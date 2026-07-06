// Collect images ADDED to galleries since HEAD (e.g. by a fill-gallery-gaps
// batch) into static/data/new-images-review.json — the data source for the
// /dev/new-images review grid. Robust to prune renumbering: an image counts
// as "new" only if its CONTENT (git blob hash) isn't present anywhere in that
// gallery at HEAD, so a slot merely renumbered (same bytes, new filename) is
// NOT flagged. First-party source/license (source-fetch-provenance.json) is
// joined when available; everything else is Wikimedia Commons.
//
//   node scripts/collect-new-images.mjs
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';

const OUT = 'static/data/new-images-review.json';
const isBase = (f) => /\.(jpe?g|png)$/i.test(f) && !/\.(1x1|16x9|4x3)\./i.test(f);

// Galleries with any changed image file since HEAD — tracked modifications
// (renumber overwrites existing slot paths) AND untracked new files (a gallery
// that grew has brand-new slot paths git diff HEAD won't list).
const tracked = execSync('git diff HEAD --name-only -- static/images', { encoding: 'utf8' });
const untracked = execSync('git ls-files --others --exclude-standard -- static/images', {
  encoding: 'utf8',
});
const changed = [...tracked.split('\n'), ...untracked.split('\n')].filter((f) => f && isBase(f));
const dirs = [...new Set(changed.map((f) => f.slice(0, f.lastIndexOf('/'))))].sort();

// First-party provenance (real source/license) keyed by served path.
const firstParty = existsSync('static/data/source-fetch-provenance.json')
  ? JSON.parse(readFileSync('static/data/source-fetch-provenance.json', 'utf8'))
  : [];
const fpByPath = new Map(firstParty.map((e) => [e.path, e]));

// Preserve prior decisions if the reviewer already started.
const prior =
  existsSync(OUT) && JSON.parse(readFileSync(OUT, 'utf8')).decisions
    ? JSON.parse(readFileSync(OUT, 'utf8')).decisions
    : {};

function headBlobHashes(dir) {
  const set = new Set();
  try {
    const tree = execSync(`git ls-tree HEAD -r -- "${dir}"`, { encoding: 'utf8' });
    for (const line of tree.split('\n')) {
      const m = line.match(/^\d+ blob ([0-9a-f]+)\t(.+)$/);
      if (m && isBase(m[2])) set.add(m[1]);
    }
  } catch {
    /* dir absent at HEAD → whole gallery is new */
  }
  return set;
}

const items = [];
for (const dir of dirs) {
  const head = headBlobHashes(dir);
  let files = [];
  try {
    files = readdirSync(dir).filter(isBase).sort();
  } catch {
    continue;
  }
  for (const f of files) {
    const abs = `${dir}/${f}`;
    const hash = execSync(`git hash-object "${abs}"`, { encoding: 'utf8' }).trim();
    if (head.has(hash)) continue; // unchanged or merely renumbered → not new
    const served = '/' + abs.replace(/^static\//, '');
    const [, , surface, gallery] = dir.split('/'); // static/images/<surface>/<gallery>
    const fp = fpByPath.get(served);
    items.push({
      path: served,
      surface,
      gallery,
      source: fp?.source ?? 'wikimedia-commons',
      sourceUrl: fp?.source_url ?? null,
      license: fp?.license_short ?? null,
    });
  }
}
items.sort((a, b) => a.path.localeCompare(b.path));

writeFileSync(
  OUT,
  JSON.stringify({ version: 1, generated_from: 'HEAD-diff', decisions: prior, items }, null, 2) +
    '\n',
);
console.log(
  `collected ${items.length} new images across ${dirs.length} changed galleries → ${OUT}`,
);
