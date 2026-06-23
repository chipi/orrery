#!/usr/bin/env node
/**
 * handsource-apply — applies the `hs-*`, `hs2-*`, `hs3-*`, `hs4-*`
 * proposals from slice-a-salvage-result.json that have an approved
 * decision in slice-a-approvals.json. slice-a-apply only reads from
 * `slice-a-*-dryrun.json`, so hand-source picks need a separate apply.
 *
 * Run: node scripts/handsource-apply.mjs [--dry-run]
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import sharp from 'sharp';

const UA = 'Mozilla/5.0 (compatible; OrreryBuildBot/0.7) AppleWebKit/605.1.15 (KHTML, like Gecko)';
const DRY = process.argv.includes('--dry-run');

const salvage = JSON.parse(readFileSync('static/data/slice-a-salvage-result.json', 'utf8'));
const approvals = JSON.parse(readFileSync('static/data/slice-a-approvals.json', 'utf8'));
const fleetPath = 'static/data/fleet-image-sources.json';
const panelPath = 'static/data/panel-image-sources.json';
const fleet = JSON.parse(readFileSync(fleetPath, 'utf8'));
const panel = JSON.parse(readFileSync(panelPath, 'utf8'));
const proposalsById = new Map(salvage.proposals.map((p) => [p.proposal_id, p]));

const bySlot = new Map();
for (const [pid, d] of Object.entries(approvals.decisions ?? {})) {
  if (d.status !== 'approved') continue;
  // Match every hand-source prefix: hs- · hs2/3/4/6- · hsfr- · hsng- ·
  // hsma- ... 2026-06-23 — the original /^hs\d?-/ regex silently
  // skipped all hsfr-* approvals (jwst, starship, new-shepard etc.)
  // because the suffix wasn't a single digit.
  if (!/^hs[a-z0-9]*-/.test(pid)) continue;
  const p = proposalsById.get(pid);
  if (!p) {
    console.log(`  ✗ missing in salvage: ${pid}`);
    continue;
  }
  const key = `${p.surface}|${p.missionId}|${p.slot}`;
  const prev = bySlot.get(key);
  if (!prev || (d.updated_at ?? '').localeCompare(prev.d.updated_at ?? '') > 0) {
    bySlot.set(key, { pid, d, p });
  }
}

console.log(`Hand-source apply${DRY ? ' (DRY)' : ''}: ${bySlot.size} unique targets`);

async function dl(url, dir, slot) {
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const baseBuf = await sharp(buf)
    .rotate()
    .resize({ width: 1600, withoutEnlargement: true })
    .jpeg({ quality: 80 })
    .toBuffer();
  mkdirSync(dir, { recursive: true });
  writeFileSync(`${dir}/${slot}.jpg`, baseBuf);
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

const stats = { applied: 0, errors: 0 };
const errors = [];

for (const [, entry] of bySlot) {
  const { pid, d, p } = entry;
  const overrides = d.overrides ?? {};
  const eff = {
    source_type: overrides.source_type ?? p.proposed.source_type,
    source_url: overrides.source_url ?? p.proposed.source_url,
    image_url: overrides.image_url ?? p.proposed.image_url,
    credit: overrides.credit ?? p.proposed.credit,
    license: overrides.license ?? p.proposed.license,
  };
  const dir = `static/images/${p.surface}/${p.missionId}`;
  if (DRY) {
    console.log(`  [dry] ${p.surface}/${p.missionId}/${p.slot} ← ${eff.source_type} (${pid})`);
    stats.applied++;
    continue;
  }
  try {
    const bytes = await dl(eff.image_url, dir, p.slot);
    const now = new Date().toISOString().slice(0, 19) + 'Z';
    if (p.surface === 'fleet-galleries') {
      fleet[`${p.missionId}/${p.slot}.jpg`] = {
        source_type: eff.source_type,
        source_url: eff.source_url,
        image_url: eff.image_url,
        credit: eff.credit,
        license: eff.license,
        fetched_at: now,
        slice_a_iteration: 'handsource-2026-06-22',
        ...(p.vision_v3
          ? { vision: { verdict: p.vision_v3.verdict, confidence: p.vision_v3.confidence } }
          : {}),
        ...(Object.keys(overrides).length ? { reviewer_overrides: overrides } : {}),
      };
    } else {
      panel[`${p.surface}/${p.missionId}/${p.slot}`] = {
        commons_file: p.proposed.metadata?.commons_file,
        commons_url: eff.source_url,
        credit: eff.credit,
        license: eff.license,
        fetched_at: now,
        slice_a_iteration: 'handsource-2026-06-22',
        ...(p.vision_v3
          ? { vision: { verdict: p.vision_v3.verdict, confidence: p.vision_v3.confidence } }
          : {}),
        ...(Object.keys(overrides).length ? { reviewer_overrides: overrides } : {}),
      };
    }
    console.log(
      `  ✓ ${p.surface}/${p.missionId}/${p.slot} ← ${(bytes / 1024).toFixed(0)}KB (${pid})`,
    );
    stats.applied++;
    await new Promise((r) => setTimeout(r, 2000)); // 2s — Commons rate-limits us under shorter
  } catch (e) {
    console.log(`  ✗ ${p.surface}/${p.missionId}/${p.slot}: ${e.message}`);
    stats.errors++;
    errors.push({ pid, e: e.message });
  }
}

if (!DRY) {
  writeFileSync(fleetPath, JSON.stringify(fleet, null, 2) + '\n');
  writeFileSync(panelPath, JSON.stringify(panel, null, 2) + '\n');
}

console.log(`\nstats: ${JSON.stringify(stats)}`);
if (errors.length) {
  console.log('errors:');
  errors.forEach((e) => console.log(` ${e.pid}: ${e.e}`));
}
