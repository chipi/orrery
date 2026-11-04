// Glossary chunk 2 (0.9.6): return and surface terms into native-terms.json `term`. Binding = the
// site's majority form per locale (term-candidates.mjs, 2026-11-04); stems = every standard
// variant the site already uses. "re-entry" is not a term of its own: `entry` covers it.
//   node scripts/i18n-tools/maps/2026-11-04-terms-chunk2/add-terms.mjs
import fs from 'node:fs';

const F = 'scripts/i18n-tools/native-terms.json';
const g = JSON.parse(fs.readFileSync(F, 'utf8'));
const L = ['ru', 'ja', 'zh-CN', 'ko', 'hi', 'ar', 'sr-Cyrl', 'de', 'fr', 'es', 'it', 'nl', 'pt-BR'];
const MAJ = 'site majority form (term-candidates.mjs, 2026-11-04)';

const T = {
  splashdown: {
    _sense: 'a capsule landing in the sea under parachutes',
    _en: '\\bsplash(?:ed|es)?[- ]?downs?\\b',
    _read_more: 'mission-phases/edl',
    forms: {
      ru: ['приводнение', ['приводн'], 'high'],
      ja: ['着水', ['着水'], 'high'],
      'zh-CN': ['溅落', ['溅落'], 'high'],
      ko: ['착수', ['착수'], 'high'],
      hi: ['स्प्लैशडाउन', ['स्प्लैशडाउन', 'समुद्र[- ]?अवतरण', 'समुद्र में (?:उतर|गिर)'], 'medium'],
      ar: [
        'هبوط مائي',
        ['هبوط\\p{L}* (?:ال)?مائي', 'هبوط\\p{L}* في (?:ال)?(?:محيط|بحر)'],
        'medium',
      ],
      'sr-Cyrl': [
        'спуштање у океан',
        [
          'спушт\\p{L}* (?:\\p{L}+ )?(?:у|на) (?:воду|океан|море|Атлантик|Пацифик|Тихи)',
          'спустил\\p{L}* (?:\\p{L}+ )?(?:у|на) (?:воду|океан|море)',
        ],
        'medium',
      ],
      de: ['Wasserung', ['Wasserung', 'Wasserlandung', 'wasserte'], 'high'],
      fr: ['amerrissage', ['amerri\\p{L}*'], 'high'],
      es: ['amerizaje', ['ameriz\\p{L}*', 'amaraje', 'amar[ao]'], 'high'],
      it: ['ammaraggio', ['ammar\\p{L}*'], 'high'],
      nl: [
        'waterlanding',
        ['waterlanding', 'landde in (?:zee|de oceaan|de \\p{L}+ Oceaan)', 'in zee'],
        'medium',
      ],
      'pt-BR': ['amerissagem', ['ameriss\\p{L}*', 'amerrissagem'], 'high'],
    },
  },
  'sample return': {
    _sense: 'bringing material from another body back to Earth',
    _en: '\\bsample[- ]return\\b',
    _read_more: 'mission-phases/mission-types',
    forms: {
      ru: [
        'возврат образцов',
        ['возвра\\p{L}* (?:\\p{L}+ )?образц', 'доставк\\p{L}* (?:\\p{L}+ )?(?:образц|грунт)'],
        'medium',
      ],
      ja: [
        'サンプルリターン',
        ['サンプル・?リターン', '試料(?:の)?(?:回収|持ち帰り|帰還)'],
        'high',
      ],
      'zh-CN': ['采样返回', ['采样返回', '样本返回', '取样返回', '样品返回'], 'high'],
      ko: ['샘플 귀환', ['샘플 ?(?:귀환|회수)', '시료 ?(?:귀환|회수)'], 'medium'],
      hi: ['नमूना वापसी', ['नमून\\p{L}* (?:की )?वापसी'], 'high'],
      ar: ['إعادة العينات', ['إعاد\\p{L}* (?:ال)?عينات', 'عود\\p{L}* (?:ال)?عينات'], 'medium'],
      'sr-Cyrl': ['повратак узорака', ['поврат\\p{L}* узорак'], 'high'],
      de: [
        'Probenrückführung',
        ['Probenrückführung', 'Mondprobenrückführung', 'Probenrückhol'],
        'high',
      ],
      fr: ["retour d'échantillons", ['retours? d.échantillons'], 'high'],
      es: ['retorno de muestras', ['retornos? de muestras'], 'high'],
      it: ['ritorno di campioni', ['ritorn\\p{L}* (?:di|dei) campion'], 'high'],
      nl: [
        'monsterterugkeer',
        ['monsterterugkeer', 'maanmonsterterugkeer', 'terugkeer van (?:\\p{L}+ )?monsters'],
        'high',
      ],
      'pt-BR': ['retorno de amostras', ['retornos? de amostras'], 'high'],
    },
  },
  regolith: {
    _sense: 'the loose broken rock and dust covering a body without much air',
    _read_more: 'planets/regolith',
    forms: {
      ru: ['реголит', ['реголит'], 'high'],
      ja: ['レゴリス', ['レゴリス'], 'high'],
      'zh-CN': ['风化层', ['风化层', '月壤', '土壤'], 'medium'],
      ko: ['레골리스', ['레골리스'], 'high'],
      hi: ['रेगोलिथ', ['रेगोलिथ'], 'high'],
      ar: ['الريغوليث', ['ريغوليث', 'ريجوليث', 'الثرى'], 'medium'],
      'sr-Cyrl': ['реголит', ['реголит'], 'high'],
      de: ['Regolith', ['Regolith'], 'high'],
      fr: ['régolithe', ['régolithe'], 'high'],
      es: ['regolito', ['regolito'], 'high'],
      it: ['regolite', ['regolite'], 'high'],
      nl: ['regoliet', ['regoliet'], 'high'],
      'pt-BR': ['regolito', ['regolito'], 'high'],
    },
  },
  microgravity: {
    _sense: 'the near-weightless state in orbit',
    _read_more: 'life-in-space/microgravity-physiology',
    forms: {
      ru: ['микрогравитация', ['микрогравитаци'], 'high'],
      ja: ['微小重力', ['微小重力'], 'high'],
      'zh-CN': ['微重力', ['微重力'], 'high'],
      ko: ['미세중력', ['미세 ?중력', '미소 ?중력'], 'high'],
      hi: ['सूक्ष्म-गुरुत्व', ['सूक्ष्म[- ]?गुरुत्व'], 'medium'],
      ar: ['الجاذبية الصغرى', ['جاذبي\\p{L}* (?:ال)?صغرى', 'جاذبي\\p{L}* متناهية'], 'medium'],
      'sr-Cyrl': ['микрогравитација', ['микрогравитациј'], 'high'],
      de: ['Mikrogravitation', ['Mikrogravitation', 'Schwerelosigkeit'], 'high'],
      fr: ['microgravité', ['microgravité'], 'high'],
      es: ['microgravedad', ['microgravedad'], 'high'],
      it: ['microgravità', ['microgravità'], 'high'],
      nl: ['microzwaartekracht', ['microzwaartekracht'], 'high'],
      'pt-BR': ['microgravidade', ['microgravidade'], 'high'],
    },
  },
  'life support': {
    _sense: 'the systems that keep a crew alive: air, water, temperature, waste',
    _en: '\\blife[- ]support\\b',
    _en_cs: true,
    _read_more: 'life-in-space/eclss-life-support',
    forms: {
      ru: ['жизнеобеспечение', ['жизнеобеспечени'], 'high'],
      ja: ['生命維持', ['生命維持'], 'high'],
      'zh-CN': ['生命保障', ['生命保障', '生命支持'], 'high'],
      ko: ['생명 유지', ['생명 ?유지'], 'high'],
      hi: ['जीवन-समर्थन', ['जीवन[- ]?(?:समर्थन|रक्षा|रक्षक)'], 'medium'],
      ar: ['دعم الحياة', ['دعم (?:ال)?حياة'], 'high'],
      'sr-Cyrl': ['одржавање живота', ['одржавањ\\p{L}* живота'], 'high'],
      de: ['Lebenserhaltung', ['Lebenserhaltung'], 'high'],
      fr: ['support de vie', ['support de vie', 'soutien[- ]vie', 'survie'], 'medium'],
      es: ['soporte vital', ['soporte vital'], 'high'],
      it: ['supporto vitale', ['supporto vitale'], 'high'],
      nl: ['levensondersteuning', ['levensondersteuning'], 'high'],
      'pt-BR': ['suporte de vida', ['suporte (?:de|à) vida', 'suporte vital'], 'medium'],
    },
  },
  'solar array': {
    _sense: 'the solar panels that power a spacecraft or station',
    _en: '\\bsolar[- ]arrays?\\b',
    _read_more: 'space-stations/solar-power-budget',
    forms: {
      ru: ['солнечные батареи', ['солнечн\\p{L}* (?:батаре|панел)'], 'high'],
      ja: ['太陽電池パドル', ['太陽電池'], 'medium'],
      'zh-CN': ['太阳能电池阵', ['太阳能电池', '太阳电池', '太阳翼'], 'high'],
      ko: ['태양전지판', ['태양 ?전지', '태양광 ?패널'], 'medium'],
      hi: ['सौर पैनल', ['सौर (?:पैनल|सारणि|सरणि)'], 'medium'],
      ar: ['الألواح الشمسية', ['(?:مصفوف|ألواح|لوح|صفيف)\\p{L}* (?:ال)?شمسي'], 'medium'],
      'sr-Cyrl': ['соларни панели', ['соларн\\p{L}* панел'], 'high'],
      de: [
        'Solarmodule',
        [
          'Solarmodul',
          'Solarpaneel',
          'Solarzell\\p{L}*',
          'Solarflügel',
          'Sonnensegel',
          'Solargenerator',
        ],
        'low',
      ],
      fr: ['panneaux solaires', ['panneaux? solaires?'], 'high'],
      es: ['paneles solares', ['panel\\p{L}* solar'], 'high'],
      it: ['pannelli solari', ['pannell\\p{L}* solar'], 'high'],
      nl: ['zonnepanelen', ['zonnepane'], 'high'],
      'pt-BR': ['painéis solares', ['painé?i?\\p{L}* solar'], 'high'],
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
