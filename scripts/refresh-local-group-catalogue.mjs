/**
 * Local Group distance refresh (GitHub #658): McConnachie 2012 (VizieR J/AJ/144/4/catalog) into
 * static/data/universe/local-group.json (dist_mly, the schematic's panel value) and
 * static/data/local-group-galaxies.json (distance_kpc, the sky sprites). Each updated member
 * carries `catalogue.<field>` = { value, source, bibcode, record_url, note }. The schematic
 * xyz layout is not catalogue data and is left as authored.
 *
 *   Run: node scripts/refresh-local-group-catalogue.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fetchMcConnachie } from './lib/catalogue-sources.mjs';
import { applyToSchematic, applyToSprites } from './lib/local-group-catalogue.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const SCHEMATIC = path.join(ROOT, 'static', 'data', 'universe', 'local-group.json');
const SPRITES = path.join(ROOT, 'static', 'data', 'local-group-galaxies.json');

const read = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));
const write = (f, o) => fs.writeFileSync(f, JSON.stringify(o, null, 2) + '\n');

async function main() {
  const mcc = await fetchMcConnachie();
  console.log(`McConnachie 2012: ${mcc.size} galaxies`);

  const schematic = read(SCHEMATIC);
  const a = applyToSchematic(schematic.members, mcc);
  schematic.members = a.members;
  schematic._provenance =
    'Distances: McConnachie 2012 (AJ 144, 4) Local Group census via VizieR J/AJ/144/4, one catalogue entry per member (source, bibcode, record link); the catalogue gives whole kpc. Types: NED and McConnachie 2012. Schematic positions are hand-authored for legibility. Refresh: node scripts/refresh-local-group-catalogue.mjs';
  write(SCHEMATIC, schematic);
  console.log(
    `✓ ${a.members.length - a.skipped.length - 1} schematic members sourced; skipped: ${a.skipped.join(', ') || 'none'}`,
  );

  const sprites = read(SPRITES);
  const b = applyToSprites(sprites.entries, mcc);
  sprites.entries = b.entries;
  sprites.description =
    'Local Group galaxies plotted as billboard sprites on the /explore celestial sphere. Positions are J2000 ICRS (RA/Dec in decimal degrees). Distances from the Solar System in kiloparsecs from McConnachie (2012), via VizieR J/AJ/144/4, one catalogue entry per galaxy (source, bibcode, record link).';
  write(SPRITES, sprites);
  console.log(
    `✓ ${b.entries.length - b.skipped.length} sprite entries sourced; skipped: ${b.skipped.join(', ') || 'none'}`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
