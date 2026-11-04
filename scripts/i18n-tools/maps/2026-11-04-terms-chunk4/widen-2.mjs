// Chunk 4, widening 2 (2026-11-04, after reading every miss): an adjective inside the term
// («équation logarithmique de la fusée»), the Tsiolkovsky-name form of the rocket equation in
// every locale, it «punto lagrangiano», word orders and inflections (sr СЛОБОДАН ПОВРАТАК, de
// Freie-Rückkehr, pt-BR livre retorno, ru свободного возвращения, ar المتزامن شمسيًا, es
// heliosincrónica, nl zonnesynchrone). Not accepted — fixed: ru «бесплатным возвратом» (free of
// charge), ja «遊離帰還», nl «overdrachten» for Hohmann transfers.
import fs from 'node:fs';

const F = 'scripts/i18n-tools/native-terms.json';
const g = JSON.parse(fs.readFileSync(F, 'utf8'));
const W = {
  'Lagrange point': { it: ['lagrangian'] },
  'rocket equation': {
    'sr-Cyrl': ['Циолковск\\p{L}* једначин'],
    de: ['T?[sz]iolkowski-Gleichung', 'Ziolkowski'],
    nl: ['Tsiolkovski-vergelijking'],
    hi: ['त्सिओल्कोव्स्की (?:का )?समीकरण'],
    fr: ['équations? (?:\\p{L}+ )?de la fusée'],
    es: ['ecuaci\\p{L}* (?:\\p{L}+ )?del cohete'],
    it: ['equazion\\p{L}* (?:\\p{L}+ )?del razzo'],
    'pt-BR': ['equaç\\p{L}* (?:\\p{L}+ )?do foguete'],
  },
  'free-return': {
    ru: ['свободн\\p{L}* возвращ'],
    'sr-Cyrl': ['слобод\\p{L}* поврат'],
    de: ['Freie-Rückkehr'],
    it: ['libera di ritorno'],
    'pt-BR': ['livre retorno'],
  },
  'sun-synchronous': {
    ar: ['متزامن[\\p{L}]* شمسي', 'شمسي[\\p{L}]* (?:ال)?متزامن'],
    es: ['heliosincr'],
    nl: ['zonnesynchro'],
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
