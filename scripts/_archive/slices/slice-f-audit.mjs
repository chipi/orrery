#!/usr/bin/env node
// Slice F audit — per-mission/agency tier distribution with the v2
// chain in mind. READ-ONLY: classifies every existing provenance
// entry by source_type → tier, aggregates per-agency, and surfaces
// the Commons-skew (entries on Tier 3 where Tier 1 / Tier 2 should
// be available).
//
// No API calls — pure analysis of static/data/image-provenance.json
// + sidecars + missions/index.json.

import { readFileSync } from 'fs';

const PROV = JSON.parse(readFileSync('static/data/image-provenance.json', 'utf8'));
const MISSIONS = JSON.parse(readFileSync('static/data/missions/index.json', 'utf8'));
const FLEET = JSON.parse(readFileSync('static/data/fleet/index.json', 'utf8'));
const REGISTRY = JSON.parse(readFileSync('static/data/agency-archives.json', 'utf8'));

// Map source_type -> tier (1/2/3/null=legacy unknown)
function tierOf(sourceType) {
  if (!sourceType) return null;
  if (sourceType === 'nasa-image-library' || sourceType === 'nasa-images-api') return 1;
  if (sourceType.startsWith('wikimedia-grandfathered-')) return 1;
  if (
    sourceType === 'jaxa' ||
    sourceType === 'esa' ||
    sourceType === 'isro' ||
    sourceType === 'jhu-apl' ||
    sourceType === 'asi'
  )
    return 1;
  if (
    sourceType === 'smithsonian-openaccess' ||
    sourceType === 'nara-rg-255' ||
    sourceType === 'eso-public'
  )
    return 2;
  if (sourceType === 'wikimedia-commons') return 3;
  if (sourceType === 'direct-other') return 3;
  return null;
}

// Build agency lookup: id -> agency. Both missions/index.json and
// fleet/index.json contribute IDs — fleet entries (a7l, antares,
// ariane-*, atlantis, atv, etc.) wouldn't otherwise be found.
const AGENCY_BY_ID = {};
for (const m of MISSIONS) {
  if (m.id) AGENCY_BY_ID[m.id] = m.agency ?? '?';
}
for (const f of FLEET) {
  if (f.id && !AGENCY_BY_ID[f.id]) AGENCY_BY_ID[f.id] = f.agency ?? '?';
}

// Aggregate stats
const perAgency = new Map(); // agency -> { t1, t2, t3, legacy, total }
const perMission = new Map(); // mission_id -> same shape
const totalsByTier = { 1: 0, 2: 0, 3: 0, legacy: 0 };

function bump(map, key, tier) {
  const row = map.get(key) ?? { t1: 0, t2: 0, t3: 0, legacy: 0, total: 0 };
  row.total++;
  if (tier === 1) row.t1++;
  else if (tier === 2) row.t2++;
  else if (tier === 3) row.t3++;
  else row.legacy++;
  map.set(key, row);
}

