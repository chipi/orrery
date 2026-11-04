// Chunk 5, widening 2 (2026-11-04, after reading every miss): adjectives (fr exoplanétaire, it
// esoplanetario), the ru abbreviation «св. лет», hyphenated es / it light-year, the ar broken
// plural «المناطق الصالحة», ru «астероидного пояса», ja 小惑星ベルト, hi «क्षुद्रग्रह पेटी», ar
// «الحزام الداخلي للكويكبات», it «fascia principale / asteroidale», ar singular «الريح الشمسية»,
// sr «соларни ветар». Fixed instead: the fr English title, es «año de luz», pt-BR «Cintura»
// (European Portuguese) and the pre-2009 «asteróides».
import fs from 'node:fs';

const F = 'scripts/i18n-tools/native-terms.json';
const g = JSON.parse(fs.readFileSync(F, 'utf8'));
const W = {
  exoplanet: { fr: ['exoplanétaire'], it: ['esoplanetari'] },
  'light-year': {
    ru: ['св\\. ?лет'],
    es: ['años?[- ]luz'],
    it: ['ann[oi][- ]luce'],
  },
  'habitable zone': { ar: ['(?:ال)?مناطق[\\p{L}]* (?:ال)?صالح'] },
  'asteroid belt': {
    ru: ['астероидн\\p{L}* пояс'],
    ja: ['小惑星ベルト'],
    hi: ['क्षुद्रग्रह पेटी'],
    ar: ['حزام[\\p{L}]*(?: [\\p{L}]+)? (?:لل|من ال)كويكبات'],
    it: ['fascia principale', 'fasci\\p{L}* (?:\\p{L}+ )?(?:degli asteroidi|asteroidal)'],
  },
  'solar wind': {
    ar: ['(?:ال)?ريح (?:ال)?شمسية'],
    'sr-Cyrl': ['соларн\\p{L}* вет(?:ар|р)'],
  },
};
let n = 0;
for (const [term, w] of Object.entries(W))
  for (const [loc, v] of Object.entries(w))
    for (const s of v)
      if (!g.term[term]._match[loc].includes(s)) {
        g.term[term]._match[loc].push(s);
        n++;
      }
fs.writeFileSync(F, JSON.stringify(g, null, 2) + '\n');
console.log('stems added', n);
