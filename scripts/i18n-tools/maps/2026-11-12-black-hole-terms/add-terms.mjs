// Glossary for the black-hole entity pages (0.9.9, deep-level pages phase 2): the astronomy
// terms of the four black-hole texts (docs/wip/deep-text/batch-01.md) into native-terms.json
// `term` (they feed /glossary and the term gate), plus the object names (`star`), the bare
// surname Thorne (`person`) and Curtin University (`agency`). Binding = the site's existing
// form where the site already writes the term (counted in i18n-src and messages, 2026-11-12),
// else the language's Wikipedia title for the English article (en.wikipedia langlinks API,
// fetched 2026-11-12); stems = every variant the site already uses.
//   node scripts/i18n-tools/maps/2026-11-12-black-hole-terms/add-terms.mjs
// Re-running rebuilds these entries (idempotent). Format with prettier afterwards.
import fs from 'node:fs';

const F = 'scripts/i18n-tools/native-terms.json';
const g = JSON.parse(fs.readFileSync(F, 'utf8'));
const L = ['ru', 'ja', 'zh-CN', 'ko', 'hi', 'ar', 'sr-Cyrl', 'de', 'fr', 'es', 'it', 'nl', 'pt-BR'];
const WIKI = { 'zh-CN': 'zh', 'sr-Cyrl': 'sr', 'pt-BR': 'pt' };

// Provenance notes (what is true of each binding form).
const ART = "the site's /science/observation/black-holes article, i18n-src, counted 2026-11-12";
const KIND =
  "the site's explore_bh_kind_* messages (Supermassive / Stellar-mass black hole labels), 2026-11-12";
const MAJ = 'site majority form (counted in i18n-src and messages, 2026-11-12)';
const wiki = (loc, title, extra = '') =>
  `${WIKI[loc] ?? loc}.wikipedia.org title of "${title}" (en.wikipedia langlinks API, fetched 2026-11-12)${extra}`;

