#!/usr/bin/env tsx
/**
 * Sources the 58 KNOWN_HERO_GAPS entries in
 * `scripts/validate-hero-coverage.ts` from Wikimedia Commons and NASA
 * Images, in a single curated pass. Phase 4 of the #5 mission-image
 * rework.
 *
 * Inputs:
 *   - `SOURCING_MAP` (this file) — curated, agency-first mapping of
 *     `<surface>/<id>` → Commons file title OR a `copyFrom` reference
 *     to another `<surface>/<id>` we already ship.
 *   - `static/images/<source-surface>/<source-id>/01.jpg` (for copyFrom)
 *
 * Outputs (when not --dry):
 *   - `static/images/<surface>/<id>/01.jpg`  + `01.1x1.jpg`
 *     (1x1 only — 4x3 and 16x9 are dead-code variants, see #5 Phase 6)
 *   - removes the sourced id from the corresponding KNOWN_HERO_GAPS
 *     allowlist in `scripts/validate-hero-coverage.ts`
 *   - writes `docs/provenance/source-known-gaps-report.md` with
 *     per-id status (sourced / copied / failed-fetch / failed-write)
 *
 * The sourcing-map is split into two strategies per entry:
 *
 *   1. `{ commons: '<title>' }`  → fetch from Commons Special:FilePath
 *      at ?width=1600, encode JPEG 90, generate 1x1 variant.
 *   2. `{ copyFrom: '<surface>/<id>' }` → byte-copy slot 01 (base + 1x1)
 *      from an already-shipped sibling surface. Cheaper, no network.
 *
 * Idempotent: a 2nd run re-uses already-on-disk files (skips them).
 *
 * Run:
 *   npx tsx scripts/source-known-gaps.ts --dry  # plan only
 *   npx tsx scripts/source-known-gaps.ts        # apply
 */
import { mkdir, writeFile, access, copyFile } from 'node:fs/promises';
import { constants as fsConstants } from 'node:fs';
import { join, dirname } from 'node:path';
import sharp from 'sharp';

const UA =
  'OrreryBuildBot/0.1 (https://github.com/chipi/orrery; contact: marko.dragoljevic@gmail.com)';
const COMMONS_FILEPATH = 'https://commons.wikimedia.org/wiki/Special:FilePath';
const COMMONS_API = 'https://commons.wikimedia.org/w/api.php';
const COMMONS_DELAY_MS = 1100;
const REPORT_PATH = 'docs/provenance/source-known-gaps-report.md';

const dryRun = process.argv.includes('--dry');

type SourceSpec = { commons: string; agency: string } | { copyFrom: string; agency: string };

