import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { FLY_CRAFT_MISSIONS, flyCraft, flyCraftSource, preloadFlyCraft } from './fly-craft';
import { buildPayload } from './ascent-scene';

describe('fly-craft', () => {
  it('loads the showcase CSM for Apollo 9 and the ascent rides it at the rocket width', async () => {
    expect(flyCraft('apollo9')).toBeNull();
    expect(await preloadFlyCraft('apollo9')).toBe(true);
    const csm = flyCraft('apollo9');
    expect(csm?.userData.bodyDiameterM).toBeCloseTo(3.9, 0);
    const payload = buildPayload('apollo9', 100, 2);
    expect(payload.userData.isCapsule).toBe(true);
    const w = new THREE.Box3().setFromObject(payload).getSize(new THREE.Vector3());
    // Taller than wide (the full CSM, not the bare CM), body width ≈ 0.92 × the stage.
    expect(w.y).toBeGreaterThan(2 * 2 * 0.92);
  });

  it('missions without a showcase craft resolve false', async () => {
    expect(await preloadFlyCraft('curiosity')).toBe(false);
    expect(flyCraft('curiosity')).toBeNull();
  });
});

describe('fly-craft: IM-1, MRO and Mariner 2 fly their own models', () => {
  it('maps each to its dedicated builder and loads a craft of the published size', async () => {
    expect(flyCraftSource('im-1')).toEqual(['landers', 'buildNovaC']);
    expect(flyCraftSource('mro')).toEqual(['mars-orbiters', 'mro']);
    expect(flyCraftSource('mariner2')).toEqual(['mars-orbiters', 'mariner-2']);
    for (const id of ['im-1', 'mro', 'mariner2']) expect(await preloadFlyCraft(id), id).toBe(true);
    const h = (id: string) =>
      new THREE.Box3().setFromObject(flyCraft(id)!).getSize(new THREE.Vector3());
    expect(h('im-1').y).toBeCloseTo(4.3, 0);
    expect(h('mariner2').y).toBeCloseTo(3.66, 0);
    expect(h('mro').x).toBeGreaterThan(10);
  });
});

describe('fly-craft map', () => {
  it('every mapped mission resolves to a built craft', async () => {
    for (const id of FLY_CRAFT_MISSIONS) {
      expect(await preloadFlyCraft(id), id).toBe(true);
      const g = flyCraft(id);
      const size = new THREE.Box3().setFromObject(g!).getSize(new THREE.Vector3());
      expect(Math.max(size.x, size.y, size.z), id).toBeGreaterThan(0.3);
    }
    // Builds every mapped craft at full detail: ~1 s alone, past the 5 s default under coverage
    // with the whole suite running.
  }, 30_000);
});
