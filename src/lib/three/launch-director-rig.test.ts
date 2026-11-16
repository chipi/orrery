import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  integrateAscent,
  sampleAscentAt,
  type AscentState,
  type LaunchProfile,
} from '$lib/physics/ascent/ascent-physics';
import { createLaunchDirector } from './launch-director-rig';
import type { AscentScene } from './ascent-scene';

const profile = JSON.parse(
  readFileSync(resolve(__dirname, '../../../static/data/launch-profiles/falcon-9.json'), 'utf-8'),
) as LaunchProfile;
const summary = integrateAscent(profile);

function fakeScene() {
  const camera = new THREE.PerspectiveCamera();
  const fed: AscentState[] = [];
  const asc = {
    scene: new THREE.Scene(),
    camera,
    activeShot: 'ascent',
    setState: (s: AscentState) => fed.push(s),
  } as unknown as AscentScene;
  return { asc, camera, fed };
}

const mk = (extra: object = {}) => {
  const f = fakeScene();
  const d = createLaunchDirector({
    asc: f.asc,
    summary,
    profile,
    vehLen: 1.2,
    missionId: 'crs-x',
    conditions: false,
    ...extra,
  });
  return { ...f, d };
};

describe('createLaunchDirector (shared by /fly and /dev/launch-director)', () => {
  it('feeds the scene the ground-relative state, not the inertial one', () => {
    const { d, fed } = mk();
    const raw = sampleAscentAt(summary.states, 10);
    d.apply(raw);
    expect(raw.downrangeKm).toBeGreaterThan(3);
    expect(fed[0].downrangeKm).toBeLessThan(0.1);
  });

  it('drives the camera from the plan, and not at all when camera is false', () => {
    const a = mk();
    a.d.apply(sampleAscentAt(summary.states, 100));
    expect(a.camera.fov).toBeGreaterThan(10);
    const before = a.camera.position.clone();
    a.d.apply(sampleAscentAt(summary.states, 300), { camera: false });
    expect(a.camera.position.equals(before)).toBe(true);
  });

  it('is deterministic for any t: scrubbing there and back gives the same camera and shot', () => {
    const { d, camera } = mk();
    const at = (t: number) => {
      const fr = d.apply(sampleAscentAt(summary.states, t));
      return { shot: fr.shot, pos: camera.position.toArray(), fov: camera.fov };
    };
    const first = [20, 150, 400, 60].map(at);
    const again = [60, 400, 150, 20].map(at).reverse();
    expect(again).toEqual(first);
  });

  it('the plan is the same for the same mission and a Plan flight is seeded, not dated', () => {
    const a = mk().d.plan;
    const b = mk().d.plan;
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    const plan = mk({ missionId: 'plan-mars-x' }).d.plan;
    expect(['midday', 'golden', 'dusk', 'night']).toContain(plan.conditions.light);
  });

  it('a real launch instant sets the light (Beresheet, 2019-02-22 01:45 UTC, Cape: night)', () => {
    const { d } = mk({
      launch: { utcMs: Date.UTC(2019, 1, 22, 1, 45), latDeg: 28.56, lonDeg: -80.58 },
    });
    expect(d.plan.conditions.light).toBe('night');
  });

  it('reduced motion gives hard cuts only', () => {
    const { d } = mk({ reducedMotion: true });
    expect(d.plan.reducedMotion).toBe(true);
    expect(d.plan.shots.every((s) => s.blendInS === 0)).toBe(true);
  });

  it('covers the whole act through the injection beat (endT)', () => {
    const end = summary.totalDurationS + 35;
    const { d } = mk({ endT: end, payloadSepT: summary.totalDurationS + 27 });
    expect(d.plan.shots.at(-1)!.tEnd).toBeGreaterThanOrEqual(end);
  });
});