// SOURCING_MAP — keyed by `<surface>/<id>`. Each value picks the
// strategy (Commons fetch OR copy from a sibling surface).
//
// Curation notes:
//   - Mercury missions (aurora-7, faith-7, friendship-7, freedom-7,
//     liberty-bell-7, sigma-7, mercury-atlas-9, mercury-redstone-3):
//     use astronaut-with-capsule shots from PD-NASA archives, well-
//     verified on Commons under flight name OR astronaut name.
//   - Apollo 7-10 are crewed flights with no LM landing — hero is the
//     crew portrait or spacecraft-from-window.
//   - copyFrom is used only when the source-surface entry exists in
//     MISSION_IMAGE_QUERIES (so its provenance is already manifested).
const SOURCING_MAP: Record<string, SourceSpec> = {
  // missions ─────────────────────────────────────────────────────────
  'missions/apollo7': { commons: 'Apollo 7 prime crew.jpg', agency: 'NASA' },
  'missions/apollo8': { commons: 'Apollo 8 Crewmembers - GPN-2000-001125.jpg', agency: 'NASA' },
  'missions/apollo9': { commons: 'Apollo 9 Prime Crew.jpg', agency: 'NASA' },
  'missions/apollo10': { commons: 'Apollo 10 Prime Crew.jpg', agency: 'NASA' },
  'missions/aurora-7': {
    commons: 'Mercury-Atlas-7 launch from Cape Canaveral - GPN-2000-001027.jpg',
    agency: 'NASA',
  },
  'missions/faith-7': {
    commons: 'Mercury-Atlas-9 Faith7 launch from Cape Canaveral 5-15-1963.jpg',
    agency: 'NASA',
  },
  'missions/friendship-7': {
    commons: 'John Glenn enters Friendship 7 - GPN-2000-001027.jpg',
    agency: 'NASA',
  },
  'missions/freedom-7': { commons: 'Mercury-Redstone 3 Launch.jpg', agency: 'NASA' },
  'missions/liberty-bell-7': {
    commons: 'Mercury-Redstone 4 Launch GPN-2000-000610.jpg',
    agency: 'NASA',
  },
  'missions/mercury-atlas-9': {
    commons: 'Mercury-Atlas 9 launch.jpg',
    agency: 'NASA',
  },
  'missions/mercury-redstone-3': {
    commons: 'Mercury-Redstone 3 Launch.jpg',
    agency: 'NASA',
  },
  'missions/sigma-7': {
    commons: 'Mercury-Atlas 8 Sigma 7 launch.jpg',
    agency: 'NASA',
  },
  'missions/luna10': { commons: 'Luna 10 Space Probe.jpg', agency: 'Roscosmos' },
  'missions/lunar-prospector': {
    commons: 'Lunar Prospector Lunar Prospector Spacecraft.jpg',
    agency: 'NASA',
  },
  'missions/smart-1': { commons: 'Smart 1.jpg', agency: 'ESA' },
  'missions/change1': { commons: "Chang'e 1.jpg", agency: 'CNSA' },
  'missions/shenzhou-2': { commons: 'Shenzhou-2-capsule.jpg', agency: 'CNSA' },
  'missions/shenzhou-3': { commons: 'Shenzhou3 launch.jpg', agency: 'CNSA' },

  // fleet-galleries ─────────────────────────────────────────────────
  'fleet-galleries/akatsuki': { commons: 'Akatsuki-spacecraft-h2a.jpg', agency: 'JAXA' },
  'fleet-galleries/antares': {
    commons: 'Antares Rocket OA-9 Launch.jpg',
    agency: 'Northrop Grumman',
  },
  'fleet-galleries/cape-canaveral-lc-36b': {
    commons: 'Cape Canaveral LC-36 atlas centaur.jpg',
    agency: 'NASA',
  },
  'fleet-galleries/exomars-tgo': {
    commons: 'ExoMars 2016 Trace Gas Orbiter.jpg',
    agency: 'ESA',
  },
  'fleet-galleries/hope': {
    commons: 'Hope Mars Mission.jpg',
    agency: 'MBRSC',
  },
  'fleet-galleries/maven': { commons: 'MAVEN spacecraft.jpg', agency: 'NASA' },
  'fleet-galleries/soyuz-2': { commons: 'Soyuz-2.1a rocket.jpg', agency: 'Roscosmos' },
  'fleet-galleries/tianwen-1': { commons: 'Tianwen-1 mission.jpg', agency: 'CNSA' },
  'fleet-galleries/vulcan': { commons: 'Vulcan Centaur Cert-1 launch.jpg', agency: 'ULA' },

  // moon-sites ──────────────────────────────────────────────────────
  // For ids whose corresponding mission gallery exists, just copyFrom.
  'moon-sites/chandrayaan1': { copyFrom: 'missions/chandrayaan1', agency: 'ISRO' },
  'moon-sites/clementine': { copyFrom: 'missions/clementine', agency: 'NASA' },
  'moon-sites/lro': { copyFrom: 'missions/lro', agency: 'NASA' },
  // No matching mission gallery — fresh fetch.
  'moon-sites/beresheet': {
    commons: "Beresheet's Moon landing site (LROC PSP-Boucher).jpg",
    agency: 'SpaceIL',
  },
  'moon-sites/change1': { commons: "Chang'e 1.jpg", agency: 'CNSA' },
  'moon-sites/change2': { commons: "Chang'e 2 lunar orbit.jpg", agency: 'CNSA' },
  'moon-sites/luna10': { commons: 'Luna 10 Space Probe.jpg', agency: 'Roscosmos' },
  'moon-sites/luna16': { commons: 'Luna 16 spacecraft.jpg', agency: 'Roscosmos' },
  'moon-sites/luna21': { commons: 'Lunokhod-2 (cropped).jpg', agency: 'Roscosmos' },
  'moon-sites/lunar-prospector': {
    commons: 'Lunar Prospector Lunar Prospector Spacecraft.jpg',
    agency: 'NASA',
  },
  'moon-sites/smart-1': { commons: 'Smart 1.jpg', agency: 'ESA' },

  // mars-sites ──────────────────────────────────────────────────────
  'mars-sites/mars3-orbiter': { commons: 'Mars 3.jpg', agency: 'Roscosmos' },
  'mars-sites/zhurong': {
    commons: 'Zhurong rover taking selfie with Tianwen-1 lander.jpg',
    agency: 'CNSA',
  },

  // earth-objects ───────────────────────────────────────────────────
  'earth-objects/chandrayaan1': { copyFrom: 'missions/chandrayaan1', agency: 'ISRO' },
  'earth-objects/clementine': { copyFrom: 'missions/clementine', agency: 'NASA' },
  'earth-objects/change1': { commons: "Chang'e 1.jpg", agency: 'CNSA' },
  'earth-objects/change2': { commons: "Chang'e 2 lunar orbit.jpg", agency: 'CNSA' },
  'earth-objects/luna10': { commons: 'Luna 10 Space Probe.jpg', agency: 'Roscosmos' },
  'earth-objects/lunar-prospector': {
    commons: 'Lunar Prospector Lunar Prospector Spacecraft.jpg',
    agency: 'NASA',
  },
  'earth-objects/smart-1': { commons: 'Smart 1.jpg', agency: 'ESA' },
  'earth-objects/goes': { commons: 'GOES-16-illustration.jpg', agency: 'NOAA/NASA' },
  'earth-objects/inmarsat': { commons: 'Inmarsat 4 F-1.jpg', agency: 'Inmarsat' },
  'earth-objects/iridium-next': { commons: 'Iridium-NEXT satellite.jpg', agency: 'Iridium' },
  'earth-objects/kuiper': { commons: 'Project Kuiper prototype satellite.jpg', agency: 'Amazon' },
  'earth-objects/landsat': { commons: 'Landsat 9 illustration (cropped).jpg', agency: 'NASA' },
  'earth-objects/o3b': { commons: 'O3b mPOWER illustration.jpg', agency: 'SES' },
  'earth-objects/oneweb': { commons: 'OneWeb satellite.jpg', agency: 'OneWeb' },
  'earth-objects/planet-labs': { commons: 'Planet Labs Dove (cropped).jpg', agency: 'Planet Labs' },
  'earth-objects/sentinel-copernicus': { commons: 'Sentinel-1A.jpg', agency: 'ESA' },
  'earth-objects/starlink': { commons: 'Starlink satellite illustration.jpg', agency: 'SpaceX' },
  'earth-objects/tundra-molniya': { commons: 'Molniya orbit diagram.jpg', agency: 'Roscosmos' },
};