for (const entry of PROV.entries) {
  const path = entry.path || '';
  const m = path.match(/\/images\/(missions|fleet-galleries)\/([^/]+)\//);
  if (!m) continue;
  const missionId = m[2];
  const agency = AGENCY_BY_ID[missionId] ?? entry.agency ?? '?';
  const tier = tierOf(entry.source_type);
  if (tier === 1) totalsByTier[1]++;
  else if (tier === 2) totalsByTier[2]++;
  else if (tier === 3) totalsByTier[3]++;
  else totalsByTier.legacy++;
  bump(perAgency, agency, tier);
  bump(perMission, missionId, tier);
}

const grand = totalsByTier[1] + totalsByTier[2] + totalsByTier[3] + totalsByTier.legacy;

console.log('── Slice F audit — v2 tier distribution ──\n');
console.log(`Total provenance entries: ${grand}\n`);

console.log('Global distribution:');
console.log(
  `  Tier 1 (agency primary):     ${totalsByTier[1].toString().padStart(5)}  (${pct(totalsByTier[1], grand)}%)`,
);
console.log(
  `  Tier 2 (institutional):      ${totalsByTier[2].toString().padStart(5)}  (${pct(totalsByTier[2], grand)}%)`,
);
console.log(
  `  Tier 3 (Commons failover):   ${totalsByTier[3].toString().padStart(5)}  (${pct(totalsByTier[3], grand)}%)`,
);
console.log(
  `  Legacy / untyped:            ${totalsByTier.legacy.toString().padStart(5)}  (${pct(totalsByTier.legacy, grand)}%)`,
);

function pct(n, total) {
  if (!total) return '0.0';
  return ((n / total) * 100).toFixed(1).padStart(4);
}

console.log('\n\nPer-agency distribution (sorted by Commons-skew %):');
console.log(
  'agency                                  total  T1    T2    T3   legacy  T3%   t1-avail',
);

// Agency Tier 1 availability map (from registry)
const t1AvailableFor = new Set();
for (const [k, v] of Object.entries(REGISTRY.tier_1_agencies ?? {})) {
  if (v.auto_fetch_disabled) continue;
  t1AvailableFor.add(k);
}
function hasT1(agencyStr) {
  // Token-split & test against registry
  const tokens = (agencyStr || '').split(/[/,·&]/).map((s) => s.trim());
  return tokens.some((t) => t1AvailableFor.has(t));
}

const agencyRows = [...perAgency.entries()]
  .map(([a, r]) => ({ agency: a, ...r, skew: r.t3 / Math.max(r.total, 1) }))
  .sort((a, b) => b.skew - a.skew);

for (const r of agencyRows) {
  if (r.total < 5) continue;
  const skewPct = (r.skew * 100).toFixed(0).padStart(4);
  const avail = hasT1(r.agency) ? '✓' : '✗';
  console.log(
    `${r.agency.padEnd(40)} ${r.total.toString().padStart(4)}  ${r.t1.toString().padStart(4)} ${r.t2.toString().padStart(4)} ${r.t3.toString().padStart(4)}  ${r.legacy.toString().padStart(4)}   ${skewPct}%   ${avail}`,
  );
}

console.log('\n\nTop 15 Commons-skewed missions (>=5 entries, sorted by T3%):');
console.log('mission                       agency             total  T1  T2  T3 legacy  T3%');
const skewedMissions = [...perMission.entries()]
  .map(([m, r]) => ({
    mission: m,
    agency: AGENCY_BY_ID[m] ?? '?',
    ...r,
    skew: r.t3 / Math.max(r.total, 1),
  }))
  .filter((r) => r.total >= 5)
  .sort((a, b) => b.skew - a.skew)
  .slice(0, 15);
for (const r of skewedMissions) {
  const skewPct = (r.skew * 100).toFixed(0).padStart(4);
  console.log(
    `${r.mission.padEnd(30)}${r.agency.padEnd(18)} ${r.total.toString().padStart(4)} ${r.t1.toString().padStart(3)} ${r.t2.toString().padStart(3)} ${r.t3.toString().padStart(3)}  ${r.legacy.toString().padStart(4)}   ${skewPct}%`,
  );
}

console.log('\n\nMissions on Tier 1-available agencies still skewed (best upgrade candidates):');
const upgradeCandidates = skewedMissions.filter((r) => hasT1(r.agency) && r.skew >= 0.5);
if (upgradeCandidates.length === 0) {
  console.log('  (none — every Commons-skewed mission is on an agency without Tier 1)');
} else {
  for (const r of upgradeCandidates) {
    console.log(
      `  ${r.mission.padEnd(28)} ${r.agency.padEnd(18)} skew=${(r.skew * 100).toFixed(0)}%`,
    );
  }
}

console.log('\n── interpretation ──');
console.log('  T3% = how often this agency falls to Commons failover instead of its own primary.');
console.log(
  '  t1-avail = does the agency have an auto-fetchable Tier 1 source in the v2 registry?',
);
console.log(
  "  Big T3% + t1-avail=✓ means the registry has a primary lane but the existing entries didn't use it (Slice A backfill target).",
);
console.log(
  "  Big T3% + t1-avail=✗ means agency primary genuinely doesn't exist (honest Commons).",
);
