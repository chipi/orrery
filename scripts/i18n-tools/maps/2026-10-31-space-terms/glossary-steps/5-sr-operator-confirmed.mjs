// Operator 2026-10-31: the Serbian forms of all 20 terms are confirmed ("Serbian words are
// perfect"), and «уз помоћ гравитације» is as good as «гравитациони маневар» for a gravity
// assist ("both options are fine").
import fs from 'node:fs';
const GF = 'scripts/i18n-tools/native-terms.json';
const g = JSON.parse(fs.readFileSync(GF, 'utf8'));
for (const [term, e] of Object.entries(g.term)) {
  e._confidence['sr-Cyrl'] = 'high';
  const k = `term:${term}:sr-Cyrl`;
  g.sources[k] = `${g.sources[k] ? g.sources[k] + '; ' : ''}confirmed by the operator 2026-10-31`;
}
const ga = g.term['gravity assist']._match;
ga['sr-Cyrl'] = [...new Set([...ga['sr-Cyrl'], 'уз помоћ гравитациј'])];
fs.writeFileSync(GF, JSON.stringify(g, null, 2) + '\n');
console.log('ok');
