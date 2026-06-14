import { describe, it, expect } from 'vitest';
import {
  A_MOON_KM,
  R_EARTH_KM,
  R_MOON_KM,
  T_MOON_DAYS,
  moonEciPos,
  parkingOrbit,
  translunarCoast,
  transEarthCoast,
  keplerianArcEarthFocus,
  buildCislunarTrajectory,
  type CislunarProfile,
  type Vec3Km,
} from './cislunar-geometry';

describe('cislunar-geometry — Tier 1 phase generators (ADR-058)', () => {
  describe('moonEciPos', () => {
    it('orbits Earth at A_MOON_KM in the x/z plane', () => {
      for (let d = 0; d < T_MOON_DAYS; d += 1) {
        const p = moonEciPos(d);
        expect(Math.hypot(p.x, p.y, p.z)).toBeCloseTo(A_MOON_KM, 3);
        expect(p.y).toBeCloseTo(0, 9);
      }
    });

    it('completes one revolution per T_MOON_DAYS', () => {
      const p0 = moonEciPos(0);
      const pT = moonEciPos(T_MOON_DAYS);
      expect(pT.x).toBeCloseTo(p0.x, 3);
      expect(pT.z).toBeCloseTo(p0.z, 3);
    });
  });

  describe('parkingOrbit', () => {
    it('places every point at R_EARTH_KM + altitude', () => {
      const pts = parkingOrbit(185, 28.5, 1.5, 96);
      for (const p of pts) {
        expect(Math.hypot(p.x, p.y, p.z)).toBeCloseTo(R_EARTH_KM + 185, 6);
      }
    });

    it('starts at the orbit equatorial line (z=0, y=0) at nu=0', () => {
      const pts = parkingOrbit(185, 28.5, 1.5, 96);
      expect(pts[0].x).toBeCloseTo(R_EARTH_KM + 185, 6);
      expect(pts[0].y).toBeCloseTo(0, 9);
      expect(pts[0].z).toBeCloseTo(0, 9);
    });

    it('inclination tilts the orbit out of the equator', () => {
      const equatorial = parkingOrbit(185, 0, 1, 24);
      const polar = parkingOrbit(185, 90, 1, 24);
      const eqYMax = Math.max(...equatorial.map((p) => Math.abs(p.y)));
      const polYMax = Math.max(...polar.map((p) => Math.abs(p.y)));
      expect(eqYMax).toBeCloseTo(0, 6);
      expect(polYMax).toBeGreaterThan(R_EARTH_KM);
    });

    it('produces steps+1 points', () => {
      expect(parkingOrbit(185, 28.5, 1, 100).length).toBe(101);
    });
  });

  describe('translunarCoast', () => {
    const parkingExit = { x: R_EARTH_KM + 185, y: 0, z: 0 };
    const moonAtArrival = { x: A_MOON_KM, y: 0, z: 0 };

    it('pins endpoint 0 to parkingExit exactly', () => {
      const pts = translunarCoast(parkingExit, moonAtArrival, 110, 64);
      expect(pts[0].x).toBe(parkingExit.x);
      expect(pts[0].y).toBe(parkingExit.y);
      expect(pts[0].z).toBe(parkingExit.z);
    });

    it('pins last endpoint at apogee (Moon + periselene altitude)', () => {
      const periselene = 9200;
      const pts = translunarCoast(parkingExit, moonAtArrival, periselene, 64);
      const last = pts[pts.length - 1];
      const lastMag = Math.hypot(last.x, last.y, last.z);
      expect(lastMag).toBeCloseTo(A_MOON_KM + R_MOON_KM + periselene, 3);
    });

    it('Apollo-class (periselene 110 km) places apogee just past Moon surface', () => {
      const pts = translunarCoast(parkingExit, moonAtArrival, 110, 64);
      const last = pts[pts.length - 1];
      const lastMag = Math.hypot(last.x, last.y, last.z);
      expect(lastMag).toBeCloseTo(A_MOON_KM + R_MOON_KM + 110, 3);
    });

    it('Artemis II hybrid (periselene 9,200 km) places apogee well past Moon', () => {
      const pts = translunarCoast(parkingExit, moonAtArrival, 9200, 64);
      const last = pts[pts.length - 1];
      const lastMag = Math.hypot(last.x, last.y, last.z);
      expect(lastMag).toBeCloseTo(A_MOON_KM + R_MOON_KM + 9200, 3);
    });

    it('intermediate points lie on a sane Earth-bound trajectory (never inside Earth, never beyond apogee+1%)', () => {
      const pts = translunarCoast(parkingExit, moonAtArrival, 110, 64);
      const apogeeR = A_MOON_KM + R_MOON_KM + 110;
      for (const p of pts) {
        const r = Math.hypot(p.x, p.y, p.z);
        expect(r).toBeGreaterThan(R_EARTH_KM * 0.99);
        expect(r).toBeLessThan(apogeeR * 1.01);
      }
    });
  });

  describe('transEarthCoast', () => {
    it('pins both endpoints', () => {
      const start = { x: A_MOON_KM + R_MOON_KM + 110, y: 0, z: 0 };
      const end = { x: -(R_EARTH_KM + 120), y: 0, z: 0 };
      const pts = transEarthCoast(start, end, 64);
      expect(pts[0]).toEqual(start);
      expect(pts[pts.length - 1]).toEqual(end);
    });
  });

  describe('buildCislunarTrajectory — composition', () => {
    const baseOpts = { dep_day_sim: 100, transit_days: 5, is_return_trip: false };

    it('produces parking + tli_coast + lunar_flyby for one-way flyby missions', () => {
      // Undefined profile defaults to arrival_type='flyby'. Post-#XX
      // (this slice) the flyby case adds a lunar_flyby phase so the
      // auto-zoom dispatcher can engage during the swing-by beat.
      const traj = buildCislunarTrajectory(undefined, baseOpts);
      expect(traj.phases.map((p) => p.type)).toEqual(['parking', 'tli_coast', 'lunar_flyby']);
    });

    it('adds tei_coast for round-trip flyby missions (Apollo 13)', () => {
      const traj = buildCislunarTrajectory(undefined, { ...baseOpts, is_return_trip: true });
      expect(traj.phases.map((p) => p.type)).toEqual([
        'parking',
        'tli_coast',
        'lunar_flyby',
        'tei_coast',
      ]);
    });

    it('phases are ordered by met_days with no gaps or overlaps', () => {
      const traj = buildCislunarTrajectory(undefined, { ...baseOpts, is_return_trip: true });
      for (let i = 0; i < traj.phases.length - 1; i++) {
        expect(traj.phases[i].end_met_days).toBeCloseTo(traj.phases[i + 1].start_met_days, 9);
      }
      expect(traj.phases[0].start_met_days).toBe(0);
      expect(traj.phases[traj.phases.length - 1].end_met_days).toBeCloseTo(
        baseOpts.transit_days * 2,
        9,
      );
    });

    it('closest_approach_km equals R_MOON + periselene_km', () => {
      const profile: CislunarProfile = {
        source_tier: 'tier_1_analytic',
        lunar_arrival: { type: 'flyby', periselene_km: 9200 },
      };
      const traj = buildCislunarTrajectory(profile, baseOpts);
      expect(traj.closest_approach_km).toBe(R_MOON_KM + 9200);
    });

    it('moon_track samples the full mission duration', () => {
      const traj = buildCislunarTrajectory(undefined, { ...baseOpts, is_return_trip: true });
      for (const p of traj.moon_track) {
        expect(Math.hypot(p.x, p.y, p.z)).toBeCloseTo(A_MOON_KM, 3);
      }
      expect(traj.moon_track.length).toBeGreaterThan(2);
    });

    it('lunar_arrival.type=orbit produces a lunar_orbit phase', () => {
      const profile: CislunarProfile = {
        source_tier: 'tier_1_analytic',
        translunar: { type: 'free_return' },
        lunar_arrival: {
          type: 'orbit',
          altitude_km: 110,
          inclination_deg: 1.25,
          periselene_km: 110,
        },
        return: { type: 'tei_direct' },
      };
      const traj = buildCislunarTrajectory(profile, { ...baseOpts, is_return_trip: true });
      const types = traj.phases.map((p) => p.type);
      expect(types).toContain('parking');
      expect(types).toContain('tli_coast');
      expect(types).toContain('lunar_orbit');
      expect(types).toContain('tei_coast');
    });

    it('translunar.type=spiral produces a spiral_earth phase (no parking)', () => {
      const profile: CislunarProfile = {
        source_tier: 'tier_1_analytic',
        translunar: { type: 'spiral' },
        lunar_arrival: { type: 'orbit', altitude_km: 100, inclination_deg: 90, periselene_km: 100 },
      };
      const traj = buildCislunarTrajectory(profile, baseOpts);
      const types = traj.phases.map((p) => p.type);
      expect(types).toContain('spiral_earth');
      expect(types).toContain('spiral_lunar');
      expect(types).not.toContain('parking');
    });

    it('lunar_arrival.type=impact produces a descent phase ending on lunar surface', () => {
      const profile: CislunarProfile = {
        source_tier: 'tier_1_analytic',
        translunar: { type: 'direct' },
        lunar_arrival: { type: 'impact', periselene_km: 0 },
      };
      const traj = buildCislunarTrajectory(profile, baseOpts);
      const types = traj.phases.map((p) => p.type);
      expect(types).toContain('descent');
    });

    it('hybrid_free_return (Artemis II) renders tli_coast + tei_coast, no LOI', () => {
      const profile: CislunarProfile = {
        source_tier: 'tier_1_analytic',
        translunar: { type: 'hybrid_free_return' },
        lunar_arrival: { type: 'flyby', periselene_km: 9200 },
        return: { type: 'none' },
      };
      const traj = buildCislunarTrajectory(profile, { ...baseOpts, is_return_trip: true });
      const types = traj.phases.map((p) => p.type);
      expect(types).toContain('tli_coast');
      expect(types).toContain('tei_coast');
      expect(types).not.toContain('lunar_orbit');
      expect(traj.closest_approach_km).toBe(R_MOON_KM + 9200);
    });

    it('Tier 2 waypoints override parametric path when present', () => {
      const wp: Array<[number, number, number, number]> = [
        [0, R_EARTH_KM + 185, 0, 0],
        [2, 200000, 50000, 0],
        [4, A_MOON_KM, 0, 0],
        [6, 200000, -50000, 0],
        [8, -(R_EARTH_KM + 120), 0, 0],
      ];
      const profile: CislunarProfile = {
        source_tier: 'tier_1_5_hybrid',
        waypoints_km: wp,
      };
      const traj = buildCislunarTrajectory(profile, { ...baseOpts, is_return_trip: true });
      expect(traj.phases.length).toBe(1);
      expect(traj.phases[0].points.length).toBe(wp.length);
      expect(traj.phases[0].points[0]).toEqual({ x: wp[0][1], y: wp[0][2], z: wp[0][3] });
    });
  });

  // GH #107 — exported primitive for hybrid Tier 2 Apollo waypoint
  // interpolation. Anchors (NASA-published) carry reality; this fills
  // the gaps between with physics-correct samples.
  describe('keplerianArcEarthFocus (exported primitive for #107)', () => {
    it('starts at p1 and ends at p2 exactly (no FP drift on endpoints)', () => {
      const p1: Vec3Km = { x: 6678, y: 0, z: 0 }; // LEO ~300 km altitude
      const p2: Vec3Km = { x: 0, y: 0, z: 6678 }; // 90° around
      const pts = keplerianArcEarthFocus(p1, p2, 10);
      expect(pts[0]).toEqual(p1);
      expect(pts[pts.length - 1]).toEqual(p2);
    });

    it('returns steps + 1 samples', () => {
      const p1: Vec3Km = { x: 6678, y: 0, z: 0 };
      const p2: Vec3Km = { x: 0, y: 0, z: 384400 };
      for (const steps of [1, 5, 12, 50]) {
        expect(keplerianArcEarthFocus(p1, p2, steps).length).toBe(steps + 1);
      }
    });

    it('intermediate samples stay within both endpoint radii (no crashes into Earth, no escape past p2)', () => {
      // TLI-ellipse approximation: perigee 6,478 km, apogee 384,400 km.
      const p1: Vec3Km = { x: 6478, y: 0, z: 0 };
      const p2: Vec3Km = { x: -384400, y: 0, z: 0 };
      const pts = keplerianArcEarthFocus(p1, p2, 20);
      const r1 = Math.hypot(p1.x, p1.y, p1.z);
      const r2 = Math.hypot(p2.x, p2.y, p2.z);
      const rMin = Math.min(r1, r2);
      const rMax = Math.max(r1, r2);
      for (let i = 1; i < pts.length - 1; i++) {
        const r = Math.hypot(pts[i].x, pts[i].y, pts[i].z);
        // Mild tolerance — the arc is an ellipse with foci at Earth +
        // some second focus; semi-major = (r1 + r2) / 2 = 195,439 km.
        // Apsides can exceed both endpoint radii by a small amount.
        expect(r).toBeGreaterThanOrEqual(rMin * 0.99);
        expect(r).toBeLessThanOrEqual(rMax * 1.05);
      }
    });

    it('samples lie in the plane spanned by p1 and p2 (no out-of-plane drift)', () => {
      const p1: Vec3Km = { x: 6478, y: 0, z: 0 };
      const p2: Vec3Km = { x: -100000, y: 0, z: 350000 };
      const pts = keplerianArcEarthFocus(p1, p2, 15);
      // Normal to the (p1, p2, origin) plane is along ±y. Each sample's
      // y must be ~0 to lie in the plane.
      for (const p of pts) {
        expect(Math.abs(p.y)).toBeLessThan(1e-6);
      }
    });
  });
});
