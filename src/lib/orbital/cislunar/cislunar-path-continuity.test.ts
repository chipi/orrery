import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  buildCislunarTrajectory,
  cislunarEventTimes,
  moonEciPos,
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
