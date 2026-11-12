/**
 * Black-hole catalogue refresh (GitHub #658).
 *
 * The masses and distances of the three real holes are the papers' values (lib/black-hole-
 * catalogue.mjs: GRAVITY 2022, EHT 2019, Miller-Jones 2021), written into
 * static/data/universe/black-holes.json with their bibcodes and the Schwarzschild radius
 * recomputed from the mass. Each distance is cross-checked against SIMBAD's compiled distances
 * for the object (a value outside their spread, with 10 per cent slack, fails the run); where
 * SIMBAD has none (Sgr A*) the note says so. M87*'s note also carries the Cosmicflows-4
 * distance of M87 from the deep-sky snapshot. Gargantua keeps no catalogue entries.
 *
 *   Run: node scripts/refresh-black-hole-catalogue.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { simbadQuery, pcToLy } from './lib/catalogue-sources.mjs';
import {
  REAL_HOLES,
  buildRealHole,
  holeDistanceLy,
  withinSimbadRange,
} from './lib/black-hole-catalogue.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const FILE = path.join(ROOT, 'static', 'data', 'universe', 'black-holes.json');

async function simbadRange(simbadId) {
  const ids = await simbadQuery(
    `SELECT i.oidref FROM ident i WHERE i.id IN ('${simbadId}', '${simbadId.replace(/ /g, '  ')}', 'NAME ${simbadId}')`,
  );
  if (!ids.length) throw new Error(`SIMBAD does not know ${simbadId}`);
  const rows = await simbadQuery(
    `SELECT dist, unit FROM mesdistance WHERE oidref=${Number(ids[0].oidref)}`,
  );
  const lys = rows
    .map((r) => {
      const d = Number(r.dist);
      const u = r.unit.trim().toLowerCase();
      return u === 'pc'
        ? pcToLy(d)
        : u === 'kpc'
          ? pcToLy(d * 1e3)
          : u === 'mpc'
            ? pcToLy(d * 1e6)
            : null;
    })
    .filter((v) => v !== null);
  return lys.length ? { n: lys.length, rangeLy: [Math.min(...lys), Math.max(...lys)] } : null;
}

async function main() {
  const doc = JSON.parse(fs.readFileSync(FILE, 'utf8'));
  const dso = JSON.parse(
    fs.readFileSync(path.join(ROOT, 'static', 'data', 'universe', 'deep-sky-objects.json'), 'utf8'),
  );
  const m87 = dso.objects.find((o) => o.id === 'm87');

  const objects = [];
  for (const hole of doc.objects) {
    const spec = REAL_HOLES[hole.id];
    if (!spec) {
      const { catalogue: _c, records: _r, ...rest } = hole;
      objects.push({ ...rest, records: {}, catalogue: {} });
      continue;
    }
    const sim = await simbadRange(spec.simbadId);
    const ly = holeDistanceLy(spec.dist);
    const ok = withinSimbadRange(ly, sim?.rangeLy);
    if (ok === false) {
      throw new Error(
        `${hole.id}: ${ly} ly is outside SIMBAD's ${sim.rangeLy.map(Math.round)} ly (n=${sim.n})`,
      );
    }
    const extra = {
      dist_ly: [
        sim
          ? `SIMBAD compiled distances ${(sim.rangeLy[0] / 1e3).toFixed(1)} to ${(sim.rangeLy[1] / 1e3).toFixed(1)} kly (n=${sim.n}), consistent`
          : 'SIMBAD lists no distance for this object, so the value is not cross-checked there',
        hole.id === 'm87-star' && m87?.catalogue?.dist_ly
          ? `Cosmicflows-4 gives M87 ${(m87.catalogue.dist_ly.value / 1e6).toFixed(1)} million ly`
          : null,
      ]
        .filter(Boolean)
        .join('; '),
    };
    objects.push(buildRealHole(hole, spec, extra));
    console.log(
      `✓ ${hole.id}: ${spec.mass.value} Msun, ${ly} ly, SIMBAD ${sim ? `${sim.n} rows` : 'none'}`,
    );
  }

  const SENTENCE =
    ' Mass and distance of the real holes are the published values named in each `catalogue` entry (scripts/refresh-black-hole-catalogue.mjs); rs_km is recomputed from the mass.';
  const out = {
    _note: doc._note.includes('refresh-black-hole-catalogue') ? doc._note : doc._note + SENTENCE,
    objects,
  };
  fs.writeFileSync(FILE, JSON.stringify(out, null, 2) + '\n');
  console.log(`✓ wrote ${objects.length} black holes → ${path.relative(ROOT, FILE)}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
