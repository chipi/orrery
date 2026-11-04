// Chunk 4, widening 1 (2026-11-04, term-candidates --misses): it «alone» (Italian for halo), ko
// 할로, ja フリーリターン, word orders (sr ракетна једначина, fr équation de fusée, pt-BR equação
// de foguete, ru свободная траектория возврата). Not accepted — fixed: nl «Hohmann-overdracht»,
// hi «मुक्त-रिटर्न».
import fs from 'node:fs';

const F = 'scripts/i18n-tools/native-terms.json';
const g = JSON.parse(fs.readFileSync(F, 'utf8'));
const W = {
  'halo orbit': { it: ['(?<!\\p{L})alone(?!\\p{L})'], ko: ['할로'] },
  'free-return': {
    ja: ['フリーリターン'],
    ru: ['свободн\\p{L}* траектори'],
  },
  'rocket equation': {
    'sr-Cyrl': ['ракетн\\p{L}* једначин'],
    fr: ['équations? (?:de )?fusée'],
    'pt-BR': ['equaç\\p{L}* de foguete'],
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
