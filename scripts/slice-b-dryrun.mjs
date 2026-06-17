#!/usr/bin/env node
// Slice B dry-run — resolve 9 known-Commons slots through the v2
// chain (Tier 1 agency primaries → Tier 2 institutional → Tier 3
// Commons). READ-ONLY: logs what each tier would produce, NO disk
// writes, NO sidecar mutations.
//
// Targets are the slots that landed on `wikimedia-commons` in the
// session-end audit and might find better attribution now that
// Smithsonian Open Access + NARA RG 255 are wired into the resolver.

import { readFileSync } from 'fs';
import { resolveAgencyImage } from './lib/agency-resolver.mjs';

// Node 20.6+ loads .env automatically; SI_API_KEY / NARA_API_KEY
// (if set) unlock the Tier 2 lanes. See `.env.example` for setup.
process.loadEnvFile?.();

const TARGETS = [
  { mission: 'hayabusa', slot: '02', agency: 'JAXA / NASA', surface: 'fleet-galleries', query: 'Itokawa asteroid Hayabusa close-up' },
  { mission: 'hayabusa', slot: '03', agency: 'JAXA / NASA', surface: 'fleet-galleries', query: 'Hayabusa spacecraft asteroid sample-return' },
  { mission: 'hayabusa', slot: '04', agency: 'JAXA / NASA', surface: 'fleet-galleries', query: 'Hayabusa sample return capsule Australia 2010' },
  { mission: 'hayabusa', slot: '05', agency: 'JAXA / NASA', surface: 'fleet-galleries', query: 'M-V rocket launch JAXA Hayabusa' },
  { mission: 'solar-orbiter', slot: '03', agency: 'ESA / NASA', surface: 'fleet-galleries', query: 'Solar Orbiter EUI ultraviolet Sun corona' },
  { mission: 'solar-orbiter', slot: '05', agency: 'ESA / NASA', surface: 'fleet-galleries', query: 'Solar Orbiter Atlas V launch Cape Canaveral 2020' },
  { mission: 'dart', slot: '02', agency: 'NASA / JHU APL', surface: 'missions', query: 'DART Dimorphos final image before impact' },
  { mission: 'dart', slot: '05', agency: 'NASA / JHU APL', surface: 'missions', query: 'DART impact plume Webb Hubble Dimorphos' },
  { mission: 'apollo11', slot: '01', agency: 'NASA', surface: 'missions', query: 'Apollo 11 Command Module Columbia' },
];

function loadSidecarEntry(t) {
  const path = t.surface === 'fleet-galleries'
    ? 'static/data/fleet-image-sources.json'
    : 'static/data/mission-image-sources.json';
  const key = t.surface === 'fleet-galleries'
    ? `${t.mission}/${t.slot}.jpg`
    : `${t.mission}/${t.slot}`;
  try {
    const data = JSON.parse(readFileSync(path, 'utf8'));
    return data[key];
  } catch {
    return null;
  }
}

console.log('Slice B dry-run — v2 resolver vs current sidecar source\n');
console.log('mission/slot              | current source        | proposed tier  | proposed source');
console.log('-'.repeat(110));

const summary = { tier1_new: 0, tier2_new: 0, tier3_same: 0, miss: 0 };

for (const t of TARGETS) {
  const current = loadSidecarEntry(t);
  const currentSource = current?.source_type ?? '(none)';
  process.stdout.write(`${t.mission}/${t.slot}`.padEnd(26) + ` | ${currentSource.padEnd(20)} | `);
  try {
    const resolved = await resolveAgencyImage({
      mission: t.mission, slot: t.slot, agency: t.agency, query: t.query,
    });
    if (!resolved) {
      console.log('MISS                                ');
      summary.miss++;
      continue;
    }
    const tierStr = `tier ${resolved.tier}`.padEnd(14);
    console.log(`${tierStr} | ${resolved.source_type} (${resolved.license})`);
    // Score the change
    if (currentSource === 'wikimedia-commons') {
      if (resolved.tier === 1) summary.tier1_new++;
      else if (resolved.tier === 2) summary.tier2_new++;
      else summary.tier3_same++;
    }
    // Polite delay
    await new Promise((r) => setTimeout(r, 600));
  } catch (e) {
    console.log(`ERR ${e.message}`);
    summary.miss++;
  }
}

console.log('\n── dry-run summary ──');
console.log(`  Commons → Tier 1 upgrade: ${summary.tier1_new}`);
console.log(`  Commons → Tier 2 upgrade: ${summary.tier2_new}`);
console.log(`  Commons → Tier 3 (no improvement): ${summary.tier3_same}`);
console.log(`  Miss (no source from any tier): ${summary.miss}`);
console.log('\nNothing was written. Re-run with a separate apply script to commit.');
