// Per-locale check for the 2026-10-31 English source fixes: each corrected fact is present in all
// 14 locales, and each removed claim is gone. Run from the repo root. Exit 1 on any miss.
import fs from 'node:fs';
const LOCS = [
  'en-US',
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
const field = (loc, rel, at) =>
  JSON.parse(fs.readFileSync(`i18n-src/${loc}/fleet/${rel}`, 'utf8'))[at];
// [rel, at, must contain (any of, per locale digits), must NOT contain (regex)]
const CHECKS = [
  ['orbiter/magellan.json', 'description', /1994/, null],
  ['rover/yutu.json', 'description', /2016/, null],
  ['rover/zhurong.json', 'description', /2022/, null],
  ['rover/spirit.json', 'description', /2010/, null],
  ['rover/pragyan.json', 'description', /2023/, null],
  ['launcher/titan-ii-glv.json', 'description', /1966/, null],
  ['cargo-spacecraft/cygnus-standard.json', 'description', /2014/, /ATK/],
  [
    'launch-site/sriharikota-slp.json',
    'tagline',
    /Chandrayaan|चंद्रयान/,
    /Mangalyaan|मंगलयान|مانجاليان|Мангальян/,
  ],
  [
    'launch-site/sriharikota-slp.json',
    'best_known_for',
    /Chandrayaan|चंद्रयान/,
    /Mangalyaan|मंगलयान|مانجاليان|Мангальян/,
  ],
  ['cargo-spacecraft/atv.json', 'description', /./, /Multi/],
  ['launcher/ariane-6.json', 'description', /./, /Multi/],
  ['observatory/xmm-newton.json', 'description', /./, /Multi/],
  ['orbiter/mars-express.json', 'description', /./, /Multi/],
  ['lander/venera-7.json', 'description', /1970/, null],
];
let bad = 0;
for (const loc of LOCS) {
  const miss = [];
  for (const [rel, at, must, mustNot] of CHECKS) {
    const v = field(loc, rel, at) ?? '';
    if (!must.test(v) || (mustNot && mustNot.test(v))) miss.push(`${rel}:${at}`);
  }
  // the false template sentence is gone everywhere it was written in English
  const stale = CHECKS.filter(([rel, at]) =>
    /Retired after first flight/.test(field(loc, rel, at) ?? ''),
  );
  bad += miss.length + stale.length;
  console.log(
    `${loc.padEnd(8)} ${CHECKS.length - miss.length}/${CHECKS.length} ok${miss.length ? ' — MISS ' + miss.join(', ') : ''}`,
  );
}
process.exit(bad ? 1 : 0);
