// SLIM landed about 10 m from its target (JAXA's final evaluation, 2024-08-26), not 55 m — the JAXA
// program overlays (14 locales), the program base note and the descent-profile caption.
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
const rep = (f, re) => {
  const s = readFileSync(f, 'utf8');
  const n = s.replace(re, (m) => m.replace('55', '10'));
  if (n === s) throw new Error(f);
  writeFileSync(f, n);
};
for (const l of LOCS)
  rep(
    `i18n-src/${l}/programs/jaxa-robotic.json`,
    /(约|約|약 |около |около|круглο|примерно в |око |about |etwa |unos |environ |circa |ongeveer |cerca de |लगभग |نحو )55/u,
  );
rep('static/data/programs/jaxa-robotic.json', /about 55 metres/);
rep('static/data/descent-profiles/slim.json', /landed 55 m from the target/);
console.log('ok');
