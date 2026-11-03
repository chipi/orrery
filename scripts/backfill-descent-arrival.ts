/**
 * Backfill the EDL arrival fields on the landing missions from their descent
 * profiles (RFC-034 §12 · D7). The descent-profile registry stays the SINGLE
 * SOURCE OF TRUTH — this script DERIVES `flight.arrival.{entry_velocity_km_s,
 * edl_system, edl_duration_s, touchdown_velocity_ms}` from each profile
 * (src/lib/physics/descent/descent-arrival.ts) and merges them into the mission
 * JSON. Only missions whose values changed are rewritten; run Prettier on them
 * afterwards. RE-RUN after editing any descent profile — descent-arrival.test.ts
 * fails until you do:  `npx tsx scripts/backfill-descent-arrival.ts`
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  DESCENT_MISSION_IDS,
  type RawDescentProfile,
} from '../src/lib/physics/descent/descent-profile-registry';
import { arrivalMissionPath, deriveArrival } from '../src/lib/physics/descent/descent-arrival';

const ROOT = resolve(import.meta.dirname, '..');

let updated = 0;
const missing: string[] = [];

for (const id of DESCENT_MISSION_IDS) {
  const profilePath = resolve(ROOT, `static/data/descent-profiles/${id}.json`);
  if (!existsSync(profilePath)) {
    missing.push(`profile:${id}`);
    continue;
  }
  const raw = JSON.parse(readFileSync(profilePath, 'utf-8')) as RawDescentProfile;
  const rel = arrivalMissionPath(id, raw, (p) => existsSync(resolve(ROOT, p)));
  if (!rel) continue; // not a descent at the mission's destination (Earth capsules, Apollo 8 …)
  const mPath = resolve(ROOT, rel);
  const derived = deriveArrival(raw);
  const mission = JSON.parse(readFileSync(mPath, 'utf-8')) as {
    flight?: { arrival?: Record<string, unknown> };
  };
  mission.flight ??= {};
  mission.flight.arrival ??= {};
  const arr = mission.flight.arrival;
  const changed = Object.entries(derived).some(([k, v]) => arr[k] !== v);
  if (!changed) continue;
  Object.assign(arr, derived);
  writeFileSync(mPath, JSON.stringify(mission, null, 2) + '\n');
  console.log(`  updated ${id}`);
  updated++;
}

console.log(`backfill-descent-arrival: updated ${updated} missions.`);
if (missing.length) console.log(`  missing: ${missing.join(', ')}`);
