/**
 * Backfill `hotspot_tier2_ground_m` + `hotspot_tier2_regional_ground_m`
 * into static/data/surface-hotspots.json from the actual fetched crops
 * (#309 step 2). Detail ground = HiRISE crop size (2048) × source res
 * (read from the cached source raster named by image-provenance source_url);
 * regional ground = CTX crop size (3072) × source res (5 m/px Murray Lab).
 *
 * These let the surface-patch builder co-scale the detail patch literally.
 * Idempotent — re-running just refreshes the numbers. Going forward the
 * fetch pipeline writes the same fields, so this is only for the existing
 * already-fetched set.
 *
 * Run (Node 20 for gdal-async):
 *   ~/.nvm/versions/node/v20.20.2/bin/node scripts/hotspots/backfill-tier2-ground.mjs
 */
import gdal from 'gdal-async';
import { createHash } from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs';

const ROOT = process.cwd();
const SIDECAR = path.join(ROOT, 'static/data/surface-hotspots.json');
const PROV = path.join(ROOT, 'static/data/image-provenance.json');
const RAW = path.join(ROOT, '.image-cache/hotspots/raw');
const HIRISE_CROP_PX = 2048;
const CTX_CROP_PX = 3072;
const CTX_RES_FALLBACK = 5;

function provIndex() {
  const prov = JSON.parse(fs.readFileSync(PROV, 'utf8'));
  const flat = [];
  (function walk(o) {
    if (o && typeof o === 'object') {
      if (o.path && o.source_url) flat.push(o);
      for (const v of Object.values(o)) walk(v);
    }
  })(prov);
  return new Map(flat.map((o) => [o.path, o.source_url]));
}

function rasterRes(sourceUrl) {
  try {
    const ext = path.extname(new URL(sourceUrl).pathname) || '.bin';
    const h = createHash('sha256').update(sourceUrl).digest('hex').slice(0, 16);
    const cp = path.join(RAW, `${h}${ext}`);
    if (fs.existsSync(cp)) return Math.abs(gdal.open(cp).geoTransform[1]);
  } catch {
    /* fall through */
  }
  return null;
}

function main() {
  const sidecar = JSON.parse(fs.readFileSync(SIDECAR, 'utf8'));
  const srcUrlFor = provIndex();
  let detailN = 0,
    regionalN = 0;
  for (const [siteId, e] of Object.entries(sidecar.entries)) {
    // Mars only: detail ground is read from the HiRISE source raster and
    // the regional layer is the 5 m/px Murray Lab CTX mosaic. Moon sites
    // (LROC NAC detail / WAC regional) have a different regional resolution
    // and their source rasters aren't cached, so leave them on the legacy
    // editorial scale until a Moon re-fetch authors their extents.
    const isMars = e.hotspot_tier2_source?.includes('/mars/');
    if (!isMars) continue;
    if (e.hotspot_tier2_source) {
      const url = srcUrlFor.get(e.hotspot_tier2_source);
      const res = url && url.includes('hirise') ? rasterRes(url) : null;
      if (res) {
        e.hotspot_tier2_ground_m = Math.round(HIRISE_CROP_PX * res);
        detailN++;
      }
    }
    if (e.hotspot_tier2_regional_source) {
      const url = srcUrlFor.get(e.hotspot_tier2_regional_source);
      const res = url ? (rasterRes(url) ?? CTX_RES_FALLBACK) : CTX_RES_FALLBACK;
      e.hotspot_tier2_regional_ground_m = Math.round(CTX_CROP_PX * res);
      regionalN++;
    }
    if (e.hotspot_tier2_ground_m || e.hotspot_tier2_regional_ground_m) {
      console.log(
        `  ${siteId.padEnd(18)} detail=${e.hotspot_tier2_ground_m ?? '—'}m regional=${e.hotspot_tier2_regional_ground_m ?? '—'}m`,
      );
    }
  }
  fs.writeFileSync(SIDECAR, JSON.stringify(sidecar, null, 2) + '\n');
  console.log(`\nBackfilled ${detailN} detail + ${regionalN} regional ground extents.`);
}

main();
