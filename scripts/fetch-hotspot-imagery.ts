#!/usr/bin/env tsx
import { execSync } from 'node:child_process';
import { existsSync, promises as fs } from 'node:fs';
import path from 'node:path';
import { fetchMarsHotspots } from './hotspots/fetch-mars.ts';
import { fetchMarsCtxHotspots } from './hotspots/fetch-mars-ctx.ts';
import { fetchMarsPanoramas } from './hotspots/fetch-mars-panoramas.ts';
import { fetchMoonHotspots } from './hotspots/fetch-moon.ts';
import { fetchMoonRegionalHotspots } from './hotspots/fetch-moon-regional.ts';
import { fetchMoonPanoramas } from './hotspots/fetch-moon-panoramas.ts';
import {
  buildHiriseProvenanceEntry,
  buildCtxMosaicProvenanceEntry,
  buildLrocProvenanceEntry,
  upsertProvenanceEntries,
} from './hotspots/provenance.ts';

/**
 * Surface Hotspots imagery orchestrator (PRD-014 / RFC-017 §S2,
 * v0.7.x #PA — Tier B).
 *
 * Mars (HiRISE): full Tier B — catalog query against the cached
 * HiRISE RDR cumulative index + auto-pick best frame + GDAL crop +
 * provenance integration. Hands-off after first run.
 *
 * Moon (LROC NAC): not yet — separate decision pending. Until then
 * lunar sites stay listed-but-skipped with a "no NAC product
 * configured" log + no Tier 2 patch on disk (the frontend renders
 * the placeholder material, geometry + LOD swap still verifiable).
 *
 * Post-fetch: runs `npm run images:score -- --segment hotspots` to
 * push the new patches through the Image Pipeline v2 (#148) for
 * variant generation + score-based selection. Image-vision.json
 * sidecar updates automatically.
 *
 * Usage:
 *   npm run images:hotspots                       # fetch all Mars sites + score
 *   npm run images:hotspots -- --list             # list only; no fetch
 *   npm run images:hotspots -- --site curiosity   # one Mars site (force-rebuild)
 *   npm run images:hotspots -- --missing-only     # skip sites already on disk
 *   npm run images:hotspots -- --dry-run          # preview without fetching
 *   npm run images:hotspots -- --skip-score       # skip the auto image-vision step
 *
 * Processing is strictly serial — one site at a time, candidates
 * within a site tried in order. Inter-site pause (POLITE_PAUSE_MS in
 * fetch-mars.ts) keeps us off any rate-limit radar at UAHiRISE PDS.
 */

interface HotspotSidecar {
  entries: Record<
    string,
    {
      hotspot_tier_max?: number;
      hotspot_tier2_source?: string;
      hotspot_tier2_force_product_id?: string;
      location_uncertainty_m?: number;
    }
  >;
}

interface MarsSite {
  id: string;
  kind?: string;
  lat?: number;
  lon?: number;
}

interface MoonSite {
  id: string;
  kind?: string;
  lat?: number;
  lon?: number;
}

const SIDECAR_PATH = path.join('static', 'data', 'surface-hotspots.json');
const MARS_SITES_PATH = path.join('static', 'data', 'mars-sites.json');
const MOON_SITES_PATH = path.join('static', 'data', 'moon-sites.json');

interface CliArgs {
  list: boolean;
  site?: string;
  dryRun: boolean;
  skipScore: boolean;
  missingOnly: boolean;
  layer: 'hirise' | 'ctx' | 'tier3' | 'lroc' | 'lroc-regional' | 'all';
  dest: 'mars' | 'moon' | 'all';
}

