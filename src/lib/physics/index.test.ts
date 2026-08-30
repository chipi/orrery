import { describe, it, expect } from 'vitest';
import * as physics from '$lib/physics';

/**
 * Public-contract smoke test (Fable-5 S1 holistic M1): the `$lib/physics` barrel
 * is the canonical entry both consumers (the app + the standalone MCP server)
 * share. Nothing imports it yet, so without this test its exports could silently
 * rot or elide. This asserts the advertised surface actually resolves.
 */
describe('$lib/physics public barrel', () => {
  it('exposes every non-empty domain namespace', () => {
    for (const domain of [
      'ephemeris',
      'transfer',
      'ascent',
      'descent',
      'propulsion',
      'satellite',
      'util',
    ] as const) {
      expect(physics[domain], `domain ${domain} missing`).toBeTypeOf('object');
      expect(Object.keys(physics[domain]).length, `domain ${domain} empty`).toBeGreaterThan(0);
    }
  });

  it('reaches the ephemeris core (the index docstring example must be true)', () => {
    // The public example is `ephemeris.heliocentric(...)` — it must resolve.
    expect(physics.ephemeris.heliocentric).toBeTypeOf('function');
    expect(physics.ephemeris.julianDay).toBeTypeOf('function');
    expect(physics.ephemeris.gmstRad).toBeTypeOf('function');
  });

  it('reaches transfer + ascent + descent headline formulas', () => {
    // Spot-check one real export per representative domain so an emptied or
    // mis-wired barrel fails loudly.
    expect(Object.keys(physics.transfer).length).toBeGreaterThan(3);
    expect(Object.keys(physics.ascent).length).toBeGreaterThan(0);
    expect(Object.keys(physics.descent).length).toBeGreaterThan(0);
  });
});
