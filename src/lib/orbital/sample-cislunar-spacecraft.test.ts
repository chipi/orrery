import { describe, it, expect } from 'vitest';
import { sampleCislunarSpacecraftPos, MOON_LOCAL_PHASE_TYPES } from './sample-cislunar-spacecraft';
import type { CislunarPhase } from '$lib/orbital/cislunar/cislunar-geometry';

const TLI_COAST: CislunarPhase = {
  type: 'tli_coast',
  start_met_days: 0,
  end_met_days: 3,
  points: [
    { x: 0, y: 0, z: 0 },
    { x: 100, y: 0, z: 0 },
    { x: 200, y: 50, z: 0 },
    { x: 300, y: 100, z: 0 },
  ],
};
const LUNAR_ORBIT: CislunarPhase = {
  type: 'lunar_orbit',
  start_met_days: 3,
  end_met_days: 4,
  points: [
    { x: 10, y: 0, z: 0 },
    { x: 0, y: 10, z: 0 },
    { x: -10, y: 0, z: 0 },
    { x: 0, y: -10, z: 0 },
  ],
};

describe('sampleCislunarSpacecraftPos', () => {
  it('returns null when the phase has no points', () => {
    const empty: CislunarPhase = { ...TLI_COAST, points: [] };
    expect(sampleCislunarSpacecraftPos(empty, 0.5)).toBeNull();
  });

  it('returns the first point at progress 0', () => {
    expect(sampleCislunarSpacecraftPos(TLI_COAST, 0)).toEqual({ x: 0, y: 0, z: 0 });
  });

  it('returns the last point at progress 1', () => {
    expect(sampleCislunarSpacecraftPos(TLI_COAST, 1)).toEqual({ x: 300, y: 100, z: 0 });
  });

  it('linearly interpolates between adjacent points', () => {
    // progress 1/3 == segment 0→1, fully at point[1]
    expect(sampleCislunarSpacecraftPos(TLI_COAST, 1 / 3)).toEqual({ x: 100, y: 0, z: 0 });
    // progress 0.5 → indexFloat = 1.5 → halfway between points[1] and points[2]
    expect(sampleCislunarSpacecraftPos(TLI_COAST, 0.5)).toEqual({ x: 150, y: 25, z: 0 });
  });

  it('clamps progress < 0 to the first point', () => {
    expect(sampleCislunarSpacecraftPos(TLI_COAST, -1)).toEqual({ x: 0, y: 0, z: 0 });
  });

  it('clamps progress > 1 to the last point', () => {
    expect(sampleCislunarSpacecraftPos(TLI_COAST, 2)).toEqual({ x: 300, y: 100, z: 0 });
  });

  it('handles a 1-point phase by returning that point regardless of progress', () => {
    const onePoint: CislunarPhase = { ...TLI_COAST, points: [{ x: 5, y: 5, z: 5 }] };
    expect(sampleCislunarSpacecraftPos(onePoint, 0)).toEqual({ x: 5, y: 5, z: 5 });
    expect(sampleCislunarSpacecraftPos(onePoint, 0.5)).toEqual({ x: 5, y: 5, z: 5 });
    expect(sampleCislunarSpacecraftPos(onePoint, 1)).toEqual({ x: 5, y: 5, z: 5 });
  });

  it('NO frame shift on ECI-stored phases (tli_coast) even when frame is supplied', () => {
    const out = sampleCislunarSpacecraftPos(TLI_COAST, 0, {
      moonPos: { x: 384400, y: 0, z: 0 },
      moonRefPos: { x: 300000, y: 0, z: 0 },
    });
    // Delta (84400, 0, 0) IS NOT added — tli_coast is in ECI already.
    expect(out).toEqual({ x: 0, y: 0, z: 0 });
  });

  it('APPLIES frame shift on Moon-local phases (lunar_orbit)', () => {
    const out = sampleCislunarSpacecraftPos(LUNAR_ORBIT, 0, {
      moonPos: { x: 384400, y: 0, z: 0 },
      moonRefPos: { x: 300000, y: 0, z: 0 },
    });
    // points[0] = (10, 0, 0) in Moon-local; delta = (84400, 0, 0)
    // → ECI (84410, 0, 0)
    expect(out).toEqual({ x: 84410, y: 0, z: 0 });
  });

  it('no frame shift when frame is undefined even for a Moon-local phase', () => {
    // Caller might choose to skip the shift in a debug-overlay context.
    const out = sampleCislunarSpacecraftPos(LUNAR_ORBIT, 0);
    expect(out).toEqual({ x: 10, y: 0, z: 0 });
  });

  it('MOON_LOCAL_PHASE_TYPES covers every Moon-centred phase Apollo uses', () => {
    expect(MOON_LOCAL_PHASE_TYPES.has('lunar_orbit')).toBe(true);
    expect(MOON_LOCAL_PHASE_TYPES.has('spiral_lunar')).toBe(true);
    expect(MOON_LOCAL_PHASE_TYPES.has('lunar_flyby')).toBe(true);
    expect(MOON_LOCAL_PHASE_TYPES.has('descent')).toBe(true);
    expect(MOON_LOCAL_PHASE_TYPES.has('ascent')).toBe(true);
    // Sanity: ECI phases NOT in the set
    expect(MOON_LOCAL_PHASE_TYPES.has('tli_coast')).toBe(false);
    expect(MOON_LOCAL_PHASE_TYPES.has('tei_coast')).toBe(false);
    expect(MOON_LOCAL_PHASE_TYPES.has('earth_orbit')).toBe(false);
  });
});
