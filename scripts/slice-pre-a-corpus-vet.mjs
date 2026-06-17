#!/usr/bin/env node
// Pre-A #4 — relevance-gate corpus vet.
// Pick a sample of existing Tier 1 (NASA images-api) provenance
// entries — those are known-good attributions. Run each through the
// v1 gate using a MINIMAL proper-noun query derived from the mission
// id. Measure accept rate. False-negatives here = gate would over-
// reject legit candidates during Slice A backfill.
//
// Read-only. No API calls. Just gate-scoring against stored titles.

import { readFileSync } from 'fs';
import { scoreRelevance, formatRelevance } from './lib/relevance-gate.mjs';

const PROV = JSON.parse(readFileSync('static/data/image-provenance.json', 'utf8'));

// Pick all NASA Tier 1 entries (curated source of truth).
const t1 = PROV.entries.filter(
  (e) => e.source_type === 'nasa-image-library' || e.source_type === 'nasa-images-api',
);
console.log(`Total NASA Tier 1 entries in provenance: ${t1.length}\n`);

// Sample N entries. Use a deterministic stride sample for repeatability.
const SAMPLE = 50;
const stride = Math.max(1, Math.floor(t1.length / SAMPLE));
const sample = [];
for (let i = 0; i < t1.length && sample.length < SAMPLE; i += stride) sample.push(t1[i]);

console.log(`Sampling ${sample.length} entries with stride ${stride}.\n`);

// For each, derive a minimal proper-noun query from the path's
// mission_id. E.g. /images/missions/opportunity/03.jpg → "opportunity".
function deriveQuery(path) {
  const m = path.match(/\/images\/(?:missions|fleet-galleries)\/([^/]+)\//);
  if (!m) return '';
  return m[1].replace(/[-_]+/g, ' ');
}

let accepted = 0;
let rejected = 0;
const rejects = [];
const accepts = [];

for (const entry of sample) {
  const query = deriveQuery(entry.path);
  if (!query) continue;
  const result = scoreRelevance({ title: entry.title }, query);
  if (result.accepted) {
    accepted++;
    accepts.push({ query, title: entry.title, result });
  } else {
    rejected++;
    rejects.push({ query, title: entry.title, result });
  }
}

const acceptRate = ((accepted / (accepted + rejected)) * 100).toFixed(0);
console.log(`Accept rate on Tier 1 corpus: ${accepted}/${accepted + rejected} (${acceptRate}%)\n`);

if (rejects.length > 0) {
  console.log(`── False-negatives (${rejects.length}) — legit T1 entries gate would reject during backfill ──`);
  for (const r of rejects.slice(0, 20)) {
    console.log(`  q="${r.query.padEnd(20)}" title="${r.title.slice(0, 60).padEnd(60)}" ${formatRelevance(r.result)}`);
  }
  if (rejects.length > 20) console.log(`  ... and ${rejects.length - 20} more`);
}

if (accepts.length > 0) {
  console.log(`\n── Sample accepts (${Math.min(5, accepts.length)} of ${accepts.length}) ──`);
  for (const a of accepts.slice(0, 5)) {
    console.log(`  q="${a.query.padEnd(20)}" title="${a.title.slice(0, 60).padEnd(60)}" ${formatRelevance(a.result)}`);
  }
}

console.log('\n── interpretation ──');
console.log(`  Accept rate measures gate recall on known-good Tier 1 corpus.`);
console.log(`  Low accept rate = gate too strict; would over-reject during Slice A backfill.`);
console.log(`  False-negative titles surface gate gaps (missing body tokens, anti-token false positives, etc.).`);
console.log(`  Use rejected sample to refine BODY_TOKENS, drop bad anti-tokens, or loosen per-source threshold.`);
