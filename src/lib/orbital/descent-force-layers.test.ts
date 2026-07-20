/**
 * Descent force-layer map (RFC-034 §9 / §11.2) — guards the four layer→force
 * mappings and the DESCENT_FORCE_LAYER_ENTRIES round-trip invariant.
 */
import { describe, it, expect } from 'vitest';
import { DESCENT_FORCE_LAYERS, DESCENT_FORCE_LAYER_ENTRIES } from './descent-force-layers';

describe('DESCENT_FORCE_LAYERS — explicit mappings', () => {
  it('maps thrust layer → thrust force', () => {
    expect(DESCENT_FORCE_LAYERS.thrust).toBe('thrust');
  });

  it('maps gravity layer → weight force', () => {
    expect(DESCENT_FORCE_LAYERS.gravity).toBe('weight');
  });

  it('maps drag layer → drag force', () => {
    expect(DESCENT_FORCE_LAYERS.drag).toBe('drag');
  });

  it('maps velocity layer → velocity force', () => {
    expect(DESCENT_FORCE_LAYERS.velocity).toBe('velocity');
  });

  it('has exactly four entries', () => {
    expect(Object.keys(DESCENT_FORCE_LAYERS).length).toBe(4);
  });
});

describe('DESCENT_FORCE_LAYER_ENTRIES — array invariants', () => {
  it('contains exactly 4 [layer, force] pairs', () => {
    expect(DESCENT_FORCE_LAYER_ENTRIES.length).toBe(4);
  });

  it('round-trips through Object.fromEntries back to the original map', () => {
    const rebuilt = Object.fromEntries(DESCENT_FORCE_LAYER_ENTRIES);
    expect(rebuilt).toEqual(DESCENT_FORCE_LAYERS);
  });

  it('all four canonical layer keys appear in the entries', () => {
    const keys = DESCENT_FORCE_LAYER_ENTRIES.map(([k]) => k);
    expect(keys).toContain('thrust');
    expect(keys).toContain('gravity');
    expect(keys).toContain('drag');
    expect(keys).toContain('velocity');
  });

  it('all four force values appear in the entries', () => {
    const forces = DESCENT_FORCE_LAYER_ENTRIES.map(([, f]) => f);
    expect(forces).toContain('thrust');
    expect(forces).toContain('weight');
    expect(forces).toContain('drag');
    expect(forces).toContain('velocity');
  });

  it('mirrors Object.entries of the map (order + content identical)', () => {
    expect(DESCENT_FORCE_LAYER_ENTRIES).toEqual(Object.entries(DESCENT_FORCE_LAYERS));
  });
});
