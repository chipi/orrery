// Chunk 5: this round's wrong forms into wrong-forms.json (the cross-file guard).
import fs from 'node:fs';

const F = 'scripts/i18n-tools/wrong-forms.json';
const w = JSON.parse(fs.readFileSync(F, 'utf8'));
const ADD = [
  { loc: 'pt-BR', re: 'asteróide', why: 'pre-2009 spelling; asteroide' },
  {
    loc: 'pt-BR',
    re: '[Cc]intura de asteroides',
    why: 'European Portuguese; cinturão de asteroides',
  },
  { loc: 'fr', re: 'Light-(?:Year|Minute)', why: 'English; année-lumière / minute-lumière' },
  {
    loc: 'es',
    re: '[Aa]ños? de luz(?! solar)',
    why: 'año luz (años de luz solar = years of sunlight is fine)',
  },
];
for (const a of ADD) if (!w.forms.some((f) => f.loc === a.loc && f.re === a.re)) w.forms.push(a);
fs.writeFileSync(F, JSON.stringify(w, null, 2) + '\n');
