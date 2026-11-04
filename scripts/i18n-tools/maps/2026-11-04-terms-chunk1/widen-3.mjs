// Chunk 1, widening 3 (2026-11-04, after reading the orbiter misses): the plain "probe / craft
// in orbit" renderings every language uses in running text are accepted (ru аппарат на орбите,
// спутник Венеры; ja 探査機; ko 탐사선; zh 探测器). Not accepted: ar مدار (an orbit, not an orbiter).
import fs from 'node:fs';

const F = 'scripts/i18n-tools/native-terms.json';
const g = JSON.parse(fs.readFileSync(F, 'utf8'));
const W = {
  orbiter: {
    ru: [
      'аппарат\\p{L}* на орбит',
      'спутник\\p{L}* (?:Венеры|Марса|Луны|Юпитера|Сатурна|Меркурия)',
      'лунн\\p{L}* (?:спутник|аппарат)',
      'зонд',
    ],
    ja: ['探査機', '観測機', '科学衛星', '周回'],
    ko: ['탐사선'],
    'zh-CN': ['探测器'],
    hi: ['कक्षा में \\p{L}* ?यान', 'परिक्रम\\p{L}*'],
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
