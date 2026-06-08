#!/usr/bin/env tsx
import { existsSync, promises as fs } from 'node:fs';
import path from 'node:path';
import { tileNameForLatLon, tileUrlForName } from './ctx-mosaic.ts';
import { LROC_CURATED_PRODUCTS, lrocProductIdToImgUrl } from './lroc-products.ts';
import {
  buildCtxMosaicProvenanceEntry,
  buildLrocProvenanceEntry,
  upsertProvenanceEntries,
  type ProvenanceEntry,
} from './provenance.ts';

/**
 * One-shot repair: re-upsert image-provenance.json entries for the
 * Tier-2 regional crops (Mars CTX + Moon LROC NAC regional) that
 * already exist on disk. Needed when `build-image-provenance.ts`
 * runs AFTER the fetch orchestrator — the rebuild walks its own
 * curated maps and silently drops the hotspot entries the fetch
 * orchestrator had upserted, because hotspot provenance isn't part
 * of the build script's source-of-truth maps.
 *
 * Idempotent: reads each output path off disk, derives source URL +
 * product/tile id from moon-sites.json / mars-sites.json + the
 * curated LROC product map, and calls upsertProvenanceEntries.
 */

interface Site {
  id: string;
  kind?: string;
  lat?: number;
  lon?: number;
}

const MARS_SITES_PATH = path.join('static', 'data', 'mars-sites.json');
const MOON_SITES_PATH = path.join('static', 'data', 'moon-sites.json');

async function main(): Promise<void> {
  const marsSites = JSON.parse(await fs.readFile(MARS_SITES_PATH, 'utf-8')) as Site[];
  const moonSites = JSON.parse(await fs.readFile(MOON_SITES_PATH, 'utf-8')) as Site[];
  const entries: ProvenanceEntry[] = [];

  // Mars CTX regional.
  for (const s of marsSites) {
    if (s.kind === 'orbiter' || s.lat == null || s.lon == null) continue;
    const outputPath = `static/images/hotspots/mars/${s.id}/tier2-ctx.jpg`;
    if (!existsSync(outputPath)) continue;
    const tileName = tileNameForLatLon(s.lat, s.lon);
    entries.push(
      buildCtxMosaicProvenanceEntry({
        outputPath,
        sourceUrl: tileUrlForName(tileName),
        tileName,
        siteId: s.id,
        centerLat: s.lat,
        centerLon: s.lon,
      }),
    );
  }

  // Moon LROC NAC regional.
  for (const s of moonSites) {
    if (s.kind === 'orbiter' || s.lat == null || s.lon == null) continue;
    const outputPath = `static/images/hotspots/moon/${s.id}/tier2-regional.jpg`;
    if (!existsSync(outputPath)) continue;
    const curated = LROC_CURATED_PRODUCTS[s.id];
    if (!curated) {
      console.log(`  · ${s.id} skipped (no curated LROC product — file orphaned)`);
      continue;
    }
    let sourceUrl: string;
    try {
      sourceUrl = lrocProductIdToImgUrl(curated);
    } catch (err) {
      console.log(`  · ${s.id} skipped (URL build failed: ${(err as Error).message})`);
      continue;
    }
    entries.push(
      buildLrocProvenanceEntry({
        outputPath,
        sourceUrl,
        productId: curated.productId,
        siteId: s.id,
        centerLat: s.lat,
        centerLon: s.lon,
      }),
    );
  }

  await upsertProvenanceEntries(entries);
  console.log(`Upserted ${entries.length} tier-2 regional provenance entries`);
}

main().catch((err) => {
  console.error('Fatal:', (err as Error).message);
  process.exit(1);
});
