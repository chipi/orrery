#!/usr/bin/env node
// Slice A-1 — NASA backfill dry-run.
//
// Identifies every provenance entry where source_type is currently
// Tier 3 (wikimedia-commons / direct-other) AND the entry's agency
// is NASA (or contains "NASA" as a token, including multi-agency).
// Resolves each through the v2 chain with the relevance gate active
// and a minimal mission-id query. Reports per-entry proposed tier.
//
// READ-ONLY: no disk writes, no sidecar mutations. Output is a JSON
// payload + a stdout summary so we can decide whether to apply.

import { readFileSync, writeFileSync } from 'fs';
import { resolveAgencyImage } from './lib/agency-resolver.mjs';

process.loadEnvFile?.();

const PROV = JSON.parse(readFileSync('static/data/image-provenance.json', 'utf8'));
const MISSIONS = JSON.parse(readFileSync('static/data/missions/index.json', 'utf8'));
const FLEET = JSON.parse(readFileSync('static/data/fleet/index.json', 'utf8'));

// Build id -> agency lookup
const AGENCY_BY_ID = {};
for (const m of MISSIONS) if (m.id) AGENCY_BY_ID[m.id] = m.agency ?? '?';
for (const f of FLEET) if (f.id && !AGENCY_BY_ID[f.id]) AGENCY_BY_ID[f.id] = f.agency ?? '?';

function tierOf(sourceType) {
  if (!sourceType) return null;
  if (sourceType === 'nasa-image-library' || sourceType === 'nasa-images-api') return 1;
  if (sourceType === 'wikimedia-commons' || sourceType === 'direct-other') return 3;
  return 2;
}

function isNasaAgency(agencyStr) {
  return (agencyStr || '')
    .split(/[/,·&]/)
    .map((s) => s.trim())
    .some((t) => t === 'NASA');
}

// Select candidates: tier 3 + agency contains NASA + has a .jpg (skip
// .1x1.jpg crops — they share the same source as the base file).
const CANDIDATES = [];
for (const entry of PROV.entries) {
  const path = entry.path || '';
  if (!path.match(/\.jpg$/i) || path.match(/\.1x1\.jpg$/i)) continue;
  const m = path.match(/\/images\/(missions|fleet-galleries)\/([^/]+)\/(\d+)\.jpg$/i);
  if (!m) continue;
  const [, surface, missionId, slot] = m;
  const agency = AGENCY_BY_ID[missionId] ?? entry.agency ?? '?';
  if (!isNasaAgency(agency)) continue;
  if (tierOf(entry.source_type) !== 3) continue;
  CANDIDATES.push({ surface, missionId, slot, agency, currentSource: entry.source_type, path });
}

console.log(`Candidates: ${CANDIDATES.length} NASA-agency Tier 3 entries\n`);

const proposals = [];
const stats = { tier1_upgrade: 0, tier2_upgrade: 0, no_change: 0, miss: 0 };

for (let i = 0; i < CANDIDATES.length; i++) {
  const c = CANDIDATES[i];
  // Minimal query: just the mission ID (proper-noun pattern per Marko's
  // smart-query rule — avoids generic words the agency wouldn't translate).
  const query = c.missionId.replace(/[-_]+/g, ' ');
  let result;
  try {
    result = await resolveAgencyImage({
      mission: c.missionId,
      slot: c.slot,
      agency: c.agency,
      query,
    });
  } catch (e) {
    console.log(`  ✗ ${c.path}: ${e.message}`);
    stats.miss++;
    proposals.push({ ...c, query, proposed: null, error: e.message });
    continue;
  }
  const _proposedTier = result?.tier ?? null;
  proposals.push({
    ...c,
    query,
    proposed: result
      ? {
          tier: result.tier,
          source_type: result.source_type,
          image_url: result.image_url,
          credit: result.credit,
          license: result.license,
        }
      : null,
  });
  if (!result) stats.miss++;
  else if (result.tier === 1) stats.tier1_upgrade++;
  else if (result.tier === 2) stats.tier2_upgrade++;
  else stats.no_change++; // still tier 3

  if (i % 25 === 24)
    console.log(
      `  …${i + 1}/${CANDIDATES.length} (T1 ${stats.tier1_upgrade}, T2 ${stats.tier2_upgrade}, T3 ${stats.no_change}, miss ${stats.miss})`,
    );
  await new Promise((r) => setTimeout(r, 600));
}

writeFileSync(
  'static/data/slice-a-1-dryrun.json',
  JSON.stringify({ generated_at: 'see commit', totals: stats, proposals }, null, 2) + '\n',
);

console.log('\n── Slice A-1 dry-run result ──');
console.log(`  Tier 1 upgrade proposed:    ${stats.tier1_upgrade}`);
console.log(`  Tier 2 upgrade proposed:    ${stats.tier2_upgrade}`);
console.log(`  No change (still Tier 3):   ${stats.no_change}`);
console.log(`  Miss / error:               ${stats.miss}`);
console.log(`  TOTAL evaluated:            ${proposals.length}`);
console.log(`\nFull payload: static/data/slice-a-1-dryrun.json`);
console.log('Next: review proposals, then run slice-a-1-apply.mjs (separate script).');
