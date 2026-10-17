// Pass 1 inventory (one name per language): for every gallery/entity page, its name in
// each locale, side by side, so the canonical form can be checked against the rules.
// Output TSV: surface/id \t field \t en-US \t <loc>… (header row first).
//   node scripts/i18n-tools/canonical-names.mjs > scripts/i18n-tools/maps/<arc>/canonical-names.tsv
import fs from 'node:fs';
import path from 'node:path';

const SURFACES = [
  'fleet',
  'programs',
  'missions',
  'planets',
  'rockets',
  'earth-objects',
  'moon-sites',
  'mars-sites',
  'iss-modules',
  'tiangong-modules',
];
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
const FIELDS = ['name', 'short_name', 'title', 'site_name'];
const walk = (d) =>
  fs.existsSync(d)
    ? fs.readdirSync(d).flatMap((n) => {
        const p = path.join(d, n);
        return fs.statSync(p).isDirectory() ? walk(p) : p.endsWith('.json') ? [p] : [];
      })
    : [];
const read = (p) => {
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return {};
  }
};
const rows = [['page', 'field', 'en-US', ...LOCS].join('\t')];
for (const s of SURFACES)
  for (const f of walk(`i18n-src/en-US/${s}`)) {
    const rel = f.slice('i18n-src/en-US/'.length);
    const en = read(f);
    for (const k of FIELDS) {
      if (typeof en[k] !== 'string') continue;
      rows.push(
        [
          rel.replace(/\.json$/, ''),
          k,
          en[k],
          ...LOCS.map((l) => read(`i18n-src/${l}/${rel}`)[k] ?? '∅'),
        ].join('\t'),
      );
    }
  }
console.log(rows.join('\n'));
