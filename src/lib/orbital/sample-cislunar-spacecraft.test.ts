import { describe, it, expect } from 'vitest';
import {
  sampleCislunarSpacecraftPos,
  MOON_LOCAL_PHASE_TYPES,
  phaseIndexAt,
  phaseTimeFractions,
} from './sample-cislunar-spacecraft';
import type { CislunarPhase } from '$lib/orbital/cislunar/cislunar-geometry';
import { buildCislunarTrajectory, translunarCoast } from '$lib/orbital/cislunar/cislunar-geometry';

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

// The coasts are drawn uniform in true anomaly, so a point near perigee covers far less time than
// one near apogee. Placed index-linear in time, the craft lingered by Earth for most of the coast
// (W6: Apollo 11 sat 10,000 km out a day after TLI).
describe('sampleCislunarSpacecraftPos: a coast moves at the speed of its orbit', () => {
  const pts = translunarCoast(
    { x: 6700, y: 0, z: 0 },
    { x: -378_560, y: 0, z: 66_750 }, // the Moon 170° round from the TLI point
    110,
    300,
  );
  const coast: CislunarPhase = {
    type: 'tli_coast',
    start_met_days: 0,
    end_met_days: 3,
    points: pts,
  };
  const r = (p: number) => {
    const s = sampleCislunarSpacecraftPos(coast, p)!;
    return Math.hypot(s.x, s.y, s.z);
  };

  it('is far out a third of the way through the coast, as Kepler has it', () => {
    // Perigee to apogee of this ellipse: a third of the time is ~266,000 km out (E - e sin E).
    expect(r(1 / 3)).toBeGreaterThan(200_000);
  });

  it('still starts at perigee and ends at apogee, moving outward the whole way', () => {
    expect(r(0)).toBeCloseTo(6700, 0);
    expect(r(1)).toBeGreaterThan(384_000);
    let prev = 0;
    for (let p = 0; p <= 1; p += 0.05) {
      expect(r(p)).toBeGreaterThanOrEqual(prev);
      prev = r(p);
    }
  });
});

describe('sampleCislunarSpacecraftPos: a waypoint path is placed by its own times', () => {
  // Waypoints every 0.1 d near Earth, then every 0.5 d: the index runs ahead of time early on.
  const met = [0, 0.1, 0.2, 0.3, 0.8, 1.3, 1.8, 2.3];
  const wp = met.map(
    (t, i) => [t, 10_000 + i * 40_000, 0, 5_000 * i] as [number, number, number, number],
  );
  const traj = buildCislunarTrajectory(
    { source_tier: 'tier_2_published', waypoints_km: wp },
    { dep_day_sim: 0, transit_days: 3, is_return_trip: false },
  );
  const coast = traj.phases.find((p) => p.type === 'tli_coast')!;

  it('carries a MET for every drawn point', () => {
    expect(coast.point_met_days?.length).toBe(coast.points.length);
  });

  it('puts the craft on the waypoint of the MET asked for', () => {
    const span = coast.end_met_days - coast.start_met_days;
    for (const k of [2, 4, 6]) {
      const s = sampleCislunarSpacecraftPos(coast, (met[k] - coast.start_met_days) / span)!;
      // The published path is rotated to the Moon's phase at departure; compare distances.
      expect(Math.hypot(s.x, s.y, s.z)).toBeCloseTo(Math.hypot(wp[k][1], wp[k][2], wp[k][3]), -1);
    }
  });
});

// The hybrid-waypoint generator stamps each coast point with the time the renderer gives it.
describe('phaseTimeFractions', () => {
  const coast: CislunarPhase = {
    type: 'tli_coast',
    start_met_days: 0,
    end_met_days: 3,
    points: translunarCoast({ x: 6700, y: 0, z: 0 }, { x: -378_560, y: 0, z: 66_750 }, 110, 60),
  };

  it('is the inverse of phaseIndexAt: the craft is on point i at its own fraction', () => {
    const f = phaseTimeFractions(coast);
    expect(f[0]).toBe(0);
    expect(f[f.length - 1]).toBeCloseTo(1, 12);
    for (const i of [5, 20, 40]) expect(phaseIndexAt(coast, f[i])).toBeCloseTo(i, 6);
  });

  it('gives the first points little time: the perigee pass is fast', () => {
    expect(phaseTimeFractions(coast)[10]).toBeLessThan(10 / 60 / 2);
  });

  it('falls back to even spacing where no Kepler timing applies', () => {
    const stay: CislunarPhase = { ...coast, type: 'lunar_flyby', points: coast.points.slice(0, 5) };
    expect(phaseTimeFractions(stay)).toEqual([0, 0.25, 0.5, 0.75, 1]);
    expect(phaseTimeFractions({ ...stay, points: stay.points.slice(0, 1) })).toEqual([0]);
  });

  it("uses the points' own times when the path carries them", () => {
    const timed: CislunarPhase = {
      ...coast,
      points: coast.points.slice(0, 3),
      point_met_days: [1, 1.5, 3],
    };
    expect(phaseTimeFractions(timed)).toEqual([0, 0.25, 1]);
  });
});