// term -> { _sense, _en, _read_more?, forms: { loc: [binding, stems, confidence, source] } }
const T = {
  'black hole': {
    _sense: 'a region of space whose gravity lets nothing, light included, escape',
    _en: '\\bblack[- ]holes?\\b',
    _read_more: 'observation/black-holes',
    forms: {
      ru: ['чёрная дыра', ['ч[её]рн\\p{L}* дыр'], 'high', ART],
      ja: ['ブラックホール', ['ブラック・?ホール'], 'high', ART],
      'zh-CN': ['黑洞', ['黑洞'], 'high', ART],
      ko: ['블랙홀', ['블랙 ?홀'], 'high', ART],
      hi: [
        'ब्लैक होल',
        ['ब्लैक ?होल', 'कृष्ण[- ]?विवर', 'कृष्ण[- ]?छिद्र'],
        'medium',
        "the site's explore_bh_* UI messages and 27 uses in text; कृष्ण विवर (hi.wikipedia title, 26 uses in the science articles) is accepted as a variant, counted 2026-11-12",
      ],
      ar: ['ثقب أسود', ['ثقب\\p{L}* (?:ال)?أسود', 'ثقوب (?:ال)?سود\\p{L}*'], 'high', ART],
      'sr-Cyrl': ['црна рупа', ['црн\\p{L}* руп\\p{L}*'], 'high', ART],
      de: ['Schwarzes Loch', ['Schwarz\\p{L}*[ -]L(?:o|ö)ch\\p{L}*'], 'high', ART],
      fr: ['trou noir', ['trous? noirs?'], 'high', ART],
      es: ['agujero negro', ['agujeros? negros?'], 'high', ART],
      it: ['buco nero', ['bu(?:co|chi) ner[io]'], 'high', ART],
      nl: ['zwart gat', ['zwarte?[ -]gat\\p{L}*'], 'high', ART],
      'pt-BR': ['buraco negro', ['buracos? negros?'], 'high', ART],
    },
  },
  'supermassive black hole': {
    _sense: 'a black hole of millions to billions of solar masses at a galaxy centre',
    _en: '\\bsuper-?massive black[- ]holes?\\b',
    _read_more: 'observation/black-holes',
    forms: {
      ru: ['сверхмассивная чёрная дыра', ['сверхмассивн\\p{L}*'], 'high', ART],
      ja: ['超大質量ブラックホール', ['超大質量', '超巨大ブラックホール'], 'high', ART],
      'zh-CN': ['超大质量黑洞', ['超大质量'], 'high', ART],
      ko: ['초대질량 블랙홀', ['초대질량'], 'high', ART],
      hi: [
        'अतिविशाल ब्लैक होल',
        ['अति-?विशाल', 'महाविशाल', 'विशालकाय', 'सुपरमैसिव'],
        'medium',
        "the site's explore_bh_kind_supermassive message (अतिविशाल, 11 uses; महाविशाल 2); hi.wikipedia uses विशालकाय ब्लैक होल, accepted as a variant, counted 2026-11-12",
      ],
      ar: [
        'ثقب أسود فائق الكتلة',
        ['(?:فائق|هائل)\\p{L}* (?:ال)?كتلة'],
        'medium',
        "فائق الكتلة: 10 uses in the site's text and the ar.wikipedia title; the explore_bh_kind_supermassive message says هائل الكتلة (5 uses), accepted as a variant, counted 2026-11-12",
      ],
      'sr-Cyrl': ['супермасивна црна рупа', ['супермасивн\\p{L}*'], 'high', ART],
      de: [
        'supermassives Schwarzes Loch',
        ['supermassi\\p{L}*', 'supermassereich\\p{L}*'],
        'high',
        `${ART}; supermassereich (de.wikipedia title) accepted as a variant`,
      ],
      fr: ['trou noir supermassif', ['supermassifs?'], 'high', ART],
      es: ['agujero negro supermasivo', ['supermasivos?'], 'high', ART],
      it: ['buco nero supermassiccio', ['supermassicc\\p{L}*'], 'high', ART],
      nl: ['superzwaar zwart gat', ['superzwa\\p{L}*'], 'high', ART],
      'pt-BR': ['buraco negro supermassivo', ['supermassivos?'], 'high', ART],
    },
  },
  'stellar-mass black hole': {
    _sense: 'a black hole of a few to a few tens of solar masses left by a collapsed star',
    _en: '\\bstellar[- ]mass black[- ]holes?\\b|\\bstellar black[- ]holes?\\b',
    _read_more: 'observation/black-holes',
    forms: {
      ru: [
        'чёрная дыра звёздной массы',
        ['звёздной массы', 'звездной массы', 'звёздн\\p{L}* ч[её]рн\\p{L}* дыр'],
        'high',
        KIND,
      ],
      ja: ['恒星質量ブラックホール', ['恒星質量', '恒星ブラックホール'], 'high', KIND],
      'zh-CN': ['恒星级黑洞', ['恒星级', '恒星质量'], 'high', KIND],
      ko: ['항성질량 블랙홀', ['항성 ?질량', '항성 ?블랙홀'], 'high', KIND],
      hi: ['तारकीय द्रव्यमान ब्लैक होल', ['तारकीय'], 'medium', KIND],
      ar: ['ثقب أسود نجمي', ['نجمي\\p{L}*', 'كتلة نجم\\p{L}*'], 'high', KIND],
      'sr-Cyrl': [
        'црна рупа звездане масе',
        ['звездан\\p{L}* масе', 'звездан\\p{L}* црн'],
        'high',
        KIND,
      ],
      de: ['stellares Schwarzes Loch', ['stellar\\p{L}*'], 'high', KIND],
      fr: ['trou noir stellaire', ['stellaires?'], 'high', KIND],
      es: ['agujero negro de masa estelar', ['masa estelar', 'estelares?'], 'high', KIND],
      it: ['buco nero di massa stellare', ['massa stellare', 'stellar\\p{L}*'], 'high', KIND],
      nl: ['stellair zwart gat', ['stellair\\p{L}*', 'stellaire'], 'high', KIND],
      'pt-BR': ['buraco negro de massa estelar', ['massa estelar', 'estelares?'], 'high', KIND],
    },
  },
  'event horizon': {
    _sense: 'the boundary of a black hole beyond which nothing returns',
    _en: '\\bevent[- ]horizons?\\b(?! Telescope)',
    _read_more: 'observation/black-holes',
    forms: {
      ru: ['горизонт событий', ['горизонт\\p{L}* событий'], 'high', ART],
      ja: [
        '事象の地平線',
        ['事象の地平線', '事象の地平面', 'イベント・?ホライズン'],
        'medium',
        "the site's black-hole article caption (事象の地平線, 2 uses; 事象の地平面 2 uses, the ja.wikipedia title, accepted as a variant), counted 2026-11-12",
      ],
      'zh-CN': ['事件视界', ['事件视界'], 'high', ART],
      ko: ['사건의 지평선', ['사건의 ?지평선', '사건 ?지평선'], 'high', ART],
      hi: ['घटना क्षितिज', ['घटना क्षितिज'], 'high', ART],
      ar: ['أفق الحدث', ['أفق (?:ال)?حدث'], 'high', ART],
      'sr-Cyrl': ['хоризонт догађаја', ['хоризонт\\p{L}* догађаја'], 'high', ART],
      de: ['Ereignishorizont', ['Ereignishorizont\\p{L}*'], 'high', ART],
      fr: ['horizon des événements', ["horizons? d(?:es |[’']) ?événements?"], 'high', ART],
      es: [
        'horizonte de sucesos',
        ['horizontes? de sucesos', 'horizontes? de eventos'],
        'high',
        ART,
      ],
      it: ['orizzonte degli eventi', ['orizzont\\p{L}* degli eventi'], 'high', ART],
      nl: [
        'waarnemingshorizon',
        ['waarnemingshorizon\\p{L}*', 'gebeurtenishorizon\\p{L}*'],
        'high',
        ART,
      ],
      'pt-BR': ['horizonte de eventos', ['horizontes? de eventos?'], 'high', ART],
    },
  },
  'accretion disk': {
    _sense: 'the flat swirl of gas spiralling in towards a compact object',
    _en: '\\baccretion[- ]dis[ck]s?\\b',
    _read_more: 'observation/black-holes',
    forms: {
      ru: [
        'аккреционный диск',
        ['аккреционн\\p{L}* диск\\p{L}*', 'диск\\p{L}* аккреции'],
        'high',
        ART,
      ],
      ja: ['降着円盤', ['降着円盤'], 'high', ART],
      'zh-CN': ['吸积盘', ['吸积盘'], 'high', ART],
      ko: ['강착 원반', ['강착 ?원반'], 'high', ART],
      hi: [
        'अभिवृद्धि चकती',
        ['अभिवृद्धि[ -]?(?:चकत|चक्रिका|चक्र|डिस्क|तश्तरी)', 'चकत[\\p{L}\\p{M}]*'],
        'medium',
        `${ART} (अभिवृद्धि चकती once; चकती 21 uses for a disk)`,
      ],
      ar: ['قرص التراكم', ['قرص\\p{L}* (?:ال)?تراكم\\p{L}*', 'أقراص (?:ال)?تراكم'], 'high', ART],
      'sr-Cyrl': ['акрециони диск', ['акрецион\\p{L}* диск\\p{L}*'], 'high', ART],
      de: ['Akkretionsscheibe', ['Akkretionsscheibe\\p{L}*'], 'high', ART],
      fr: ["disque d'accrétion", ["disques? d[’']accrétion"], 'high', ART],
      es: ['disco de acreción', ['discos? de acreción'], 'high', ART],
      it: ['disco di accrescimento', ['dis(?:co|chi) di accrescimento'], 'high', ART],
      nl: ['accretieschijf', ['accretieschij\\p{L}*'], 'high', ART],
      'pt-BR': ['disco de acreção', ['discos? de acreção'], 'high', ART],
    },
  },
  'black hole shadow': {
    _sense:
      'the dark patch at the centre of the glowing gas around a black hole (what the EHT imaged)',
    _en: "\\bblack[- ]holes?(?:'s|’s)? shadows?\\b|\\bshadows? of [^.;,]{0,25}black[- ]holes?\\b",
    _read_more: 'observation/black-holes',
    forms: {
      ru: ['тень чёрной дыры', ['(?<!\\p{L})тен(?:ь|и|ей|ям|ями|ях)(?!\\p{L})'], 'high', ART],
      ja: [
        'ブラックホールの影',
        ['影', 'シャドウ'],
        'medium',
        `${ART} (影 is the text form; シャドウ, 2 uses, the diagram caption)`,
      ],
      'zh-CN': ['黑洞阴影', ['阴影', '影子'], 'high', ART],
      ko: ['블랙홀 그림자', ['그림자', '섀도', '쉐도'], 'high', ART],
      hi: ['ब्लैक होल की छाया', ['छाया'], 'high', ART],
      ar: ['ظل الثقب الأسود', ['(?<!\\p{L})(?:ال)?ظل'], 'high', ART],
      'sr-Cyrl': ['сенка црне рупе', ['сенк\\p{L}*'], 'high', ART],
      de: ['Schatten des Schwarzen Lochs', ['Schatten'], 'high', ART],
      fr: ['ombre du trou noir', ['ombre'], 'high', ART],
      es: ['sombra del agujero negro', ['sombra'], 'high', ART],
      it: ['ombra del buco nero', ['ombra'], 'high', ART],
      nl: ['schaduw van het zwarte gat', ['schaduw'], 'high', ART],
      'pt-BR': ['sombra do buraco negro', ['sombra'], 'high', ART],
    },
  },
  'gravitational lensing': {
    _sense: 'the bending of light by gravity',
    _en: '\\bgravitational(?:ly)?[- ]lens(?:es|ing|ed)?\\b',
    forms: {
      ru: ['гравитационное линзирование', ['гравитационн\\p{L}*[ -]линз\\p{L}*'], 'high', MAJ],
      ja: ['重力レンズ効果', ['重力レンズ'], 'high', MAJ],
      'zh-CN': ['引力透镜效应', ['引力透镜', '重力透镜'], 'high', MAJ],
      ko: ['중력 렌즈 효과', ['중력 ?렌즈'], 'high', MAJ],
      hi: [
        'गुरुत्वाकर्षण लेंसिंग',
        ['गुरुत्व[\\p{L}\\p{M}]*[ -]लेंस[\\p{L}\\p{M}]*', 'लेंसिंग'],
        'medium',
        "the site's Gargantua culture-door blurb (गुरुत्वाकर्षण लेंसिंग) and 9 uses of लेंसिंग; गुरुत्वीय लेंस 2 uses accepted, counted 2026-11-12",
      ],
      ar: [
        'عدسة الجاذبية',
        ['عدس\\p{L}* (?:ال)?(?:جاذبي|ثقال)\\p{L}*', '(?:ال)?تعدس'],
        'medium',
        MAJ,
      ],
      'sr-Cyrl': [
        'гравитационо сочиво',
        ['гравитацион\\p{L}* сочив\\p{L}*', 'сочивљ\\p{L}*'],
        'high',
        MAJ,
      ],
      de: [
        'Gravitationslinseneffekt',
        ['Gravitationslins\\p{L}*'],
        'high',
        `${MAJ} (Gravitationslinse, 5 uses); the effect form is the de.wikipedia title`,
      ],
      fr: ['lentille gravitationnelle', ['lentilles? gravitationnelles?'], 'high', MAJ],
      es: [
        'lente gravitacional',
        ['lentes? gravitacional\\p{L}*', 'lentes? gravitatori\\p{L}*'],
        'high',
        MAJ,
      ],
      it: [
        'lente gravitazionale',
        ['lent[ei] gravitazional\\p{L}*', 'lensing'],
        'high',
        `${MAJ}; lensing (10 uses) accepted`,
      ],
      nl: [
        'zwaartekrachtlens',
        ['zwaartekrachtlens\\p{L}*', 'gravitatielens\\p{L}*'],
        'medium',
        MAJ,
      ],
      'pt-BR': ['lente gravitacional', ['lentes? gravitacion\\p{L}*'], 'high', MAJ],
    },
  },
  supernova: {
    _sense: 'the explosion of a star at the end of its life',
    _en: '\\bsupernova(?:e|s)?\\b',
    forms: {
      ru: ['сверхновая', ['сверхнов\\p{L}*'], 'high', MAJ],
      ja: ['超新星', ['超新星'], 'high', MAJ],
      'zh-CN': ['超新星', ['超新星'], 'high', MAJ],
      ko: ['초신성', ['초신성'], 'high', MAJ],
      hi: ['सुपरनोवा', ['सुपरनोवा', 'अधिनव', 'महानोवा'], 'medium', MAJ],
      ar: [
        'مستعر أعظم',
        ['مستعر\\p{L}* (?:ال)?(?:أعظم|عظمى|فائق\\p{L}*)', 'سوبرنوفا'],
        'high',
        MAJ,
      ],
      'sr-Cyrl': ['супернова', ['супернов\\p{L}*'], 'high', MAJ],
      de: ['Supernova', ['Supernov\\p{L}*'], 'high', MAJ],
      fr: ['supernova', ['supernov\\p{L}*'], 'high', MAJ],
      es: ['supernova', ['supernov\\p{L}*'], 'high', MAJ],
      it: ['supernova', ['supernov\\p{L}*'], 'high', MAJ],
      nl: ['supernova', ['supernov\\p{L}*'], 'high', MAJ],
      'pt-BR': ['supernova', ['supernov\\p{L}*'], 'high', MAJ],
    },
  },
  'general relativity': {
    _sense: "Einstein's theory of gravity as curved space and time",
    _en: '\\bgeneral (?:theory of )?relativity\\b',
    forms: {
      ru: [
        'общая теория относительности',
        ['общ\\p{L}* теори\\p{L}* относительности', 'ОТО'],
        'high',
        MAJ,
      ],
      ja: ['一般相対性理論', ['一般相対性理論', '一般相対論'], 'high', MAJ],
      'zh-CN': ['广义相对论', ['广义相对论'], 'high', MAJ],
      ko: ['일반 상대성이론', ['일반 ?상대성 ?이론', '일반 ?상대론'], 'high', MAJ],
      hi: [
        'सामान्य सापेक्षता',
        ['सामान्य (?:सापेक्षता|आपेक्षिकता)', 'व्यापक (?:सापेक्षता|आपेक्षिकता)'],
        'high',
        MAJ,
      ],
      ar: ['النسبية العامة', ['(?:ال)?نسبية (?:ال)?عامة'], 'high', MAJ],
      'sr-Cyrl': [
        'општа теорија релативности',
        ['општ\\p{L}* теори\\p{L}* релативности', 'општ\\p{L}* релативност\\p{L}*'],
        'high',
        MAJ,
      ],
      de: [
        'Allgemeine Relativitätstheorie',
        ['allgemein\\p{L}* Relativit(?:ä|ae)tstheorie'],
        'high',
        wiki('de', 'General relativity', `; ${MAJ}`),
      ],
      fr: ['relativité générale', ['relativité générale'], 'high', MAJ],
      es: ['relatividad general', ['relatividad general'], 'high', MAJ],
      it: ['relatività generale', ['relatività generale'], 'high', MAJ],
      nl: ['algemene relativiteitstheorie', ['algemene relativiteit'], 'high', MAJ],
      'pt-BR': ['relatividade geral', ['relatividade geral'], 'high', MAJ],
    },
  },
  'Doppler effect': {
    _sense: 'the shift in frequency of light or sound from a moving source',
    _en: '\\bDoppler[- ](?:shift(?:s|ed|ing)?|effects?|beaming|boosting|glow|broadening)\\b',
    forms: {
      ru: ['эффект Доплера', ['Доплер\\p{L}*'], 'high', MAJ],
      ja: ['ドップラー効果', ['ドップラー'], 'high', MAJ],
      'zh-CN': ['多普勒效应', ['多普勒'], 'high', MAJ],
      ko: ['도플러 효과', ['도플러'], 'high', MAJ],
      hi: ['डॉप्लर प्रभाव', ['डॉप्लर', 'डॉपलर', 'डोप्लर', 'Doppler'], 'high', MAJ],
      ar: ['تأثير دوبلر', ['دوبلر', 'دوپلر'], 'high', MAJ],
      'sr-Cyrl': ['Доплеров ефекат', ['Доплер\\p{L}*'], 'high', MAJ],
      de: ['Doppler-Effekt', ['Doppler'], 'high', MAJ],
      fr: ['effet Doppler', ['Doppler'], 'high', MAJ],
      es: ['efecto Doppler', ['Doppler'], 'high', MAJ],
      it: ['effetto Doppler', ['Doppler'], 'high', MAJ],
      nl: ['dopplereffect', ['Doppler'], 'high', MAJ],
      'pt-BR': ['efeito Doppler', ['Doppler'], 'high', MAJ],
    },
  },
};

