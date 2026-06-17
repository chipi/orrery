#!/usr/bin/env node
// audit-image-source-order — reports the distribution of `source_type`
// across mission/fleet/panel sidecars. Catches drift from the
// agency-first source order codified in IMAGE-PIPELINE.md §"Source-
// resolution order" / ADR-046.
//
// Hard fail: a NASA-tagged mission whose every sidecar entry is
//   source_type=wikimedia-commons. That's the regression signature
//   the 2026-06-17 inventory surfaced — the agency master existed
//   on images.nasa.gov but the fetcher went straight to Commons.
//
// Soft warning: any mission with >50% Commons sourcing, or any
//   sidecar entry lacking source_type entirely (pre-migration).
//
// Wire into `npm run validate-data` once the legacy entries are
// backfilled with source_type. For now it's an audit-only sweep.

import { readFileSync } from 'fs';

const SIDECARS = [
  { path: 'static/data/mission-image-sources.json', label: 'missions' },
  { path: 'static/data/fleet-image-sources.json', label: 'fleet' },
  { path: 'static/data/panel-image-sources.json', label: 'panel' },
];

function loadAgencies() {
  // Read missions/index.json for {id: agency} mapping. Best-effort.
  try {
    const idx = JSON.parse(readFileSync('static/data/missions/index.json', 'utf8'));
    const out = {};
    for (const m of idx.missions ?? []) {
      if (m.id) out[m.id] = m.agency ?? 'UNKNOWN';
    }
    return out;
  } catch {
    return {};
  }
}

const AGENCIES = loadAgencies();
let totalEntries = 0;
let untypedEntries = 0;
const counts = new Map(); // source_type -> count
const perMission = new Map(); // id -> {nasa, commons, other, total}

for (const { path, label } of SIDECARS) {
  let data;
  try {
    data = JSON.parse(readFileSync(path, 'utf8'));
  } catch (e) {
    console.log(`✗ ${path}: ${e.message}`);
    continue;
  }
  console.log(`\n── ${label} (${path}) ──`);

  for (const [key, val] of Object.entries(data)) {
    totalEntries++;
    const st = val?.source_type;
    if (!st) {
      untypedEntries++;
      counts.set('(untyped legacy)', (counts.get('(untyped legacy)') ?? 0) + 1);
    } else {
      counts.set(st, (counts.get(st) ?? 0) + 1);
    }

    // Per-mission breakdown (only missions sidecar)
    if (label === 'missions') {
      const missionId = key.split('/')[0];
      const row = perMission.get(missionId) ?? { nasa: 0, commons: 0, other: 0, total: 0 };
      row.total++;
      if (st === 'nasa-image-library' || st === 'jpl-photojournal') row.nasa++;
      else if (st === 'wikimedia-commons') row.commons++;
      else row.other++;
      perMission.set(missionId, row);
    }
  }
}

console.log(`\n── source_type distribution (all sidecars) ──`);
for (const [st, n] of [...counts.entries()].sort((a, b) => b[1] - a[1])) {
  const pct = ((n / totalEntries) * 100).toFixed(1);
  console.log(`  ${st.padEnd(28)}  ${String(n).padStart(4)}  (${pct}%)`);
}

console.log(`\n── per-mission Commons-skew (>50%) ──`);
const skewed = [];
for (const [id, row] of perMission.entries()) {
  if (row.total < 2) continue;
  const pct = (row.commons / row.total) * 100;
  if (pct > 50) skewed.push({ id, agency: AGENCIES[id] ?? '?', pct, ...row });
}
skewed.sort((a, b) => b.pct - a.pct);
if (skewed.length === 0) {
  console.log('  none');
} else {
  for (const s of skewed.slice(0, 20)) {
    console.log(
      `  ${s.id.padEnd(24)}  ${s.agency.padEnd(10)}  ${s.commons}/${s.total}  ${s.pct.toFixed(0)}%`,
    );
  }
  if (skewed.length > 20) console.log(`  … and ${skewed.length - 20} more`);
}

const hardFails = skewed.filter((s) => s.agency === 'NASA' && s.commons === s.total);
if (hardFails.length > 0) {
  console.log(`\n✗ HARD FAIL: ${hardFails.length} NASA missions with 100% Commons sourcing:`);
  for (const f of hardFails) console.log(`  ${f.id}: ${f.commons}/${f.total} entries`);
  console.log(`\nRe-source these from NASA images-api.nasa.gov per IMAGE-PIPELINE.md §"Source-resolution order".`);
  process.exit(1);
}

console.log(`\n✓ no hard-fail conditions. Legacy untyped entries: ${untypedEntries}`);
console.log(`  Backfill source_type on those during next sidecar touch.`);