function parseArgs(): CliArgs {
  const args = process.argv.slice(2);
  const out: CliArgs = {
    list: false,
    dryRun: false,
    skipScore: false,
    missingOnly: false,
    layer: 'all',
    dest: 'all',
  };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--list') out.list = true;
    else if (args[i] === '--dry-run') out.dryRun = true;
    else if (args[i] === '--skip-score') out.skipScore = true;
    else if (args[i] === '--missing-only') out.missingOnly = true;
    else if (args[i] === '--site' && i + 1 < args.length) {
      out.site = args[++i];
    } else if (args[i] === '--layer' && i + 1 < args.length) {
      const v = args[++i];
      if (
        v !== 'hirise' &&
        v !== 'ctx' &&
        v !== 'tier3' &&
        v !== 'lroc' &&
        v !== 'lroc-regional' &&
        v !== 'all'
      ) {
        throw new Error(`--layer must be hirise|ctx|tier3|lroc|lroc-regional|all (got ${v})`);
      }
      out.layer = v;
    } else if (args[i] === '--dest' && i + 1 < args.length) {
      const v = args[++i];
      if (v !== 'mars' && v !== 'moon' && v !== 'all') {
        throw new Error(`--dest must be mars|moon|all (got ${v})`);
      }
      out.dest = v;
    }
  }
  return out;
}