for (const [term, t] of Object.entries(T)) {
  const e = { _sense: t._sense, _en: t._en };
  if (t._read_more) e._read_more = t._read_more;
  e._match = {};
  e._confidence = {};
  for (const loc of L) {
    const [, stems, conf, src] = t.forms[loc];
    e._match[loc] = stems;
    e._confidence[loc] = conf;
    g.sources[`term:${term}:${loc}`] = src;
  }
  for (const loc of L) e[loc] = t.forms[loc][0];
  g.term[term] = e;
}

// Object names. Latin forms are written out so each locale's choice is on record.
const NAMES = {
  'Sagittarius A*': {
    ru: 'Стрелец A*',
    ja: 'いて座A*',
    'zh-CN': '人马座 A*',
    ko: '궁수자리 A*',
    hi: 'धनु A*',
    ar: 'القوس A*',
    'sr-Cyrl': 'Стрелац A*',
    de: 'Sagittarius A*',
    fr: 'Sagittarius A*',
    es: 'Sagittarius A*',
    it: 'Sagittarius A*',
    nl: 'Sagittarius A*',
    'pt-BR': 'Sagittarius A*',
  },
  'Cygnus X-1': {
    ru: 'Лебедь X-1',
    ja: 'はくちょう座X-1',
    'zh-CN': '天鹅座 X-1',
    ko: '백조자리 X-1',
    hi: 'Cygnus X-1',
    ar: 'الدجاجة X-1',
    'sr-Cyrl': 'Лабуд X-1',
    de: 'Cygnus X-1',
    fr: 'Cygnus X-1',
    es: 'Cygnus X-1',
    it: 'Cygnus X-1',
    nl: 'Cygnus X-1',
    'pt-BR': 'Cygnus X-1',
  },
  'M87*': Object.fromEntries(L.map((l) => [l, 'M87*'])),
  Gargantua: Object.fromEntries(L.map((l) => [l, 'Gargantua'])),
};
for (const [name, forms] of Object.entries(NAMES)) g.star[name] ??= forms;
g.sources['black hole names (2026-11-12)'] =
  "Sagittarius A* and Cygnus X-1: each language Wikipedia title of the English article (en.wikipedia langlinks API, fetched 2026-11-12; zh traditional converted to simplified), which agrees with the site's existing text in ru Стрелец A*, ja いて座A*, ko 궁수자리 A*, hi धनु A*, sr-Cyrl Стрелац A* (counted in i18n-src, 2026-11-12). Where the site's explore_deep_sgra message differs from Wikipedia the message wins (the label audit requires one form): es Sagittarius A* (Wikipedia Sagitario A*), zh-CN 人马座 A* (with a space), ar القوس A* (Wikipedia الرامي A*); pt-BR keeps Sagittarius A* (pt.wikipedia title and 4 of 6 site uses); sr-Cyrl Лабуд X-1 is the Cyrillic of Labud X-1 (sr.wikipedia title, Latin script) with the glossary's Лабуд for Cygnus; hi Cygnus X-1 stays Latin (hi.wikipedia title सिग्नस ऍक्स-१ is not used anywhere on the site). M87* and Gargantua: Latin in every locale (the site's existing text writes them so; Gargantua in the Interstellar culture-door blurb in all 13). The film title Interstellar is Latin in every locale on the site (culture-door blurb), so it is not listed. James Miller-Jones: no article in any language (en.wikipedia langlinks), kept in Latin in every locale. Event Horizon Telescope: Latin everywhere on the site except zh-CN 事件视界望远镜 (the black-hole article); Very Long Baseline Array: ja 超長基線アレイ, ko 초장기선 어레이, zh-CN 超长基线阵列 from the Wikipedia titles, Latin elsewhere (ru, de, fr, it, nl, pt titles are the English name; ar, hi, es, sr have no article).";

