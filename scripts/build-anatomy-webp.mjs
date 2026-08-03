/**
 * build-anatomy-webp.mjs — derive the anatomy id manifest from the masters (#367).
 *
 *   node scripts/build-anatomy-webp.mjs
 *
 * Source of truth is now `masters/anatomy/{id}.webp` (full-res, git-LFS) — the
 * legacy 1100px `original-assets/anatomy/*.png` archive was retired once the set
 * was re-mastered at 4K and folded into the responsive ladder (RFC-030/ADR-080).
 * The served display images (`static/images/anatomy/{id}.webp` + width-suffixed
 * rungs) are produced by `scripts/vision/build-display-ladder.mjs` from the same
 * masters — this script no longer resizes anything; it only emits the id list so
 * `src/lib/spacecraft-diagrams.ts` derives its manifest automatically.
 */
import { readdirSync, writeFileSync } from 'node:fs';

const MASTERS = 'masters/anatomy';

// Masters hold only the unsuffixed canonical `{id}.webp` (the width-suffixed
// ladder rungs live under static/images, not here), and many real ids end in a
// number (mars-3, soyuz-2, pioneer-10) — so take every .webp basename verbatim.
const ids = readdirSync(MASTERS)
  .filter((f) => f.endsWith('.webp'))
  .map((f) => f.replace(/\.webp$/, ''))
  .sort();

writeFileSync('src/lib/anatomy-ids.json', JSON.stringify(ids, null, 0) + '\n');
console.log(`${ids.length} anatomy ids → src/lib/anatomy-ids.json (from ${MASTERS}).`);
