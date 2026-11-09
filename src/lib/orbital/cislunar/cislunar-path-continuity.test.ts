import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  buildCislunarTrajectory,
  cislunarEventTimes,
  moonEciPos,
  smoothPhasePoints,
  SMOOTH_SAMPLES_PER_SEGMENT,
  type CislunarProfile,
} from './cislunar-geometry';

const DIR = join(process.cwd(), 'static/data/missions/moon');

interface MoonMission {
  id: string;
  transit_days: number;
  departure_date?: string;
  flight?: {
    cislunar_profile?: CislunarProfile;
    events?: { type?: string; met_days?: number | null }[];
  };
}

const missions: MoonMission[] = readdirSync(DIR)
  .filter((f) => f.endsWith('.json') && f !== 'index.json')
  .map((f) => JSON.parse(readFileSync(join(DIR, f), 'utf8')) as MoonMission)
  .filter((m) => (m.flight?.cislunar_profile?.waypoints_km?.length ?? 0) >= 2);

// A trans-Earth leg leaves the Moon. A first point left at the Moon's position from the arrival
// day, while the Moon has since moved on, draws a straight 100,000+ km chord across the plot
// (Apollo 11: 245,000 km, 40 degrees) that no spacecraft flew.
const MAX_LEAVE_MOON_KM = 20_000;

describe('cislunar waypoint trajectories — the trip home starts on the Moon', () => {
  it('covers the catalogue (guards against the glob matching nothing)', () => {
    expect(missions.length).toBeGreaterThan(25);
  });

  for (const m of missions) {
    it(`${m.id}: every tei_coast starts at the Moon's position at its start time`, () => {
      const profile = m.flight!.cislunar_profile!;
      const dep = 0;
      const ct = buildCislunarTrajectory(profile, {
        dep_day_sim: dep,
        transit_days: m.transit_days,
        is_return_trip: true,
        events: cislunarEventTimes(m.flight!.events as never),
      });
      for (const ph of ct.phases.filter((p) => p.type === 'tei_coast')) {
        const moon = moonEciPos(dep + ph.start_met_days);
        const p = ph.points[0];
        const gap = Math.hypot(p.x - moon.x, p.y - moon.y, p.z - moon.z);
        expect(gap, `${m.id} tei_coast starts ${Math.round(gap)} km from the Moon`).toBeLessThan(
          MAX_LEAVE_MOON_KM,
        );
      }
    });
  }
});

describe('cislunar waypoint trajectories — drawn smooth', () => {
  it('smoothPhasePoints passes through every authored point and keeps the ends', () => {
    const raw = [
      { x: 0, y: 0, z: 0 },
      { x: 10, y: 0, z: 5 },
      { x: 20, y: 0, z: 0 },
      { x: 30, y: 0, z: -5 },
    ];
    const s = smoothPhasePoints(raw);
    expect(s.length).toBe((raw.length - 1) * SMOOTH_SAMPLES_PER_SEGMENT + 1);
    raw.forEach((p, i) => {
      const q = s[i * SMOOTH_SAMPLES_PER_SEGMENT];
      expect(Math.hypot(q.x - p.x, q.y - p.y, q.z - p.z)).toBeLessThan(1e-6);
    });
  });

  it('a long hop between short ones does not overshoot', () => {
    const raw = [
      { x: 0, y: 0, z: 0 },
      { x: 1000, y: 0, z: 0 },
      { x: 2000, y: 0, z: 800 },
      { x: 400000, y: 0, z: 0 },
      { x: 400500, y: 0, z: 100 },
    ];
    const s = smoothPhasePoints(raw);
    expect(Math.max(...s.map((p) => p.x))).toBeLessThanOrEqual(400500);
  });

  for (const m of missions) {
    it(`${m.id}: the trip home turns no more than 30 degrees between drawn samples`, () => {
      const ct = buildCislunarTrajectory(m.flight!.cislunar_profile!, {
        dep_day_sim: 0,
        transit_days: m.transit_days,
        is_return_trip: true,
        events: cislunarEventTimes(m.flight!.events as never),
      });
      for (const ph of ct.phases.filter((p) => p.type === 'tei_coast')) {
        const P = ph.points;
        let worst = 0;
        for (let i = 1; i < P.length - 1; i++) {
          const a = [P[i].x - P[i - 1].x, P[i].z - P[i - 1].z];
          const b = [P[i + 1].x - P[i].x, P[i + 1].z - P[i].z];
          const la = Math.hypot(a[0], a[1]);
          const lb = Math.hypot(b[0], b[1]);
          if (la < 1 || lb < 1) continue;
          const c = Math.max(-1, Math.min(1, (a[0] * b[0] + a[1] * b[1]) / (la * lb)));
          worst = Math.max(worst, (Math.acos(c) * 180) / Math.PI);
        }
        expect(worst, `${m.id} tei_coast corner ${worst.toFixed(0)} deg`).toBeLessThanOrEqual(30);
      }
    });
  }
});

// Drawn at 8 samples per authored segment, no hop of the trip home may exceed this. Before the
// smoothing the longest straight chords were 60,000 to 250,000 km (Apollo 11) and
// 245,000 km before it.
const MAX_DRAWN_CHORD_KM = 45_000;

describe('cislunar waypoint trajectories — no long straight chord is drawn', () => {
  for (const m of missions) {
    it(`${m.id}: the trip home has no drawn chord over ${MAX_DRAWN_CHORD_KM} km`, () => {
      const ct = buildCislunarTrajectory(m.flight!.cislunar_profile!, {
        dep_day_sim: 0,
        transit_days: m.transit_days,
        is_return_trip: true,
        events: cislunarEventTimes(m.flight!.events as never),
      });
      for (const ph of ct.phases.filter((p) => p.type === 'tei_coast')) {
        let longest = 0;
        for (let i = 1; i < ph.points.length; i++) {
          const a = ph.points[i - 1];
          const b = ph.points[i];
          longest = Math.max(longest, Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z));
        }
        expect(longest, `${m.id} tei_coast chord ${Math.round(longest)} km`).toBeLessThan(
          MAX_DRAWN_CHORD_KM,
        );
      }
    });
  }
});

// The Moon is 384,400 km away; Earth-orbit raising and the stay at the Moon stay inside this. The
// old Chandrayaan-3 waypoints held the craft at 760,637 km for 40 days.
const MAX_CRAFT_KM = 420_000;

describe('cislunar waypoint trajectories — the craft stays near the Earth-Moon system', () => {
  for (const m of missions) {
    it(`${m.id}: no authored waypoint is farther than ${MAX_CRAFT_KM} km from Earth`, () => {
      const far = m.flight!.cislunar_profile!.waypoints_km!.filter(
        ([, x, y, z]) => Math.hypot(x, y, z) > MAX_CRAFT_KM,
      );
      expect(far.length, `${m.id}: ${far.length} waypoints beyond ${MAX_CRAFT_KM} km`).toBe(0);
    });
  }
});

describe('cislunar waypoint trajectories — the craft is never inside the Earth', () => {
  for (const m of missions) {
    it(`${m.id}: no authored waypoint is closer than one Earth radius to Earth's centre`, () => {
      const inside = m.flight!.cislunar_profile!.waypoints_km!.filter(
        ([, x, y, z]) => Math.hypot(x, y, z) < 6378,
      );
      expect(inside.length, `${m.id}: ${inside.length} waypoints inside the Earth`).toBe(0);
    });
  }
});
