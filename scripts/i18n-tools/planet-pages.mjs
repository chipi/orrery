// Pass 1 for planets/*.json pages: the page name is the canonical form of a body in
// each locale. Fixes listed here (checked against native pages — see native-terms.json
// sources) are written to the page; then every page name is recorded in the glossary's
// `body` class so the article pass (pass 2) uses exactly that form.
//   node scripts/i18n-tools/planet-pages.mjs [--write]
import fs from 'node:fs';
import { writeJsonEdits } from '../lib/json-surgical.mjs';
import { problems } from '../lib/translate-quality.mjs';

const write = process.argv.includes('--write');
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
const FIX = {
  mercury: { de: 'Merkur' },
  earth: { 'pt-BR': 'Terra' },
  saturn: { it: 'Saturno' },
  uranus: { hi: 'अरुण' },
  neptune: { hi: 'वरुण' },
  pluto: { hi: 'यम' },
  arrokoth: { ru: 'Аррокот', hi: 'एरोकोथ', ar: 'أروكوث', 'sr-Cyrl': 'Арокот', ko: '아로코트' },
  didymos: { 'zh-CN': '双生星', 'sr-Cyrl': 'Дидимос' },
  dimorphos: { 'zh-CN': '双卫一', 'sr-Cyrl': 'Диморфос' },
  donaldjohanson: {
    'sr-Cyrl': 'Доналдџохансон',
    ru: 'Дональдджохансон',
    'zh-CN': '唐纳德约翰森',
    ko: '도널드요한슨',
    hi: 'डोनाल्डजोहानसन',
    ar: 'دونالدجوهانسون',
  },
  eurybates: { 'sr-Cyrl': 'Еурибат', es: 'Euríbates' },
  itokawa: { 'sr-Cyrl': 'Итокава' },
  leucus: { 'sr-Cyrl': 'Леук' },
  menoetius: { 'sr-Cyrl': 'Менетије' },
  orus: { 'sr-Cyrl': 'Ор', 'zh-CN': '奥鲁斯' },
  patroclus: { 'sr-Cyrl': 'Патрокло' },
  polymele: { 'sr-Cyrl': 'Полимела' },
};
const gp = 'scripts/i18n-tools/native-terms.json';
const g = JSON.parse(fs.readFileSync(gp, 'utf8'));
for (const file of fs.readdirSync('i18n-src/en-US/planets')) {
  const id = file.replace(/\.json$/, '');
  const en = JSON.parse(fs.readFileSync(`i18n-src/en-US/planets/${file}`, 'utf8')).name;
  const entry = (g.body[en] ??= {});
  for (const loc of LOCS) {
    const p = `i18n-src/${loc}/planets/${file}`;
    const cur = JSON.parse(fs.readFileSync(p, 'utf8')).name;
    const nu = FIX[id]?.[loc] ?? cur;
    if (nu !== cur) {
      const bad = problems(loc, en, nu);
      console.log(
        `${loc} ${id}: ${cur} → ${nu}${bad.length ? `  REFUSED: ${bad.join('; ')}` : ''}`,
      );
      if (write && !bad.length) writeJsonEdits(p, [{ at: 'name', old: cur, nu }]);
    }
    if (entry[loc] && entry[loc] !== nu)
      console.log(`  glossary ${en}.${loc}: ${entry[loc]} → ${nu}`);
    entry[loc] = nu;
  }
}
if (write) fs.writeFileSync(gp, JSON.stringify(g, null, 2) + '\n');
