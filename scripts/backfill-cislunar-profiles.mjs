#!/usr/bin/env node
/**
 * Backfill Tier-1 cislunar_profile metadata on the 10 lunar missions
 * added in Tier A + Tier F (apollo8/10/12/14/15/16 + luna10 +
 * lunar-prospector + smart-1 + change1). Each gets:
 *   - parking_orbit (altitude_km, inclination_deg, revs)
 *   - tli (dv_kms, c3_km2_s2)
 *   - translunar.type (direct | free_return | hybrid_free_return | spiral)
 *   - lunar_arrival (type, altitude_km, inclination_deg, periselene_km)
 *   - return (type, dv_kms)
 *
 * Sourced from NASA Apollo Mission Reports + ESA / NPO Lavochkin /
 * CNSA / NASA press kits. Tier-1 parametric: /fly renders the phases
 * from this metadata without waypoints. Tier-1.5/2 waypoints (per
 * apollo11.json) remain a future ADR-058 follow-up — see PRD-026 §out
 * of scope.
 *
 * Re-runnable; overwrites cislunar_profile on each target.
 */
import { readFile, writeFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const MISSIONS_MOON = join(ROOT, 'static', 'data', 'missions', 'moon');

const PROFILES = {
  // Apollo crewed lunar — all Saturn V free-return-then-circularise.
  apollo8: {
    source_tier: 'tier_1_analytic',
    parking_orbit: { altitude_km: 191, inclination_deg: 32.5, revs: 1.5 },
    tli: { dv_kms: 3.05, c3_km2_s2: -1.7 },
    translunar: { type: 'free_return' },
    lunar_arrival: { type: 'orbit', altitude_km: 112, inclination_deg: 12, periselene_km: 112 },
    return: { type: 'tei_direct', dv_kms: 1.07 },
  },
  apollo10: {
    source_tier: 'tier_1_analytic',
    parking_orbit: { altitude_km: 191, inclination_deg: 32.5, revs: 1.5 },
    tli: { dv_kms: 3.05, c3_km2_s2: -1.7 },
    translunar: { type: 'free_return' },
    lunar_arrival: { type: 'orbit', altitude_km: 111, inclination_deg: 1.2, periselene_km: 14.5 },
    return: { type: 'tei_direct', dv_kms: 1.0 },
  },
  apollo12: {
    source_tier: 'tier_1_analytic',
    parking_orbit: { altitude_km: 185, inclination_deg: 32.5, revs: 1.5 },
    tli: { dv_kms: 3.05, c3_km2_s2: -1.7 },
    translunar: { type: 'free_return' },
    lunar_arrival: {
      type: 'orbit_and_land',
      altitude_km: 111,
      inclination_deg: 14.5,
      periselene_km: 111,
    },
    return: { type: 'tei_direct', dv_kms: 1.0 },
  },
  apollo14: {
    source_tier: 'tier_1_analytic',
    parking_orbit: { altitude_km: 188, inclination_deg: 31.1, revs: 1.5 },
    tli: { dv_kms: 3.05, c3_km2_s2: -1.7 },
    translunar: { type: 'hybrid_free_return' },
    lunar_arrival: {
      type: 'orbit_and_land',
      altitude_km: 111,
      inclination_deg: 14.4,
      periselene_km: 16.7,
    },
    return: { type: 'tei_direct', dv_kms: 1.0 },
  },
  apollo15: {
    source_tier: 'tier_1_analytic',
    parking_orbit: { altitude_km: 169, inclination_deg: 29.7, revs: 1.5 },
    tli: { dv_kms: 3.04, c3_km2_s2: -1.7 },
    translunar: { type: 'hybrid_free_return' },
    lunar_arrival: {
      type: 'orbit_and_land',
      altitude_km: 113,
      inclination_deg: 26,
      periselene_km: 17.7,
    },
    return: { type: 'tei_direct', dv_kms: 1.0 },
  },
  apollo16: {
    source_tier: 'tier_1_analytic',
    parking_orbit: { altitude_km: 167, inclination_deg: 32.5, revs: 1.5 },
    tli: { dv_kms: 3.05, c3_km2_s2: -1.7 },
    translunar: { type: 'hybrid_free_return' },
    lunar_arrival: {
      type: 'orbit_and_land',
      altitude_km: 108,
      inclination_deg: 10,
      periselene_km: 19.8,
    },
    return: { type: 'tei_direct', dv_kms: 1.0 },
  },
  // Robotic — direct translunar (Luna 10 + Prospector + Chang'e 1)
  // OR spiral (SMART-1's ion drive).
  luna10: {
    source_tier: 'tier_1_analytic',
    parking_orbit: { altitude_km: 200, inclination_deg: 51.8, revs: 1 },
    tli: { dv_kms: 3.1, c3_km2_s2: -1.5 },
    translunar: { type: 'direct' },
    lunar_arrival: { type: 'orbit', altitude_km: 350, inclination_deg: 71.9, periselene_km: 350 },
    return: { type: 'none' },
  },
  'lunar-prospector': {
    source_tier: 'tier_1_analytic',
    parking_orbit: { altitude_km: 200, inclination_deg: 28.5, revs: 1 },
    tli: { dv_kms: 3.1, c3_km2_s2: -1.5 },
    translunar: { type: 'direct' },
    lunar_arrival: { type: 'orbit', altitude_km: 100, inclination_deg: 90, periselene_km: 100 },
    return: { type: 'none' },
  },
  'smart-1': {
    source_tier: 'tier_1_analytic',
    parking_orbit: { altitude_km: 656, inclination_deg: 7.0, revs: 1 },
    tli: { dv_kms: 0 },
    translunar: { type: 'spiral' },
    lunar_arrival: { type: 'orbit', altitude_km: 470, inclination_deg: 90, periselene_km: 470 },
    return: { type: 'none' },
  },
  change1: {
    source_tier: 'tier_1_analytic',
    parking_orbit: { altitude_km: 600, inclination_deg: 31, revs: 3 },
    tli: { dv_kms: 3.1, c3_km2_s2: -1.5 },
    translunar: { type: 'direct' },
    lunar_arrival: { type: 'orbit', altitude_km: 200, inclination_deg: 90, periselene_km: 200 },
    return: { type: 'none' },
  },
};

async function main() {
  for (const [id, profile] of Object.entries(PROFILES)) {
    const path = join(MISSIONS_MOON, id + '.json');
    const obj = JSON.parse(await readFile(path, 'utf8'));
    obj.flight = obj.flight || {};
    obj.flight.cislunar_profile = profile;
    await writeFile(path, JSON.stringify(obj, null, 2) + '\n');
    console.log('✓ ' + id);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
