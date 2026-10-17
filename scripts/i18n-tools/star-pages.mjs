// Pass 1 for stars: each named-star page (universe/named-stars/<id>) takes its name in the
// locale from the "star" glossary, keyed by the catalogue's proper name — the field
// NamedStarOverlay.name that StarPanel shows. A locale with no form keeps the proper name.
//   node scripts/i18n-tools/star-pages.mjs [--dry]
import fs from 'node:fs';
import { problems } from '../lib/translate-quality.mjs';

const dry = process.argv[2] === '--dry';
const g = JSON.parse(fs.readFileSync('scripts/i18n-tools/native-terms.json', 'utf8'));
const stars = JSON.parse(fs.readFileSync('static/data/universe/named-stars.json', 'utf8')).stars;
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
let n = 0;
const missing = {};
for (const loc of LOCS)
  for (const s of stars) {
    const f = `i18n-src/${loc}/universe/named-stars/${s.id}.json`;
    if (!fs.existsSync(f)) continue;
    const form = g.star?.[s.proper]?.[loc];
    if (!form) {
      (missing[loc] ??= []).push(s.proper);
      continue;
    }
    const doc = JSON.parse(fs.readFileSync(f, 'utf8'));
    if (doc.name === form) continue;
    const bad = problems(loc, s.proper, form);
    if (bad.length) {
      console.log(`refused ${loc} ${s.id}: ${form} — ${bad.join('; ')}`);
      continue;
    }
    const out = {
      name: form,
      ...Object.fromEntries(Object.entries(doc).filter(([k]) => k !== 'name')),
    };
    if (!dry) fs.writeFileSync(f, JSON.stringify(out, null, 2) + '\n');
    n++;
  }
console.log(`${dry ? 'would write' : 'wrote'} ${n} names`);
for (const [loc, l] of Object.entries(missing))
  console.log(`${loc}: no form for ${l.length} (${l.join(', ')})`);
