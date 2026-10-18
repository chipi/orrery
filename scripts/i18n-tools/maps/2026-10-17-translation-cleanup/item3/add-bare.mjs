// Add a bare-surname glossary key from an existing full-name key: each locale's surname is the
// last part of the full form (split on space, ・ or ·). Never overwrites an existing key.
//   node add-bare.mjs "John F. Kennedy" Kennedy   (WRITE=1 writes)
import fs from 'node:fs';

const [fullKey, bareKey] = process.argv.slice(2);
const P = 'scripts/i18n-tools/native-terms.json';
const g = JSON.parse(fs.readFileSync(P, 'utf8'));
const full = g.person[fullKey];
if (!full) throw new Error(`no person "${fullKey}"`);
if (g.person[bareKey]) throw new Error(`"${bareKey}" exists`);
const bare = { _bare: true, _qid: full._qid };
for (const [loc, f] of Object.entries(full))
  if (!loc.startsWith('_'))
    bare[loc] = f
      .trim()
      .split(/[\s・·]/)
      .at(-1);
console.log(JSON.stringify(bare));
if (process.env.WRITE) {
  g.person[bareKey] = bare;
  fs.writeFileSync(P, JSON.stringify(g, null, 2) + '\n');
  console.log('WRITTEN');
}
