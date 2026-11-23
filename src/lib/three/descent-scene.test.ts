// @vitest-environment jsdom
import type * as THREE from 'three';
import { beforeAll, describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { createDescentScene, type DescentScene } from './descent-scene';
import { preloadDescentModels } from './descent-landers';
import {
  expandDescentProfile,
  type RawDescentProfile,
} from '$lib/physics/descent/descent-profile-registry';
import {
  integrateDescent,
  sampleDescentAt,
  type DescentSummary,
} from '$lib/physics/descent/descent-physics';

/** Apollo 17's descent in the scene: the contact beats read at the craft's own scale. */
describe('a powered lunar landing with a contact beat', () => {
  let sum: DescentSummary;
  let scene: DescentScene;
  let probes: THREE.Object3D;
  let vehicle: THREE.Object3D;
  let plume: THREE.Object3D;
  const t = (type: string): number => sum.events.find((e) => e.type === type)!.t;
  const at = (s: number) => sampleDescentAt(sum.states, s);

  beforeAll(async () => {
    await preloadDescentModels();
    const raw = JSON.parse(
      readFileSync('static/data/descent-profiles/apollo17.json', 'utf-8'),
    ) as RawDescentProfile;
    sum = integrateDescent(expandDescentProfile(raw));
    scene = createDescentScene({
      aspect: 1.6,
      body: 'moon',
      siteId: 'apollo17',
      durationS: sum.totalDurationS,
      events: sum.events,
    });
    scene.scene.traverse((o) => {
      if (o.userData.flightOnly) probes = o;
      if (o.type === 'Group' && o.rotation.z === Math.PI && o.children.length === 2) plume = o;
    });
    vehicle = probes;
    while (vehicle.parent && vehicle.parent !== scene.scene) vehicle = vehicle.parent;
  });

  it('the probes fly until touchdown, then are gone', () => {
    scene.setState(at(t('contact_light')));
    expect(probes.visible).toBe(true);
    scene.setState(at(t('touchdown') + 1));
    expect(probes.visible).toBe(false);
  });

  it('the planted flag waits for touchdown, though the craft is drawn at scale in the last 2 m', () => {
    let flag!: THREE.Object3D;
    scene.scene.traverse((o) => {
      if (o.userData.surfaceOnly) flag = o;
    });
    scene.setState(at(t('engine_cutoff')));
    expect(flag.visible).toBe(false);
    scene.setState(at(t('touchdown') + 1));
    expect(flag.visible).toBe(true);
  });

  it('the engine burns until the cutoff, not after it', () => {
    scene.setState(at(t('engine_cutoff') - 0.5));
    expect(plume.visible).toBe(true);
    scene.setState(at(t('engine_cutoff') + 0.2));
    expect(plume.visible).toBe(false);
  });

  it('the last metres are drawn at the craft scale, rising continuously above them', () => {
    const k = probes.scale.x;
    const s = at(t('contact_light'));
    scene.setState(s);
    expect(vehicle.position.y).toBeCloseTo(s.altM * k, 6);
    const above = sum.states.filter((x) => x.altM > 55 && x.altM < 65);
    const ys = above.map((x) => (scene.setState(x), vehicle.position.y));
    for (let i = 1; i < ys.length; i++) expect(ys[i]).toBeLessThan(ys[i - 1]);
    expect(Math.abs(ys[0] - ys[ys.length - 1])).toBeLessThan(15 * k);
  });
});
