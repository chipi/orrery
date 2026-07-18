/**
 * Backfill the EDL arrival fields on the 37 landing missions from their descent
 * profiles (RFC-034 §12 · D7). The descent-profile registry stays the SINGLE
 * SOURCE OF TRUTH — this script DERIVES `flight.arrival.{entry_velocity_km_s,
 * edl_system, edl_duration_s, touchdown_velocity_ms}` from each profile and
 * merges them into the mission JSON, so the mission data model records the EDL
 * facts without hand-typing (and without drifting). RE-RUN after editing any
 * descent profile:  `npx tsx scripts/backfill-descent-arrival.ts`
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  expandDescentProfile,
  DESCENT_MISSION_IDS,
  type RawDescentProfile,
  type ArchetypeName,
} from '../src/lib/orbital/descent-profile-registry';
import { integrateDescent } from '../src/lib/orbital/descent-physics';
import type { EDLSystemKind } from '../src/types/mission';

const ROOT = resolve(import.meta.dirname, '..');
const BODIES = ['moon', 'mars', 'venus'];

const EDL_SYSTEM: Record<ArchetypeName, EDLSystemKind> = {
  LUNAR_POWERED: 'powered',
  LUNA_DIRECT_IMPACT: 'direct_impact',
  MARS_PARACHUTE_RETRO: 'parachute_retro',
  MARS_AIRBAG: 'airbag',
  MARS_SKYCRANE: 'skycrane',
  MARS_PROPULSIVE: 'powered',
  VENUS_AEROSHELL: 'aeroshell',
  ASTEROID_TOUCH_AND_GO: 'touch_and_go',
  COMET_HARPOON: 'harpoon',
  TITAN_PARACHUTE: 'aeroshell',
  JUPITER_PROBE: 'atmospheric_probe',
};

function missionPath(id: string): string | null {
  for (const b of BODIES) {
    const p = resolve(ROOT, `static/data/missions/${b}/${id}.json`);
    if (existsSync(p)) return p;
  }
  return null;
}

let updated = 0;
const missing: string[] = [];

for (const id of DESCENT_MISSION_IDS) {
  const profilePath = resolve(ROOT, `static/data/descent-profiles/${id}.json`);
  if (!existsSync(profilePath)) {
    missing.push(`profile:${id}`);
    continue;
  }
  const raw = JSON.parse(readFileSync(profilePath, 'utf-8')) as RawDescentProfile;
  const summary = integrateDescent(expandDescentProfile(raw));

  const mPath = missionPath(id);
  if (!mPath) {
    missing.push(`mission:${id}`);
    continue;
  }
  const mission = JSON.parse(readFileSync(mPath, 'utf-8')) as {
    flight?: { arrival?: Record<string, unknown> };
  };
  mission.flight ??= {};
  mission.flight.arrival ??= {};
  const arr = mission.flight.arrival;
  arr.entry_velocity_km_s = Number((raw.entryState.velocityMs / 1000).toFixed(3));
  arr.edl_system = EDL_SYSTEM[raw.archetype];
  arr.edl_duration_s = Math.round(summary.totalDurationS);
  arr.touchdown_velocity_ms = Number(summary.touchdownVelocityMs.toFixed(2));

  writeFileSync(mPath, JSON.stringify(mission, null, 2) + '\n');
  updated++;
}

console.log(`backfill-descent-arrival: updated ${updated} missions.`);
if (missing.length) console.log(`  missing: ${missing.join(', ')}`);
