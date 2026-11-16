import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  integrateAscent,
  sampleAscentAt,
  type LaunchProfile,
} from '$lib/physics/ascent/ascent-physics';
import { buildDirectorPlan, groundRelative } from './ascent-director';
import {
  boundsOf,
  buildPlotModel,
  cameraRelative,
  fitTransform,
  liveReadout,
  pushTrail,
} from './launch-director-debug-plot';

const profile = JSON.parse(
  readFileSync(
    resolve(__dirname, '../../../static/data/launch-profiles/sls-block-1.json'),
    'utf-8',
  ),
) as LaunchProfile;
const sum = integrateAscent(profile);
const stateAt = (t: number) => sampleAscentAt(sum.states, t);
const plan = buildDirectorPlan({
  vehicleId: 'sls-block-1',
  seed: 4,
  events: sum.events,
  maxQt: sum.maxQ.t,
  duration: sum.totalDurationS,
  altAt: (t) => stateAt(t).altKm,
  hasBoosters: true,
});
const lat = profile.launchSite?.lat ?? 28.5;

describe('fitTransform / boundsOf', () => {
  it('maps the bounds inside the canvas with the margin, y flipped', () => {
    const b = { minX: 0, maxX: 10, minY: 0, maxY: 5 };
    const t = fitTransform(b, 200, 100, 10);
    const lo = t.apply({ x: 0, y: 0 });
    const hi = t.apply({ x: 10, y: 5 });
    expect(lo.x).toBeGreaterThanOrEqual(10 - 1e-9);
    expect(hi.x).toBeLessThanOrEqual(190 + 1e-9);
    expect(lo.y).toBeGreaterThan(hi.y); // up is up
    expect(hi.y).toBeGreaterThanOrEqual(10 - 1e-9);
  });

  it('equal scale keeps the aspect', () => {
    const t = fitTransform({ minX: 0, maxX: 1, minY: 0, maxY: 1 }, 400, 100, 0, true);
    expect(t.sx).toBeCloseTo(t.sy, 9);
  });

  it('boundsOf pads, and survives an empty list', () => {
    const b = boundsOf(
      [
        { x: 0, y: 0 },
        { x: 10, y: 10 },
      ],
      0.1,
    );
    expect(b.minX).toBeCloseTo(-1, 9);
    expect(b.maxY).toBeCloseTo(11, 9);
    expect(boundsOf([]).maxX).toBe(1);
  });
});

describe('buildPlotModel', () => {
  const model = buildPlotModel({ plan, stateAt, latDeg: lat, vehLen: 1.2 });

  it('has one entry per planned shot, in order, covering the path', () => {
    expect(model.shots).toHaveLength(plan.shots.length);
    model.shots.forEach((s, i) => {
      expect(s.index).toBe(i);
      expect(s.id).toBe(plan.shots[i].id);
      expect(s.path.length).toBeGreaterThanOrEqual(2);
    });
    expect(model.path[0]).toEqual({ x: 0, y: 0 });
  });

  it('the path is the ground-relative one: over the pad at T+10', () => {
    const i = model.path.findIndex((_, k) => k * 2 >= 10);
    expect(Math.abs(model.path[i].x)).toBeLessThan(0.2);
    expect(model.path[i].y).toBeLessThan(0.5);
  });

  it('every shot reports a camera, a unit look direction and a framing fill', () => {
    for (const s of model.shots) {
      expect(Math.hypot(s.mid.lx, s.mid.ly, s.mid.lz)).toBeCloseTo(1, 6);
      expect(s.mid.dist).toBeGreaterThan(0);
      expect(s.fill).toBeGreaterThan(0);
    }
    expect(model.rigRadius).toBeGreaterThanOrEqual(1);
  });
});

describe('liveReadout / cameraRelative', () => {
  it('names the active shot and reports the fill in percent', () => {
    const t = 100;
    const s = groundRelative(stateAt(t), lat);
    const r = liveReadout(plan, t, s, 1.2);
    expect(r.shot).toBe(plan.shots[r.shotIndex].id);
    expect(r.fillPct).toBeGreaterThan(5);
    expect(r.fillPct).toBeLessThan(100);
    expect(r.rel.dist).toBeCloseTo(Math.hypot(r.rel.dx, r.rel.dy, r.rel.dz), 9);
  });

  it('a camera straight above looks down', () => {
    const s = stateAt(30);
    const rel = cameraRelative(
      {
        px: s.downrangeKm,
        py: s.altKm + 3,
        pz: 0.0001,
        tx: s.downrangeKm,
        ty: s.altKm,
        tz: 0,
        fov: 40,
      },
      s,
      1.2,
    );
    expect(rel.elevDeg).toBeGreaterThan(85);
    expect(rel.ly).toBeLessThan(-0.99);
  });
});

describe('pushTrail', () => {
  it('caps the length and skips a point that did not move', () => {
    let tr: { x: number; y: number }[] = [];
    for (let i = 0; i < 300; i++) tr = pushTrail(tr, { x: i, y: 0 }, 50);
    expect(tr).toHaveLength(50);
    expect(tr[49].x).toBe(299);
    expect(pushTrail(tr, { x: 299, y: 0 })).toBe(tr);
  });
});
