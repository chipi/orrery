#!/usr/bin/env node
/**
 * handsource-retry-safari — Safari-UA retry for approvals that hit
 * 429 on the OrreryBuildBot UA from Wikimedia. 5s delay between
 * fetches so we don't trip the throttle bucket. (2026-06-23 release-
 * prep — same trick that landed starship/01 + change-4 hero.)
 *
 * Reads only fleet/moon/mars proposals that are approved but the
 * sidecar's image_url doesn't match — i.e., the bytes never landed.
 *
 * Run: node scripts/handsource-retry-safari.mjs
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import sharp from 'sharp';

const SAFARI_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15';

const salvage = JSON.parse(readFileSync('static/data/slice-a-salvage-result.json', 'utf8'));
const approvals = JSON.parse(readFileSync('static/data/slice-a-approvals.json', 'utf8'));
const fleetPath = 'static/data/fleet-image-sources.json';
const panelPath = 'static/data/panel-image-sources.json';
const fleet = JSON.parse(readFileSync(fleetPath, 'utf8'));
const panel = JSON.parse(readFileSync(panelPath, 'utf8'));
const propsById = new Map(salvage.proposals.map((p) => [p.proposal_id, p]));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Group by (surface, missionId, slot) — latest approved wins.
const bySlot = new Map();
for (const [pid, d] of Object.entries(approvals.decisions ?? {})) {
  if (d.status !== 'approved') continue;
  if (!/^hs[a-z0-9]*-/.test(pid)) continue;
  const p = propsById.get(pid);
  if (!p) continue;
  const key = `${p.surface}|${p.missionId}|${p.slot}`;
  const prev = bySlot.get(key);
  if (!prev || (d.updated_at ?? '').localeCompare(prev.d.updated_at ?? '') > 0) {
    bySlot.set(key, { pid, d, p });
  }
}

// Determine which entries actually need the apply (sidecar mismatch).
const targets = [];
for (const { pid, p } of bySlot.values()) {
  let sidecar;
  let sidecarKey;
  if (p.surface === 'fleet-galleries') {
    sidecarKey = `${p.missionId}/${p.slot}.jpg`;
    sidecar = fleet[sidecarKey];
  } else if (['moon-sites', 'mars-sites', 'missions'].includes(p.surface)) {
    sidecarKey = `${p.surface}/${p.missionId}/${p.slot}`;
    sidecar = panel[sidecarKey];
  } else {
    continue;
  }
  if (sidecar?.image_url === p.proposed?.image_url) continue;
  targets.push({ pid, p });
}

console.log(`${targets.length} apply-pending entries to retry with Safari UA + 5s delay`);

const stats = { applied: 0, errors: 0 };
const errs = [];

(async () => {
  for (const { pid, p } of targets) {
    const url = p.proposed?.image_url;
    if (!url) {
      console.log(`  ${pid}: no image_url, skip`);
      continue;
    }
    const surface = p.surface;
    const dir = `static/images/${surface}/${p.missionId}`;
    process.stdout.write(`  ${surface}/${p.missionId}/${p.slot}... `);
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': SAFARI_UA, Accept: 'image/avif,image/webp,*/*' },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      const baseBuf = await sharp(buf)
        .rotate()
        .resize({ width: 1600, withoutEnlargement: true })
        .jpeg({ quality: 80 })
        .toBuffer();
      mkdirSync(dir, { recursive: true });
      writeFileSync(`${dir}/${p.slot}.jpg`, baseBuf);
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
        .toFile(`${dir}/${p.slot}.1x1.jpg`);
      // Update sidecar
      const now = new Date().toISOString().slice(0, 19) + 'Z';
      const sidecarEntry = {
        source_type: p.proposed.source_type,
        source_url: p.proposed.source_url,
        image_url: p.proposed.image_url,
        credit: p.proposed.credit,
        license: p.proposed.license,
        fetched_at: now,
        slice_a_iteration: 'safari-ua-retry-2026-06-23',
        ...(p.vision_v3
          ? { vision: { verdict: p.vision_v3.verdict, confidence: p.vision_v3.confidence } }
          : {}),
      };
      if (surface === 'fleet-galleries') {
        fleet[`${p.missionId}/${p.slot}.jpg`] = sidecarEntry;
      } else {
        panel[`${surface}/${p.missionId}/${p.slot}`] = sidecarEntry;
      }
      console.log(`OK ${(baseBuf.length / 1024).toFixed(0)}KB`);
      stats.applied++;
    } catch (err) {
      console.log(`FAIL ${err.message}`);
      stats.errors++;
      errs.push({ pid, err: err.message });
    }
    await sleep(5000);
  }
  writeFileSync(fleetPath, JSON.stringify(fleet, null, 2) + '\n');
  writeFileSync(panelPath, JSON.stringify(panel, null, 2) + '\n');
  console.log(`\nstats: ${JSON.stringify(stats)}`);
  if (errs.length) {
    console.log('errors:');
    errs.forEach((e) => console.log(`  ${e.pid}: ${e.err}`));
  }
})();
