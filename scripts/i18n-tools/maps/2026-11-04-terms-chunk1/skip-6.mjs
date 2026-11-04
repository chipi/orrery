// Chunk 1, step 6 (2026-11-04, from the /science/glossary check): "orbiter" on the Shuttle and
// Buran pages is the winged orbiter, not a robotic one, so those pages are skipped for the term
// (`_en_skip`, read by term-drift, term-widen-check and build-glossary "used on").
import fs from 'node:fs';

const F = 'scripts/i18n-tools/native-terms.json';
const g = JSON.parse(fs.readFileSync(F, 'utf8'));
g.term.orbiter._en_skip = [
  'fleet/crewed-spacecraft/atlantis.json',
  'fleet/crewed-spacecraft/buran',
  'fleet/crewed-spacecraft/challenger.json',
  'fleet/crewed-spacecraft/columbia.json',
  'fleet/crewed-spacecraft/discovery.json',
  'fleet/crewed-spacecraft/endeavour.json',
  'fleet/crewed-spacecraft/enterprise.json',
  'fleet/crewed-spacecraft/space-shuttle-orbiter.json',
  'programs/buran.json',
  'programs/space-shuttle.json',
];
fs.writeFileSync(F, JSON.stringify(g, null, 2) + '\n');

// Keeps on the skipped pages are no longer reached: removed.
const K = 'scripts/i18n-tools/term-keeps.json';
const keeps = JSON.parse(fs.readFileSync(K, 'utf8'));
let dropped = 0;
for (const key of Object.keys(keeps)) {
  const [term, , where] = key.split('|');
  if (term === 'orbiter' && g.term.orbiter._en_skip.some((p) => where.startsWith(p))) {
    delete keeps[key];
    dropped++;
  }
}
fs.writeFileSync(K, JSON.stringify(keeps, null, 2) + '\n');
console.log('keeps dropped', dropped);
