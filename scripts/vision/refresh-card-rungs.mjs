/**
 * Re-derive the existing -320 / -640 card rungs of re-captured images from their new base,
 * the same way scripts/vision/add-card-rungs.mjs derives them (sharp resize by width, WebP q80).
 * add-card-rungs.mjs is add-only (it skips widths the ladder already lists), so after a
 * re-capture (e.g. scripts/capture-colophon-thumbs.ts) the small rungs keep the OLD picture;
 * this refreshes them. Only rungs that exist are rewritten; the ladder manifest is untouched.
 *
 *   node scripts/vision/refresh-card-rungs.mjs static/images/colophon/model-*.webp
 */
import { existsSync } from 'node:fs';
import sharp from 'sharp';
let n = 0;
for (const base of process.argv.slice(2)) {
  if (/-(320|640)\.webp$/.test(base)) continue; // a rung, not a base
  const stem = base.replace(/\.webp$/, '');
  for (const w of [320, 640]) {
    const out = `${stem}-${w}.webp`;
    if (!existsSync(out)) continue; // only refresh rungs that exist
    const buf = await sharp(base).resize({ width: w }).webp({ quality: 80 }).toBuffer();
    await sharp(buf).toFile(out);
    n++;
  }
}
console.log(`rungs refreshed: ${n}`);
