// Item 8: per-locale stop-label overlays for rover traverses (en-US twin + 13 locales).
// Feature names stay as written; "Station N · Name" via a per-locale pattern; other
// labels from the hand dictionary; a label with no entry that is only names stays English.
import fs from 'node:fs';
import { problems } from '../lib/translate-quality.mjs';
const ROOT = process.cwd();
const S = 'scripts/i18n-tools/maps/2026-10-17-translation-cleanup';
const dict = JSON.parse(fs.readFileSync(`${S}/traverse-dict.json`, 'utf8'));
const LOCS = [
  'ar',
  'de',
  'es',
  'fr',
  'hi',
  'it',
  'ja',
  'ko',
  'nl',
  'pt-BR',
  'ru',
  'sr-Cyrl',
  'zh-CN',
];
// Names only — no ordinary word to translate.
const NAMES_ONLY = new Set([
  'Marias Pass',
  'Murray Buttes',
  'Vera Rubin Ridge',
  'Greenheugh Pediment',
  'Endurance Crater',
  'Erebus Crater',
  'Victoria Crater',
  'Marathon Valley',
  'Hawksbill Gap',
]);
const errs = [];
const tr = (loc, en) => {
  const st = en.match(/^Station (\d+)(?: · (.+))?$/);
  if (st) return dict._station[loc].replace('{n}', st[1]) + (st[2] ? ` · ${st[2]}` : '');
  if (NAMES_ONLY.has(en)) return en;
  const v = dict[en]?.[loc];
  if (!v) errs.push(`${loc}: no entry for "${en}"`);
  return v ?? en;
};
let files = 0;
for (const dir of ['mars-traverses', 'moon-traverses']) {
  for (const f of fs.readdirSync(`${ROOT}/static/data/${dir}`)) {
    if (!f.endsWith('.json') || f.includes('route-patches')) continue;
    const base = JSON.parse(fs.readFileSync(`${ROOT}/static/data/${dir}/${f}`, 'utf8'));
    const stops = (base.stops ?? []).filter((s) => s.id && s.label);
    if (!stops.length) continue;
    const write = (loc, labelOf) => {
      const out = { stops: stops.map((s) => ({ id: s.id, label: labelOf(s.label) })) };
      if (loc !== 'en-US')
        for (const [i, s] of out.stops.entries())
          for (const p of problems(loc, stops[i].label, s.label))
            errs.push(`${loc} ${dir}/${f} ${s.id}: ${p.slice(0, 100)}`);
      fs.mkdirSync(`${ROOT}/i18n-src/${loc}/${dir}`, { recursive: true });
      fs.writeFileSync(`${ROOT}/i18n-src/${loc}/${dir}/${f}`, JSON.stringify(out, null, 2) + '\n');
      files++;
    };
    write('en-US', (l) => l);
    for (const loc of LOCS) write(loc, (l) => tr(loc, l));
  }
}
if (errs.length) {
  console.log(errs.join('\n'));
  process.exit(1);
}
console.log(`${files} overlay files written`);
