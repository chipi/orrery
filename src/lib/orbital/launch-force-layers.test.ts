/**
 * The launch force-layer map (RFC-034 §11.2) is the single source of truth that
 * wires Science-Lens layer keys to the ascent scene's force vectors. These tests
 * guard the two drift risks: a layer key that isn't a real LayerKey, and a force
 * value that isn't a real ForceKey — plus the invariant that every one of the
 * four force vectors is covered exactly once.
 */
import { describe, it, expect } from 'vitest';
import { LAUNCH_FORCE_LAYERS, LAUNCH_FORCE_LAYER_ENTRIES } from './launch-force-layers';
import { LAYER_ORDER, type LayerKey } from '$lib/science-layers';
import type { ForceKey } from '$lib/three/flight-phase-scene';

const ALL_FORCES: ForceKey[] = ['thrust', 'weight', 'drag', 'velocity'];

describe('launch force-layer map', () => {
  it('every key is a real LayerKey present in LAYER_ORDER', () => {
    const layers = new Set<LayerKey>(LAYER_ORDER);
    for (const key of Object.keys(LAUNCH_FORCE_LAYERS) as LayerKey[]) {
      expect(layers.has(key), `${key} is not in LAYER_ORDER`).toBe(true);
    }
  });

  it('covers all four force vectors exactly once (a bijection onto ForceKey)', () => {
    const forces = Object.values(LAUNCH_FORCE_LAYERS);
    expect(new Set(forces)).toEqual(new Set(ALL_FORCES));
    expect(forces.length).toBe(ALL_FORCES.length);
  });

  it('maps weight to the shared gravity layer (no separate weight layer)', () => {
    expect(LAUNCH_FORCE_LAYERS.gravity).toBe('weight');
    expect((LAUNCH_FORCE_LAYERS as Record<string, string>).weight).toBeUndefined();
  });

  it('the entries array mirrors the map', () => {
    expect(LAUNCH_FORCE_LAYER_ENTRIES).toEqual(Object.entries(LAUNCH_FORCE_LAYERS));
    expect(LAUNCH_FORCE_LAYER_ENTRIES.length).toBe(4);
  });
});
