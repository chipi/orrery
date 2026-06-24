/**
 * Backfill image-provenance for all Mars surface imagery (#360 / credits):
 *   1. Add the capturing-spacecraft fields (MRO + HiRISE/CTX) to existing
 *      landing-patch + CTX provenance entries that predate the field.
 *   2. Create provenance entries for every along-route HiRISE patch (the
 *      route fetch writes the crops but not provenance), so /credits attributes
 *      them and links each back to Mars Reconnaissance Orbiter.
 *
 * Idempotent — re-runnable. Run after the route + CTX fetches complete.
 *
 * Run (Node 20):
 *   node --import tsx scripts/hotspots/backfill-imagery-provenance.ts
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { buildHiriseProvenanceEntry, upsertProvenanceEntries } from './provenance.ts';
import { hiriseProductIdToJP2Url } from './hirise-catalog.ts';

const PROV = path.join('static', 'data', 'image-provenance.json');
const TRAV_DIR = path.join('static', 'data', 'mars-traverses');

interface RoutePatch {
  id: string;
  lat: number;
  lon: number;
  image: string;
  product_id: string;
}

async function main() {
  // --- 1. Patch spacecraft fields onto existing surface-imagery entries ---
  const prov = JSON.parse(await fs.readFile(PROV, 'utf-8'));
  let patched = 0;
  for (const e of prov.entries as Array<Record<string, unknown>>) {
    const p = String(e.path ?? '');
    if (!p.includes('/hotspots/mars/')) continue;
    let instrument: string | null = null;
    if (p.includes('tier2-ctx')) instrument = 'CTX';
    else if (p.includes('tier2-hirise') || p.includes('/traverse/')) instrument = 'HiRISE';
    if (!instrument) continue;
    if (e.spacecraft_id === 'mro' && e.instrument === instrument) continue;
    e.spacecraft_id = 'mro';
    e.spacecraft_name = 'Mars Reconnaissance Orbiter';
    e.instrument = instrument;
    patched++;
  }
  await fs.writeFile(PROV, JSON.stringify(prov, null, 2) + '\n');
  console.log(`Patched ${patched} existing entries with MRO spacecraft fields.`);

  // --- 2. Create provenance for every along-route HiRISE patch ---
  const existingPaths = new Set((prov.entries as Array<{ path: string }>).map((e) => e.path));
  const manifests = (await fs.readdir(TRAV_DIR)).filter((f) => f.endsWith('.route-patches.json'));
  const newEntries = [];
  for (const m of manifests) {
    const rover = m.replace('.route-patches.json', '');
    const { patches } = JSON.parse(await fs.readFile(path.join(TRAV_DIR, m), 'utf-8')) as {
      patches: RoutePatch[];
    };
    for (const rp of patches) {
      if (existingPaths.has(rp.image)) continue; // patched above already
      newEntries.push(
        buildHiriseProvenanceEntry({
          outputPath: `static${rp.image}`,
          sourceUrl: hiriseProductIdToJP2Url(rp.product_id),
          productId: rp.product_id,
          siteId: rover,
          centerLat: rp.lat,
          centerLon: rp.lon,
        }),
      );
    }
  }
  if (newEntries.length) await upsertProvenanceEntries(newEntries);
  console.log(`Added ${newEntries.length} route-patch provenance entries (MRO · HiRISE).`);
}

main();
