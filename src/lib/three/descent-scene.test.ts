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

/** Apollo 15's splashdown: one of the three mains deflated to a fifth of its diameter at 6,000 ft. */
describe('Apollo 15 lands on two mains', () => {
  const run = (id: string) => {
    const raw = JSON.parse(
      readFileSync(`static/data/descent-profiles/${id}.json`, 'utf-8'),
    ) as RawDescentProfile;
    const sum = integrateDescent(expandDescentProfile(raw));
    const scene = createDescentScene({
      aspect: 1.6,
      body: 'earth',
      siteId: id,
      durationS: sum.totalDurationS,
      events: sum.events,
    });
    let pivot: THREE.Object3D | undefined;
    scene.scene.traverse((o) => {
      if (o.userData.deflatingMain) pivot = o.userData.deflatingMain as THREE.Object3D;
    });
    const scaleAt = (altM: number): number => {
      const s = sum.states.find((x, i) => i > 0 && x.altM <= altM && x.t > 300)!;
      scene.setState(s);
      return pivot!.scale.x;
    };
    return { pivot: () => pivot, scaleAt };
  };
  beforeAll(async () => {
    await preloadDescentModels();
  });
  it('shrinks one canopy to about a fifth of its width by the ground; the other two are untouched', () => {
    const a15 = run('apollo15-splashdown');
    expect(a15.pivot()).toBeDefined();
    expect(a15.scaleAt(2500)).toBe(1);
    expect(a15.scaleAt(1000)).toBeCloseTo(0.2, 2);
    const mid = a15.scaleAt(1700);
    expect(mid).toBeLessThan(1);
    expect(mid).toBeGreaterThan(0.2);
  });
  it('leaves the other Apollo splashdowns on three full mains', () => {
    const a16 = run('apollo16-splashdown');
    expect(a16.scaleAt(1000)).toBe(1);
  });
});

describe('Gemini on its two-point bridle', () => {
  it('hangs with its centre under the riser, not swung out to one side', async () => {
    const { Box3, Vector3 } = await import('three');
    await preloadDescentModels();
    const raw = JSON.parse(
      readFileSync('static/data/descent-profiles/gemini4.json', 'utf-8'),
    ) as RawDescentProfile;
    const sum = integrateDescent(expandDescentProfile(raw));
    const scene = createDescentScene({
      aspect: 1.6,
      body: 'earth',
      siteId: 'gemini4',
      durationS: sum.totalDurationS,
      events: sum.events,
    });
    let capsule!: THREE.Object3D;
    scene.scene.traverse((o) => {
      if (o.userData.hangPivotY != null) capsule = o;
    });
    const touchdown = sum.events.find((e) => e.type === 'touchdown')!.t;
    scene.setState(sampleDescentAt(sum.states, touchdown - 6));
    scene.scene.updateMatrixWorld(true);
    const box = new Box3().setFromObject(capsule);
    const c = capsule.parent!.worldToLocal(box.getCenter(new Vector3()));
    const len = box.getSize(new Vector3()).length();
    expect(Math.hypot(c.x, c.z) / len).toBeLessThan(0.05);
  });
});
