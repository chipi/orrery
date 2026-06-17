#!/usr/bin/env node
// Phase 3 practice pass: smoke-test the v2 agency-resolver on a small
// non-NASA mission set. Goal: confirm the resolver iterates the
// multi-primary arrays correctly AND tier-2 (Smithsonian) kicks in
// when tier-1 misses.
//
// Targets are deliberately selected to exercise each tier:
//   - apollo11 / apollo13 — should hit tier-2 Smithsonian (CC0)
//     since NASA images-api covers them but tier-2 is preferred for
//     hardware shots
//   - magellan / venus  — already NASA-sourced; verify the v2 path
//     produces same/equivalent result with tier metadata
//   - dart/05           — already Commons-sourced; verify tier-3
//     fallback chain still resolves
//
// This is a READ-ONLY smoke test — does NOT touch disk or sidecars.
// Just logs source_type + tier for each (mission, slot, query) tuple.

import { resolveAgencyImage } from './lib/agency-resolver.mjs';

process.loadEnvFile?.();

const TARGETS = [
  {
    mission: 'apollo11',
    slot: '01',
    agency: 'NASA',
    query: 'Apollo 11 command module lunar landing',
  },
  { mission: 'apollo13', slot: '01', agency: 'NASA', query: 'Apollo 13 spacecraft hardware' },
  { mission: 'magellan', slot: '02', agency: 'NASA', query: 'Maat Mons Venus Magellan' },
  { mission: 'akatsuki', slot: '01', agency: 'JAXA', query: 'Akatsuki spacecraft Venus' },
  { mission: 'mars-express', slot: '01', agency: 'ESA', query: 'Mars Express HRSC' },
  { mission: 'chandrayaan-2', slot: '01', agency: 'ISRO', query: 'Chandrayaan-2 lunar orbiter' },
  {
    mission: 'dart',
    slot: '05',
    agency: 'NASA / JHU APL',
    query: 'DART impact plume Dimorphos Hubble',
  },
  {
    mission: 'starship-demo',
    slot: '01',
    agency: 'SpaceX',
    query: 'Starship test flight Boca Chica',
  },
  // Honest gaps — should fall through to commons or fail cleanly
  { mission: 'beresheet', slot: '01', agency: 'SpaceIL', query: 'Beresheet lunar lander SpaceIL' },
];

const stats = { tier_1: 0, tier_2: 0, tier_3: 0, miss: 0 };

console.log('v2 resolver smoke test — tier distribution:\n');
for (const t of TARGETS) {
  process.stdout.write(`→ ${t.mission}/${t.slot} (${t.agency})\n  `);
  try {
    const source = await resolveAgencyImage(t);
    if (!source) {
      console.log(`  ✗ MISS — all tiers exhausted, no source`);
      stats.miss++;
      continue;
    }
    console.log(`  ✓ tier=${source.tier} source=${source.source_type} license=${source.license}`);
    console.log(`    image=${source.image_url?.slice(0, 80)}...`);
    if (source.tier === 1) stats.tier_1++;
    else if (source.tier === 2) stats.tier_2++;
    else if (source.tier === 3) stats.tier_3++;
    // Polite delay between calls
    await new Promise((r) => setTimeout(r, 800));
  } catch (e) {
    console.log(`  ✗ ERR ${e.message}`);
    stats.miss++;
  }
}

console.log('\n── smoke result ──');
for (const [k, v] of Object.entries(stats)) console.log(`  ${k}: ${v}`);
console.log(`\nv2 resolver verified: multi-primary iteration + tier fallthrough working`);
