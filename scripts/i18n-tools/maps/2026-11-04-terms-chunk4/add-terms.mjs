// Glossary chunk 4 (0.9.6): transfer terms into native-terms.json `term`. Binding = the site's
// majority form per locale (term-candidates.mjs, 2026-11-04), except nl Hohmann: the majority
// «Hohmann-overdracht» uses overdracht (a handover of ownership), so the binding is the Dutch
// technical form «Hohmann-transferbaan» and «overdracht» is fixed like nl «steekproef». C3 is a
// symbol written C3 everywhere; its entry exists for the glossary definition.
//   node scripts/i18n-tools/maps/2026-11-04-terms-chunk4/add-terms.mjs
import fs from 'node:fs';

const F = 'scripts/i18n-tools/native-terms.json';
const g = JSON.parse(fs.readFileSync(F, 'utf8'));
const L = ['ru', 'ja', 'zh-CN', 'ko', 'hi', 'ar', 'sr-Cyrl', 'de', 'fr', 'es', 'it', 'nl', 'pt-BR'];
const MAJ = 'site majority form (term-candidates.mjs, 2026-11-04)';
const C3 = 'C[3₃]';

const T = {
  'Hohmann transfer': {
    _sense: 'the cheapest two-burn transfer between two circular orbits, along half an ellipse',
    _en: '\\bHohmann(?:-class)? (?:transfer|ellipse|orbit|trajector)',
    _read_more: 'transfers/hohmann-transfer',
    forms: {
      ru: ['переход Гомана', ['Гоман'], 'high'],
      ja: ['ホーマン遷移', ['ホーマン'], 'high'],
      'zh-CN': ['霍曼转移', ['霍曼'], 'high'],
      ko: ['호만 전이', ['호만'], 'high'],
      hi: ['होमान स्थानांतरण', ['होमान'], 'high'],
      ar: ['انتقال هوهمان', ['هوهمان'], 'high'],
      'sr-Cyrl': ['Хоманова прелазна путања', ['Хоман'], 'high'],
      de: ['Hohmann-Transfer', ['Hohmann'], 'high'],
      fr: ['transfert de Hohmann', ['Hohmann'], 'high'],
      es: ['transferencia de Hohmann', ['Hohmann'], 'high'],
      it: ['trasferimento di Hohmann', ['Hohmann'], 'high'],
      nl: [
        'Hohmann-transferbaan',
        ['Hohmann-?(?:transfer|baan|overgang)', 'Hohmannbaan'],
        'medium',
      ],
      'pt-BR': ['transferência de Hohmann', ['Hohmann'], 'high'],
    },
  },
  'Lagrange point': {
    _sense: 'one of five points where a small body can keep its place relative to two large ones',
    _en: '\\bLagrang(?:e|ian) points?\\b|\\bLagrange-point\\b',
    _read_more: 'orbits/lagrange-points',
    forms: {
      ru: ['точка Лагранжа', ['Лагранж'], 'high'],
      ja: ['ラグランジュ点', ['ラグランジュ'], 'high'],
      'zh-CN': ['拉格朗日点', ['拉格朗日'], 'high'],
      ko: ['라그랑주점', ['라그랑주'], 'high'],
      hi: ['लाग्रांज बिंदु', ['लाग्रांज'], 'high'],
      ar: ['نقطة لاغرانج', ['لاغرانج'], 'high'],
      'sr-Cyrl': ['Лагранжова тачка', ['Лагранж'], 'high'],
      de: ['Lagrange-Punkt', ['Lagrange'], 'high'],
      fr: ['point de Lagrange', ['Lagrange'], 'high'],
      es: ['punto de Lagrange', ['Lagrange'], 'high'],
      it: ['punto di Lagrange', ['Lagrange'], 'high'],
      nl: ['lagrangepunt', ['[Ll]agrange'], 'high'],
      'pt-BR': ['ponto de Lagrange', ['Lagrange'], 'high'],
    },
  },
  C3: {
    _sense: 'characteristic energy, the excess launch energy (km²/s²) a departure needs',
    _en: '\\bC3\\b',
    _en_cs: true,
    _read_more: 'propulsion/c3',
    forms: Object.fromEntries(L.map((l) => [l, ['C3', [C3], 'high']])),
  },
  'rocket equation': {
    _sense: 'the Tsiolkovsky rocket equation: Δv from exhaust velocity and mass ratio',
    _en: '\\brocket equation\\b|\\bTsiolkovsky(?: rocket)? equation\\b',
    _read_more: 'propulsion/tsiolkovsky',
    forms: {
      ru: [
        'уравнение Циолковского',
        [
          'уравнени\\p{L}* (?:Циолковского|ракет)',
          'формул\\p{L}* Циолковского',
          'ракетн\\p{L}* уравнени',
        ],
        'high',
      ],
      ja: ['ロケット方程式', ['ロケット方程式', 'ツィオルコフスキー(?:の)?(?:式|方程式)'], 'high'],
      'zh-CN': ['火箭方程', ['火箭方程', '齐奥尔科夫斯基(?:公式|方程)'], 'high'],
      ko: ['로켓 방정식', ['로켓 ?방정식', '치올콥스키 ?(?:방정식|공식)'], 'high'],
      hi: ['रॉकेट समीकरण', ['रॉकेट समीकरण', 'त्सिओल्कोव्स्की समीकरण'], 'high'],
      ar: ['معادلة الصاروخ', ['معادل[\\p{L}]* (?:ال)?صاروخ', 'معادل[\\p{L}]* تسيولكوفسكي'], 'high'],
      'sr-Cyrl': ['једначина ракете', ['једначин\\p{L}* (?:ракет|Циолковског)'], 'high'],
      de: ['Raketengleichung', ['Raketen(?:grund)?gleichung', 'Ziolkowski-Gleichung'], 'high'],
      fr: [
        'équation de la fusée',
        ['équations? (?:de la fusée|des fusées|de Tsiolkovski)'],
        'high',
      ],
      es: ['ecuación del cohete', ['ecuaci\\p{L}* (?:del cohete|de Tsiolkovski)'], 'high'],
      it: [
        'equazione del razzo',
        ['equazion\\p{L}* (?:del razzo|dei razzi|di Ciolkovskij)'],
        'high',
      ],
      nl: ['raketvergelijking', ['raketvergelijking', 'vergelijking van Tsiolkovski'], 'high'],
      'pt-BR': ['equação do foguete', ['equaç\\p{L}* (?:do foguete|de Tsiolkovsky)'], 'high'],
    },
  },
  'free-return': {
    _sense: 'a lunar trajectory that swings round the Moon and back to Earth with no burn',
    _en: '\\bfree[- ]return\\b',
    _read_more: 'transfers/free-return',
    forms: {
      ru: ['свободный возврат', ['свободн\\p{L}* возврат'], 'high'],
      ja: ['自由帰還', ['自由帰還'], 'high'],
      'zh-CN': ['自由返回', ['自由返回'], 'high'],
      ko: ['자유 귀환', ['자유 ?(?:귀환|복귀)'], 'medium'],
      hi: ['मुक्त-वापसी', ['मुक्त[- ]वापसी'], 'high'],
      ar: ['العودة الحرة', ['عود[\\p{L}]* (?:ال)?حرة'], 'high'],
      'sr-Cyrl': ['слободни повратак', ['слободн\\p{L}* поврат'], 'high'],
      de: ['Free-Return-Bahn', ['Free-Return', 'freie\\p{L}* Rückkehr', 'Freiflug'], 'low'],
      fr: ['retour libre', ['retour libre'], 'high'],
      es: ['retorno libre', ['retorno libre'], 'high'],
      it: ['ritorno libero', ['ritorno libero'], 'high'],
      nl: ['vrije-terugkeerbaan', ['vrije[- ]?terugkeer', 'free-return'], 'medium'],
      'pt-BR': ['retorno livre', ['retorno livre'], 'high'],
    },
  },
  'sun-synchronous': {
    _sense: 'a near-polar orbit that crosses each latitude at the same local solar time',
    _en: '\\bsun[- ]synchronous\\b',
    _read_more: 'orbits/sun-synchronous',
    forms: {
      ru: ['солнечно-синхронная орбита', ['солнечно-синхронн'], 'high'],
      ja: ['太陽同期軌道', ['太陽同期'], 'high'],
      'zh-CN': ['太阳同步轨道', ['太阳同步'], 'high'],
      ko: ['태양동기궤도', ['태양 ?동기'], 'high'],
      hi: ['सूर्य-समकालिक', ['सूर्य[- ](?:समकालिक|समकालीन|तुल्यकालिक)'], 'medium'],
      ar: ['المدار المتزامن مع الشمس', ['متزامن[\\p{L}]* مع (?:ال)?شمس'], 'high'],
      'sr-Cyrl': ['сунчево-синхрона орбита', ['сунчево-синхрон'], 'high'],
      de: ['sonnensynchrone Umlaufbahn', ['sonnensynchron'], 'high'],
      fr: ['orbite héliosynchrone', ['héliosynchrone'], 'high'],
      es: ['órbita heliosíncrona', ['heliosíncron'], 'high'],
      it: ['orbita eliosincrona', ['eliosincron'], 'high'],
      nl: ['zonsynchrone baan', ['zonsynchro'], 'high'],
      'pt-BR': [
        'órbita heliossíncrona',
        ['heliossíncron', 'síncron\\p{L}* (?:com|ao) (?:o )?Sol'],
        'medium',
      ],
    },
  },
  'halo orbit': {
    _sense: 'a looping orbit around a Lagrange point (e.g. NRHO, JWST at L2)',
    _en: '\\bhalo orbits?\\b',
    _read_more: 'orbits/cislunar-orbits',
    forms: {
      ru: ['гало-орбита', ['гало'], 'high'],
      ja: ['ハロー軌道', ['ハロー'], 'high'],
      'zh-CN': ['晕轨道', ['晕轨道', '晕'], 'high'],
      ko: ['헤일로 궤도', ['헤일로'], 'high'],
      hi: ['हेलो कक्षा', ['हेलो'], 'high'],
      ar: ['مدار هالة', ['هال[\\p{L}]*'], 'high'],
      'sr-Cyrl': ['хало орбита', ['хало'], 'high'],
      de: ['Halo-Orbit', ['Halo'], 'high'],
      fr: ['orbite de halo', ['halo'], 'high'],
      es: ['órbita de halo', ['halo'], 'high'],
      it: ['orbita halo', ['halo'], 'high'],
      nl: ['halobaan', ['halo'], 'high'],
      'pt-BR': ['órbita de halo', ['halo'], 'high'],
    },
  },
};

let added = 0;
for (const [term, { forms, ...meta }] of Object.entries(T)) {
  if (g.term[term]) {
    console.log('exists, skipped:', term);
    continue;
  }
  const e = { ...meta, _match: {}, _confidence: {} };
  for (const loc of L) {
    const [form, stems, conf] = forms[loc];
    e[loc] = form;
    e._match[loc] = stems;
    e._confidence[loc] = conf;
    g.sources[`term:${term}:${loc}`] ??= MAJ;
  }
  g.term[term] = e;
  added++;
}
fs.writeFileSync(F, JSON.stringify(g, null, 2) + '\n');
console.log('added', added);
