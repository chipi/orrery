/**
 * Structure distance catalogue (GitHub #658): writes `catalogue.dist_mpc` into the members of
 * the four outer-scale files (local-sheet, virgo-cluster, laniakea, cosmic-web) from the table in
 * lib/structure-distance-catalogue.mjs. Offline: the table is hand-reviewed (batch 06), nothing
 * is fetched. Run again after editing the table or a `dist_mpc`.
 *
 *   Run: node scripts/apply-structure-distance-catalogue.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { applyStructureCatalogue, STRUCTURE_FILES } from './lib/structure-distance-catalogue.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const NOTE =
  ' Distance sources: `catalogue.dist_mpc` where a paper states the value (scripts/lib/structure-distance-catalogue.mjs, batch 06 review); a member with no entry is an anchor or its distance is unsourced.';

for (const name of STRUCTURE_FILES) {
  const file = path.join(ROOT, 'static', 'data', 'universe', `${name}.json`);
  const doc = JSON.parse(fs.readFileSync(file, 'utf8'));
  doc.members = applyStructureCatalogue(doc.members);
  if (!doc._provenance.includes(NOTE)) doc._provenance += NOTE;
  fs.writeFileSync(file, JSON.stringify(doc, null, 2) + '\n');
  const n = doc.members.filter((m) => m.catalogue).length;
  console.log(`✓ ${name}: ${n} of ${doc.members.length} distances sourced`);
}
