// Chunk 3, widening 2 (2026-11-04, after reading every miss): inflections and word orders the
// stems missed (ru низкой земной орбиты, nl lage banen, plural perieli / perihelia, sr
// ексцентричношћу), standard variants (ko 정지 전이 GTO, hi भू-स्थैतिक, ru пусковое окно, sr
// стартни прозор). "a SpaceX eccentricity" is the quirk sense: that page is skipped for the term.
import fs from 'node:fs';

const F = 'scripts/i18n-tools/native-terms.json';
const g = JSON.parse(fs.readFileSync(F, 'utf8'));
const W = {
  'low Earth orbit': {
    ru: ['низк\\p{L}* земн\\p{L}* орбит'],
    ko: ['낮은 지구 ?궤도'],
    hi: ['(?:निम्न|निचल)[\\p{L}\\p{M}]*-पृथ्वी'],
    fr: ['basses? orbites?'],
    nl: ['lage (?:aard|omloop)?ban'],
  },
  geostationary: {
    ko: ['정지 ?(?:전이|천이)', '정지 ?통신'],
    hi: ['भू-?स्थैतिक'],
    ar: ['ثابت\\p{L}* (?:ال)?(?:موضع )?(?:ال)?جغرافي'],
  },
  'polar orbit': {
    ru: ['полярн\\p{L}* (?:\\p{L}+ )?орбит', 'полярн\\p{L}* вит'],
    'zh-CN': ['极区轨道'],
    ar: ['مدار\\p{L}*(?: [\\p{L}\\w.-]+){0,2} (?:ال)?قطبي', 'قريب من (?:ال)?قطبي'],
    de: ['polar\\p{L}* (?:Mond|Sonnen)?(?:umlauf|umkreis)', 'Polarumläuf', 'polar\\p{L}* Neigung'],
    fr: ['orbites? (?:\\p{L}+ ){0,2}polaires?'],
    es: ['órbitas? (?:\\p{L}+ ){0,2}polar'],
    it: ['orbit\\p{L}* (?:\\p{L}+ ){0,2}polar'],
    'pt-BR': ['órbitas? (?:\\p{L}+ ){0,2}polar'],
  },
  perihelion: {
    it: ['perieli'],
    nl: ['perihelia'],
    'pt-BR': ['periéli'],
  },
  aphelion: {
    it: ['afeli'],
    nl: ['aphelia'],
  },
  eccentricity: {
    _en_skip: ['programs/spacex.json'],
    'sr-Cyrl': ['ексцентричнош'],
    ar: ['لا ?مركزي'],
  },
  'launch window': {
    ru: ['пусков\\p{L}* окн', 'окн\\p{L}* запуска'],
    ja: ['打上げ?窓'],
    ko: ['발사 ?시기'],
    ar: ['(?:نافذ|نوافذ)\\p{L}* (?:ال)?انطلاق'],
    'sr-Cyrl': ['стартн\\p{L}* прозор'],
  },
  'escape velocity': {
    ru: ['скорост\\p{L}* ухода'],
    hi: ['मुक्ति गति'],
  },
};
let n = 0;
for (const [term, w] of Object.entries(W))
  for (const [k, v] of Object.entries(w)) {
    if (k.startsWith('_')) {
      g.term[term][k] = v;
      continue;
    }
    for (const s of v)
      if (!g.term[term]._match[k].includes(s)) {
        g.term[term]._match[k].push(s);
        n++;
      }
  }
fs.writeFileSync(F, JSON.stringify(g, null, 2) + '\n');
console.log('stems added', n);
