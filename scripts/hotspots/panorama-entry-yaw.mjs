#!/usr/bin/env node
/**
 * Entry yaw for partial Tier-3 panoramas.
 *
 * Many Moon panoramas are a photograph pasted into one slice of a padded
 * 2:1 canvas (panorama-padder.ts: black sky above, grey regolith below).
 * The panorama opens at yaw 0, which faces texture u = 0.75 (the skybox is
 * an X-inverted SphereGeometry and the camera looks back through the
 * origin) — padding on those canvases, so the view opened on black.
 *
 * This finds where the photograph sits — columns with a lit sky above the
 * horizon or texture just below it; the padding is black over flat grey —
 * takes the circular mean
 * of those columns as the content centre u, and converts it to the yaw that
 * faces it: T = 360 · (0.75 − u). Panoramas whose content spans ≥ 90 % of
 * the width are full and get no entry yaw.
 *
 * Run:  node scripts/hotspots/panorama-entry-yaw.mjs           (report)
 *       node scripts/hotspots/panorama-entry-yaw.mjs --write   (sets
 *       panorama_metadata.entry_yaw_deg in static/data/surface-hotspots.json)
 */
import { globSync, readFileSync, writeFileSync } from 'node:fs';
import sharp from 'sharp';

const SIDECAR = 'static/data/surface-hotspots.json';
const W = 720;
const H = 360;
const SKY = [0.3, 0.48];
const GROUND = [0.5, 0.66];
const MIN_SKY = 6;
const MIN_SD = 4;
const FULL = 0.9;

const write = process.argv.includes('--write');
const yaws = {};
for (const f of globSync('static/images/hotspots/*/*/tier3-pan.jpg').sort()) {
  const id = f.split('/')[4];
  const { data } = await sharp(f)
    .resize(W, H, { fit: 'fill' })
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const band = (lo, hi, x) => {
    const y0 = Math.round(H * lo);
    const y1 = Math.round(H * hi);
    let s = 0;
    let s2 = 0;
    for (let y = y0; y < y1; y++) {
      const v = data[y * W + x];
      s += v;
      s2 += v * v;
    }
    const n = y1 - y0;
    const mean = s / n;
    return { mean, sd: Math.sqrt(Math.max(0, s2 / n - mean * mean)) };
  };
  let sx = 0;
  let sy = 0;
  let lit = 0;
  for (let x = 0; x < W; x++) {
    // Content = a lit sky (Mars, Earth) or textured ground (the Moon's sky
    // is black); padding is black above and flat grey below.
    const sky = band(SKY[0], SKY[1], x);
    const ground = band(GROUND[0], GROUND[1], x);
    if (sky.mean > MIN_SKY || ground.sd > MIN_SD) {
      lit++;
      const a = (2 * Math.PI * (x + 0.5)) / W;
      sx += Math.cos(a);
      sy += Math.sin(a);
    }
  }
  const share = lit / W;
  const u = (((Math.atan2(sy, sx) / (2 * Math.PI)) % 1) + 1) % 1;
  const yaw = Math.round(((((0.75 - u) * 360) % 360) + 360) % 360);
  const full = share >= FULL;
  if (!full) yaws[id] = yaw;
  console.log(
    `${f.split('/').slice(3, 5).join('/').padEnd(28)} content ${(share * 100).toFixed(0).padStart(3)}%  ` +
      (full ? 'full' : `centre u ${u.toFixed(3)} → entry yaw ${yaw}`),
  );
}

if (write) {
  const doc = JSON.parse(readFileSync(SIDECAR, 'utf8'));
  let changed = 0;
  for (const [id, entry] of Object.entries(doc.entries)) {
    if (!entry.hotspot_tier3_panorama) continue;
    const meta = entry.panorama_metadata;
    if (id in yaws) {
      entry.panorama_metadata = { ...(meta ?? {}), entry_yaw_deg: yaws[id] };
      changed += meta?.entry_yaw_deg === yaws[id] ? 0 : 1;
    } else if (meta && 'entry_yaw_deg' in meta) {
      delete meta.entry_yaw_deg;
      changed++;
    }
  }
  writeFileSync(SIDECAR, JSON.stringify(doc, null, 2) + '\n');
  console.log(`${SIDECAR}: ${changed} entr${changed === 1 ? 'y' : 'ies'} changed`);
}
