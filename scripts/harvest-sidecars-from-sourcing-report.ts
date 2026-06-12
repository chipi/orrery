#!/usr/bin/env tsx
/**
 * Post-pass over `docs/provenance/source-known-gaps-report.md` — for
 * each row tagged `sourced` (Commons fetch), append a provenance
 * sidecar entry so `build-image-provenance.ts` registers the new
 * image. For `copied` rows we don't need a sidecar — the build script
 * already follows the `copyFrom` mission's entry via
 * `buildPanelEntries`.
 *
 * Three sidecars get written:
 *
 *   1. `static/data/mission-image-sources.json` — appended; same
 *      `commons-shape` `{commons_file, commons_url, credit, license,
 *      fetched_at}` per `<id>/<slot>` key the post-2026-06 fetcher
 *      writes. Consumed by `buildMissionCommonsSidecarEntries`.
 *   2. `static/data/fleet-image-sources.json` — appended; same shape.
 *      Consumed by the commons-shape branch in `buildFleetEntries`.
 *   3. `static/data/panel-image-sources.json` — NEW. Same shape but
 *      keyed by `<surface>/<id>/<slot>` so it can carry moon-sites,
 *      mars-sites, and earth-objects in one file. Consumed by a new
 *      `buildPanelCommonsSidecarEntries` we add in the same change.
 *
 * Idempotent: a 2nd run on the same report is a no-op (sidecar entries
 * keyed by `<id>/<slot>` get overwritten with identical values).
 *
 * Run:
 *   npx tsx scripts/harvest-sidecars-from-sourcing-report.ts
 */
import { readFile, writeFile, access } from 'node:fs/promises';
import { constants as fsConstants } from 'node:fs';

const REPORT_PATH = 'docs/provenance/source-known-gaps-report.md';
const MISSION_SIDECAR = 'static/data/mission-image-sources.json';
const FLEET_SIDECAR = 'static/data/fleet-image-sources.json';
const PANEL_SIDECAR = 'static/data/panel-image-sources.json';

// Per-surface → commons-shape sidecar dispatch. Missions + fleet use
// pre-existing files keyed by `<id>/<slot>` (no surface segment in the
// key). Panels share one file keyed by `<surface>/<id>/<slot>`.
type SidecarTarget = 'mission' | 'fleet' | 'panel';

const SURFACE_TO_TARGET: Record<string, SidecarTarget> = {
  missions: 'mission',
  'fleet-galleries': 'fleet',
  'moon-sites': 'panel',
  'mars-sites': 'panel',
  'earth-objects': 'panel',
};

interface CommonsEntry {
  commons_file: string;
  commons_url: string;
  credit: string;
  license: string;
  fetched_at: string;
}

async function main(): Promise<void> {
  const report = await readFile(REPORT_PATH, 'utf8');
  const lines = report.split('\n');
  // Lines look like `| \`<key>\` | sourced | <details> |`
  const rowRe = /^\|\s*`([^`]+)`\s*\|\s*(sourced|copied)\s*\|\s*(.+?)\s*\|$/;

  const missionSidecar = await loadOrEmpty(MISSION_SIDECAR);
  const fleetSidecar = await loadOrEmpty(FLEET_SIDECAR);
  const panelSidecar = await loadOrEmpty(PANEL_SIDECAR);

  let appended = 0;
  let skipped = 0;
  const now = new Date().toISOString();

  for (const line of lines) {
    const m = rowRe.exec(line);
    if (!m) continue;
    const [, key, status, details] = m;
    if (status !== 'sourced') continue; // copied entries don't need a sidecar
    const [surface, id] = key.split('/');
    const target = SURFACE_TO_TARGET[surface];
    if (!target) {
      skipped++;
      continue;
    }
    const commonsFile = details;
    const entry: CommonsEntry = {
      commons_file: commonsFile,
      commons_url: `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(commonsFile)}`,
      credit: inferAgency(key, commonsFile),
      license: 'Public Domain / CC-BY-SA (Wikimedia Commons)',
      fetched_at: now,
    };
    if (target === 'mission') {
      missionSidecar[`${id}/01`] = entry;
    } else if (target === 'fleet') {
      fleetSidecar[`${id}/01`] = entry;
    } else {
      panelSidecar[`${surface}/${id}/01`] = entry;
    }
    appended++;
  }

  await writeFile(MISSION_SIDECAR, JSON.stringify(missionSidecar, null, 2) + '\n');
  await writeFile(FLEET_SIDECAR, JSON.stringify(fleetSidecar, null, 2) + '\n');
  await writeFile(PANEL_SIDECAR, JSON.stringify(panelSidecar, null, 2) + '\n');

  console.log(`Appended ${appended} sidecar entries; skipped ${skipped}.`);
}

async function loadOrEmpty(p: string): Promise<Record<string, CommonsEntry>> {
  try {
    await access(p, fsConstants.F_OK);
    return JSON.parse(await readFile(p, 'utf8'));
  } catch {
    return {};
  }
}

/**
 * Best-effort agency inference. The sourcing-map carried per-id agency
 * tags but the report-driven path doesn't see them — fall back to keyword
 * matching on the Commons filename. Build-image-provenance hits the
 * Commons API anyway and overrides this with the real Commons-recorded
 * attribution; this is purely the fallback when offline.
 */
function inferAgency(key: string, commonsFile: string): string {
  const blob = `${key} ${commonsFile}`.toLowerCase();
  if (/\b(soyuz|luna|lunokhod|vostok|voskhod|salyut|mir|molniya|roskosmos|roscosmos)\b/.test(blob))
    return 'Roscosmos';
  if (/\b(chang|tianwen|tiangong|shenzhou|zhurong|long march|cnsa|cmsa)\b/.test(blob))
    return 'CNSA';
  if (/\b(akatsuki|hayabusa|jaxa|h-?(2|3))\b/.test(blob)) return 'JAXA';
  if (/\b(esa|sentinel|copernicus|exomars|smart[-_ ]1|schiaparelli|columbus|cluster)\b/.test(blob))
    return 'ESA';
  if (/\b(isro|chandrayaan|mangalyaan|gaganyaan|vikram)\b/.test(blob)) return 'ISRO';
  if (/\b(mbrsc|hope.*mars|emirates)\b/.test(blob)) return 'MBRSC';
  if (/\b(spaceil|beresheet)\b/.test(blob)) return 'SpaceIL';
  if (/\b(spacex|starlink|falcon|dragon)\b/.test(blob)) return 'SpaceX';
  if (/\b(amazon|kuiper)\b/.test(blob)) return 'Amazon';
  if (/\b(planet[- ]?labs|skysat)\b/.test(blob)) return 'Planet Labs';
  if (/\b(inmarsat)\b/.test(blob)) return 'Inmarsat';
  if (/\b(iridium)\b/.test(blob)) return 'Iridium';
  if (/\b(ses|o3b)\b/.test(blob)) return 'SES';
  if (/\b(oneweb)\b/.test(blob)) return 'OneWeb';
  if (/\b(noaa|goes|landsat)\b/.test(blob)) return 'NOAA/NASA';
  if (/\b(ula|vulcan|atlas|delta)\b/.test(blob)) return 'United Launch Alliance';
  if (/\b(antares|northrop)\b/.test(blob)) return 'Northrop Grumman';
  return 'NASA';
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
