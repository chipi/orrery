// Chunk 1, narrowing 5 (2026-11-04, from the widen check of the new terms): the bare Arabic verb
// "تدور حول" also matched "the moons that orbit each planet" (science/planets/_intro), so it
// counts only after a craft noun; English "lander" is not accepted in pt-BR (de "Spacewalk"
// was changed for the same reason).
import fs from 'node:fs';

const F = 'scripts/i18n-tools/native-terms.json';
const g = JSON.parse(fs.readFileSync(F, 'utf8'));
const DROP = {
  orbiter: { ar: ['تدور حول', 'يدور حول', 'دارت حول', 'تدخل مدار'] },
  lander: { 'pt-BR': ['lander'] },
};
const ADD = {
  orbiter: {
    ar: [
      'مركب\\p{L}*(?: [\\p{L}\\w.-]+){0,2} (?:تدور|يدور|دارت|تدخل) (?:حول|مدار)',
      'مسبار\\p{L}*(?: [\\p{L}\\w.-]+){0,2} (?:تدور|يدور|دار|يدخل) (?:حول|مدار)',
    ],
  },
};
for (const [term, w] of Object.entries(DROP))
  for (const [loc, v] of Object.entries(w))
    g.term[term]._match[loc] = g.term[term]._match[loc].filter((s) => !v.includes(s));
for (const [term, w] of Object.entries(ADD))
  for (const [loc, v] of Object.entries(w))
    for (const s of v) if (!g.term[term]._match[loc].includes(s)) g.term[term]._match[loc].push(s);
fs.writeFileSync(F, JSON.stringify(g, null, 2) + '\n');
console.log('done');
