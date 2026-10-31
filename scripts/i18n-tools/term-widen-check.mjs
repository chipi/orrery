// After widening glossary stems: which fields pass now that missed under the old glossary,
// on the same text, without a reviewed keep? Those were never read by anyone; read them,
// because a stem that is too wide hides real misses.
//   git show HEAD:scripts/i18n-tools/native-terms.json > /tmp/old.json
//   node scripts/i18n-tools/term-widen-check.mjs /tmp/old.json [--trees=…] [--out=f.json]
import fs from 'node:fs';
import path from 'node:path';
import { enPattern, keepKey, locPattern, textHash } from './term-match.mjs';

const [oldFile] = process.argv.slice(2);
const arg = (n, d) => process.argv.find((a) => a.startsWith(`--${n}=`))?.slice(n.length + 3) ?? d;
if (!oldFile) {
  console.error('usage: term-widen-check.mjs <old-native-terms.json> [--trees=…] [--out=f.json]');
  process.exit(2);
}
const OLD = JSON.parse(fs.readFileSync(oldFile, 'utf8')).term ?? {};
const NEW = JSON.parse(fs.readFileSync('scripts/i18n-tools/native-terms.json', 'utf8')).term;
const KEEPS = JSON.parse(fs.readFileSync('scripts/i18n-tools/term-keeps.json', 'utf8'));
const trees = arg('trees', 'science,essays,missions,fleet,programs').split(',');
const out = arg('out', null);

const walk = (d) =>
  fs.existsSync(d)
    ? fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => {
        const p = path.join(d, e.name);
        return e.isDirectory() ? walk(p) : e.name.endsWith('.json') ? [p] : [];
      })
    : [];
const leaves = (o, pre = '', acc = new Map()) => {
  if (typeof o === 'string') acc.set(pre, o);
  else if (o && typeof o === 'object')
    for (const [k, v] of Object.entries(o)) leaves(v, pre ? `${pre}.${k}` : k, acc);
  return acc;
};
const read = (f) => (fs.existsSync(f) ? leaves(JSON.parse(fs.readFileSync(f, 'utf8'))) : null);

const found = [];
const locales = Object.keys(NEW[Object.keys(NEW)[0]]._confidence);
for (const tree of trees)
  for (const enFile of walk(path.join('i18n-src/en-US', tree))) {
    const rel = path.relative('i18n-src/en-US', enFile);
    const en = read(enFile);
    for (const loc of locales) {
      const tr = read(path.join('i18n-src', loc, rel));
      if (!tr) continue;
      for (const [term, e] of Object.entries(NEW)) {
        const o = OLD[term];
        if (!o) continue;
        const enRe = enPattern(term, e);
        const now = locPattern(e, loc);
        const before = locPattern(o, loc);
        if (!now || !before) continue;
        for (const [key, s] of en) {
          const t = tr.get(key);
          if (t == null || !enRe.test(s) || before.test(t) || !now.test(t)) continue;
          const where = `${rel} :: ${key}`;
          if (KEEPS[keepKey(term, loc, where)]?.tr === textHash(t)) continue;
          found.push({ term, loc, where, hit: now.match(t), en: s, tr: t });
        }
      }
    }
  }
// grouped by the text the new stems matched: one reading per distinct form
const by = {};
for (const f of found) {
  const k = `${f.loc}\t${f.term}\t${f.hit}`;
  by[k] = (by[k] ?? 0) + 1;
}
console.log(
  Object.entries(by)
    .sort()
    .map(([k, n]) => `${n}\t${k}`)
    .join('\n'),
);
console.log(`${found.length} fields pass only under the new stems and were never reviewed`);
if (out) fs.writeFileSync(out, JSON.stringify(found, null, 1));
