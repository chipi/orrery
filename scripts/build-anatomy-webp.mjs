/**
 * build-anatomy-webp.mjs — derive the anatomy id manifests from the masters (#367).
 *
 *   node scripts/build-anatomy-webp.mjs
 *
 * Source of truth is now `masters/anatomy/{id}.webp` (full-res, git-LFS) — the
 * legacy 1100px `original-assets/anatomy/*.png` archive was retired once the set
 * was re-mastered at 4K and folded into the responsive ladder (RFC-030/ADR-080).
 * The served display images (`static/images/anatomy/{id}.webp` + width-suffixed
 * rungs) are produced by `scripts/vision/build-display-ladder.mjs` from the same
 * masters — this script no longer resizes anything; it only emits the id lists so
 * `src/lib/spacecraft-diagrams.ts` derives its manifests automatically.
 *
 * The launcher exploded cutaways get the same treatment: their masters are the raw
 * Higgsfield PNGs in `masters/anatomy-exploded/`, and the id list goes to
 * `src/lib/anatomy-exploded-ids.json`.
 */
import { readdirSync, writeFileSync } from 'node:fs';

// Masters hold only the unsuffixed canonical `{id}.<ext>` (the width-suffixed
// ladder rungs live under static/images, not here), and many real ids end in a
// number (mars-3, soyuz-2, pioneer-10) — so take every basename verbatim.
function idsFrom(dir, ext) {
  return readdirSync(dir)
    .filter((f) => ext.test(f))
    .map((f) => f.replace(ext, ''))
    .sort();
}

const write = (file, ids) => writeFileSync(file, JSON.stringify(ids, null, 2) + '\n');

const anatomy = idsFrom('masters/anatomy', /\.webp$/);
write('src/lib/anatomy-ids.json', anatomy);
console.log(`${anatomy.length} anatomy ids → src/lib/anatomy-ids.json (from masters/anatomy).`);

const exploded = idsFrom('masters/anatomy-exploded', /\.(png|webp)$/);
write('src/lib/anatomy-exploded-ids.json', exploded);
console.log(
  `${exploded.length} exploded ids → src/lib/anatomy-exploded-ids.json (from masters/anatomy-exploded).`,
);
