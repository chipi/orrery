#!/usr/bin/env tsx
/**
 * Moon Tier 3 ground-view panorama orchestrator (PRD-014 / RFC-017
 * §S8, v0.7.x #PC). Mirror of fetch-mars-panoramas.ts.
 *
 * Per-site: download the canonical surface panorama, pad cylindrical /
 * partial-360 → 4096×2048 equirectangular via panorama-padder.ts,
 * write JPEG to static/images/hotspots/moon/<site>/tier3-pan.jpg,
 * upsert image-provenance.json entry with per-mission credit chain.
 *
 * Default palette is DEFAULT_MOON_PALETTE (black sky, mid-grey regolith)
 * — Moon has no atmosphere so the sky stays solid black at every
 * elevation. Per-site overrides available for Soviet-era monochrome
 * panoramas (warmer tone) or polar-region long-shadow imagery.
 *
 * Starter batch (this slice): Apollo 11 + Apollo 17 — the two sites
 * already pre-wired with hotspot_tier3_panorama in surface-hotspots.json.
 * Follow-up commits will add Chang'e 3/4/5, Chandrayaan-3, SLIM, Luna
 * 9, Lunokhod 1/2 as per-site panorama URLs land.
 *
 * Sites without sourceable panoramas (luna16, luna24 = robotic-only,
 * no panoramic camera): hotspot_tier3_panorama stays unset → "Stand
 * at site" button silently doesn't render. Same UX as mars3/beagle2/
 * schiaparelli.
 *
 * Usage:
 *   npm run images:hotspots -- --dest moon --layer tier3
 *   npm run images:hotspots -- --site apollo11 --layer tier3
 */

import path from 'node:path';
import { spawn } from 'node:child_process';
import { existsSync, promises as fs } from 'node:fs';

import {
  padToEquirectangular,
  DEFAULT_MOON_PALETTE,
  type MarsColourPalette,
} from './panorama-padder.ts';
import { buildPanoramaProvenanceEntry, upsertProvenanceEntries } from './provenance.ts';

const PANORAMA_CACHE_DIR = '.image-cache/hotspots/panoramas';
const OUTPUT_BASE = 'static/images/hotspots/moon';

interface MoonPanoramaConfig {
  siteId: string;
  sourceUrl: string;
  sourceLabel: string;
  attribution: string;
  license: 'PD-NASA' | 'CNSA-EDU' | 'CC-BY-4.0';
  srcAzimuthDeg: number;
  srcElevationTopDeg: number;
  srcElevationBottomDeg: number;
  caption: string;
  palette?: Partial<MarsColourPalette>;
  recolourBlackThreshold?: number;
}

const PANORAMAS: MoonPanoramaConfig[] = [
  {
    siteId: 'apollo11',
    sourceUrl:
      'https://upload.wikimedia.org/wikipedia/commons/8/8a/' +
      'Apollo_11_Tranquility_Base_panoramic_%28JSC2007-E-045375%29.jpg',
    sourceLabel: 'JSC2007-E-045375',
    attribution: 'NASA / JSC / Apollo Lunar Surface Journal (mosaic by JSC, 2007)',
    license: 'PD-NASA',
    srcAzimuthDeg: 360,
    srcElevationTopDeg: 14,
    srcElevationBottomDeg: 14,
    caption:
      'Tranquillity Base panoramic mosaic — Apollo 11 LM Eagle, deployed flag, EASEP instrument, ' +
      'lunar regolith and crater field. 32454×2554 px Hasselblad composite (NASA JSC, 2007).',
  },
  {
    siteId: 'apollo17',
    sourceUrl:
      'https://upload.wikimedia.org/wikipedia/commons/1/18/' +
      "019_Jack's_Color_ALSEP_Pan_USGS.jpg",
    sourceLabel: "Jack's Color ALSEP Pan (USGS)",
    attribution: 'NASA / Gene Cernan / Jack Schmitt / USGS · via Apollo Lunar Surface Journal',
    license: 'PD-NASA',
    // 3249×651 ≈ 5:1 aspect — roughly 180° wide, ~36° vertical.
    srcAzimuthDeg: 180,
    srcElevationTopDeg: 18,
    srcElevationBottomDeg: 18,
    caption:
      'Taurus-Littrow Valley ALSEP panorama, EVA-1. Jack Schmitt assembled colour pan, ' +
      'Lunar Roving Vehicle and Lunar Module Challenger visible. ' +
      'Captured Dec 12 1972; USGS-prepared composite via NASA Apollo Lunar Surface Journal.',
  },
];

interface FetchResult {
  status: 'ok' | 'skipped' | 'failed';
  outBytes?: number;
  reason?: string;
}

async function curl(url: string, outPath: string): Promise<void> {
  await fs.mkdir(path.dirname(outPath), { recursive: true });
  return new Promise((resolve, reject) => {
    const p = spawn('curl', ['-fsSL', '--retry', '3', '--retry-delay', '5', '-o', outPath, url], {
      stdio: ['ignore', 'inherit', 'inherit'],
    });
    p.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`curl exit ${code}`))));
    p.on('error', reject);
  });
}

