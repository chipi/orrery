// Chunks 1–3 sweep (2026-11-04): the wrong forms each fix round found, searched across every
// overlay, the UI messages and the alt text — places term-drift does not see (other trees,
// one-word titles, fields whose English uses another word). Each replacement must occur
// exactly the expected number of times, or the file is left alone.
import fs from 'node:fs';

const R = [
  [
    'i18n-src/it/missions/earth/voskhod-2.json',
    "fuori dall'eclusa",
    'fuori dalla camera di equilibrio',
    1,
  ],
  [
    'i18n-src/it/science/life-in-space/lunar-habitat-design.json',
    'prevedono tutti portelli stagni',
    'prevedono tutti camere di equilibrio',
    1,
  ],
  [
    'i18n-src/it/science/life-in-space/lunar-surface-ops.json',
    "all'interno del portello stagno",
    "all'interno della camera di equilibrio",
    1,
  ],
  [
    'i18n-src/pt-BR/science/life-in-space/lunar-habitat-design.json',
    'com ecluses de ar',
    'com eclusas de ar',
    1,
  ],
  ['i18n-src/pt-BR/science/orbits/synodic-period.json', 'apélio', 'afélio', 1],
  ['i18n-src/pt-BR/science/transfers/hohmann-transfer.json', 'apélio', 'afélio', 1],
  [
    'i18n-src/pt-BR/science/mission-phases/interplanetary-internet.json',
    'Os rovôs não',
    'Os rovers não',
    1,
  ],
  [
    'i18n-src/pt-BR/science/mission-phases/interplanetary-internet.json',
    'em um rovô',
    'em um rover',
    1,
  ],
  [
    'i18n-src/nl/fleet/lander/change6.json',
    'Chinese steekproefterugbrengmissie',
    'Chinese monsterterugkeermissie',
    1,
  ],
  [
    'i18n-src/nl/planets/itokawa.json',
    'Eerste asteroïdesteekproef ooit',
    'Eerste asteroïdemonster ooit',
    1,
  ],
  [
    'i18n-src/nl/programs/galileo.json',
    'enige directe steekproef van het binnenste',
    'enige directe monster van het binnenste',
    1,
  ],
  [
    'i18n-src/nl/videos.json',
    'terugkeer van asteroïdesteekproef',
    'terugkeer van een asteroïdemonster',
    1,
  ],
  ['messages/nl.json', 'afhelium', 'aphelium', 4],
  [
    'i18n-src/de/videos.json',
    'Leonow, der erste Spacewalk',
    'Leonow, der erste Weltraumausstieg',
    1,
  ],
  ['i18n-src/zh-CN/missions/mars/mars-express.json', '登陆器与轨道器分离', '着陆器与轨道器分离', 1],
  ['static/data/image-alt-text/zh-CN.json', '一艘月球登陆器', '一艘月球着陆器', 1],
  ['i18n-src/sr-Cyrl/missions/earth/vostok-3.json', 'САЛЕТАЊЕ', 'СЛЕТАЊЕ', 1],
  ['i18n-src/sr-Cyrl/missions/moon/slim.json', 'САЛЕТАЊЕ', 'СЛЕТАЊЕ', 1],
  ['static/data/image-alt-text/fr.json', 'régolite ', 'régolithe ', 6],
  ['messages/fr.json', "sa vitesse d'échappement moyenne", 'sa vitesse de libération moyenne', 1],
  [
    'messages/fr.json',
    "la marche rapide bat la vitesse d'échappement",
    'la marche rapide bat la vitesse de libération',
    1,
  ],
  [
    'messages/fr.json',
    "une vitesse d'échappement près de 3 km/s",
    "une vitesse d'éjection près de 3 km/s",
    1,
  ],
  ['messages/fr.json', "à la vitesse d'échappement vₑ", "à la vitesse d'éjection vₑ", 1],
  ['messages/fr.json', "fois vitesse d'échappement vₑ", "fois vitesse d'éjection vₑ", 1],
  [
    'messages/fr.json',
    "se convertit directement en vitesse d'échappement",
    "se convertit directement en vitesse d'éjection",
    1,
  ],
  ['i18n-src/hi/belts/kuiper.json', 'परिहेलियन', 'उपसौर', 1],
  ['i18n-src/hi/small-bodies/eris.json', 'परिहेलियन', 'उपसौर', 1],
  ['i18n-src/hi/fleet/orbiter/parker-solar-probe.json', 'पेरिहेलियन', 'उपसौर', 1],
  ['i18n-src/hi/fleet/orbiter/solar-orbiter.json', 'पेरिहेलियन', 'उपसौर', 1],
  ['i18n-src/hi/planets/mercury.json', 'पेरिहेलियन', 'उपसौर', 1],
  ['i18n-src/hi/planets/mars.json', 'अपहेलियन', 'अपसौर', 1],
];
let bad = 0;
for (const [f, a, b, n] of R) {
  const s = fs.readFileSync(f, 'utf8');
  const k = s.split(a).length - 1;
  if (k !== n) {
    console.log(`SKIP ${f}: "${a}" ×${k}, expected ${n}`);
    bad++;
    continue;
  }
  fs.writeFileSync(f, s.split(a).join(b));
}
console.log(bad ? `${bad} skipped` : 'all applied');

