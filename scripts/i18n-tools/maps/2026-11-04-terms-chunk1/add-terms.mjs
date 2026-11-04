// Glossary chunk 1 (0.9.6): eight craft terms into native-terms.json `term`. Binding = the
// site's majority form per locale (term-candidates.mjs, 2026-11-04), stems = every standard
// variant the site already uses. Run from the repo root; never overwrites an existing term.
//   node scripts/i18n-tools/maps/2026-11-04-terms-chunk1/add-terms.mjs
import fs from 'node:fs';

const F = 'scripts/i18n-tools/native-terms.json';
const g = JSON.parse(fs.readFileSync(F, 'utf8'));
const L = ['ru', 'ja', 'zh-CN', 'ko', 'hi', 'ar', 'sr-Cyrl', 'de', 'fr', 'es', 'it', 'nl', 'pt-BR'];
const MAJ = 'site majority form (term-candidates.mjs, 2026-11-04)';

// term → { _sense, _en?, _en_cs?, _read_more?, forms: {loc: [binding, stems[], confidence]} }
const T = {
  orbiter: {
    _sense: 'a spacecraft that orbits a body (not the Shuttle Orbiter, not mission names)',
    _en: '\\borbiters?\\b',
    _en_cs: true,
    _read_more: 'mission-phases/mission-types',
    forms: {
      ru: [
        'орбитальный аппарат',
        ['орбитальн\\p{L}* (?:аппарат|модул|зонд|станци)', 'орбитер'],
        'high',
      ],
      ja: ['周回機', ['周回機', '周回探査機', '周回衛星', 'オービター?'], 'medium'],
      'zh-CN': ['轨道器', ['轨道器', '环绕器', '轨道飞行器'], 'high'],
      ko: ['궤도선', ['궤도선'], 'high'],
      hi: ['ऑर्बिटर', ['ऑर्बिटर'], 'high'],
      ar: ['مركبة مدارية', ['مركب\\p{L}* (?:ال)?مداري', 'مسبار (?:ال)?مداري'], 'medium'],
      'sr-Cyrl': ['орбитер', ['орбитер'], 'high'],
      de: ['Orbiter', ['Orbiter'], 'high'],
      fr: ['orbiteur', ['orbiteur'], 'high'],
      es: ['orbitador', ['orbitador'], 'high'],
      it: ['orbiter', ['orbiter'], 'high'],
      nl: ['orbiter', ['orbiter'], 'high'],
      'pt-BR': ['orbitador', ['orbitador'], 'high'],
    },
  },
  lander: {
    _sense: 'a spacecraft that lands on a surface (not mission names)',
    _en: '\\blanders?\\b',
    _en_cs: true,
    _read_more: 'mission-phases/mission-types',
    forms: {
      ru: [
        'посадочный аппарат',
        ['посадочн\\p{L}* (?:аппарат|модул|блок|ступен|платформ|станци|зонд)'],
        'high',
      ],
      ja: ['着陸機', ['着陸機', '着陸船', 'ランダー'], 'medium'],
      'zh-CN': ['着陆器', ['着陆器'], 'high'],
      ko: ['착륙선', ['착륙선'], 'high'],
      hi: ['लैंडर', ['लैंडर'], 'high'],
      ar: [
        'مركبة الهبوط',
        ['مركب\\p{L}* (?:ال)?هبوط', 'هابط', 'مسبار (?:ال)?هبوط', 'وحد\\p{L}* (?:ال)?هبوط'],
        'medium',
      ],
      'sr-Cyrl': ['лендер', ['лендер'], 'high'],
      de: [
        'Lander',
        ['Lander', 'Mondlander', 'Marslander', 'Landefähre', 'Landemodul', 'Landeeinheit'],
        'high',
      ],
      fr: ['atterrisseur', ['atterrisseur'], 'high'],
      es: ['módulo de aterrizaje', ['módulos? de aterrizaje', 'aterrizador'], 'high'],
      it: ['lander', ['lander'], 'high'],
      nl: ['lander', ['lander', 'maanlander', 'marslander'], 'high'],
      'pt-BR': ['módulo de pouso', ['módulos? de pouso', 'sondas? de pouso', 'pousador'], 'high'],
    },
  },
  rover: {
    _sense: 'a surface vehicle that drives on another world',
    _en: '\\brovers?\\b',
    _en_cs: true,
    _read_more: 'mission-phases/mission-types',
    forms: {
      ru: ['ровер', ['ровер', 'марсоход', 'луноход'], 'medium'],
      ja: ['ローバー', ['ローバー'], 'high'],
      'zh-CN': ['漫游车', ['漫游车', '火星车', '月球车', '巡视器', '探测车'], 'medium'],
      ko: ['로버', ['로버'], 'high'],
      hi: ['रोवर', ['रोवर'], 'high'],
      ar: ['مركبة جوالة', ['جوال'], 'high'],
      'sr-Cyrl': ['ровер', ['ровер'], 'high'],
      de: ['Rover', ['Rover'], 'high'],
      fr: ['rover', ['rover', 'astromobile'], 'high'],
      es: ['róver', ['r[oó]ver'], 'high'],
      it: ['rover', ['rover'], 'high'],
      nl: ['rover', ['rover'], 'high'],
      'pt-BR': ['rover', ['rover', 'jipe'], 'high'],
    },
  },
  capsule: {
    _sense: 'a crew or return capsule (the vehicle that comes home through the atmosphere)',
    _en: '\\bcapsules?\\b',
    _read_more: 'mission-phases/edl',
    forms: {
      ru: ['капсула', ['капсул'], 'high'],
      ja: ['カプセル', ['カプセル'], 'high'],
      'zh-CN': [
        '返回舱',
        ['返回舱', '太空舱', '乘员舱', '载人舱', '座舱', '胶囊', '舱体'],
        'medium',
      ],
      ko: ['캡슐', ['캡슐'], 'high'],
      hi: ['कैप्सूल', ['कैप्सूल'], 'high'],
      ar: ['كبسولة', ['كبسول'], 'high'],
      'sr-Cyrl': ['капсула', ['капсул'], 'high'],
      de: ['Kapsel', ['Kapsel', 'Raumkapsel', 'Rückkehrkapsel', 'Landekapsel'], 'high'],
      fr: ['capsule', ['capsule'], 'high'],
      es: ['cápsula', ['cápsula'], 'high'],
      it: ['capsula', ['capsul'], 'high'],
      nl: ['capsule', ['capsule', 'terugkeercapsule'], 'high'],
      'pt-BR': ['cápsula', ['cápsula'], 'high'],
    },
  },
  'upper stage': {
    _sense: 'the top stage of a launcher (Centaur, Fregat, Block D …)',
    _en: '\\bupper[- ]stages?\\b',
    _read_more: 'propulsion/rocket-stages',
    forms: {
      ru: ['разгонный блок', ['разгонн\\p{L}* блок', 'верхн\\p{L}* ступен'], 'medium'],
      ja: ['上段', ['上段'], 'high'],
      'zh-CN': ['上面级', ['上面级'], 'high'],
      ko: ['상단', ['상단'], 'high'],
      hi: ['ऊपरी चरण', ['ऊपरी चरण'], 'high'],
      ar: ['المرحلة العليا', ['(?:ال)?مرحل\\p{L}* (?:ال)?علي'], 'high'],
      'sr-Cyrl': ['горњи степен', ['горњ\\p{L}* степен'], 'high'],
      de: ['Oberstufe', ['Oberstufe'], 'high'],
      fr: ['étage supérieur', ['étages? supérieurs?'], 'high'],
      es: ['etapa superior', ['etapas? superior'], 'high'],
      it: ['stadio superiore', ['stadi\\p{L}* superior'], 'high'],
      nl: ['bovenste trap', ['bovenste trap', 'boventrap'], 'high'],
      'pt-BR': ['estágio superior', ['estágios? superior'], 'high'],
    },
  },
  'heat shield': {
    _sense: 'the shield that protects a craft from entry heating',
    _en: '\\bheat[- ]?shields?\\b',
    _read_more: 'mission-phases/edl',
    forms: {
      ru: ['теплозащитный экран', ['теплозащит\\p{L}*', 'теплов\\p{L}* щит'], 'medium'],
      ja: ['熱シールド', ['熱シールド', '耐熱シールド', 'ヒートシールド'], 'high'],
      'zh-CN': ['隔热罩', ['隔热罩', '防热罩', '防热大底', '防热层'], 'high'],
      ko: ['열차폐막', ['열 ?차폐', '차폐막', '방열판', '히트 ?실드'], 'medium'],
      hi: ['ताप-कवच', ['ताप[- ]?कवच', 'ऊष्मा[- ]?(?:ढाल|कवच)', 'हीट ?शील्ड'], 'low'],
      ar: ['الدرع الحراري', ['درع\\p{L}* (?:ال)?حراري'], 'high'],
      'sr-Cyrl': ['топлотни штит', ['топлотн\\p{L}* штит'], 'high'],
      de: ['Hitzeschild', ['Hitzeschild'], 'high'],
      fr: ['bouclier thermique', ['boucliers? thermiques?'], 'high'],
      es: ['escudo térmico', ['escudos? térmicos?'], 'high'],
      it: ['scudo termico', ['scud\\p{L}* termic'], 'high'],
      nl: ['hitteschild', ['hitteschild'], 'high'],
      'pt-BR': ['escudo térmico', ['escudos? térmicos?'], 'high'],
    },
  },
  airlock: {
    _sense: 'the chamber crews pass through between a pressurised cabin and vacuum',
    _en: '\\bair-?locks?\\b',
    _read_more: 'life-in-space/eva-suits',
    forms: {
      ru: ['шлюз', ['шлюз'], 'high'],
      ja: ['エアロック', ['エアロック'], 'high'],
      'zh-CN': ['气闸舱', ['气闸'], 'high'],
      ko: ['에어록', ['에어록'], 'high'],
      hi: ['एयरलॉक', ['एयरलॉक'], 'high'],
      ar: ['غرفة معادلة الضغط', ['معادل\\p{L}* (?:ال)?ضغط'], 'medium'],
      'sr-Cyrl': ['ваздушна комора', ['ваздушн\\p{L}* комор'], 'medium'],
      de: ['Luftschleuse', ['Luftschleuse', 'Schleuse'], 'high'],
      fr: ['sas', ['(?<!\\p{L})sas(?!\\p{L})'], 'high'],
      es: ['esclusa', ['esclusa'], 'high'],
      it: ['camera di equilibrio', ['camer\\p{L}* di equilibrio', 'airlock'], 'medium'],
      nl: ['luchtsluis', ['luchtsluis'], 'high'],
      'pt-BR': ['eclusa', ['eclusa', 'câmaras? de (?:des)?compressão', 'airlock'], 'low'],
    },
  },
  spacewalk: {
    _sense: 'work outside a spacecraft in a spacesuit (EVA)',
    _en: '\\bspace ?walk(?:s|ing|ers?)?\\b',
    _read_more: 'life-in-space/eva-operations',
    forms: {
      ru: ['выход в открытый космос', ['открыт\\p{L}* космос'], 'high'],
      ja: ['船外活動', ['船外活動', '宇宙遊泳'], 'medium'],
      'zh-CN': ['太空行走', ['太空行走', '出舱'], 'high'],
      ko: ['우주유영', ['우주 ?유영', '선외 ?활동'], 'high'],
      hi: ['स्पेसवॉक', ['स्पेसवॉक', 'अंतरिक्ष[- ]?(?:सैर|चहलक़दमी|चहलकदमी)'], 'medium'],
      ar: ['السير في الفضاء', ['سير\\p{L}* في الفضاء', 'سير\\p{L}* (?:ال)?فضائي'], 'high'],
      'sr-Cyrl': [
        'излазак у свемир',
        ['излаз\\p{L}* у (?:отворен\\p{L}* )?свемир', 'шетњ\\p{L}* (?:по |у )?свемир'],
        'medium',
      ],
      de: [
        'Weltraumausstieg',
        ['Weltraumausstieg', 'Außenbordeinsatz', 'Weltraumspaziergang'],
        'high',
      ],
      fr: [
        'sortie extravéhiculaire',
        ['sorties? extravéhiculaires?', 'sorties? dans l.espace'],
        'high',
      ],
      es: [
        'paseo espacial',
        ['paseos? espacial', 'caminatas? espacial', 'actividad extravehicular'],
        'high',
      ],
      it: [
        'passeggiata spaziale',
        ['passeggiat\\p{L}* spazial', 'attività extraveicolare'],
        'high',
      ],
      nl: ['ruimtewandeling', ['ruimtewandeling'], 'high'],
      'pt-BR': ['caminhada espacial', ['caminhadas? espacia', 'atividade extraveicular'], 'high'],
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