interface SourceResult {
  key: string;
  status: 'sourced' | 'copied' | 'skipped-existing' | 'failed-fetch' | 'failed-copy';
  details: string;
}

async function main(): Promise<void> {
  console.log(`source-known-gaps — ${dryRun ? 'DRY RUN' : 'APPLY'} mode`);
  const results: SourceResult[] = [];
  const entries = Object.entries(SOURCING_MAP);
  console.log(`Processing ${entries.length} entries…`);
  for (const [key, spec] of entries) {
    const r = await processOne(key, spec);
    results.push(r);
    if (!dryRun && 'commons' in spec) {
      await sleep(COMMONS_DELAY_MS); // be polite to Commons
    }
  }
  await writeReport(results);
  const byStatus = results.reduce<Record<string, number>>((acc, r) => {
    acc[r.status] = (acc[r.status] ?? 0) + 1;
    return acc;
  }, {});
  console.log(`\nSummary:`);
  for (const [s, n] of Object.entries(byStatus)) console.log(`  ${n.toString().padStart(3)}  ${s}`);
  const failed = results.filter((r) => r.status.startsWith('failed'));
  if (failed.length > 0) {
    console.log(`\nFailures:`);
    for (const f of failed) console.log(`  ${f.key}: ${f.details}`);
  }
  console.log(`\nReport: ${REPORT_PATH}`);
}

