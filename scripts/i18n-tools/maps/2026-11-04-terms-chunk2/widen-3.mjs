// Chunk 2, widening 3 (2026-11-04, after reading every miss): forms right for the sense that
// the stems missed. Not accepted — changed instead (finds.json): fr «s'est amaré» (moored) and
// «s'écrase», nl «noodwatering» and English, ru «приземлился», zh 着陆, ko 귀환, de «platscht»,
// pt-BR «cai», it / pt-BR English «sample return», nl «steekproef».
import fs from 'node:fs';

const F = 'scripts/i18n-tools/native-terms.json';
const g = JSON.parse(fs.readFileSync(F, 'utf8'));
const W = {
  splashdown: {
    _en: '(?<!Mars )\\bsplash(?:ed|es)?[- ]?downs?\\b',
    ru: [
      'посадк\\p{L}* на воду',
      'посадк\\p{L}* в (?:\\p{L}+ ){0,3}(?:Атлантик|Тихого|океан)',
      'приводн',
    ],
    hi: [
      'जल[- ]?(?:अवतर|उतर)',
      'जल में (?:उतर|गिर)',
      'पानी में उतर',
      'समुद्र में अवतरण',
      'स्प्लैश ?डाउन',
    ],
    ar: [
      'هبط[\\p{L}]*(?: [\\p{L}\\w.-]+){0,4} في (?:ال)?(?:محيط|مياه|بحر)',
      'على سطح (?:ال)?(?:ماء|مياه)',
      'هبوط[\\p{L}]* (?:آمن\\p{L}* )?بحري',
    ],
    'sr-Cyrl': [
      'водн\\p{L}* (?:слет|спушт)',
      'воден\\p{L}* слет',
      'слет\\p{L}* (?:\\p{L}+ )?у (?:\\p{L}+ )?(?:океан|Атлантик|Пацифик)',
      'спушт\\p{L}* у (?:\\p{L}+ )?(?:океан|Пацифик|Атлантик)',
    ],
    de: ['wassert', 'auf dem Wasser'],
    nl: [
      'plons',
      'landde op (?:het )?water',
      'waterland',
      'geland in de oceaan',
      'in de (?:\\p{L}+[- ])?(?:Atlantische|Stille) Oceaan',
      'noodlanding op zee',
    ],
    'pt-BR': ['pous\\p{L}* (?:na água|no mar|no (?:\\p{L}+ )?[Oo]ceano)', 'amar(?:ou|agem|iss)'],
  },
  'sample return': {
    _en: '(?<!Mars )\\bsample[- ]return\\b',
    ja: ['試料(?:採取)?(?:帰還|返還)'],
    'zh-CN': ['返回样本'],
    ko: ['샘플[- ]?반환'],
    hi: ['नमून[\\p{L}\\p{M}]*[- ]प्रत्यावर्तन'],
    ar: [
      'إرجاع (?:ال)?عين',
      'استرجاع (?:ال)?عين',
      'عائد\\p{L}* (?:لل|بال)عينات',
      'إعاد\\p{L}* (?:\\p{L}+ )?عين',
    ],
    'sr-Cyrl': ['повраћај\\p{L}* узор'],
    de: ['Probenrückführ', 'Rückholung von \\p{L}*[Pp]roben'],
    it: ['ritorn\\p{L}*(?: \\p{L}+){0,2} (?:di |dei |del |di un )?campion'],
    'pt-BR': ['retorno\\p{L}*(?: \\p{L}+){0,2} de amostra', 'retorno da amostra'],
    nl: ['terugbreng\\p{L}* van \\p{L}*monsters'],
  },
  regolith: {
    'zh-CN': ['表[壤土]'],
    ar: ['ترب\\p{L}*', 'ثرى', 'رجوليث'],
  },
  microgravity: {
    'zh-CN': ['失重'],
    ko: ['무중력'],
    ar: ['جاذبي\\p{L}* (?:ال)?(?:ميكروية|دقيقة)', 'انعدام (?:ال)?وزن'],
    nl: ['gewichtloos'],
  },
  'life support': {
    fr: ['support[- ]?vi(?:e|tal)', 'soutien vital', 'maintien de la vie'],
    ar: ['دعم (?:ال)?حيوي'],
  },
  'solar array': {
    'zh-CN': ['太阳能阵列'],
    hi: ['सौर ऐरे'],
    ar: ['مصفوف\\p{L}*(?: [\\w.-]+)? (?:ال)?شمسي', 'صفائح (?:ال)?شمسي'],
    de: ['Solarfläche', 'Solarpanel'],
    it: ['array solari'],
    'pt-BR': ['arranjos? solar'],
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
