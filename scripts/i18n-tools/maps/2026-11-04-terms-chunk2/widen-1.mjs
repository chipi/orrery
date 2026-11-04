// Chunk 2, widening 1 (2026-11-04, term-candidates --misses): singular / case forms the stems
// missed (sr узорка, fr / pt-BR singular échantillon / amostra), the plain words each language
// uses (ru невесомость, грунт; sr бестежинско стање; ar انعدام الجاذبية), and a script bug: in
// Devanagari the vowel signs are combining marks, so `\p{L}*` after a hi stem never matched
// नमूना — every hi stem now uses [\p{L}\p{M}]* (chunk 1's too).
import fs from 'node:fs';

const F = 'scripts/i18n-tools/native-terms.json';
const g = JSON.parse(fs.readFileSync(F, 'utf8'));
for (const e of Object.values(g.term))
  if (e._match?.hi) e._match.hi = e._match.hi.map((s) => s.replaceAll('\\p{L}', '[\\p{L}\\p{M}]'));

const W = {
  splashdown: {
    'sr-Cyrl': [
      'спусти\\p{L}*(?: се)? (?:у|на) (?:\\p{L}+ )?(?:океан|Пацифик|Атлантик|Тихи|воду|море)',
    ],
    ko: ['스플래시 ?다운'],
    ar: ['هبط\\p{L}* في (?:ال)?(?:محيط|بحر)', 'على (?:ال)?ماء'],
    de: ['Wassern', 'gewassert'],
    es: ['amariz'],
  },
  'sample return': {
    ru: ['возврат\\p{L}* грунт', 'с возвратом'],
    'sr-Cyrl': ['поврат\\p{L}* узорк', 'враћањ\\p{L}* (?:\\p{L}+ )?узор'],
    ja: ['サンプル(?:の)?回収'],
    ko: ['표본 ?(?:반환|회수|귀환)', '샘플 ?반환'],
    ar: ['عود\\p{L}* (?:ب|ل)?(?:ال)?عين', 'إعاد\\p{L}* (?:ال)?عين'],
    de: ['Rückführung von \\p{L}*[Pp]roben', 'Probenrückkehr'],
    fr: ['retours? d.échantillon'],
    es: ['retorno\\p{L}*(?: \\p{L}+)? de muestras'],
    nl: ['monsterretour', 'monsters? terug'],
    'pt-BR': ['retornos? de amostra'],
  },
  regolith: {
    ru: ['грунт'],
    ko: ['표토'],
  },
  microgravity: {
    ru: ['невесомост'],
    'sr-Cyrl': ['бестежинск\\p{L}* стањ'],
    ar: ['انعدام (?:ال)?جاذبي'],
  },
  'life support': {
    'zh-CN': ['生保'],
    hi: ['जीवन[- ]?सहायक'],
    nl: ['levensondersteunend'],
  },
};
let n = 0;
for (const [term, w] of Object.entries(W))
  for (const [loc, v] of Object.entries(w))
    for (const s of v)
      if (!g.term[term]._match[loc].includes(s)) {
        g.term[term]._match[loc].push(s);
        n++;
      }
fs.writeFileSync(F, JSON.stringify(g, null, 2) + '\n');
console.log('stems added', n);
