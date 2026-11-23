// @vitest-environment jsdom
import * as THREE from 'three';
import { describe, it, expect } from 'vitest';
import { buildDescentModel, KNOWN_DESCENT_STACK_IDS } from './descent-models';
import { DETAILED_CAPSULE_IDS, DETAILED_DESCENT_LANDER_IDS } from './descent-landers';
import { buildCapsuleById } from './capsule-models';

describe('buildDescentModel', () => {
  it('skycrane stack (Curiosity) has rigging, descent stage, chute + a lander', () => {
    const m = buildDescentModel('curiosity', 'mars', 1);
    expect(m.skycraneRigging.children.length).toBeGreaterThan(0);
    expect(m.descentStage.children.length).toBeGreaterThan(0);
    expect(m.parachute.children.length).toBeGreaterThan(0);
    expect(m.lander.children.length).toBeGreaterThan(0);
    expect(m.root.children).toContain(m.lander);
  });

  it('lunar stack (Apollo 11) has a retro + lander but no parachute', () => {
    const m = buildDescentModel('apollo11', 'moon', 1);
    expect(m.lander.children.length).toBeGreaterThan(0);
    // The detailed LM brings its own descent engine: the plume starts at its bell's exit, below
    // the descent stage and above the footpads.
    expect(m.lander.userData.engineExitY).toBeGreaterThan(0);
    expect(m.retroPlumeAnchor.position.y).toBe(m.lander.userData.engineExitY);
    expect(m.parachute.children.length).toBe(0); // vacuum — no chute
  });

  it('Apollo flies the central models: the detailed LM, and the detailed CSM docked on it', () => {
    const m = buildDescentModel('apollo11', 'moon', 1);
    let meshes = 0;
    m.lander.traverse((o) => void ((o as THREE.Mesh).isMesh && meshes++));
    expect(meshes).toBeGreaterThan(150); // the Tier 0 silhouette had about 20
    const lm = new THREE.Box3().setFromObject(m.lander.children[0]); // the LM, not its flag
    const csm = new THREE.Box3().setFromObject(m.orbiter);
    expect(csm.min.y).toBeCloseTo(m.lander.userData.dockY, 2); // probe on the drogue
    // Real ratio: the CSM (11 m) is about 1.6 times the LM's height (7.04 m).
    expect((csm.max.y - csm.min.y) / (lm.max.y - lm.min.y)).toBeCloseTo(11 / 7.04, 1);
  });

  it('every robotic Moon and Mars landing flies its central model, deployables stowed', () => {
    const profiles = import.meta.glob<{ siteId: string; body: string }>(
      '../../../static/data/descent-profiles/*.json',
      { eager: true, import: 'default' },
    );
    const body = new Map(Object.values(profiles).map((p) => [p.siteId, p.body]));
    for (const id of DETAILED_DESCENT_LANDER_IDS) {
      const b = body.get(id);
      expect(b, `${id} has a descent profile`).toBeDefined();
      const m = buildDescentModel(id, b as 'moon' | 'mars', 1);
      let meshes = 0;
      let stowed = 0;
      m.lander.traverse((o) => {
        if ((o as THREE.Mesh).isMesh) meshes++;
        if (o.userData.surfaceOnly) stowed++;
      });
      expect(meshes, id).toBeGreaterThan(40); // the Tier 0 silhouettes had about 20
      if (
        ![
          'luna16',
          'luna24',
          'change5',
          'change6',
          'slim',
          'beresheet',
          'blue-moon-mk1',
          'viking1-lander',
          'schiaparelli',
          'apollo11',
          'apollo12',
          'apollo14',
          'apollo15',
          'apollo16',
          'apollo17',
        ].includes(id)
      )
        expect(stowed, `${id}: its deployables are stowed in flight`).toBeGreaterThan(0);
    }
  });

  it('crewed returns come home in the central capsule models, at the old capsule size', () => {
    for (const [mission, family] of [
      ['friendship-7', 'mercury'],
      ['gemini4', 'gemini'],
      ['vostok-1', 'vostok'],
      ['voskhod-1', 'voskhod'],
      ['soyuz-11', 'soyuz'],
    ] as const) {
      expect(DETAILED_CAPSULE_IDS, family).toContain(family);
      const old = buildCapsuleById(family);
      const m = buildDescentModel(mission, 'earth', 1);
      // The central model's descent module, not the old capsule.
      expect(m.lander.getObjectByName('descent-module'), mission).toBeDefined();
      expect(old.getObjectByName('descent-module'), mission).toBeUndefined();
      const h = (o: THREE.Object3D) =>
        new THREE.Box3().setFromObject(o).getSize(new THREE.Vector3()).y;
      expect(h(m.lander) / h(old), mission).toBeCloseTo(1, 2);
    }
  });

  it('Curiosity rides the central rover, its mast stowed until touchdown', () => {
    const m = buildDescentModel('curiosity', 'mars', 1);
    const rsm = m.lander.getObjectByName('rsm');
    expect(rsm?.userData.surfaceOnly).toBe(true);
  });

  it('airbag stack (Pathfinder) carries a hidden airbag cluster', () => {
    const m = buildDescentModel('mars-pathfinder', 'mars', 1);
    expect(m.airbags.children.length).toBeGreaterThan(0);
    expect(m.airbags.visible).toBe(false); // inflated by the scene at deploy
  });

  it('Venus stack builds an aeroshell heat-shield + reuses the Venera lander', () => {
    const m = buildDescentModel('venera-13', 'venus', 1);
    expect(m.heatshield.geometry).toBeTruthy();
    expect(m.lander.children.length).toBeGreaterThan(0);
  });

  it('Apollo 8 re-enters in the Apollo CM, not the Mercury fallback', () => {
    const m = buildDescentModel('apollo8', 'earth', 1);
    expect(m.lander.userData.capsuleId).toBe('apollo-cm');
  });

  it('Zhurong lands as the Tianwen-1 lander, not the generic Mars lander', () => {
    const own = buildDescentModel('zhurong', 'mars', 1).lander;
    const generic = buildDescentModel('no-such-site', 'mars', 1).lander;
    const n = (o: THREE.Object3D) => {
      let c = 0;
      o.traverse(() => c++);
      return c;
    };
    expect(n(own)).not.toBe(n(generic));
  });

  it('small-body touchdowns fly the mission craft, sized like the generic sampler', () => {
    const size = (o: THREE.Object3D) => {
      const v = new THREE.Box3().setFromObject(o).getSize(new THREE.Vector3());
      return Math.max(v.x, v.y, v.z);
    };
    const generic = buildDescentModel('no-such-site', 'bennu', 1).lander;
    for (const [id, body] of [
      ['osiris-rex', 'bennu'],
      ['hayabusa1', 'itokawa'],
      ['hayabusa2', 'ryugu'],
      ['near-shoemaker', 'eros'],
    ] as const) {
      const own = buildDescentModel(id, body, 1).lander;
      expect(own.children[0]?.children.length ?? 0, id).toBeGreaterThan(0);
      expect(Math.abs(size(own) - size(generic)) / size(generic), id).toBeLessThan(0.02);
    }
  });

  it('exposes the dedicated stack ids', () => {
    expect(KNOWN_DESCENT_STACK_IDS).toContain('curiosity');
    expect(KNOWN_DESCENT_STACK_IDS).toContain('viking1-lander');
  });
});
