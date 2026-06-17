#!/usr/bin/env node
// Slice A generic dry-run — runs the v2 resolver against every Tier 3
// provenance entry whose agency matches the given --agency=<token>.
// READ-ONLY: no disk writes to images/sidecars, only a per-run JSON
// payload + stdout summary. Same shape as slice-a-1-nasa-dryrun.mjs
// (which it supersedes) but parameterised by agency.
//
// Usage:
//   node scripts/slice-a-dryrun.mjs --agency=NASA       # A-1
//   node scripts/slice-a-dryrun.mjs --agency=Roscosmos  # A-2
//   node scripts/slice-a-dryrun.mjs --agency=ESA        # A-3
//   node scripts/slice-a-dryrun.mjs --agency=JAXA       # A-4
//
// Optional:
//   --limit=<N>   — cap candidates (debug)
//   --throttle=600 — ms between API calls
//
// Agency matching is token-based: an entry with agency
// "ESA / NASA" matches --agency=ESA AND --agency=NASA — runs both
// sub-slices won't double-process because each run filters then
// resolves; you'd just dedup at apply time.

import { readFileSync, writeFileSync } from 'fs';
import { resolveAgencyImage } from './lib/agency-resolver.mjs';

process.loadEnvFile?.();

// ── CLI parsing ────────────────────────────────────────────────────

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const m = a.match(/^--([^=]+)=(.+)$/);
    return m ? [m[1], m[2]] : [a.replace(/^-+/, ''), true];
  }),
);
const TARGET_AGENCY = args.agency;
if (!TARGET_AGENCY) {
  console.error('usage: slice-a-dryrun.mjs --agency=<token> [--limit=N] [--throttle=600]');
  process.exit(2);
}
const LIMIT = args.limit ? parseInt(args.limit, 10) : Infinity;
const THROTTLE = args.throttle ? parseInt(args.throttle, 10) : 600;

// ── Load data ──────────────────────────────────────────────────────

const PROV = JSON.parse(readFileSync('static/data/image-provenance.json', 'utf8'));
const MISSIONS = JSON.parse(readFileSync('static/data/missions/index.json', 'utf8'));
const FLEET = JSON.parse(readFileSync('static/data/fleet/index.json', 'utf8'));

const AGENCY_BY_ID = {};
for (const m of MISSIONS) if (m.id) AGENCY_BY_ID[m.id] = m.agency ?? '?';
for (const f of FLEET) if (f.id && !AGENCY_BY_ID[f.id]) AGENCY_BY_ID[f.id] = f.agency ?? '?';

function tierOf(sourceType) {
  if (!sourceType) return null;
  if (sourceType === 'nasa-image-library' || sourceType === 'nasa-images-api') return 1;
  if (sourceType === 'wikimedia-commons' || sourceType === 'direct-other') return 3;
  return 2;
}

function agencyMatches(agencyStr, target) {
  return (agencyStr || '')
    .split(/[\/\,·&]/)
    .map((s) => s.trim())
    .some((t) => t === target);
}

// ── Candidate filter ───────────────────────────────────────────────

const CANDIDATES = [];
for (const entry of PROV.entries) {
  const path = entry.path || '';
  if (!path.match(/\.jpg$/i) || path.match(/\.1x1\.jpg$/i)) continue;
  const m = path.match(/\/images\/(missions|fleet-galleries)\/([^/]+)\/(\d+)\.jpg$/i);
  if (!m) continue;
  const [, surface, missionId, slot] = m;
  const agency = AGENCY_BY_ID[missionId] ?? entry.agency ?? '?';
  if (!agencyMatches(agency, TARGET_AGENCY)) continue;
  if (tierOf(entry.source_type) !== 3) continue;
  CANDIDATES.push({ surface, missionId, slot, agency, currentSource: entry.source_type, path });
  if (CANDIDATES.length >= LIMIT) break;
}

console.log(`Slice A dry-run — agency=${TARGET_AGENCY}`);
console.log(`Candidates: ${CANDIDATES.length} Tier 3 entries matching agency=${TARGET_AGENCY}\n`);

// ── Resolver loop ──────────────────────────────────────────────────

const proposals = [];
const stats = { tier1_upgrade: 0, tier2_upgrade: 0, no_change: 0, miss: 0 };

for (let i = 0; i < CANDIDATES.length; i++) {
  const c = CANDIDATES[i];
  // Minimal proper-noun query — mission id with dashes/underscores → spaces.
  const query = c.missionId.replace(/[-_]+/g, ' ');
  let result;
  try {
    result = await resolveAgencyImage({
      mission: c.missionId, slot: c.slot, agency: c.agency, query,
    });
  } catch (e) {
    proposals.push({ ...c, query, proposed: null, error: e.message });
    stats.miss++;
    continue;
  }
  proposals.push({
    ...c, query,
    proposed: result
      ? { tier: result.tier, source_type: result.source_type, image_url: result.image_url, credit: result.credit, license: result.license }
      : null,
  });
  if (!result) stats.miss++;
  else if (result.tier === 1) stats.tier1_upgrade++;
  else if (result.tier === 2) stats.tier2_upgrade++;
  else stats.no_change++;

  if (i % 25 === 24) {
    console.log(`  …${i + 1}/${CANDIDATES.length} (T1 ${stats.tier1_upgrade}, T2 ${stats.tier2_upgrade}, T3 ${stats.no_change}, miss ${stats.miss})`);
  }
  await new Promise((r) => setTimeout(r, THROTTLE));
}

// ── Output ─────────────────────────────────────────────────────────

const slug = TARGET_AGENCY.toLowerCase().replace(/[^a-z0-9]+/g, '-');
const outPath = `static/data/slice-a-${slug}-dryrun.json`;
writeFileSync(outPath, JSON.stringify({
  agency: TARGET_AGENCY,
  totals: stats,
  candidate_count: CANDIDATES.length,
  proposals,
}, null, 2) + '\n');

console.log('\n── result ──');
console.log(`  Tier 1 upgrade:           ${stats.tier1_upgrade}`);
console.log(`  Tier 2 upgrade:           ${stats.tier2_upgrade}`);
console.log(`  No change (still T3):     ${stats.no_change}`);
console.log(`  Miss / error:             ${stats.miss}`);
console.log(`  Total evaluated:          ${CANDIDATES.length}`);
console.log(`\nFull payload: ${outPath}`);
