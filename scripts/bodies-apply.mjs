#!/usr/bin/env node
/**
 * bodies-apply — apply approved swaps from /dev/slice-a-review?dataset=bodies
 *
 * Reads:
 *   static/data/bodies-salvage-result.json   (proposal pool)
 *   static/data/bodies-approvals.json        (Marko's decisions + overrides)
 *
 * For every proposal whose decision.status === 'approved':
 *   1. Resolve effective source (proposal.proposed + decision.overrides)
 *   2. fetch + sharp-encode (jpeg q80, max 1600px) + 1x1 centre-crop
 *   3. Write to static/images/<surface>/<id>/<slot>.jpg + .1x1.jpg
 *   4. Update panel-image-sources.json at key <surface>/<id>/<slot>
 *   5. Collision check (refuse to apply two proposals to same target)
 *
 * Run:
 *   node scripts/bodies-apply.mjs --dry-run   # print plan, no disk writes
 *   node scripts/bodies-apply.mjs             # apply for real
 *
 * Why a separate script from slice-a-apply: bodies-salvage emits a
 * simpler proposal shape (one file with all surfaces, no per-agency
 * dryruns) so a focused apply is clearer than munging the bodies
 * result into the slice-a-apply input format.
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import sharp from 'sharp';

const UA =
  'OrreryBuildBot/0.1 (https://github.com/chipi/orrery; contact: marko.dragoljevic@gmail.com)';

const DRY_RUN = process.argv.includes('--dry-run');
const SALVAGE_PATH = 'static/data/bodies-salvage-result.json';
const APPROVALS_PATH = 'static/data/bodies-approvals.json';
const PANEL_SIDECAR_PATH = 'static/data/panel-image-sources.json';

const salvage = JSON.parse(readFileSync(SALVAGE_PATH, 'utf8'));
const approvals = JSON.parse(readFileSync(APPROVALS_PATH, 'utf8'));
const panel = JSON.parse(readFileSync(PANEL_SIDECAR_PATH, 'utf8'));

const decisions = approvals.decisions ?? {};
const proposalsById = new Map(salvage.proposals.map((p) => [p.proposal_id, p]));

const stats = { approved: 0, applied: 0, missing: 0, superseded: 0, error: 0 };
const errors = [];

// Group approved decisions by (surface, body, slot) so when two
// rounds of approvals target the same slot (e.g. round-1 + hubble-pass),
// we can pick the latest one rather than first-wins-by-iteration-order.
const bySlot = new Map();
for (const [proposalId, decision] of Object.entries(decisions)) {
  if (decision.status !== 'approved') continue;
  const p = proposalsById.get(proposalId);
  if (!p) continue;
  const key = `${p.surface}|${p.missionId}|${p.slot}`;
  if (!bySlot.has(key)) bySlot.set(key, []);
  bySlot.get(key).push({ proposalId, decision, proposal: p });
}

async function downloadAndProcess(imageUrl, surface, id, slot) {
  const res = await fetch(imageUrl, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const baseBuf = await sharp(buf)
    .rotate()
    .resize({ width: 1600, withoutEnlargement: true })
    .jpeg({ quality: 80 })
    .toBuffer();
  // Sun is a single-entity surface (matches getSunGallery's flat
  // {count: N} layout): files live at static/images/sun/<slot>.jpg
  // with no per-id subdir. Every other surface uses <surface>/<id>/.
  const dir = surface === 'sun' ? 'static/images/sun' : `static/images/${surface}/${id}`;
  mkdirSync(dir, { recursive: true });
  writeFileSync(`${dir}/${slot}.jpg`, baseBuf);
  // 1x1 centre crop
  const meta = await sharp(baseBuf).metadata();
  const side = Math.min(meta.width, meta.height);
  await sharp(baseBuf)
    .extract({
      left: Math.round((meta.width - side) / 2),
      top: Math.round((meta.height - side) / 2),
      width: side,
      height: side,
    })
    .jpeg({ quality: 80 })
    .toFile(`${dir}/${slot}.1x1.jpg`);
  return baseBuf.length;
}

// Collision tie-break: when two approvals target the same
// (surface, body, slot), the one with the newer decision.updated_at
// wins. Round-2 (hubble-pass) approvals will have a newer timestamp
// than round-1 picks for the same slot, so they overwrite cleanly.
function pickWinningApproval(decisionsBySlot) {
  return decisionsBySlot
    .filter((d) => d.decision.status === 'approved')
    .sort((a, b) => (b.decision.updated_at ?? '').localeCompare(a.decision.updated_at ?? ''))
    [0];
}

console.log(`Loading approvals from ${APPROVALS_PATH}${DRY_RUN ? ' (DRY RUN)' : ''}\n`);

for (const [key, candidates] of bySlot) {
  stats.approved += candidates.length;
  const winner = pickWinningApproval(candidates);
  if (!winner) continue;
  const { proposalId, decision, proposal: p } = winner;
  if (candidates.length > 1) {
    const supersededIds = candidates
      .filter((c) => c.proposalId !== proposalId)
      .map((c) => c.proposalId);
    stats.superseded += supersededIds.length;
    console.log(
      `  ↺ ${key.replace(/\|/g, '/')} — picked ${proposalId} (${decision.updated_at}), superseded ${supersededIds.length}`,
    );
  }

  const overrides = decision.overrides ?? {};
  const effective = {
    source_type: overrides.source_type ?? p.proposed.source_type,
    source_url: overrides.source_url ?? p.proposed.source_url,
    image_url: overrides.image_url ?? p.proposed.image_url,
    credit: overrides.credit ?? p.proposed.credit,
    license: overrides.license ?? p.proposed.license,
  };

  const overrideTag = Object.keys(overrides).length > 0 ? ' [override]' : '';
  if (DRY_RUN) {
    console.log(
      `  [dry]${overrideTag} ${p.surface}/${p.missionId}/${p.slot} ← ${effective.source_type} ` +
      `(v=${p.vision_v3?.verdict ?? 'n/a'} c=${(p.vision_v3?.confidence ?? 0).toFixed(2)})`,
    );
    stats.applied++;
    continue;
  }

  try {
    const bytes = await downloadAndProcess(
      effective.image_url,
      p.surface,
      p.missionId,
      p.slot,
    );
    // Sun uses a flat sidecar key matching its flat disk layout —
    // 'sun/01' rather than 'sun/sun/01'.
    const sidecarKey =
      p.surface === 'sun' ? `sun/${p.slot}` : `${p.surface}/${p.missionId}/${p.slot}`;
    panel[sidecarKey] = {
      commons_file: p.proposed.metadata?.commons_file,
      commons_url: effective.source_url,
      credit: effective.credit,
      license: effective.license,
      fetched_at: new Date().toISOString().slice(0, 19) + 'Z',
      bodies_iteration: 1,
      query: p.query,
      vision: p.vision_v3
        ? { verdict: p.vision_v3.verdict, confidence: p.vision_v3.confidence }
        : undefined,
      ...(Object.keys(overrides).length > 0 ? { reviewer_overrides: overrides } : {}),
    };
    console.log(
      `  ✓${overrideTag} ${p.surface}/${p.missionId}/${p.slot} ← ${(bytes / 1024).toFixed(0)}KB`,
    );
    stats.applied++;
    await new Promise((r) => setTimeout(r, 200)); // CDN-friendly throttle
  } catch (e) {
    console.log(`  ✗ ${p.surface}/${p.missionId}/${p.slot}: ${e.message}`);
    stats.error++;
    errors.push({ proposalId, error: e.message });
  }
}

if (!DRY_RUN && stats.applied > 0) {
  writeFileSync(PANEL_SIDECAR_PATH, JSON.stringify(panel, null, 2) + '\n');
  console.log(`\n✓ wrote ${PANEL_SIDECAR_PATH}`);
}

console.log(`\nstats: ${JSON.stringify(stats)}`);
if (errors.length) {
  console.log(`\nerrors:`);
  errors.forEach((e) => console.log(`  ${e.proposalId}: ${e.error}`));
}