// Second pass: counts corrected after the first run; hi Mercury had perihelion and aphelion
// reversed (both notes said अपसूर, aphelion, where the English says perihelion) — rewritten.
const R2 = [
  ['static/data/image-alt-text/fr.json', 'régolite', 'régolithe', 6],
  ['i18n-src/hi/fleet/orbiter/solar-orbiter.json', 'पेरिहेलियन', 'उपसौर', 2],
  ['i18n-src/hi/small-bodies/eris.json', 'अपहेलियन', 'अपसौर', 2],
  [
    'i18n-src/hi/planets/mercury.json',
    'बुध का 0.206 विकेंद्रता 8 ग्रहों में सर्वोच्च है — अपसूर में सूर्य अपहेलियन की तुलना में इसके आकाश में 1.5× बड़ा दिखाई देता है।',
    'बुध की 0.206 उत्केंद्रता 8 ग्रहों में सबसे अधिक है — उपसौर पर उसके आकाश में सूर्य अपसौर की तुलना में 1.5× बड़ा दिखाई देता है।',
    1,
  ],
  [
    'i18n-src/hi/planets/mercury.json',
    'Vis-viva वह है जो बुध को अपसूर में नाटकीय रूप से तेज गति दिखाता है और अपहेलियन में धीमा करता है — 12 km/s का दोलन।',
    'Vis-viva ही दिखाता है कि बुध उपसौर पर नाटकीय रूप से तेज़ और अपसौर पर धीमा हो जाता है — 12 km/s का अंतर।',
    1,
  ],
];
if (process.argv.includes('--second'))
  for (const [f, a, b, n] of R2) {
    const s = fs.readFileSync(f, 'utf8');
    const k = s.split(a).length - 1;
    if (k !== n) {
      console.log(`SKIP ${f}: ×${k}, expected ${n}`);
      continue;
    }
    fs.writeFileSync(f, s.split(a).join(b));
    console.log('fixed', f);
  }

// Third pass: hi Mars bio said "genetically about 20% farther" (आनुवंशिकीय रूप से) and kept the
// transliterated perihelion — rewritten from the English.
const MARS_OLD =
  'आंतरिक ग्रहों में सर्वोच्च विकेंद्रता (e=0.093) — मंगल अपसौर पर सूर्य से आनुवंशिकीय रूप से लगभग 20% अधिक दूर घूमता है जितना कि पेरिहेलियन पर, जो बड़े ऋतुगत परिवर्तन और धूल-तूफान के झूलों को चलाता है।';
const MARS_NEW =
  'आंतरिक ग्रहों में सबसे अधिक उत्केंद्रता (e=0.093) — मंगल अपसौर पर उपसौर की तुलना में सूर्य से लगभग 20% अधिक दूर चला जाता है, जिससे ऋतुओं और धूल-तूफ़ानों में बड़े उतार-चढ़ाव आते हैं।';
if (process.argv.includes('--third')) {
  const f = 'i18n-src/hi/planets/mars.json';
  const s = fs.readFileSync(f, 'utf8');
  if (s.split(MARS_OLD).length === 2) {
    fs.writeFileSync(f, s.replace(MARS_OLD, MARS_NEW));
    console.log('fixed', f);
  } else console.log('SKIP', f);
}
