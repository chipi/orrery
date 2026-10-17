// One-name check across pages: for each English name that appears as the `name` of more
// than one entity page, or any name in the given list, print every distinct form each
// locale uses for it (with the pages), so one form can be chosen and applied everywhere.
//   node scripts/i18n-tools/name-variants.mjs <canonical-names.tsv> ["English name" …]
import fs from 'node:fs';
const [file, ...only] = process.argv.slice(2);
const [head, ...rows] = fs
  .readFileSync(file, 'utf8')
  .trim()
  .split('\n')
  .map((l) => l.split('\t'));
const LOCS = head.slice(3);
const byEn = new Map();
for (const r of rows) if (r[1] === 'name') (byEn.get(r[2]) ?? byEn.set(r[2], []).get(r[2])).push(r);
for (const [en, rs] of byEn) {
  if (only.length ? !only.includes(en) : rs.length < 2) continue;
  console.log(`## ${en}  (${rs.map((r) => r[0]).join(', ')})`);
  for (const [i, loc] of LOCS.entries()) {
    const forms = [...new Set(rs.map((r) => r[3 + i]))];
    console.log(`  ${loc}: ${forms.join('  |  ')}`);
  }
}