g.person.Thorne ??= {
  _bare: true,
  _qid: 'Q323320',
  ru: 'Торн',
  ja: 'ソーン',
  'zh-CN': '索恩',
  ko: '손',
  hi: 'थोर्न',
  ar: 'ثورن',
  'sr-Cyrl': 'Торн',
};
g.sources['Thorne (2026-11-12)'] =
  'Bare surname of the existing Kip Thorne entry (ru Торн, ja ソーン, zh-CN 索恩, ko 손, hi थोर्न, ar ثورن, sr-Cyrl Торн), used in the Gargantua text after the full name.';

g.agency['Curtin University'] ??= {
  ar: 'جامعة كيرتن',
  ja: 'カーティン大学',
  'zh-CN': '科廷大学',
  ko: '커틴 대학교',
  fr: 'Université Curtin',
  es: 'Universidad John Curtin',
  'pt-BR': 'Universidade Curtin',
};
g.sources['Curtin University (2026-11-12)'] =
  'Each language Wikipedia title of "Curtin University" (en.wikipedia langlinks API, fetched 2026-11-12; zh 科廷大學 converted to simplified). de and nl write Curtin University; ru, hi, it and sr-Cyrl have no article in the langlinks and keep the English name. es.wikipedia still titles the page Universidad John Curtin, used as is.';

fs.writeFileSync(F, JSON.stringify(g, null, 2) + '\n');
console.log('terms now:', Object.keys(g.term).length);
