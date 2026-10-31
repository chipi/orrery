// Packs sample files into one file for a grader: every item gets its locale and tree.
//   node scripts/i18n-tools/grade-pack.mjs <out.json> <sampledir>/<bucket>/<loc>.json …
// The locale is the file's name, the tree the item's own `tree` (garble-sample.mjs writes it), else
// the name of the directory the file is in. Items keep rel, at, en, tr only. Prints the item count
// and the English characters the grader will read.
import path from 'node:path';
import { cpLen, isMain, readJson, writeJson } from './garble-lib.mjs';

export function pack(files) {
  return files.flatMap((f) => {
    const loc = path.basename(f, '.json');
    return readJson(f).map((x) => ({
      loc,
      tree: x.tree ?? path.basename(path.dirname(path.resolve(f))),
      rel: x.rel,
      at: x.at,
      en: x.en,
      tr: x.tr,
    }));
  });
}

if (isMain(import.meta.url)) {
  const [out, ...files] = process.argv.slice(2);
  if (!out || !files.length) {
    console.error('usage: grade-pack.mjs <out.json> <sampledir>/<bucket>/<loc>.json …');
    process.exit(2);
  }
  const items = pack(files);
  writeJson(out, items);
  console.log(
    items.length,
    'items',
    items.reduce((n, i) => n + cpLen(i.en), 0),
    'en chars',
  );
}
