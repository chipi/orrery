import { describe, it, expect } from 'vitest';
import {
  buildInterplanetaryTrajectory,
  helioAuAtMet,
  type InterplanetaryProfile,
  type InterplanetaryTrajectory,
  type Vec3Au,
} from './interplanetary-geometry';

const baseOpts = {
  dep_day_sim: 0,
  transit_days: 200, // representative Hohmann window for Earth → Mars
};

describe('interplanetary-geometry — buildInterplanetaryTrajectory (Tier 1)', () => {
  it('produces a single helio_cruise phase when waypoints + return absent', () => {
    const profile: InterplanetaryProfile = {
      source_tier: 'tier_1_analytic',
      arrival_body: 'mars',
      transfer_type: 'type1_lambert',
    };
    const traj = buildInterplanetaryTrajectory(profile, baseOpts);
    expect(traj.phases.length).toBeGreaterThanOrEqual(1);
    expect(traj.phases[0].type).toBe('helio_cruise');
    expect(traj.phases[0].start_met_days).toBe(0);
    expect(traj.phases[0].end_met_days).toBe(200);
    expect(traj.phases[0].points.length).toBeGreaterThan(10);
  });

  it('appends arrival_orbit holding phase right after cruise', () => {
    const profile: InterplanetaryProfile = {
      arrival_body: 'mars',
    };
    const traj = buildInterplanetaryTrajectory(profile, baseOpts);
    const arrival = traj.phases.find((p) => p.type === 'arrival_orbit');
    expect(arrival).toBeDefined();
    expect(arrival!.start_met_days).toBe(200);
  });

  it('appends tei + earth_return phases when is_return_trip=true', () => {
    const profile: InterplanetaryProfile = { arrival_body: 'mars' };
    const traj = buildInterplanetaryTrajectory(profile, {
      ...baseOpts,
      is_return_trip: true,
    });
    const phaseTypes = traj.phases.map((p) => p.type);
    expect(phaseTypes).toContain('tei_helio');
    expect(phaseTypes).toContain('earth_return_helio');
  });

  it('points produced are heliocentric (~1 AU near Earth, ~1.5 AU near Mars)', () => {
    const profile: InterplanetaryProfile = { arrival_body: 'mars' };
    const traj = buildInterplanetaryTrajectory(profile, baseOpts);
    const cruise = traj.phases.find((p) => p.type === 'helio_cruise')!;
    const first = cruise.points[0];
    const last = cruise.points[cruise.points.length - 1];
    const r0 = Math.hypot(first.x, first.z);
    const r1 = Math.hypot(last.x, last.z);
    // Earth ~1 AU; Mars ~1.524 AU.
    expect(r0).toBeGreaterThan(0.95);
    expect(r0).toBeLessThan(1.05);
    expect(r1).toBeGreaterThan(1.45);
    expect(r1).toBeLessThan(1.55);
  });

  it('arrival_track samples the target body over the full mission window', () => {
    const profile: InterplanetaryProfile = { arrival_body: 'mars' };
    const traj = buildInterplanetaryTrajectory(profile, baseOpts);
    expect(traj.arrival_track.length).toBeGreaterThan(10);
    for (const p of traj.arrival_track) {
      const r = Math.hypot(p.x, p.z);
      expect(r).toBeGreaterThan(1.45);
      expect(r).toBeLessThan(1.55);
    }
  });

  it('defaults arrival_body to mars when profile omits it', () => {
    const traj = buildInterplanetaryTrajectory({}, baseOpts);
    expect(traj.phases[0].points.length).toBeGreaterThan(10);
  });
});

describe('interplanetary-geometry — Tier 1.5 dispatch', () => {
  it('replays waypoints_helio_au when present (bypassing parametric)', () => {
    const wp: Array<[number, number, number, number]> = [
      [0, 1, 0, 0],
      [100, 1.2, 0, 0.5],
      [200, 1.524, 0, 0],
    ];
    const profile: InterplanetaryProfile = {
      source_tier: 'tier_1_5_hybrid',
      arrival_body: 'mars',
      waypoints_helio_au: wp,
    };
    const traj = buildInterplanetaryTrajectory(profile, baseOpts);
    expect(traj.phases.length).toBe(1);
    expect(traj.phases[0].points.length).toBe(wp.length);
    expect(traj.phases[0].points[0]).toEqual({ x: 1, y: 0, z: 0 });
    expect(traj.phases[0].points[2]).toEqual({ x: 1.524, y: 0, z: 0 });
    expect(traj.phases[0].start_met_days).toBe(0);
    expect(traj.phases[0].end_met_days).toBe(200);
  });

  it('treats short waypoint arrays (<2) as parametric fallback', () => {
    const profile: InterplanetaryProfile = {
      source_tier: 'tier_1_5_hybrid',
      arrival_body: 'mars',
      waypoints_helio_au: [[0, 1, 0, 0]],
    };
    const traj = buildInterplanetaryTrajectory(profile, baseOpts);
    // Fell through to parametric path — should have multiple phases.
    expect(traj.phases.length).toBeGreaterThan(1);
  });
});

describe('interplanetary-geometry — helioAuAtMet', () => {
  function makeTraj(): InterplanetaryTrajectory {
    return {
      phases: [
        {
          type: 'helio_cruise',
          start_met_days: 0,
          end_met_days: 100,
          points: [
            { x: 1, y: 0, z: 0 },
            { x: 1.25, y: 0, z: 0.5 },
            { x: 1.524, y: 0, z: 0 },
          ],
        },
        {
          type: 'arrival_orbit',
          start_met_days: 100,
          end_met_days: 105,
          points: [
            { x: 1.524, y: 0, z: 0 },
            { x: 1.524, y: 0, z: 0.05 },
          ],
        },
      ],
      arrival_track: [],
      closest_approach_au: 0,
    };
  }

  it('returns null when trajectory has no phases', () => {
    expect(helioAuAtMet(50, { phases: [], arrival_track: [], closest_approach_au: 0 })).toBeNull();
  });

  it('clamps to first sample when MET < trajectory start', () => {
    const pt = helioAuAtMet(-10, makeTraj());
    expect(pt).toEqual({ x: 1, y: 0, z: 0 });
  });

  it('clamps to last sample when MET > trajectory end', () => {
    const pt = helioAuAtMet(200, makeTraj());
    expect(pt).toEqual({ x: 1.524, y: 0, z: 0.05 });
  });

  it('linearly interpolates between bracketing samples within a phase', () => {
    // Midpoint of helio_cruise — phase spans MET 0..100 with 3 samples.
    // MET 50 = halfway = sample index 1.0 (exact middle sample).
    const pt = helioAuAtMet(50, makeTraj());
    expect(pt).toEqual({ x: 1.25, y: 0, z: 0.5 });
  });

  it('handles phase boundary cleanly (end of phase 1 = start of phase 2)', () => {
    const pt = helioAuAtMet(100, makeTraj()) as Vec3Au;
    expect(pt.x).toBeCloseTo(1.524);
  });
});
