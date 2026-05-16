#!/usr/bin/env tsx
import { execSync } from 'node:child_process';
import { existsSync, promises as fs } from 'node:fs';
import path from 'node:path';

/**
 * Surface Hotspots imagery wrapper (PRD-014 / RFC-017 §S2).
 *
 * Thin orchestrator that:
 *   1. Documents where each hotspot's LROC NAC / HiRISE source patch
 *      should be placed on disk (the actual fetch is manual — NASA's
 *      LROC Quickmap + UAHiRISE map browser don't have a public
 *      single-image API; operator downloads the regional mosaic +
 *      crops to 2048×2048 + saves at the expected path).
 *   2. Lists which hotspots are MISSING their source image so the
 *      operator knows what to fetch.
 *   3. Runs the Image Pipeline v2 (#148) over the hotspots segment
 *      to score + variant-generate whatever IS on disk.
 *
 * Expected source path:
 *   static/images/hotspots/{moon|mars}/{site_id}/tier2-{lroc|hirise}.jpg
 *
 * Source format spec (RFC-017 §ADR-060):
 *   - Moon: LROC NAC, 0.5 m/px, cropped + re-encoded to 2048×2048 JPEG q=88.
 *     Centre of image = published lat/lon. North up.
 *   - Mars: HiRISE, 25 cm/px, same 2048×2048 JPEG q=88.
 *     Centre of image = published lat/lon. North up.
 *
 * After this script runs, the 1:1 variants (`tier2-lroc.1x1.jpg`)
 * are what /moon and /mars actually render via the image-vision.json
 * manifest lookup.
 *
 * Usage:
 *   npm run images:hotspots              # list missing + run pipeline on present
 *   npm run images:hotspots -- --list    # only list; don't run pipeline
 *   npm run images:hotspots -- --site apollo11
 */

interface HotspotSidecar {
  entries: Record<
    string,
    {
      hotspot_tier_max?: number;
      hotspot_tier2_source?: string;
    }
  >;
}

const SIDECAR_PATH = path.join('static', 'data', 'surface-hotspots.json');

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const listOnly = args.includes('--list');
  const siteIdx = args.indexOf('--site');
  const onlySite = siteIdx >= 0 ? args[siteIdx + 1] : undefined;

  const raw = await fs.readFile(SIDECAR_PATH, 'utf-8');
  const sidecar = JSON.parse(raw) as HotspotSidecar;
  const tier2Sites = Object.entries(sidecar.entries).filter(
    ([id, e]) =>
      (e.hotspot_tier_max ?? 0) >= 2 &&
      typeof e.hotspot_tier2_source === 'string' &&
      (onlySite ? id === onlySite : true),
  );

  if (tier2Sites.length === 0) {
    console.log(
      `No tier-2 hotspots found in ${SIDECAR_PATH}${onlySite ? ` matching --site ${onlySite}` : ''}.`,
    );
    return;
  }

  console.log(`Tier-2 hotspots configured: ${tier2Sites.length}`);
  const missing: string[] = [];
  for (const [id, entry] of tier2Sites) {
    const sourcePath = `static${entry.hotspot_tier2_source}`;
    const present = existsSync(sourcePath);
    const status = present ? '✓' : '✗ MISSING';
    console.log(`  ${status}  ${id} → ${sourcePath}`);
    if (!present) missing.push(`${id} → ${sourcePath}`);
  }

  if (missing.length > 0) {
    console.log(`\n${missing.length} source image(s) need to be fetched manually.`);
    console.log(`Per RFC-017 §ADR-060 the operator workflow is:`);
    console.log(`  1. Open the LROC Quickmap (lroc.sese.asu.edu/quickmap) for Moon`);
    console.log(`     or the UAHiRISE map browser (uahirise.org) for Mars.`);
    console.log(`  2. Navigate to the published site lat/lon.`);
    console.log(`  3. Export a 2048×2048 NAC/HiRISE crop centred on the site, north up.`);
    console.log(`  4. Re-encode as JPEG q=88 and save at the path shown above.`);
    console.log(`  5. Re-run this script to score + generate variants.`);
  }

  if (listOnly) return;

  // Run the Image Pipeline v2 over the hotspots segment for whatever
  // images ARE on disk. The pipeline's --new-only default picks up
  // newly-fetched images automatically.
  console.log(`\nRunning Image Pipeline v2 over segment=hotspots ...`);
  try {
    execSync('npm run images:score -- --segment hotspots', { stdio: 'inherit' });
  } catch (err) {
    console.error(`Image Pipeline v2 failed: ${(err as Error).message}`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal:', (err as Error).message);
  process.exit(1);
});
