// Chunk 2, widening 2 (2026-11-04): sample-return forms the site uses that are right — hi with a
// hyphen, it «restituzione / rientro campioni», nl one-word «maanmonsters», a word between
// (pt-BR «retorno robótico de amostras»), es «devolución», de «Probenrückgabe». Not accepted:
// nl «steekproef» (a statistical sample) and English left in it — changed instead.
import fs from 'node:fs';

const F = 'scripts/i18n-tools/native-terms.json';
const g = JSON.parse(fs.readFileSync(F, 'utf8'));
const W = {
  'sample return': {
    hi: ['नमूना[- ]वापसी'],
    it: ['restituzion\\p{L}* (?:di |dei |del )?campion', 'rientr\\p{L}* (?:di |dei )?campion'],
    nl: ['terugkeer van \\p{L}*monsters'],
    'pt-BR': ['retorno\\p{L}*(?: \\p{L}+)? de amostra'],
    es: ['devoluci\\p{L}* de muestras'],
    de: ['Probenrückgabe'],
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