async function main(): Promise<void> {
  const args = parseArgs();
  const sidecar = JSON.parse(await fs.readFile(SIDECAR_PATH, 'utf-8')) as HotspotSidecar;

  // Filter sidecar to tier-2 hotspots (optionally narrowed by --site).
  const all = Object.entries(sidecar.entries).filter(
    ([id, e]) =>
      (e.hotspot_tier_max ?? 0) >= 2 &&
      typeof e.hotspot_tier2_source === 'string' &&
      (args.site ? id === args.site : true),
  );

  if (all.length === 0) {
    console.log(`No tier-2 hotspots found${args.site ? ` matching --site ${args.site}` : ''}.`);
    return;
  }

  // Split into Mars (full Tier B) vs Moon (curated map, not in this
  // slice). Path under /mars/ → Mars; under /moon/ → Moon.
  const marsHotspots = all.filter(([, e]) => e.hotspot_tier2_source?.includes('/mars/'));
  const moonHotspots = all.filter(([, e]) => e.hotspot_tier2_source?.includes('/moon/'));

  console.log(`Tier-2 hotspots configured: ${all.length}`);
  console.log(`  Mars (Tier B HiRISE): ${marsHotspots.length}`);
  console.log(`  Moon (LROC, manual): ${moonHotspots.length}`);

  // Listing-only mode: report present + missing without fetching.
  if (args.list || args.dryRun) {
    console.log('');
    let presentCount = 0;
    let missingCount = 0;
    for (const [id, e] of all) {
      const sourcePath = `static${e.hotspot_tier2_source}`;
      const present = existsSync(sourcePath);
      if (present) presentCount++;
      else missingCount++;
      console.log(`  ${present ? '✓' : '✗ MISSING'}  ${id} → ${sourcePath}`);
    }
    console.log(`\n${presentCount} present · ${missingCount} missing`);
    if (args.list) return;
  }

  const wantMars = args.dest === 'all' || args.dest === 'mars';
  const wantMoon = args.dest === 'all' || args.dest === 'moon';

  // Mars Tier B (HiRISE detail layer) — auto-fetch via catalog query.
  if (wantMars && marsHotspots.length > 0 && (args.layer === 'all' || args.layer === 'hirise')) {
    console.log(`\n=== Mars Tier B (HiRISE detail) ===`);
    const marsResult = await fetchMarsHotspots({
      onlySite: args.site,
      dryRun: args.dryRun,
      missingOnly: args.missingOnly,
    });
    for (const f of marsResult.fetched) {
      console.log(
        `  ✓ ${f.siteId} ← ${f.productId} (${f.candidateCount} candidates, ${f.cropMeta.resolutionMPerPx.toFixed(2)} m/px, ${(f.cropMeta.bytes / 1024).toFixed(0)} KB)`,
      );
    }
    for (const s of marsResult.skipped) {
      console.log(`  · ${s.siteId} skipped — ${s.reason}`);
    }
    for (const fl of marsResult.failed) {
      console.log(`  ✗ ${fl.siteId} FAILED — ${fl.error}`);
    }

    // Provenance — append entries for the freshly-fetched patches.
    if (!args.dryRun && marsResult.fetched.length > 0) {
      const marsSites = JSON.parse(await fs.readFile(MARS_SITES_PATH, 'utf-8')) as MarsSite[];
      const siteById = new Map(marsSites.map((s) => [s.id, s]));
      const provenanceEntries = marsResult.fetched
        .map((f) => {
          const site = siteById.get(f.siteId);
          if (!site || site.lat == null || site.lon == null) return null;
          return buildHiriseProvenanceEntry({
            outputPath: f.outputPath,
            sourceUrl: f.sourceUrl,
            productId: f.productId,
            siteId: f.siteId,
            centerLat: site.lat,
            centerLon: site.lon,
          });
        })
        .filter((e) => e !== null);
      await upsertProvenanceEntries(provenanceEntries);
      console.log(`  Provenance: ${provenanceEntries.length} entries upserted`);
    }
  }

  // Mars Tier 2a (CTX regional layer) — Murray Lab global mosaic tiles.
  if (wantMars && marsHotspots.length > 0 && (args.layer === 'all' || args.layer === 'ctx')) {
    console.log(`\n=== Mars Tier 2a (CTX regional) ===`);
    const ctxResult = await fetchMarsCtxHotspots({
      onlySite: args.site,
      dryRun: args.dryRun,
      missingOnly: args.missingOnly,
    });
    for (const f of ctxResult.fetched) {
      console.log(
        `  ✓ ${f.siteId} ← tile ${f.tileName} (${f.cropMeta.resolutionMPerPx.toFixed(2)} m/px, ${(f.cropMeta.bytes / 1024).toFixed(0)} KB)`,
      );
    }
    for (const s of ctxResult.skipped) {
      console.log(`  · ${s.siteId} skipped — ${s.reason}`);
    }
    for (const fl of ctxResult.failed) {
      console.log(`  ✗ ${fl.siteId} FAILED — ${fl.error}`);
    }
    if (!args.dryRun && ctxResult.fetched.length > 0) {
      const marsSites = JSON.parse(await fs.readFile(MARS_SITES_PATH, 'utf-8')) as MarsSite[];
      const siteById = new Map(marsSites.map((s) => [s.id, s]));
      const provenanceEntries = ctxResult.fetched
        .map((f) => {
          const site = siteById.get(f.siteId);
          if (!site || site.lat == null || site.lon == null) return null;
          return buildCtxMosaicProvenanceEntry({
            outputPath: f.outputPath,
            sourceUrl: f.sourceUrl,
            tileName: f.tileName,
            siteId: f.siteId,
            centerLat: site.lat,
            centerLon: site.lon,
          });
        })
        .filter((e) => e !== null);
      await upsertProvenanceEntries(provenanceEntries);
      console.log(`  Provenance: ${provenanceEntries.length} CTX entries upserted`);
    }
  }

  // Mars Tier 3 — ground-view panoramas (#PD-mars / #249).
  if (wantMars && marsHotspots.length > 0 && (args.layer === 'all' || args.layer === 'tier3')) {
    await fetchMarsPanoramas({
      site: args.site,
      dryRun: args.dryRun,
      missingOnly: args.missingOnly,
    });
  }

  // Moon Tier 2 (LROC NAC detail layer) — curated product map.
  if (wantMoon && moonHotspots.length > 0 && (args.layer === 'all' || args.layer === 'lroc')) {
    console.log(`\n=== Moon Tier 2 (LROC NAC detail) ===`);
    const moonResult = await fetchMoonHotspots({
      onlySite: args.site,
      dryRun: args.dryRun,
      missingOnly: args.missingOnly,
    });
    for (const f of moonResult.fetched) {
      console.log(
        `  ✓ ${f.siteId} ← ${f.productId} (${f.cropMeta.resolutionMPerPx.toFixed(2)} m/px, ${(f.cropMeta.bytes / 1024).toFixed(0)} KB)`,
      );
    }
    for (const s of moonResult.skipped) {
      console.log(`  · ${s.siteId} skipped — ${s.reason}`);
    }
    for (const fl of moonResult.failed) {
      console.log(`  ✗ ${fl.siteId} FAILED — ${fl.error}`);
    }
    if (!args.dryRun && moonResult.fetched.length > 0) {
      const moonSites = JSON.parse(await fs.readFile(MOON_SITES_PATH, 'utf-8')) as MoonSite[];
      const siteById = new Map(moonSites.map((s) => [s.id, s]));
      const provenanceEntries = moonResult.fetched
        .map((f) => {
          const site = siteById.get(f.siteId);
          if (!site || site.lat == null || site.lon == null) return null;
          return buildLrocProvenanceEntry({
            outputPath: f.outputPath,
            sourceUrl: f.sourceUrl,
            productId: f.productId,
            siteId: f.siteId,
            centerLat: site.lat,
            centerLon: site.lon,
          });
        })
        .filter((e) => e !== null);
      await upsertProvenanceEntries(provenanceEntries);
      console.log(`  Provenance: ${provenanceEntries.length} LROC entries upserted`);
    }
  }

  // Moon Tier 2a (LROC NAC regional layer) — same source, wider 3072² crop.
  if (
    wantMoon &&
    moonHotspots.length > 0 &&
    (args.layer === 'all' || args.layer === 'lroc-regional')
  ) {
    console.log(`\n=== Moon Tier 2a (LROC NAC regional) ===`);
    const moonRegResult = await fetchMoonRegionalHotspots({
      onlySite: args.site,
      dryRun: args.dryRun,
      missingOnly: args.missingOnly,
    });
    for (const f of moonRegResult.fetched) {
      console.log(
        `  ✓ ${f.siteId} ← ${f.productId} (${f.cropMeta.resolutionMPerPx.toFixed(2)} m/px, ${(f.cropMeta.bytes / 1024).toFixed(0)} KB)`,
      );
    }
    for (const s of moonRegResult.skipped) {
      console.log(`  · ${s.siteId} skipped — ${s.reason}`);
    }
    for (const fl of moonRegResult.failed) {
      console.log(`  ✗ ${fl.siteId} FAILED — ${fl.error}`);
    }
    if (!args.dryRun && moonRegResult.fetched.length > 0) {
      const moonSites = JSON.parse(await fs.readFile(MOON_SITES_PATH, 'utf-8')) as MoonSite[];
      const siteById = new Map(moonSites.map((s) => [s.id, s]));
      const provenanceEntries = moonRegResult.fetched
        .map((f) => {
          const site = siteById.get(f.siteId);
          if (!site || site.lat == null || site.lon == null) return null;
          return buildLrocProvenanceEntry({
            outputPath: f.outputPath,
            sourceUrl: f.sourceUrl,
            productId: f.productId,
            siteId: f.siteId,
            centerLat: site.lat,
            centerLon: site.lon,
          });
        })
        .filter((e) => e !== null);
      await upsertProvenanceEntries(provenanceEntries);
      console.log(`  Provenance: ${provenanceEntries.length} LROC regional entries upserted`);
    }
  }

  // Moon Tier 3 — ground-view panoramas (#PC / Step 8).
  if (wantMoon && moonHotspots.length > 0 && (args.layer === 'all' || args.layer === 'tier3')) {
    await fetchMoonPanoramas({
      site: args.site,
      dryRun: args.dryRun,
      missingOnly: args.missingOnly,
    });
  }

  if (!args.skipScore && !args.dryRun) {
    console.log(`\n=== Image Pipeline v2 (variant generation + scoring) ===`);
    try {
      execSync('npm run images:score -- --segment hotspots', { stdio: 'inherit' });
    } catch (err) {
      console.error(`Image Pipeline v2 failed: ${(err as Error).message}`);
    }
  }
}

main().catch((err) => {
  console.error('Fatal:', (err as Error).message);
  if ((err as Error).stack) {
    console.error((err as Error).stack);
  }
  process.exit(1);
});
