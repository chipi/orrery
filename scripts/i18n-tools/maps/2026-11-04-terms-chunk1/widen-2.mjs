// Chunk 1, widening 2 (2026-11-04): the Shuttle sense of "orbiter" is written as the shuttle
// itself (ar مكوك, ja シャトル): accepted, not bound. Arabic broken plural المراحل العليا; forms
// with a name between the words (sr "излазак Алексеја Леонова у свемир").
import fs from 'node:fs';

const F = 'scripts/i18n-tools/native-terms.json';
const g = JSON.parse(fs.readFileSync(F, 'utf8'));
const W = {
  orbiter: {
    ja: ['軌道船', 'シャトル'],
    hi: ['कक्षयान'],
    ar: ['مكوك'],
  },
  lander: { es: ['alunizador'] },
  'upper stage': { ar: ['مراحل (?:ال)?علي', 'مرحل\\p{L}* (?:ال)?علوي'] },
  'heat shield': { de: ['Wärmeschild'] },
  airlock: { ar: ['حجر\\p{L}* (?:ال)?(?:هواء|معادل)'] },
  spacewalk: {
    'sr-Cyrl': ['излаз\\p{L}*(?: \\p{L}+){0,3} у (?:отворен\\p{L}* )?свемир'],
    ar: ['مشي\\p{L}*(?: \\p{L}+)? (?:في )?(?:ال)?فضاء'],
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
