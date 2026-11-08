// Leftovers after the batch agents (2026-11-06):
// - Apollo 13: free-return DPS burn at MET 61:30 (2.56 d, Wikipedia), closest approach 00:21 UTC
//   15 Apr (3.21 d), PC+2 at MET 79:28 (3.31 d); base label "PC+22" was a typo for PC+2.
// - SMART-1 fleet: impact 2006-09-03 05:42 UTC (ESA), not 02:42 (base + 14 overlays).
// - Lunar Prospector fleet base: the third Discovery mission (overlays and mission file say third).
// - Clementine fleet base best_known_for: "first evidence" → "first hint" (the radar result was
//   disputed; the 14 overlays already say hint).
// - Luna 24 base mass_at_tli_kg 4800 → 5700 to match the corrected launch mass.
import { readFileSync, writeFileSync } from 'node:fs';
const LOCS = [
  'en-US',
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
const edit = (f, pairs) => {
  let s = readFileSync(f, 'utf8');
  for (const [a, b] of pairs) {
    if (!(typeof a === 'string' ? s.includes(a) : a.test(s))) throw new Error(`${f}: ${a}`);
    s = s.replace(a, b);
  }
  writeFileSync(f, s);
};
edit('static/data/missions/moon/apollo13.json', [
  ['"met_days": 2.92', '"met_days": 2.56'],
  ['"met_days": 3.13', '"met_days": 3.21'],
  ['"met_days": 3.96', '"met_days": 3.31'],
  ['PC+22 — second LM burn correction', 'PC+2 — second LM descent-engine burn'],
]);
for (const l of LOCS)
  edit(`i18n-src/${l}/missions/moon/apollo13.json`, [[/"met": 2\.92/, '"met": 2.56']]);
edit('static/data/fleet/orbiter/smart-1.json', [['02:42 UTC', '05:42 UTC']]);
for (const l of LOCS) edit(`i18n-src/${l}/fleet/orbiter/smart-1.json`, [['02:42', '05:42']]);
edit('static/data/fleet/orbiter/lunar-prospector.json', [
  ['The first NASA Discovery-class mission', 'The third NASA Discovery-class mission'],
]);
edit('static/data/fleet/orbiter/clementine.json', [
  ['and the first evidence for water ice', 'and the first hint of water ice'],
]);
edit('static/data/missions/moon/luna24.json', [
  ['"mass_at_tli_kg": 4800', '"mass_at_tli_kg": 5700'],
]);
console.log('ok');
