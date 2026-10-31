// An English source correction carried into every locale (garble pass, 2026-10-31).
//   node scripts/i18n-tools/en-fix-workfile.mjs <fixes.json> <outdir> [--apply-en]
// fixes: [{rel, at, find, replace}] on i18n-src/en-US (several per field allowed, applied in order).
// Writes <outdir>/<loc>.json per locale: [{rel, at, en_old, en_new, tr, terms}] — the translator
// changes only what the English change needs. --apply-en also writes the new English (each find
// must occur exactly once in its field). Locale edits then go through apply-edits.mjs.
import fs from 'node:fs';
import path from 'node:path';
import { writeJsonEdits } from '../lib/json-surgical.mjs';
import { termNotes } from '../lib/translate-quality.mjs';

const [fixFile, outDir] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const applyEn = process.argv.includes('--apply-en');
if (!fixFile || !outDir) {
  console.error('usage: en-fix-workfile.mjs <fixes.json> <outdir> [--apply-en]');
  process.exit(2);
}
const LOCS = [
  'ru',
  'ja',
  'zh-CN',
  'ko',
  'hi',
  'ar',
  'sr-Cyrl',
  'de',
  'fr',
  'es',
  'it',
  'nl',
  'pt-BR',
];
const at = (doc, p) => p.split('.').reduce((a, k) => a?.[/^\d+$/.test(k) ? +k : k], doc);
const read = (loc, rel) => JSON.parse(fs.readFileSync(`i18n-src/${loc}/${rel}`, 'utf8'));

const fields = new Map();
for (const f of JSON.parse(fs.readFileSync(fixFile, 'utf8'))) {
  const key = `${f.rel}|${f.at}`;
  if (!fields.has(key)) {
    const en = at(read('en-US', f.rel), f.at);
    fields.set(key, { rel: f.rel, at: f.at, en_old: en, en_new: en });
  }
  const x = fields.get(key);
  const n = x.en_new.split(f.find).length - 1;
  if (n !== 1) {
    console.error(`${f.rel}:${f.at} — "${f.find}" occurs ${n} times (must be once)`);
    process.exit(1);
  }
  x.en_new = x.en_new.replace(f.find, f.replace);
}
fs.mkdirSync(outDir, { recursive: true });
for (const loc of LOCS) {
  const items = [...fields.values()].map((x) => ({
    ...x,
    tr: at(read(loc, x.rel), x.at),
    terms: termNotes(loc, x.en_new).trim(),
  }));
  fs.writeFileSync(path.join(outDir, `${loc}.json`), JSON.stringify(items, null, 1));
}
console.log(`${fields.size} fields × ${LOCS.length} locales → ${outDir}`);
if (applyEn) {
  const byFile = new Map();
  for (const x of fields.values())
    (byFile.get(x.rel) ?? byFile.set(x.rel, []).get(x.rel)).push({
      at: x.at,
      old: x.en_old,
      nu: x.en_new,
    });
  let n = 0;
  for (const [rel, es] of byFile) n += writeJsonEdits(`i18n-src/en-US/${rel}`, es).applied;
  console.log(`en-US: applied ${n}`);
}
