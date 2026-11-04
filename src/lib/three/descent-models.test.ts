// @vitest-environment jsdom
import * as THREE from 'three';
import { describe, it, expect } from 'vitest';
import { buildDescentModel, KNOWN_DESCENT_STACK_IDS } from './descent-models';

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
    expect(m.retro.children.length).toBeGreaterThan(0);
    expect(m.parachute.children.length).toBe(0); // vacuum — no chute
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
