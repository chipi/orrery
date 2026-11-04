// Glossary chunk 3 (0.9.6): orbit terms into native-terms.json `term`. Binding = the site's
// majority form per locale (term-candidates.mjs, 2026-11-04); stems = every standard variant the
// site already uses; the acronym LEO is accepted for low Earth orbit in every locale.
//   node scripts/i18n-tools/maps/2026-11-04-terms-chunk3/add-terms.mjs
import fs from 'node:fs';

const F = 'scripts/i18n-tools/native-terms.json';
const g = JSON.parse(fs.readFileSync(F, 'utf8'));
const L = ['ru', 'ja', 'zh-CN', 'ko', 'hi', 'ar', 'sr-Cyrl', 'de', 'fr', 'es', 'it', 'nl', 'pt-BR'];
const MAJ = 'site majority form (term-candidates.mjs, 2026-11-04)';
const LEO = '(?<!\\p{L})LEO(?!\\p{L})';
const HI = '[\\p{L}\\p{M}]*';

const T = {
  'low Earth orbit': {
    _sense: 'an orbit a few hundred km up (LEO), below about 2,000 km',
    _en: '\\blow[- ]Earth orbits?\\b',
    _read_more: 'orbits/orbit-regimes',
    forms: {
      ru: ['низкая околоземная орбита', ['низк\\p{L}* (?:околоземн|орбит)', LEO], 'high'],
      ja: ['低軌道', ['低軌道', '低地球軌道', LEO], 'high'],
      'zh-CN': ['近地轨道', ['近地轨道', '低地球轨道', '低轨', LEO], 'high'],
      ko: ['저궤도', ['저궤도', '저지구 ?궤도', LEO], 'high'],
      hi: ['निम्न पृथ्वी कक्षा', [`(?:निम्न|निचल)${HI} (?:पृथ्वी[- ])?कक्षा`, LEO], 'high'],
      ar: [
        'المدار الأرضي المنخفض',
        ['(?:ال)?مدار(?: (?:ال)?أرضي)? (?:ال)?منخفض', 'أرضي (?:ال)?منخفض', LEO],
        'high',
      ],
      'sr-Cyrl': ['ниска Земљина орбита', ['ниск\\p{L}* (?:Земљин|орбит)', LEO], 'medium'],
      de: [
        'niedrige Erdumlaufbahn',
        [
          'niedrig\\p{L}* (?:Erd)?(?:umlauf)?bahn',
          'niedrig\\p{L}* (?:Erd)?[Oo]rbit',
          'erdnah\\p{L}* (?:Umlauf)?bahn',
          LEO,
        ],
        'high',
      ],
      fr: ['orbite terrestre basse', ['orbites? (?:terrestres? )?basses?', LEO], 'high'],
      es: ['órbita terrestre baja', ['órbitas? (?:terrestres? )?bajas?', LEO], 'high'],
      it: ['orbita terrestre bassa', ['orbit\\p{L}* (?:terrestr\\p{L}* )?bass', LEO], 'high'],
      nl: ['lage baan om de aarde', ['lage (?:aard|omloop)?baan', LEO], 'high'],
      'pt-BR': ['órbita terrestre baixa', ['órbitas? (?:terrestres? )?baixas?', LEO], 'high'],
    },
  },
  geostationary: {
    _sense:
      'the orbit 35,786 km above the equator where a satellite keeps pace with the turning Earth',
    _read_more: 'orbits/special-orbits',
    forms: {
      ru: ['геостационарная орбита', ['геостационарн'], 'high'],
      ja: ['静止軌道', ['静止'], 'high'],
      'zh-CN': ['地球静止轨道', ['静止'], 'high'],
      ko: ['정지궤도', ['정지 ?궤도', '정지 ?위성', '지구 ?정지'], 'high'],
      hi: ['भूस्थिर', ['भू-?स्थिर'], 'high'],
      ar: [
        'المدار الثابت بالنسبة للأرض',
        ['ثابت\\p{L}* بالنسبة (?:لل|إلى ال)أرض', 'مستقر\\p{L}* بالنسبة'],
        'medium',
      ],
      'sr-Cyrl': ['геостационарна орбита', ['геостационарн'], 'high'],
      de: ['geostationäre Umlaufbahn', ['geostationär'], 'high'],
      fr: ['orbite géostationnaire', ['géostationnaire'], 'high'],
      es: ['órbita geoestacionaria', ['geoestacionari'], 'high'],
      it: ['orbita geostazionaria', ['geostazionari'], 'high'],
      nl: ['geostationaire baan', ['geostationair'], 'high'],
      'pt-BR': ['órbita geoestacionária', ['geoestacionári'], 'high'],
    },
  },
  'polar orbit': {
    _sense: 'an orbit passing over or near both poles',
    _en: '\\bpolar orbits?\\b',
    _read_more: 'orbits/inclination',
    forms: {
      ru: ['полярная орбита', ['полярн\\p{L}* орбит'], 'high'],
      ja: ['極軌道', ['極軌道'], 'high'],
      'zh-CN': ['极地轨道', ['极地?轨道'], 'high'],
      ko: ['극궤도', ['극 ?궤도'], 'high'],
      hi: ['ध्रुवीय कक्षा', ['ध्रुवीय कक्षा'], 'high'],
      ar: ['مدار قطبي', ['مدار\\p{L}* (?:ال)?قطبي'], 'high'],
      'sr-Cyrl': ['поларна орбита', ['поларн\\p{L}* орбит'], 'high'],
      de: [
        'polare Umlaufbahn',
        ['polar\\p{L}* (?:Umlauf)?[Bb]ahn', 'Polarbahn', 'polar\\p{L}* Orbit', 'Polarorbit'],
        'medium',
      ],
      fr: ['orbite polaire', ['orbites? polaires?'], 'high'],
      es: ['órbita polar', ['órbitas? polar'], 'high'],
      it: ['orbita polare', ['orbit\\p{L}* polar'], 'high'],
      nl: ['polaire baan', ['polaire ba(?:a|n)n'], 'high'],
      'pt-BR': ['órbita polar', ['órbitas? polar'], 'high'],
    },
  },
  perihelion: {
    _sense: 'the point of an orbit around the Sun closest to the Sun',
    _en: '\\bperihel(?:ion|ia)s?\\b',
    _read_more: 'orbits/apsides',
    forms: {
      ru: ['перигелий', ['перигели'], 'high'],
      ja: ['近日点', ['近日点'], 'high'],
      'zh-CN': ['近日点', ['近日点'], 'high'],
      ko: ['근일점', ['근일점'], 'high'],
      hi: ['उपसौर', ['उपसौर'], 'high'],
      ar: ['الحضيض الشمسي', ['حضيض\\p{L}* (?:ال)?شمسي'], 'medium'],
      'sr-Cyrl': ['перихел', ['перихел'], 'high'],
      de: ['Perihel', ['Perihel'], 'high'],
      fr: ['périhélie', ['périhélie'], 'high'],
      es: ['perihelio', ['perihelio'], 'high'],
      it: ['perielio', ['perielio'], 'high'],
      nl: ['perihelium', ['perihelium'], 'high'],
      'pt-BR': ['periélio', ['periélio'], 'high'],
    },
  },
  aphelion: {
    _sense: 'the point of an orbit around the Sun farthest from the Sun',
    _en: '\\baphel(?:ion|ia)s?\\b',
    _read_more: 'orbits/apsides',
    forms: {
      ru: ['афелий', ['афели'], 'high'],
      ja: ['遠日点', ['遠日点'], 'high'],
      'zh-CN': ['远日点', ['远日点'], 'high'],
      ko: ['원일점', ['원일점'], 'high'],
      hi: ['अपसौर', ['अपसौर'], 'high'],
      ar: ['الأوج الشمسي', ['أوج\\p{L}* (?:ال)?شمسي'], 'low'],
      'sr-Cyrl': ['афел', ['афел'], 'high'],
      de: ['Aphel', ['Aphel'], 'high'],
      fr: ['aphélie', ['aphélie'], 'high'],
      es: ['afelio', ['afelio'], 'high'],
      it: ['afelio', ['afelio'], 'high'],
      nl: ['aphelium', ['aphelium'], 'high'],
      'pt-BR': ['afélio', ['afélio'], 'high'],
    },
  },
  eccentricity: {
    _sense: 'how stretched an orbit is: 0 a circle, towards 1 a long ellipse',
    _en: '\\beccentricit(?:y|ies)\\b',
    _read_more: 'orbits/eccentricity',
    forms: {
      ru: ['эксцентриситет', ['эксцентриситет'], 'high'],
      ja: ['離心率', ['離心率'], 'high'],
      'zh-CN': ['离心率', ['离心率', '偏心率'], 'high'],
      ko: ['이심률', ['이심률'], 'high'],
      hi: ['उत्केंद्रता', ['उत्केन्?द्रता', 'उत्केंद्रता'], 'medium'],
      ar: ['الاختلاف المركزي', ['اختلاف\\p{L}* (?:ال)?مركزي', 'لامركزي'], 'medium'],
      'sr-Cyrl': ['ексцентрицитет', ['ексцентри(?:цитет|чност)'], 'medium'],
      de: ['Exzentrizität', ['Exzentrizität'], 'high'],
      fr: ['excentricité', ['excentricité'], 'high'],
      es: ['excentricidad', ['excentricidad'], 'high'],
      it: ['eccentricità', ['eccentricità'], 'high'],
      nl: ['excentriciteit', ['excentriciteit'], 'high'],
      'pt-BR': ['excentricidade', ['excentricidade'], 'high'],
    },
  },
  'launch window': {
    _sense: 'the period when a launch can reach its target, set by where the planets are',
    _en: '\\blaunch windows?\\b',
    _read_more: 'orbits/synodic-period',
    forms: {
      ru: [
        'стартовое окно',
        ['стартов\\p{L}* окн', 'окн\\p{L}* (?:для )?(?:запуск|старт)'],
        'medium',
      ],
      ja: ['打ち上げウィンドウ', ['打ち上げ(?:の)?ウ[ィイ]ンドウ', '打ち上げ(?:の)?窓'], 'medium'],
      'zh-CN': ['发射窗口', ['发射窗口'], 'high'],
      ko: ['발사 창', ['발사 ?창', '발사 ?윈도'], 'medium'],
      hi: ['प्रक्षेपण विंडो', [`(?:प्रक्षेपण|लॉन्च) (?:खिड़की|खिड़कियाँ|विंडो)`], 'low'],
      ar: ['نافذة الإطلاق', ['(?:نافذ|نوافذ)\\p{L}* (?:ال)?إطلاق'], 'high'],
      'sr-Cyrl': [
        'прозор за лансирање',
        ['прозор\\p{L}* за лансирање', 'лансирн\\p{L}* прозор'],
        'high',
      ],
      de: ['Startfenster', ['Startfenster'], 'high'],
      fr: ['fenêtre de lancement', ['fenêtres? de (?:lancement|tir)'], 'high'],
      es: ['ventana de lanzamiento', ['ventanas? de lanzamiento'], 'high'],
      it: ['finestra di lancio', ['finestr\\p{L}* di lancio'], 'high'],
      nl: ['lanceervenster', ['lanceervenster'], 'high'],
      'pt-BR': ['janela de lançamento', ['janelas? de lançamento'], 'high'],
    },
  },
  'escape velocity': {
    _sense: 'the speed needed to leave a body for good without further thrust',
    _en: '\\bescape (?:velocit(?:y|ies)|speeds?)\\b',
    _read_more: 'orbits/escape-velocity',
    forms: {
      ru: [
        'вторая космическая скорость',
        ['втор\\p{L}* космическ\\p{L}* скорост', 'скорост\\p{L}* (?:убегания|освобождения|отрыва)'],
        'medium',
      ],
      ja: ['脱出速度', ['脱出速度'], 'high'],
      'zh-CN': ['逃逸速度', ['逃逸速度'], 'high'],
      ko: ['탈출 속도', ['탈출 ?속도'], 'high'],
      hi: ['मुक्ति वेग', ['(?:मुक्ति|पलायन) वेग'], 'medium'],
      ar: ['سرعة الإفلات', ['سرع\\p{L}* (?:ال)?إفلات'], 'high'],
      'sr-Cyrl': [
        'друга космичка брзина',
        ['друг\\p{L}* космичк\\p{L}* брзин', 'брзин\\p{L}* (?:бекства|ослобађања|излета)'],
        'medium',
      ],
      de: ['Fluchtgeschwindigkeit', ['Fluchtgeschwindigkeit'], 'high'],
      fr: ['vitesse de libération', ['vitesses? de libération'], 'high'],
      es: ['velocidad de escape', ['velocidad\\p{L}* de escape'], 'high'],
      it: ['velocità di fuga', ['velocità di fuga'], 'high'],
      nl: ['ontsnappingssnelheid', ['ontsnappingssnelheid'], 'high'],
      'pt-BR': ['velocidade de escape', ['velocidades? de escape'], 'high'],
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
