/**
 * Regenerate .1x1 / .4x3 / .16x9 variants for a Tier-3 panorama
 * master without invoking the vision-API pass (PRD-022 / ADR-074,
 * #286 Phase 1A).
 *
 * Why: when we upgrade marquee panoramas to 8K (Curiosity Mt Mercou,
 * Perseverance Sol 3), Claude's image API rejects them (>8000 px
 * either dimension) and the standard `npm run images:hotspots`
 * pipeline silently skips variant regeneration. Variants then
 * carry over from the previous run and reference the old master,
 * showing mismatched content.
 *
 * This helper invokes the same generateVariants() the vision step
 * uses, but with a deterministic centred focal point (0.5, 0.5) —
 * acceptable for equirectangular panoramas where the centre is
 * canonically the "forward" view.
 *
 * Usage:
 *   node scripts/hotspots/regenerate-tier3-variants.mjs \
 *     static/images/hotspots/mars/perseverance/tier3-pan.jpg
 */
import { readFile, writeFile, stat } from 'node:fs/promises';
import { resolve, dirname, basename, extname } from 'node:path';
import sharp from 'sharp';
import { generateVariants } from './../vision/crop-variants.ts';

// Keep variant dimensions sane regardless of master resolution: clamp
// the longest side to MAX_VARIANT_LONG_SIDE. Matches the existing
// 4K-master convention (~3641 wide for 16:9 variants) so the gallery
// thumbnail load cost doesn't balloon with marquee 8K masters.
const MAX_VARIANT_LONG_SIDE = 1920;

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('Usage: node scripts/hotspots/regenerate-tier3-variants.mjs <master.jpg> [...]');
  process.exit(1);
}

for (const arg of args) {
  const sourcePath = resolve(arg);
  const sourceBytes = await readFile(sourcePath);
  const outputBase = resolve(dirname(sourcePath), basename(sourcePath, extname(sourcePath)));
  console.log(`Regenerating variants for ${sourcePath}`);
  const results = await generateVariants({
    sourcePath,
    sourceBytes,
    focalPoint: { x: 0.5, y: 0.5 },
    outputBase,
    jpegQuality: 85,
    forceRefresh: true,
  });
  // Post-pass: clamp variants to MAX_VARIANT_LONG_SIDE. generateVariants
  // produces variants at master resolution (8K masters → 7K variants),
  // which is wasteful for gallery thumbnails — clamp here.
  for (const r of results) {
    if (r.width <= MAX_VARIANT_LONG_SIDE && r.height <= MAX_VARIANT_LONG_SIDE) {
      console.log(`  ✓ ${r.outputPath} ${r.width}×${r.height} (under cap)`);
      continue;
    }
    const longSide = Math.max(r.width, r.height);
    const scale = MAX_VARIANT_LONG_SIDE / longSide;
    const newW = Math.round(r.width * scale);
    const newH = Math.round(r.height * scale);
    const resized = await sharp(r.outputPath)
      .resize({ width: newW, height: newH })
      .jpeg({ quality: 85, mozjpeg: true })
      .toBuffer();
    await writeFile(r.outputPath, resized);
    const finalBytes = (await stat(r.outputPath)).size;
    console.log(
      `  ✓ ${r.outputPath} ${r.width}×${r.height} → ${newW}×${newH} (${(finalBytes / 1024).toFixed(0)} KB)`,
    );
  }
}
