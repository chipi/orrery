// Glossary chunk 5 (0.9.6): astronomy terms into native-terms.json `term`. Binding = the site's
// majority form per locale (term-candidates.mjs, 2026-11-04); where a locale has two standard
// forms both are stems (hi एक्सोप्लैनेट / बहिर्ग्रह, nl asteroïden- / planetoïdengordel, hi सौर
// पवन / सौर वायु). ar «الكواكب الخارجية» can also mean the outer planets: read in the round.
//   node scripts/i18n-tools/maps/2026-11-04-terms-chunk5/add-terms.mjs
import fs from 'node:fs';

const F = 'scripts/i18n-tools/native-terms.json';
const g = JSON.parse(fs.readFileSync(F, 'utf8'));
const L = ['ru', 'ja', 'zh-CN', 'ko', 'hi', 'ar', 'sr-Cyrl', 'de', 'fr', 'es', 'it', 'nl', 'pt-BR'];
const MAJ = 'site majority form (term-candidates.mjs, 2026-11-04)';

const T = {
  exoplanet: {
    _sense: 'a planet orbiting a star other than the Sun',
    _read_more: 'exoplanets/transit',
    forms: {
      ru: ['экзопланета', ['экзопланет'], 'high'],
      ja: ['系外惑星', ['系外惑星'], 'high'],
      'zh-CN': ['系外行星', ['系外行星'], 'high'],
      ko: ['외계행성', ['외계 ?행성'], 'high'],
      hi: ['एक्सोप्लैनेट', ['एक्सोप्लैनेट', 'बहिर्ग्रह', 'बाह्यग्रह'], 'medium'],
      ar: [
        'الكواكب الخارجية',
        [
          '(?:ال)?كواكب (?:ال)?خارجية',
          'كوكب[\\p{L}]* خارج (?:ال)?مجموعة (?:ال)?شمسية',
          'خارج (?:ال)?مجموعة (?:ال)?شمسية',
        ],
        'medium',
      ],
      'sr-Cyrl': ['егзопланета', ['егзопланет'], 'high'],
      de: ['Exoplanet', ['Exoplanet'], 'high'],
      fr: ['exoplanète', ['exoplanète'], 'high'],
      es: ['exoplaneta', ['exoplaneta'], 'high'],
      it: ['esopianeta', ['esopianet'], 'high'],
      nl: ['exoplaneet', ['exoplane'], 'high'],
      'pt-BR': ['exoplaneta', ['exoplaneta'], 'high'],
    },
  },
  'light-year': {
    _sense: 'the distance light travels in a year, about 9.46 trillion km',
    _en: '\\blight[- ]years?\\b',
    _read_more: 'scales-time/light-minute',
    forms: {
      ru: ['световой год', ['светов\\p{L}* (?:год|лет)'], 'high'],
      ja: ['光年', ['光年'], 'high'],
      'zh-CN': ['光年', ['光年'], 'high'],
      ko: ['광년', ['광년'], 'high'],
      hi: ['प्रकाश-वर्ष', ['प्रकाश[- ]वर्ष'], 'high'],
      ar: ['سنة ضوئية', ['(?:سن|سنوات|سنين)[\\p{L}]* (?:ال)?ضوئي'], 'high'],
      'sr-Cyrl': ['светлосна година', ['светлосн\\p{L}* годин'], 'high'],
      de: ['Lichtjahr', ['Lichtjahr'], 'high'],
      fr: ['année-lumière', ['années?-lumière'], 'high'],
      es: ['año luz', ['años? luz'], 'high'],
      it: ['anno luce', ['ann[oi] luce'], 'high'],
      nl: ['lichtjaar', ['lichtja(?:a|r)r'], 'high'],
      'pt-BR': ['ano-luz', ['anos?-luz'], 'high'],
    },
  },
  'habitable zone': {
    _sense: 'the range of distances from a star where liquid water could exist on a surface',
    _en: '\\bhabitable zones?\\b',
    _read_more: 'exoplanets/habitable-zone',
    forms: {
      ru: ['обитаемая зона', ['обитаем\\p{L}* зон', 'зон\\p{L}* обитаемости'], 'high'],
      ja: ['ハビタブルゾーン', ['ハビタブル・?ゾーン', '生命居住可能(?:領域|ゾーン)'], 'high'],
      'zh-CN': ['宜居带', ['宜居带', '宜居区'], 'high'],
      ko: ['거주 가능 영역', ['거주 ?가능 ?(?:영역|지대|구역)'], 'high'],
      hi: ['रहने योग्य क्षेत्र', ['रहने योग्य क्षेत्र', 'आवास[\\p{L}\\p{M}]* क्षेत्र'], 'high'],
      ar: [
        'النطاق الصالح للسكن',
        ['(?:نطاق|منطقة)[\\p{L}]* (?:ال)?صالح[\\p{L}]* (?:لل)?سكن', 'صالح[\\p{L}]* للحياة'],
        'medium',
      ],
      'sr-Cyrl': ['настањива зона', ['настањив\\p{L}* зон'], 'high'],
      de: ['habitable Zone', ['habitabl\\p{L}* Zone', 'Lebenszone'], 'high'],
      fr: ['zone habitable', ['zones? habitables?'], 'high'],
      es: ['zona habitable', ['zonas? habitables?'], 'high'],
      it: ['zona abitabile', ['zon\\p{L}* abitabil'], 'high'],
      nl: ['bewoonbare zone', ['bewoonbare zone'], 'high'],
      'pt-BR': ['zona habitável', ['zonas? habitáve'], 'high'],
    },
  },
  'asteroid belt': {
    _sense: 'the ring of small rocky bodies between Mars and Jupiter',
    _en: '\\b(?:main[- ])?asteroid belt\\b',
    _read_more: 'planets/asteroid-belt',
    forms: {
      ru: ['пояс астероидов', ['пояс\\p{L}* астероидов'], 'high'],
      ja: ['小惑星帯', ['小惑星帯'], 'high'],
      'zh-CN': ['小行星带', ['小行星带'], 'high'],
      ko: ['소행성대', ['소행성대'], 'high'],
      hi: ['क्षुद्रग्रह घेरा', ['क्षुद्रग्रह (?:घेर|पट्टी|बेल्ट)'], 'medium'],
      ar: ['حزام الكويكبات', ['حزام (?:ال)?كويكبات'], 'high'],
      'sr-Cyrl': ['астероидни појас', ['астероидн\\p{L}* појас', 'појас\\p{L}* астероида'], 'high'],
      de: ['Asteroidengürtel', ['Asteroidengürtel'], 'high'],
      fr: ["ceinture d'astéroïdes", ['ceintures? d.astéroïdes', 'ceinture principale'], 'high'],
      es: ['cinturón de asteroides', ['cinturón (?:principal )?de asteroides'], 'high'],
      it: [
        'fascia degli asteroidi',
        ['fasci\\p{L}* (?:principale )?(?:degli|di) asteroidi'],
        'high',
      ],
      nl: ['asteroïdengordel', ['asteroïdengordel', 'planetoïdengordel'], 'high'],
      'pt-BR': ['cinturão de asteroides', ['cinturão (?:principal )?de asteroides'], 'high'],
    },
  },
  'solar wind': {
    _sense: 'the stream of charged particles flowing out from the Sun',
    _en: '\\bsolar winds?\\b',
    _read_more: 'planets/magnetic-fields',
    forms: {
      ru: ['солнечный ветер', ['солнечн\\p{L}* ветр', 'солнечн\\p{L}* ветер'], 'high'],
      ja: ['太陽風', ['太陽風'], 'high'],
      'zh-CN': ['太阳风', ['太阳风'], 'high'],
      ko: ['태양풍', ['태양풍'], 'high'],
      hi: ['सौर पवन', ['सौर (?:पवन|वायु|हवा)'], 'medium'],
      ar: ['الرياح الشمسية', ['(?:ال)?رياح (?:ال)?شمسية'], 'high'],
      'sr-Cyrl': ['сунчев ветар', ['сунчев\\p{L}* вет(?:ар|р)'], 'high'],
      de: ['Sonnenwind', ['Sonnenwind'], 'high'],
      fr: ['vent solaire', ['vents? solaires?'], 'high'],
      es: ['viento solar', ['vientos? solar'], 'high'],
      it: ['vento solare', ['vent[oi] solar'], 'high'],
      nl: ['zonnewind', ['zonnewind'], 'high'],
      'pt-BR': ['vento solar', ['ventos? solar'], 'high'],
    },
  },
  magnetosphere: {
    _sense: 'the region around a body controlled by its magnetic field',
    _read_more: 'planets/magnetic-fields',
    forms: {
      ru: ['магнитосфера', ['магнитосфер'], 'high'],
      ja: ['磁気圏', ['磁気圏'], 'high'],
      'zh-CN': ['磁层', ['磁层'], 'high'],
      ko: ['자기권', ['자기권'], 'high'],
      hi: ['चुंबकमंडल', ['चुंबकमंडल', 'चुम्बकमण्डल'], 'high'],
      ar: ['الغلاف المغناطيسي', ['(?:ال)?غلاف (?:ال)?مغناطيسي'], 'high'],
      'sr-Cyrl': ['магнетосфера', ['магнетосфер'], 'high'],
      de: ['Magnetosphäre', ['Magnetosphäre'], 'high'],
      fr: ['magnétosphère', ['magnétosphère'], 'high'],
      es: ['magnetosfera', ['magnetosfera'], 'high'],
      it: ['magnetosfera', ['magnetosfer'], 'high'],
      nl: ['magnetosfeer', ['magnetosfe'], 'high'],
      'pt-BR': ['magnetosfera', ['magnetosfera'], 'high'],
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
