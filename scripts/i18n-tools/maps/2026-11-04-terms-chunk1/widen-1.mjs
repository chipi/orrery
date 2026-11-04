// Chunk 1, widening 1: forms the missed fields use that are standard for the sense
// (term-candidates.mjs --misses, 2026-11-04). Sense questions are left as misses to review.
import fs from 'node:fs';

const F = 'scripts/i18n-tools/native-terms.json';
const g = JSON.parse(fs.readFileSync(F, 'utf8'));
const EVA = '(?<!\\p{L})EVA(?!\\p{L})';
const ALL = [
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
const W = {
  orbiter: {
    _en: '(?<![\\w-])orbiters?\\b',
    ru: ['орбитальн\\p{L}* корабл'],
    'sr-Cyrl': ['орбиталн\\p{L}* (?:летелиц|сонд)'],
    ja: ['軌道(?:探査)?機', '軌道衛星'],
    'zh-CN': ['轨道探测器'],
    hi: ['परिक्रमा यान', 'कक्षीय यान'],
    ar: ['تدور حول'],
    es: ['transbordador'],
    it: ['orbitatore', 'orbitante'],
    'pt-BR': ['sondas? orbita'],
  },
  lander: {
    'sr-Cyrl': ['слетач'],
    ar: ['جهاز (?:ال)?هبوط'],
    fr: ['modules? d.atterrissage', 'alunisseur'],
    es: ['módulos? de descenso', 'módulos? lunar'],
    it: ['modul\\p{L}* di atterraggio'],
    nl: ['landingsvaartuig'],
    'pt-BR': ['módulos? lunar', 'lander'],
  },
  rover: {
    ru: ['вездеход'],
    'sr-Cyrl': ['возил'],
    ja: ['探査車'],
    ko: ['탐사 ?로봇'],
    'zh-CN': ['漫游'],
    ar: ['مستكشف', 'مركب\\p{L}* (?:ال)?استكشاف'],
    es: ['vehícul\\p{L}* (?:explorador|lunar|todoterreno)'],
  },
  capsule: {
    ru: ['спускаем\\p{L}* аппарат'],
    'zh-CN': ['飞船', '航天舱'],
  },
  'upper stage': {
    _en_cs: true,
    hi: ['ऊपरी[- ]चरण'],
    ar: ['مرحل\\p{L}* علوي'],
    nl: ['bovenste[- ]trap'],
  },
  'heat shield': {
    ru: ['теплов\\p{L}* экран'],
    ko: ['열 ?방패'],
    'zh-CN': ['热防护', '热盾'],
    hi: ['ताप[- ]?ढाल'],
    de: ['Wärmeschutzschild', 'Hitzeschutz'],
    nl: ['hitteescherm'],
  },
  airlock: {
    'sr-Cyrl': ['преткомор'],
    ko: ['에어락'],
    nl: ['sluis'],
    'pt-BR': ['câmaras? de ar'],
  },
  spacewalk: {
    'sr-Cyrl': ['свемирск\\p{L}* шетњ'],
    'zh-CN': ['舱外活动'],
    hi: ['में चहलक़दमी'],
    ar: [
      'مشي\\p{L}* (?:في )?(?:ال)?فضاء',
      'خروج\\p{L}* (?:ال)?فضائي',
      'خروج\\p{L}* إلى (?:ال)?فضاء',
    ],
    de: ['Weltraumausstie\\p{L}*', 'Außenbordeins\\p{L}*', 'Weltraumspazierg\\p{L}*'],
    fr: ['sorties? spatiales?'],
    es: ['actividad\\p{L}* extravehicular'],
    it: ['passeggiat\\p{L}* nello spazio'],
    nl: ['ruimtewandel'],
    'pt-BR': ['passeios? espacia'],
  },
};
for (const loc of ALL) (W.spacewalk[loc] ??= []).push(EVA);

let n = 0;
for (const [term, w] of Object.entries(W)) {
  const e = g.term[term];
  for (const [k, v] of Object.entries(w)) {
    if (k.startsWith('_')) {
      e[k] = v;
      continue;
    }
    for (const s of v)
      if (!e._match[k].includes(s)) {
        e._match[k].push(s);
        n++;
      }
  }
}
fs.writeFileSync(F, JSON.stringify(g, null, 2) + '\n');
console.log('stems added', n);
