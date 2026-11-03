/**
 * Every lander's `flight.arrival` EDL fields must equal what its descent profile derives
 * (the profile is the single source of truth). Fails when a profile is edited and the
 * mission's copy is not re-derived: run `npx tsx scripts/backfill-descent-arrival.ts`.
 */

import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { describe, it, expect, vi } from 'vitest';
import { DESCENT_MISSION_IDS, type RawDescentProfile } from './descent-profile-registry';
import { arrivalMissionPath, deriveArrival } from './descent-arrival';

// Each case runs one full descent integration (same budget as descent-profiles.test.ts).
vi.setConfig({ testTimeout: 30_000 });

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../');

const cases = [...DESCENT_MISSION_IDS].flatMap((id) => {
  const profile = resolve(ROOT, `static/data/descent-profiles/${id}.json`);
  if (!existsSync(profile)) return [];
  const raw = JSON.parse(readFileSync(profile, 'utf-8')) as RawDescentProfile;
  const mission = arrivalMissionPath(id, raw, (p) => existsSync(resolve(ROOT, p)));
  return mission ? [[id, profile, resolve(ROOT, mission)] as const] : [];
});

describe('lander arrival fields match their descent profiles', () => {
  it('covers the landers', () => {
    expect(cases.length).toBeGreaterThan(30);
  });

  it.each(cases)('%s', (_id, profilePath, missionPath) => {
    const derived = deriveArrival(
      JSON.parse(readFileSync(profilePath, 'utf-8')) as RawDescentProfile,
    );
    const arrival = (
      JSON.parse(readFileSync(missionPath, 'utf-8')) as {
        flight?: { arrival?: Record<string, unknown> };
      }
    ).flight?.arrival;
    expect({
      entry_velocity_km_s: arrival?.entry_velocity_km_s,
      edl_system: arrival?.edl_system,
      edl_duration_s: arrival?.edl_duration_s,
      touchdown_velocity_ms: arrival?.touchdown_velocity_ms,
    }).toEqual(derived);
  });
});