async function ensureCachedSource(cfg: MoonPanoramaConfig): Promise<string> {
  const ext = path.extname(new URL(cfg.sourceUrl).pathname).toLowerCase() || '.jpg';
  const cached = path.join(PANORAMA_CACHE_DIR, `moon-${cfg.siteId}${ext}`);
  if (existsSync(cached)) return cached;
  console.log(`  downloading ${cfg.sourceUrl}`);
  await curl(cfg.sourceUrl, cached);
  const stat = await fs.stat(cached);
  console.log(`  cached ${cached} (${(stat.size / 1024).toFixed(0)} KB)`);
  return cached;
}

async function processOne(cfg: MoonPanoramaConfig, missingOnly: boolean): Promise<FetchResult> {
  const outPath = path.join(OUTPUT_BASE, cfg.siteId, 'tier3-pan.jpg');
  if (missingOnly && existsSync(outPath)) {
    return { status: 'skipped', reason: 'already exists (--missing-only)' };
  }
  try {
    const sourcePath = await ensureCachedSource(cfg);
    const sourceBytes = await fs.readFile(sourcePath);
    const padded = await padToEquirectangular({
      source: sourceBytes,
      srcAzimuthDeg: cfg.srcAzimuthDeg,
      srcElevationTopDeg: cfg.srcElevationTopDeg,
      srcElevationBottomDeg: cfg.srcElevationBottomDeg,
      palette: { ...DEFAULT_MOON_PALETTE, ...(cfg.palette ?? {}) },
      // NASA Apollo panoramas often have rover-deck cutouts padded
      // with black; recolour to lunar grey so they blend.
      recolourBlackThreshold: cfg.recolourBlackThreshold ?? 60,
    });
    await fs.mkdir(path.dirname(outPath), { recursive: true });
    await fs.writeFile(outPath, padded);
    return { status: 'ok', outBytes: padded.length };
  } catch (e) {
    return { status: 'failed', reason: (e as Error).message };
  }
}

interface Args {
  site?: string;
  dryRun: boolean;
  missingOnly: boolean;
}

export async function fetchMoonPanoramas(args: Args): Promise<void> {
  const targets = args.site ? PANORAMAS.filter((p) => p.siteId === args.site) : PANORAMAS;
  if (targets.length === 0) {
    console.log(`\n=== Moon Tier 3 (panoramas) === no targets`);
    return;
  }
  console.log(`\n=== Moon Tier 3 (panoramas) ===`);
  const results: Array<{ cfg: MoonPanoramaConfig; result: FetchResult }> = [];
  for (const cfg of targets) {
    if (args.dryRun) {
      console.log(`  · ${cfg.siteId} dry-run: would fetch ${cfg.sourceUrl}`);
      continue;
    }
    const result = await processOne(cfg, args.missingOnly);
    if (result.status === 'ok') {
      console.log(`  ✓ ${cfg.siteId} → tier3-pan.jpg (${(result.outBytes! / 1024).toFixed(0)} KB)`);
    } else if (result.status === 'skipped') {
      console.log(`  · ${cfg.siteId} skipped — ${result.reason}`);
    } else {
      console.log(`  ✗ ${cfg.siteId} FAILED — ${result.reason}`);
    }
    results.push({ cfg, result });
  }

  // Provenance upsert for newly-fetched panoramas.
  const fresh = results.filter((r) => r.result.status === 'ok');
  if (fresh.length > 0) {
    const entries = fresh.map((r) =>
      buildPanoramaProvenanceEntry({
        siteId: r.cfg.siteId,
        publicPath: `/images/hotspots/moon/${r.cfg.siteId}/tier3-pan.jpg`,
        sourceLabel: r.cfg.sourceLabel,
        sourceUrl: r.cfg.sourceUrl,
        attribution: r.cfg.attribution,
        license: r.cfg.license,
        caption: r.cfg.caption,
      }),
    );
    await upsertProvenanceEntries(entries);
    console.log(`  Provenance: ${entries.length} panorama entries upserted`);
  }
}

// Allow running directly: npx tsx scripts/hotspots/fetch-moon-panoramas.ts
const isDirectRun =
  import.meta.url === `file://${process.argv[1]}` ||
  process.argv[1]?.endsWith('fetch-moon-panoramas.ts');
if (isDirectRun) {
  const args = process.argv.slice(2);
  const siteArg = args[args.indexOf('--site') + 1];
  const opts: Args = {
    site: args.includes('--site') ? siteArg : undefined,
    dryRun: args.includes('--dry-run'),
    missingOnly: args.includes('--missing-only'),
  };
  fetchMoonPanoramas(opts).catch((err) => {
    console.error('Fatal:', (err as Error).message);
    process.exit(1);
  });
}
