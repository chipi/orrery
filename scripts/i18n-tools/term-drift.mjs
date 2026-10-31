// Technical-term drift: for each glossary `term` entry, find every overlay field whose
// en-US text uses the term (in the sense the entry's `_en` pattern describes) and check
// that the same field in each locale uses the binding form or an accepted variant
// (`_match[loc]`, regex stems that cover inflection). Read-only.
//   node scripts/i18n-tools/term-drift.mjs [--terms=burn,orbit] [--locales=fr,ru]
//        [--trees=science,essays,missions,fleet,programs] [--misses=<file.json>] [--gate]
// Prints a term × locale table: share of aligned fields that use the binding form or are a
// reviewed keep (term-keeps.json), and the count of unreviewed misses.
// --misses writes every unreviewed miss (stale keeps included, marked), for fixing.
// --gate exits 1 when any unreviewed miss is left.
import fs from 'node:fs';
import path from 'node:path';
import { enPattern, keepKey, locPattern, textHash } from './term-match.mjs';

const arg = (name, dflt) => {
  const a = process.argv.find((x) => x.startsWith(`--${name}=`));
  return a ? a.slice(name.length + 3) : dflt;
};
const GLOSSARY = JSON.parse(fs.readFileSync('scripts/i18n-tools/native-terms.json', 'utf8'));
const TERMS = GLOSSARY.term ?? {};
const LOCALES = [
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
const terms = arg('terms', Object.keys(TERMS).join(','))
  .split(',')
  .filter((t) => TERMS[t]);
const locales = arg('locales', LOCALES.join(',')).split(',');
const trees = arg('trees', 'science,essays,missions,fleet,programs,glossary').split(',');
const missesOut = arg('misses', null);
const gate = process.argv.includes('--gate');
const KEEPS_FILE = 'scripts/i18n-tools/term-keeps.json';
const KEEPS = fs.existsSync(KEEPS_FILE) ? JSON.parse(fs.readFileSync(KEEPS_FILE, 'utf8')) : {};

const ROOT = 'i18n-src';
const walk = (d) =>
  fs.existsSync(d)
    ? fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => {
        const p = path.join(d, e.name);
        return e.isDirectory() ? walk(p) : e.name.endsWith('.json') ? [p] : [];
      })
    : [];
function leaves(o, prefix = '', out = []) {
  if (typeof o === 'string') out.push([prefix, o]);
  else if (o && typeof o === 'object')
    for (const [k, v] of Object.entries(o)) leaves(v, prefix ? `${prefix}.${k}` : k, out);
  return out;
}

// en-US fields once: rel path → [[key, text]]
const EN = new Map();
for (const tree of trees)
  for (const f of walk(path.join(ROOT, 'en-US', tree)))
    EN.set(
      path.relative(path.join(ROOT, 'en-US'), f),
      leaves(JSON.parse(fs.readFileSync(f, 'utf8'))),
    );
const locCache = new Map();
function locLeaves(loc, rel) {
  const k = `${loc}/${rel}`;
  if (!locCache.has(k)) {
    const f = path.join(ROOT, loc, rel);
    locCache.set(
      k,
      fs.existsSync(f) ? new Map(leaves(JSON.parse(fs.readFileSync(f, 'utf8')))) : null,
    );
  }
  return locCache.get(k);
}

const misses = [];
const table = [];
for (const term of terms) {
  const entry = TERMS[term];
  const enRe = enPattern(term, entry);
  const row = { term };
  for (const loc of locales) {
    const re = locPattern(entry, loc);
    if (!re) {
      row[loc] = '—';
      continue;
    }
    let aligned = 0,
      ok = 0,
      open = 0;
    for (const [rel, enLeaves] of EN) {
      const ll = locLeaves(loc, rel);
      if (!ll) continue;
      for (const [key, en] of enLeaves) {
        if (!enRe.test(en) || !ll.has(key)) continue;
        aligned++;
        const tr = ll.get(key);
        const where = `${rel} :: ${key}`;
        const keep = KEEPS[keepKey(term, loc, where)];
        if (re.test(tr) || keep?.tr === textHash(tr)) ok++;
        else {
          open++;
          misses.push({ term, loc, where, en, tr, ...(keep ? { staleKeep: keep.why } : {}) });
        }
      }
    }
    row[loc] = aligned ? `${Math.round((100 * ok) / aligned)}%${open ? ` ·${open}` : ''}` : 'n/a';
  }
  table.push(row);
}
console.table(table);
if (missesOut) {
  fs.writeFileSync(missesOut, JSON.stringify(misses, null, 1));
  console.log(`${misses.length} unreviewed misses → ${missesOut}`);
}
const stale = misses.filter((m) => m.staleKeep).length;
console.log(
  `unreviewed misses: ${misses.length}${stale ? ` (${stale} keeps went stale: the text changed)` : ''}`,
);
if (gate && misses.length) process.exit(1);