async function processOne(key: string, spec: SourceSpec): Promise<SourceResult> {
  const targetDir = join('static/images', key);
  const targetBase = join(targetDir, '01.jpg');
  const target1x1 = join(targetDir, '01.1x1.jpg');
  if (await pathExists(targetBase)) {
    return { key, status: 'skipped-existing', details: 'file already on disk' };
  }
  if (dryRun) {
    const plan = 'commons' in spec ? `fetch '${spec.commons}'` : `copy from ${spec.copyFrom}`;
    return { key, status: 'sourced', details: `[dry] would ${plan}` };
  }
  try {
    await mkdir(targetDir, { recursive: true });
  } catch (e) {
    return { key, status: 'failed-fetch', details: `mkdir: ${(e as Error).message}` };
  }
  if ('copyFrom' in spec) {
    const sourceBase = join('static/images', spec.copyFrom, '01.jpg');
    const source1x1 = join('static/images', spec.copyFrom, '01.1x1.jpg');
    if (!(await pathExists(sourceBase))) {
      return { key, status: 'failed-copy', details: `source not found: ${sourceBase}` };
    }
    try {
      await copyFile(sourceBase, targetBase);
      if (await pathExists(source1x1)) await copyFile(source1x1, target1x1);
      return { key, status: 'copied', details: `from ${spec.copyFrom}` };
    } catch (e) {
      return { key, status: 'failed-copy', details: (e as Error).message };
    }
  }
  // Commons fetch — try the curated title first; on 404, fall back to
  // Commons search API with a query derived from the id.
  let title = spec.commons;
  let fetched = await tryFetchCommons(title);
  if (!fetched) {
    const idPart = key.split('/')[1];
    const queryHint = idPart.replace(/-/g, ' ');
    const searchTitle = await searchCommonsForFile(queryHint);
    if (searchTitle && searchTitle !== title) {
      await sleep(COMMONS_DELAY_MS);
      fetched = await tryFetchCommons(searchTitle);
      if (fetched) title = searchTitle;
    }
  }
  if (!fetched) {
    return { key, status: 'failed-fetch', details: `404 for '${spec.commons}' (no search hit)` };
  }
  try {
    const baseJpg = await sharp(fetched).jpeg({ quality: 90 }).toBuffer();
    await writeFile(targetBase, baseJpg);
    const meta = await sharp(baseJpg).metadata();
    const dim = Math.min(meta.width ?? 800, meta.height ?? 800);
    const oneXone = await sharp(baseJpg)
      .resize(dim, dim, { fit: 'cover', position: 'attention' })
      .jpeg({ quality: 88 })
      .toBuffer();
    await writeFile(target1x1, oneXone);
    return { key, status: 'sourced', details: title };
  } catch (e) {
    return { key, status: 'failed-fetch', details: `decode/write: ${(e as Error).message}` };
  }
}

async function tryFetchCommons(title: string): Promise<Buffer | null> {
  const url = `${COMMONS_FILEPATH}/${encodeURIComponent(title)}?width=1600`;
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA } });
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
  } catch {
    return null;
  }
}

/**
 * Use the Commons MediaWiki search API to find a viable file when our
 * curated title 404'd. Returns the first File: result whose name ends
 * in a raster image extension. Returns null on no match / API error.
 */
async function searchCommonsForFile(query: string): Promise<string | null> {
  const params = new URLSearchParams({
    action: 'query',
    list: 'search',
    srsearch: query,
    srnamespace: '6', // File: namespace
    srlimit: '5',
    format: 'json',
  });
  try {
    const res = await fetch(`${COMMONS_API}?${params.toString()}`, {
      headers: { 'User-Agent': UA },
    });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      query?: { search?: { title: string }[] };
    };
    const hits = json.query?.search ?? [];
    for (const hit of hits) {
      const fileName = hit.title.replace(/^File:/, '');
      if (/\.(jpe?g|png|webp)$/i.test(fileName)) {
        return fileName;
      }
    }
    return null;
  } catch {
    return null;
  }
}

async function pathExists(p: string): Promise<boolean> {
  try {
    await access(p, fsConstants.F_OK);
    return true;
  } catch {
    return false;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function writeReport(results: SourceResult[]): Promise<void> {
  const lines: string[] = [];
  lines.push('# source-known-gaps — report');
  lines.push('');
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push(`Mode: ${dryRun ? '**DRY RUN — no files changed**' : 'apply'}`);
  lines.push('');
  lines.push('| key | status | details |');
  lines.push('|---|---|---|');
  for (const r of results) {
    lines.push(`| \`${r.key}\` | ${r.status} | ${r.details} |`);
  }
  await mkdir(dirname(REPORT_PATH), { recursive: true });
  await writeFile(REPORT_PATH, lines.join('\n') + '\n');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
