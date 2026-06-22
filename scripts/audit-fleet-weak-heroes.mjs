#!/usr/bin/env node
/**
 * audit-fleet-weak-heroes — Phase A prep: order every fleet entry by
 * hero-quality, weakest-first, so Marko's review session can attack
 * the worst ones first.
 *
 * For each fleet entry that exists on disk under
 * static/images/fleet-galleries/<id>/, captures:
 *   - slot 01 file size
 *   - vision-judge verdict (if any) from the v3 salvage result
 *   - existing slice-a-approval status (approved / rejected / pending)
 *   - whether a hero-override JSON entry points elsewhere
 *
 * Writes /tmp/fleet-weak-heroes.json sorted by (status, vision-verdict,
 * file size ascending). Already-decided entries are deprioritised so
 * Marko's effort goes to undecided + weak.
 *
 * Read-only.
 *
 * Run: node scripts/audit-fleet-weak-heroes.mjs
 */

import { readFileSync, existsSync, statSync, readdirSync } from 'node:fs';

const FLEET_DIR = 'static/images/fleet-galleries';
const SALVAGE_PATH = 'static/data/slice-a-salvage-result.json';
const APPROVALS_PATH = 'static/data/slice-a-approvals.json';
const HERO_OVERRIDES_PATH = 'static/data/fleet-hero-overrides.json';
const FLEET_SIDECAR_PATH = 'static/data/fleet-image-sources.json';

const salvage = existsSync(SALVAGE_PATH)
  ? JSON.parse(readFileSync(SALVAGE_PATH, 'utf8'))
  : { proposals: [] };
const approvals = existsSync(APPROVALS_PATH)
  ? JSON.parse(readFileSync(APPROVALS_PATH, 'utf8'))
  : { decisions: {} };
const heroOverrides = existsSync(HERO_OVERRIDES_PATH)
  ? JSON.parse(readFileSync(HERO_OVERRIDES_PATH, 'utf8'))
  : { overrides: {} };
const fleetSidecar = existsSync(FLEET_SIDECAR_PATH)
  ? JSON.parse(readFileSync(FLEET_SIDECAR_PATH, 'utf8'))
  : {};

// Index salvage proposals by id + slot for quick lookup
const propByKey = new Map();
for (const p of salvage.proposals ?? []) {
  if (p.surface !== 'fleet-galleries') continue;
  const k = `${p.missionId}|${p.slot}`;
  if (!propByKey.has(k)) propByKey.set(k, []);
  propByKey.get(k).push(p);
}

// Index approvals by composite proposal_id pattern
function decisionFor(proposalId) {
  return approvals.decisions?.[proposalId]?.status ?? null;
}

const rows = [];
const fleetIds = readdirSync(FLEET_DIR, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name);

for (const id of fleetIds) {
  const heroPath = `${FLEET_DIR}/${id}/01.jpg`;
  if (!existsSync(heroPath)) continue;
  const heroSize = statSync(heroPath).size;
  const proposals = propByKey.get(`${id}|01`) ?? [];
  const visions = proposals.map((p) => p.vision_v3).filter(Boolean);
  const bestVision = visions.sort(
    (a, b) => (b.confidence ?? 0) - (a.confidence ?? 0),
  )[0];
  // Determine if any decision exists across this id's proposals
  const idDecisions = (salvage.proposals ?? [])
    .filter((p) => p.surface === 'fleet-galleries' && p.missionId === id)
    .map((p) => decisionFor(p.proposal_id))
    .filter(Boolean);
  const status = idDecisions.length === 0 ? 'untriaged' : idDecisions[0]; // first non-null
  const heroOverride = heroOverrides.overrides?.[id]?.slot ?? null;
  const sidecar = fleetSidecar[`${id}/01.jpg`] ?? null;
  rows.push({
    id,
    hero_size_kb: Math.round(heroSize / 1024),
    vision_verdict: bestVision?.verdict ?? null,
    vision_conf: bestVision?.confidence ?? null,
    vision_reason: bestVision?.reason?.slice(0, 80) ?? null,
    triage_status: status,
    hero_override_slot: heroOverride,
    source_type: sidecar?.source_type ?? null,
    credit: sidecar?.credit?.slice(0, 50) ?? null,
  });
}

// Priority sort: untriaged first, then weakest hero first
function priority(row) {
  let p = 0;
  if (row.triage_status === 'untriaged') p -= 1000;
  if (row.vision_verdict === 'unrelated') p -= 500;
  if (row.hero_size_kb < 30) p -= 100;
  if (row.hero_size_kb < 60) p -= 50;
  return p;
}
rows.sort((a, b) => priority(a) - priority(b));

const summary = {
  total: rows.length,
  untriaged: rows.filter((r) => r.triage_status === 'untriaged').length,
  approved: rows.filter((r) => r.triage_status === 'approved').length,
  rejected: rows.filter((r) => r.triage_status === 'rejected').length,
  vision_unrelated: rows.filter((r) => r.vision_verdict === 'unrelated').length,
  vision_related: rows.filter((r) => r.vision_verdict === 'related').length,
  hero_under_30kb: rows.filter((r) => r.hero_size_kb < 30).length,
  hero_30_to_60kb: rows.filter((r) => r.hero_size_kb >= 30 && r.hero_size_kb < 60).length,
};

import('node:fs').then(({ writeFileSync }) => {
  writeFileSync('/tmp/fleet-weak-heroes.json', JSON.stringify({ summary, rows }, null, 2));
  console.log('Summary:');
  for (const [k, v] of Object.entries(summary)) console.log(' ', k.padEnd(25), v);
  console.log('\nTop 20 highest-priority for triage:');
  rows.slice(0, 20).forEach((r) =>
    console.log(
      ` ${r.id.padEnd(28)} ${String(r.hero_size_kb).padStart(5)}KB  v=${(r.vision_verdict ?? '-').padEnd(10)}  status=${r.triage_status}`,
    ),
  );
  console.log('\n→ full sorted list at /tmp/fleet-weak-heroes.json');
});
