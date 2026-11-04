// Chunk 5, widening 1 (2026-11-04): nl stem bug (lichtja(?:a|r)r never matched «lichtjaren»),
// ar singular «كوكب خارجي» and the spelling «المغنطيسي», de «bewohnbare Zone».
import fs from 'node:fs';

const F = 'scripts/i18n-tools/native-terms.json';
const g = JSON.parse(fs.readFileSync(F, 'utf8'));
g.term['light-year']._match.nl = ['lichtjaa?r'];
const W = {
  exoplanet: { ar: ['كوكب[\\p{L}]* خارجي'] },
  'habitable zone': { de: ['bewohnbar\\p{L}* Zone'] },
  magnetosphere: { ar: ['(?:ال)?غلاف (?:ال)?مغن(?:ا)?طيسي'] },
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
