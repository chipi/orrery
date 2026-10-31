// Record reviewed term misses as keeps in term-keeps.json (see term-match.mjs).
//   node scripts/i18n-tools/term-keep.mjs <decisions.json>
// decisions: [{term, loc, rel, at, why}] (term-apply's `keep` rows) — `loc` may instead be
// given once as a second argument. Each keep stores the hash of the field's current text,
// so it lapses when the field is edited. Prunes keeps whose field no longer exists.
import fs from 'node:fs';
import path from 'node:path';
import { keepKey, textHash } from './term-match.mjs';

const [file, locArg] = process.argv.slice(2);
if (!file) {
  console.error('usage: term-keep.mjs <decisions.json> [loc]');
  process.exit(2);
}
const KEEPS = 'scripts/i18n-tools/term-keeps.json';
const keeps = fs.existsSync(KEEPS) ? JSON.parse(fs.readFileSync(KEEPS, 'utf8')) : {};

const get = (o, at) => at.split('.').reduce((v, k) => (v == null ? v : v[k]), o);
const docs = new Map();
function fieldText(loc, rel, at) {
  const f = path.join('i18n-src', loc, rel);
  if (!docs.has(f)) docs.set(f, fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : null);
  const v = docs.get(f) && get(docs.get(f), at);
  return typeof v === 'string' ? v : null;
}

let added = 0,
  missing = 0;
for (const d of JSON.parse(fs.readFileSync(file, 'utf8'))) {
  if (d.decision && d.decision !== 'keep') continue;
  const loc = d.loc ?? locArg;
  const tr = fieldText(loc, d.rel, d.at);
  if (tr == null) {
    missing++;
    console.error(`no field: ${loc} ${d.rel} :: ${d.at}`);
    continue;
  }
  keeps[keepKey(d.term, loc, `${d.rel} :: ${d.at}`)] = { why: d.why ?? '', tr: textHash(tr) };
  added++;
}
let pruned = 0;
for (const k of Object.keys(keeps)) {
  const [, loc, where] = k.split('|');
  const [rel, at] = where.split(' :: ');
  if (fieldText(loc, rel, at) == null) {
    delete keeps[k];
    pruned++;
  }
}
const sorted = Object.fromEntries(Object.entries(keeps).sort(([a], [b]) => a.localeCompare(b)));
fs.writeFileSync(KEEPS, JSON.stringify(sorted, null, 2) + '\n');
console.log(
  `keeps: +${added}, ${missing} not found, ${pruned} pruned, ${Object.keys(sorted).length} total`,
);
if (missing) process.exit(1);
