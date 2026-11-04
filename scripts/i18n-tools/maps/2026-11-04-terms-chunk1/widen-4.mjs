// Chunk 1, widening 4 (2026-11-04, after reading every miss): forms that are right for the
// sense — inflections the stems missed (ar plural دروع, nl sluizen, sr изласка), a name between
// the words (ar «مرحلة Blok-D العليا»), and the plain renderings each language uses in running
// text (ru выход в космос, ru корабль for a crew capsule, es / pt-BR módulo for a lander).
// Not accepted (changed instead, finds.json): ar مهبط / مدار, pt-BR pouso for the craft,
// it eclusa / portello stagno, zh 登陆器, English left in de / pt-BR / it.
import fs from 'node:fs';

const F = 'scripts/i18n-tools/native-terms.json';
const g = JSON.parse(fs.readFileSync(F, 'utf8'));
const W = {
  orbiter: {
    ru: ['орбитальн\\p{L}* разведчик'],
    ko: ['오비터'],
    ar: [
      'مسبار\\p{L}*(?: [\\p{L}\\w.-]+){0,3} (?:ال)?مداري',
      'مركب\\p{L}*(?: [\\p{L}\\w.-]+){0,3} (?:ال)?مداري',
      'يدور حول',
      'دارت حول',
      'تدخل مدار',
    ],
    es: ['sondas? orbital', 'satélites? orbital'],
  },
  lander: {
    _en: '(?<![\\w-])landers?(?![\\w-])',
    ru: ['спускаем\\p{L}* аппарат', '(?:лунн|марсианск|венерианск)\\p{L}* аппарат', 'модул'],
    'sr-Cyrl': [
      'слет\\p{L}* летелиц',
      'летелиц\\p{L}* за слетање',
      'сонд\\p{L}* за слетање',
      'слетелиц',
      'спустн\\p{L}* модул',
      'лунарн\\p{L}* летелиц',
    ],
    'zh-CN': ['着陆舱'],
    ar: ['محط\\p{L}* (?:ال)?هبوط', 'مسبار\\p{L}*(?: \\p{L}+)? للهبوط'],
    fr: ['modules? lunaires?', 'modules? de descente', 'sondes? d.atterrissage'],
    es: ['módulo'],
    it: ['modul\\p{L}* di allunaggio'],
    'pt-BR': ['módulo'],
  },
  rover: {
    ar: ['روفر'],
    es: ['vehícul'],
  },
  capsule: {
    ru: ['корабл', 'возвращаем\\p{L}* (?:модул|аппарат|капсул)'],
    'zh-CN': ['(?:样本|样品|着陆|下降|再入|返回|载人)舱', '舱室'],
    nl: ['monsterkapsel', 'retourkapsule', 'terugkeermodule'],
  },
  'upper stage': {
    ar: ['مرحل\\p{L}*(?: [\\p{L}\\w.-]+){0,3} (?:ال)?علي'],
  },
  'heat shield': {
    ja: ['遮熱', '熱遮蔽', '耐熱タイル'],
    'zh-CN': ['隔热瓦'],
    ko: ['열 ?보호막'],
    ar: ['دروع\\p{L}* (?:ال)?حراري'],
    de: ['Ablativschild'],
    'pt-BR': ['protetor térmico'],
  },
  airlock: {
    ko: ['기압실'],
    ar: ['حجر\\p{L}* (?:ال)?ضغط', 'غرف\\p{L}* معادلة'],
    'sr-Cyrl': ['комор'],
    it: ['camer\\p{L}* (?:stagn|di compensazione|di decompressione)'],
    nl: ['sluiz'],
    'pt-BR': ['câmara', 'compartimento de (?:ar|descompressão)'],
  },
  spacewalk: {
    ru: ['выход\\p{L}* в космос'],
    'zh-CN': ['舱外行走'],
    ar: [
      'خروج\\p{L}* في (?:ال)?فضاء',
      'سير\\p{L}*(?: \\p{L}+)? في (?:ال)?فضاء',
      'مشي\\p{L}*(?: \\p{L}+){0,2} (?:ال)?فضائي',
    ],
    'sr-Cyrl': ['изласк\\p{L}* у свемир', 'изласц\\p{L}* у свемир'],
    'pt-BR': ['caminhadas? no espaço'],
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
