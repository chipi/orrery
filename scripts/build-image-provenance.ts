/**
 * ADR-046 Milestone C — provenance manifest writer.
 *
 * Walks the on-disk image trees (`static/images/**`, `static/textures/`,
 * `static/logos/`) and emits `static/data/image-provenance.json` plus
 * `docs/provenance/last-fetch-diff.md`. Fails closed when:
 *   - any required TASL field cannot be derived,
 *   - a license is not in `scripts/license-allowlist.ts` and not waived
 *     in `static/data/license-waivers.json`,
 *   - any local file we know about is missing on disk.
 *
 * The script reuses the curated maps that drive `scripts/fetch-assets.ts`
 * (mission queries, Wikimedia fallbacks, agency logos, etc.) so the
 * source of truth for "where did slot X come from" stays single. For
 * Wikimedia Commons entries it fetches `imageinfo`/`extmetadata` live,
 * so author + license + revision id are always upstream-truth, never
 * guessed.
 *
 * Run via:
 *   npm run build-image-provenance              # full run, online
 *   npm run build-image-provenance -- --offline # skips Commons enrichment
 *
 * Designed to be re-run in CI/local after `npm run fetch-assets` and
 * also as part of the Milestone D `/credits` page data layer.
 */

import { writeFile, mkdir, readdir, readFile, access } from 'node:fs/promises';
import { constants as fsConstants } from 'node:fs';
import { join, basename, extname, dirname, posix } from 'node:path';
import { createHash } from 'node:crypto';
import { execSync } from 'node:child_process';

import {
  MISSION_IMAGE_QUERIES,
  WIKIMEDIA_MISSION_FALLBACK,
  WIKIMEDIA_MISSION_GALLERY_FALLBACK,
  WIKIMEDIA_ISS_FALLBACK,
  WIKIMEDIA_ISS_MODULE_GALLERY,
  WIKIMEDIA_TIANGONG_FALLBACK,
  WIKIMEDIA_TIANGONG_MODULE_GALLERY,
  EARTH_OBJECT_QUERIES,
  MOON_SITE_QUERIES,
  MARS_SITE_QUERIES,
  SMALL_BODY_QUERIES,
  PLANET_QUERIES,
  SUN_QUERIES,
  AGENCY_LOGOS,
  LUNAR_DISC_PHOTOS,
  ROCKET_IMAGES,
  TEXTURES,
  MISSION_NASA_CREDIT_EXTRAS,
  type GalleryQuery,
  type MissionImageQuery,
} from './fetch-assets.ts';
import {
  getAllowlistEntry,
  isAllowedLicense,
  normaliseLicenseShortName,
} from './license-allowlist.ts';

// ──────────────────────────────────────────────────────────────────────
// Constants
// ──────────────────────────────────────────────────────────────────────

const SCRIPT_VERSION = 'build-image-provenance@1.0.0';
const SCHEMA_VERSION = 1;

const PROVENANCE_OUT = 'static/data/image-provenance.json';
const DIFF_REPORT_OUT = 'docs/provenance/last-fetch-diff.md';
const WAIVERS_PATH = 'static/data/license-waivers.json';

const COMMONS_API = 'https://commons.wikimedia.org/w/api.php';
const COMMONS_FILEPATH_BASE = 'https://commons.wikimedia.org/wiki/Special:FilePath';
const COMMONS_DELAY_MS = 1100;
const COMMONS_UA =
  'OrreryBuildBot/0.1 (https://github.com/chipi/orrery; contact: marko.dragoljevic@gmail.com)';

const SOLAR_SYSTEM_SCOPE_URL = 'https://www.solarsystemscope.com/textures/';
const NASA_IMAGES_BASE = 'https://images.nasa.gov';

// ──────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────

type SourceType = 'wikimedia-commons' | 'nasa-images-api' | 'direct-agency' | 'direct-other';

interface ProvenanceEntry {
  id: string;
  path: string;
  source_type: SourceType;
  title: string;
  author: string | null;
  agency: string;
  source_url: string;
  image_url: string | null;
  license_short: string;
  license_url: string | null;
  license_rationale: string;
  modifications: string[];
  revid: number | null;
  pageid: number | null;
  nasa_id: string | null;
  fetched_at: string;
}

interface ProvenanceManifest {
  schema_version: number;
  generated_at: string;
  script_version: string;
  commit_sha: string | null;
  entries: ProvenanceEntry[];
}

interface CommonsImageInfo {
  title: string;
  pageid: number | null;
  revid: number | null;
  descriptionurl: string;
  url: string;
  artist: string | null;
  licenseShort: string | null;
  licenseUrl: string | null;
  usageTerms: string | null;
  imageDescription: string | null;
  credit: string | null;
}

interface LicenseWaiver {
  license_short: string;
  scope: string;
  justification: string;
  reviewer: string;
  decided_at: string;
  expires_at?: string | null;
}

// ──────────────────────────────────────────────────────────────────────
// Argv
// ──────────────────────────────────────────────────────────────────────

const ARGS = new Set(process.argv.slice(2));
const OFFLINE = ARGS.has('--offline');

// ──────────────────────────────────────────────────────────────────────
// Commons API client (cached, rate-limited)
// ──────────────────────────────────────────────────────────────────────

const commonsCache = new Map<string, CommonsImageInfo | null>();

function plainText(html: string | undefined | null): string | null {
  if (!html) return null;
  const stripped = html
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return stripped || null;
}

async function fetchCommonsImageInfo(filename: string): Promise<CommonsImageInfo | null> {
  if (commonsCache.has(filename)) return commonsCache.get(filename)!;
  if (OFFLINE) {
    commonsCache.set(filename, null);
    return null;
  }
  const params = new URLSearchParams({
    action: 'query',
    format: 'json',
    titles: `File:${filename}`,
    prop: 'imageinfo',
    iiprop: 'url|extmetadata',
    iiextmetadatafilter: 'Artist|LicenseShortName|LicenseUrl|UsageTerms|ImageDescription|Credit',
  });
  let info: CommonsImageInfo | null = null;
  try {
    const res = await fetch(`${COMMONS_API}?${params}`, {
      headers: { 'User-Agent': COMMONS_UA, Accept: 'application/json' },
    });
    if (res.ok) {
      const json = (await res.json()) as Record<string, unknown>;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const pages = (json?.query as any)?.pages ?? {};
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const page = Object.values(pages)[0] as any;
      if (page && !page.missing && page.imageinfo?.[0]) {
        const ii = page.imageinfo[0];
        const meta = ii.extmetadata ?? {};
        info = {
          title: page.title,
          pageid: typeof page.pageid === 'number' ? page.pageid : null,
          revid: typeof page.lastrevid === 'number' ? page.lastrevid : null,
          descriptionurl: ii.descriptionurl,
          url: ii.url,
          artist: plainText(meta.Artist?.value),
          licenseShort: plainText(meta.LicenseShortName?.value),
          licenseUrl: plainText(meta.LicenseUrl?.value),
          usageTerms: plainText(meta.UsageTerms?.value),
          imageDescription: plainText(meta.ImageDescription?.value),
          credit: plainText(meta.Credit?.value),
        };
      }
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`    ⚠ Commons API error for ${filename}: ${msg}`);
  }
  commonsCache.set(filename, info);
  await sleep(COMMONS_DELAY_MS);
  return info;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// ──────────────────────────────────────────────────────────────────────
// Filesystem helpers
// ──────────────────────────────────────────────────────────────────────

async function pathExists(p: string): Promise<boolean> {
  try {
    await access(p, fsConstants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function listFiles(dir: string): Promise<string[]> {
  if (!(await pathExists(dir))) return [];
  const entries = await readdir(dir, { withFileTypes: true });
  return entries
    .filter((e) => e.isFile())
    .map((e) => e.name)
    .sort();
}

async function listDirs(dir: string): Promise<string[]> {
  if (!(await pathExists(dir))) return [];
  const entries = await readdir(dir, { withFileTypes: true });
  return entries
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();
}

function staticToServed(p: string): string {
  // Maps a `static/...` filesystem path to the served URL path
  // ("/images/missions/..."). Uses POSIX so Windows builds still emit
  // forward-slash URLs in the manifest.
  return '/' + posix.relative('static', p.split('\\').join('/'));
}

function entryId(localPath: string): string {
  return createHash('sha256').update(localPath).digest('hex').slice(0, 16);
}

function gitHeadSha(): string | null {
  try {
    return execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
  } catch {
    return null;
  }
}

// ──────────────────────────────────────────────────────────────────────
// Sidecar URL → identifier helpers (Slice A v3 walker schema sync)
// Sidecar shape evolved over time. Pre-2026-06 entries carry
// `commons_file` + `commons_url`. Post-2026-06 ("Slice A") entries carry
// `source_type` + `source_url` + `image_url` and may or may not include
// `commons_file` / `nasa_id`. Walkers must derive identity from whatever
// fields are present rather than reading one fixed key.
// ──────────────────────────────────────────────────────────────────────

function deriveCommonsFilename(url: string | undefined | null): string | null {
  if (!url) return null;
  if (url.includes('upload.wikimedia.org')) {
    const m = url.match(/\/commons\/(?:thumb\/)?[0-9a-f]\/[0-9a-f]{2}\/([^/]+)/);
    if (m) return decodeURIComponent(m[1]);
  }
  if (url.includes('commons.wikimedia.org/wiki/Special:FilePath/')) {
    const m = url.match(/Special:FilePath\/([^?]+)/);
    if (m) return decodeURIComponent(m[1]);
  }
  if (url.includes('commons.wikimedia.org/wiki/File:')) {
    const m = url.match(/wiki\/File:([^?]+)/);
    if (m) return decodeURIComponent(m[1]);
  }
  return null;
}

function extractNasaIdFromUrl(url: string | undefined | null): string | null {
  if (!url) return null;
  const m = url.match(/images-assets\.nasa\.gov\/image\/([^/~]+)/);
  return m ? m[1] : null;
}

// ──────────────────────────────────────────────────────────────────────
// Wikimedia → ProvenanceEntry
// ──────────────────────────────────────────────────────────────────────

async function buildWikimediaEntry(opts: {
  localPath: string;
  filename: string;
  fallbackAuthor: string;
  fallbackAgency: string;
  fallbackLicense: string;
  fallbackLicenseUrl: string | null;
  fallbackLicenseRationale: string;
  fallbackTitle?: string;
  modifications: string[];
}): Promise<ProvenanceEntry> {
  const info = await fetchCommonsImageInfo(opts.filename);
  const title = info?.title ?? opts.fallbackTitle ?? `File:${opts.filename}`;
  const author = info?.artist ?? info?.credit ?? opts.fallbackAuthor;
  const sourceUrl =
    info?.descriptionurl ??
    `https://commons.wikimedia.org/wiki/${encodeURIComponent(`File:${opts.filename}`)}`;
  const imageUrl = info?.url ?? `${COMMONS_FILEPATH_BASE}/${encodeURIComponent(opts.filename)}`;
  let licenseShort = info?.licenseShort
    ? normaliseLicenseShortName(info.licenseShort)
    : opts.fallbackLicense;
  if (!isAllowedLicense(licenseShort)) {
    // If Commons returned a license id we don't recognise (e.g. "PD",
    // "CC BY-SA"), fall back to the curated fallback rather than failing
    // closed on a normalisation glitch.
    licenseShort = opts.fallbackLicense;
  }
  const licenseUrl =
    info?.licenseUrl ?? getAllowlistEntry(licenseShort)?.url ?? opts.fallbackLicenseUrl;
  const licenseRationale =
    info?.usageTerms ?? getAllowlistEntry(licenseShort)?.rationale ?? opts.fallbackLicenseRationale;
  return {
    id: entryId(staticToServed(opts.localPath)),
    path: staticToServed(opts.localPath),
    source_type: 'wikimedia-commons',
    title,
    author,
    agency: opts.fallbackAgency,
    source_url: sourceUrl,
    image_url: imageUrl,
    license_short: licenseShort,
    license_url: licenseUrl,
    license_rationale: licenseRationale,
    modifications: opts.modifications,
    revid: info?.revid ?? null,
    pageid: info?.pageid ?? null,
    nasa_id: null,
    fetched_at: new Date().toISOString(),
  };
}

// ──────────────────────────────────────────────────────────────────────
// NASA-API → ProvenanceEntry
// ──────────────────────────────────────────────────────────────────────

function nasaSearchUrl(query: string, missionId: string | null): string {
  const params = new URLSearchParams({ q: query, media_type: 'image' });
  if (missionId) {
    params.set('keywords', missionId);
  }
  return `${NASA_IMAGES_BASE}/search?${params}`;
}

function buildNasaEntry(opts: {
  localPath: string;
  query: string;
  missionId: string | null;
  agency: string;
  modifications: string[];
  nasaId?: string | null;
  sourceUrl?: string | null;
  imageUrl?: string | null;
  title?: string | null;
}): ProvenanceEntry {
  const allow = getAllowlistEntry('PD-NASA')!;
  const titleBase = opts.missionId ?? basename(opts.localPath, extname(opts.localPath));
  const resolvedNasaId = opts.nasaId ?? extractNasaIdFromUrl(opts.imageUrl ?? opts.sourceUrl);
  return {
    id: entryId(staticToServed(opts.localPath)),
    path: staticToServed(opts.localPath),
    source_type: 'nasa-images-api',
    title: opts.title ?? `NASA Images search result — ${titleBase} / "${opts.query}"`,
    author: opts.agency,
    agency: opts.agency,
    source_url: opts.sourceUrl ?? nasaSearchUrl(opts.query, opts.missionId),
    image_url: opts.imageUrl ?? null,
    license_short: 'PD-NASA',
    license_url: allow.url,
    license_rationale: allow.rationale,
    modifications: opts.modifications,
    revid: null,
    pageid: null,
    nasa_id: resolvedNasaId ?? null,
    fetched_at: new Date().toISOString(),
  };
}

// ──────────────────────────────────────────────────────────────────────
// Mission galleries
//
// Heuristic: map slot index → curated Commons title when we have one.
// Slot 1 = commonsCoverFirst ?? WIKIMEDIA_MISSION_FALLBACK[id]; slots
// 2..N = WIKIMEDIA_MISSION_GALLERY_FALLBACK[id]. Anything past N comes
// from the NASA Images API top-up. This mirrors the priority ordering
// in fetch-assets.ts `fetchMissionImages`.
// ──────────────────────────────────────────────────────────────────────

interface MissionContext {
  missionId: string;
  query: string;
  agency: string;
  commonsTitles: string[]; // ordered; index 0 → slot 01.jpg
}

async function loadMissionAgency(missionId: string): Promise<string> {
  const candidates = [
    `static/data/missions/mars/${missionId}.json`,
    `static/data/missions/moon/${missionId}.json`,
  ];
  for (const p of candidates) {
    try {
      const j = JSON.parse(await readFile(p, 'utf8')) as { agency?: string };
      if (j.agency) return j.agency;
    } catch {
      // missing
    }
  }
  // Fallbacks for legacy mars2/mars6 not in /missions json.
  if (missionId === 'mars2' || missionId === 'mars6') return 'Roscosmos';
  return 'NASA';
}

async function buildMissionContext(q: MissionImageQuery): Promise<MissionContext> {
  const titles: string[] = [];
  if (q.commonsCoverFirst) titles.push(q.commonsCoverFirst);
  else if (WIKIMEDIA_MISSION_FALLBACK[q.id]) titles.push(WIKIMEDIA_MISSION_FALLBACK[q.id]);
  for (const t of WIKIMEDIA_MISSION_GALLERY_FALLBACK[q.id] ?? []) titles.push(t);
  return {
    missionId: q.id,
    query: q.query,
    agency: await loadMissionAgency(q.id),
    commonsTitles: titles,
  };
}

async function buildMissionGalleryEntries(): Promise<ProvenanceEntry[]> {
  const out: ProvenanceEntry[] = [];
  for (const q of MISSION_IMAGE_QUERIES) {
    const ctx = await buildMissionContext(q);
    const dir = `static/images/missions/${q.id}`;
    const files = (await listFiles(dir)).filter((f) => /\.(jpe?g|png)$/i.test(f));
    for (let i = 0; i < files.length; i++) {
      const localPath = join(dir, files[i]);
      const slot = i + 1; // 1-based
      const commonsTitle = ctx.commonsTitles[slot - 1];
      if (commonsTitle) {
        out.push(
          await buildWikimediaEntry({
            localPath,
            filename: commonsTitle,
            fallbackAuthor: ctx.agency,
            fallbackAgency: ctx.agency,
            fallbackLicense: defaultLicenseForAgency(ctx.agency),
            fallbackLicenseUrl: null,
            fallbackLicenseRationale: defaultRationaleForAgency(ctx.agency),
            modifications: ['downloaded-via-special-filepath', 'reencoded-jpeg'],
          }),
        );
      } else {
        out.push(
          buildNasaEntry({
            localPath,
            query: ctx.query,
            missionId: q.id,
            agency: agencyForNasaTopup(q.id, ctx.agency),
            modifications: ['downloaded-via-nasa-images-api', 'reencoded-jpeg'],
          }),
        );
      }
    }
    // Mission card hero: static/images/missions/<id>.jpg mirrors slot 1.
    const cardPath = `static/images/missions/${q.id}.jpg`;
    if (await pathExists(cardPath)) {
      const commonsTitle = ctx.commonsTitles[0];
      if (commonsTitle) {
        out.push(
          await buildWikimediaEntry({
            localPath: cardPath,
            filename: commonsTitle,
            fallbackAuthor: ctx.agency,
            fallbackAgency: ctx.agency,
            fallbackLicense: defaultLicenseForAgency(ctx.agency),
            fallbackLicenseUrl: null,
            fallbackLicenseRationale: defaultRationaleForAgency(ctx.agency),
            modifications: ['downloaded-via-special-filepath', 'reencoded-jpeg', 'card-hero-copy'],
          }),
        );
      } else {
        out.push(
          buildNasaEntry({
            localPath: cardPath,
            query: ctx.query,
            missionId: q.id,
            agency: agencyForNasaTopup(q.id, ctx.agency),
            modifications: ['downloaded-via-nasa-images-api', 'reencoded-jpeg', 'card-hero-copy'],
          }),
        );
      }
    }
  }
  return out;
}

/**
 * Sidecar manifest for missions whose imagery the post-2026-06
 * fetch-assets.ts ran for but that aren't in `MISSION_IMAGE_QUERIES`
 * (yet). Shape is `{commons_file, commons_url, credit, license}` keyed
 * by `<missionId>/<slot>` (no extension). Used to extend
 * `buildMissionGalleryEntries` coverage without forcing every mission
 * id into MISSION_IMAGE_QUERIES (which would side-effect refetches).
 */
type MissionCommonsSource = {
  // Legacy pre-2026-06 fields:
  commons_file?: string;
  commons_url?: string;
  // Slice A v3 fields (post-2026-06): one of these source shapes is present.
  source_type?: 'wikimedia-commons' | 'nasa-image-library' | string;
  source_url?: string;
  image_url?: string;
  nasa_id?: string;
  nasa_title?: string;
  // Common fields across both shapes:
  credit: string;
  license?: string;
  fetched_at?: string;
  shared_with?: string;
};

/**
 * Sidecar manifest for panel surfaces (moon-sites, mars-sites,
 * earth-objects) whose imagery `source-known-gaps.ts` fetched but
 * that aren't in the corresponding `*_QUERIES` arrays. Keyed by
 * `<surface>/<id>/<slot>`.
 */
async function buildPanelCommonsSidecarEntries(
  knownIdsBySurface: Map<string, Set<string>>,
): Promise<ProvenanceEntry[]> {
  const out: ProvenanceEntry[] = [];
  const sidecarPath = 'static/data/panel-image-sources.json';
  let sources: Record<string, MissionCommonsSource> = {};
  try {
    const txt = await readFile(sidecarPath, 'utf8');
    sources = JSON.parse(txt) as typeof sources;
  } catch {
    return out;
  }
  for (const [relKey, src] of Object.entries(sources)) {
    // Key shape: `<surface>/<id>/<slot>`. Slot has no extension here;
    // we look up the on-disk file's actual extension.
    const parts = relKey.split('/');
    if (parts.length !== 3) continue;
    const [surface, id, slot] = parts;
    if (knownIdsBySurface.get(surface)?.has(id)) continue; // already covered
    const baseLocal = join(`static/images/${surface}`, id, slot);
    let localPath = baseLocal;
    if (await pathExists(`${baseLocal}.jpg`)) localPath = `${baseLocal}.jpg`;
    else if (await pathExists(`${baseLocal}.png`)) localPath = `${baseLocal}.png`;
    else continue;
    const entry = await buildSidecarEntry(localPath, src, { missionId: id, query: id });
    if (entry) out.push(entry);
  }
  return out;
}

/**
 * Schema-tolerant sidecar → ProvenanceEntry router.
 *
 * Handles three shapes:
 *   1. Slice A NASA: { source_type: 'nasa-image-library', source_url, image_url, nasa_id?, credit, ... }
 *   2. Slice A Commons: { source_type: 'wikimedia-commons', source_url, image_url, commons_file?, credit, ... }
 *   3. Legacy: { commons_file, commons_url, credit, license? }
 *
 * Returns null when no usable identity can be derived (skipped, not failed).
 * Logs a warning so the missing field is visible during build.
 */
async function buildSidecarEntry(
  localPath: string,
  src: MissionCommonsSource,
  ctx: { missionId: string; query: string },
): Promise<ProvenanceEntry | null> {
  const agencyHuman = src.credit || 'Unknown';
  const fallbackLicense = defaultLicenseForAgency(agencyHuman);
  const fallbackRationale = defaultRationaleForAgency(agencyHuman);

  // Slice A NASA shape → route to buildNasaEntry, preserve nasa_id + URLs.
  if (src.source_type === 'nasa-image-library' || extractNasaIdFromUrl(src.image_url)) {
    return buildNasaEntry({
      localPath,
      query: ctx.query,
      missionId: ctx.missionId,
      agency: agencyHuman,
      modifications: ['downloaded-via-nasa-images-api', 'reencoded-jpeg'],
      nasaId: src.nasa_id ?? extractNasaIdFromUrl(src.image_url ?? src.source_url),
      sourceUrl: src.source_url ?? null,
      imageUrl: src.image_url ?? null,
      title: src.nasa_title ?? null,
    });
  }

  // Commons shape (Slice A or legacy) → derive filename from whichever field carries it.
  const filename =
    src.commons_file ??
    deriveCommonsFilename(src.image_url) ??
    deriveCommonsFilename(src.source_url) ??
    deriveCommonsFilename(src.commons_url);
  if (!filename) {
    console.warn(
      `[provenance walker] skipping ${localPath}: sidecar entry has no commons_file, derivable filename, or NASA id`,
    );
    return null;
  }
  return buildWikimediaEntry({
    localPath,
    filename,
    fallbackAuthor: agencyHuman,
    fallbackAgency: agencyHuman,
    fallbackLicense,
    fallbackLicenseUrl: null,
    fallbackLicenseRationale: fallbackRationale,
    modifications: ['downloaded-via-commons-search', 'reencoded-jpeg'],
  });
}

async function buildMissionCommonsSidecarEntries(
  knownMissionIds: Set<string>,
): Promise<ProvenanceEntry[]> {
  const out: ProvenanceEntry[] = [];
  const sidecarPath = 'static/data/mission-image-sources.json';
  let sources: Record<string, MissionCommonsSource> = {};
  try {
    const txt = await readFile(sidecarPath, 'utf8');
    sources = JSON.parse(txt) as typeof sources;
  } catch {
    return out;
  }
  for (const [relPath, src] of Object.entries(sources)) {
    const missionId = relPath.split('/')[0];
    // Skip missions that MISSION_IMAGE_QUERIES already covers — that
    // path emits curated commonsCoverFirst entries; sidecar is a
    // fallback for unknown missions only.
    if (knownMissionIds.has(missionId)) continue;
    const baseLocal = join('static/images/missions', relPath);
    let localPath = baseLocal;
    if (await pathExists(`${baseLocal}.jpg`)) localPath = `${baseLocal}.jpg`;
    else if (await pathExists(`${baseLocal}.png`)) localPath = `${baseLocal}.png`;
    else continue; // file isn't on disk — skip silently
    const entry = await buildSidecarEntry(localPath, src, { missionId, query: missionId });
    if (entry) out.push(entry);
  }
  return out;
}

function defaultLicenseForAgency(agency: string): string {
  // Curated Wikimedia files we ship are typically PD-NASA, PD-Russia
  // (Soviet), or CC-BY-SA. Without a Commons-API hit we still need an
  // honest fallback. Calling code overwrites this when imageinfo
  // returns a recognised LicenseShortName.
  const a = agency.trim().toLowerCase();
  if (a.includes('nasa')) return 'PD-NASA';
  if (a.includes('roscosmos') || a.includes('soviet')) return 'PD-Russia';
  if (a.includes('esa')) return 'CC-BY-SA-3.0-IGO';
  if (a.includes('jaxa')) return 'CC-BY-4.0';
  if (a.includes('isro')) return 'PD-self';
  if (a.includes('cnsa') || a.includes('cmsa')) return 'CC-BY-SA-4.0';
  if (a.includes('mbrsc') || a.includes('uae')) return 'CC-BY-4.0';
  if (a.includes('spacex')) return 'CC-BY-2.0';
  return 'PD-Old';
}

function defaultRationaleForAgency(agency: string): string {
  return getAllowlistEntry(defaultLicenseForAgency(agency))?.rationale ?? 'See source page.';
}

function agencyForNasaTopup(missionId: string, primary: string): string {
  const extras = MISSION_NASA_CREDIT_EXTRAS[missionId];
  // No partner-credit list: honour the mission's actual operator. Was
  // hard-coding 'NASA' here, which mis-attributed Soviet/Chinese/
  // Indian missions whose top-up photos came from the NASA Images API
  // but whose operator owns the credit. (E.g. mars6 → Roscosmos.)
  if (!extras) return primary;
  // ESA / JAXA / MBRSC partner credits surface for these mission IDs in
  // fetch-assets.ts; reflect that here.
  const bits = [primary, 'NASA'];
  return bits.filter((s, i, a) => a.indexOf(s) === i).join(' / ');
}

// ──────────────────────────────────────────────────────────────────────
// Panel galleries (planets, sun, ISS, earth-objects, moon-sites, small-bodies)
// ──────────────────────────────────────────────────────────────────────

function panelCommonsTitles(q: GalleryQuery): string[] {
  const titles: string[] = [];
  if (q.commonsHeroFirst) titles.push(q.commonsHeroFirst);
  else if (q.wikimediaFallback) titles.push(q.wikimediaFallback);
  if (q.wikimediaGallery) titles.push(...q.wikimediaGallery);
  return titles;
}

async function buildPanelEntries(opts: {
  queries: readonly GalleryQuery[];
  rootDir: string;
  /** Agency resolver per entity id; falls back to defaultAgency when unset. */
  agencyById?: (id: string) => Promise<string> | string;
  defaultAgency: string;
  defaultLicense: string;
  defaultLicenseRationale: string;
  defaultLicenseUrl?: string | null;
  modifications?: string[];
}): Promise<ProvenanceEntry[]> {
  const out: ProvenanceEntry[] = [];
  for (const q of opts.queries) {
    const dir = join(opts.rootDir, q.id);
    const files = (await listFiles(dir)).filter((f) => /\.(jpe?g|png)$/i.test(f));
    const agency = opts.agencyById ? await opts.agencyById(q.id) : opts.defaultAgency;
    const license = defaultLicenseForAgency(agency);
    const rationale = defaultRationaleForAgency(agency);
    if (q.copyFromMission) {
      // Copies of the same mission's gallery; inherit provenance.
      const missionQuery = MISSION_IMAGE_QUERIES.find((m) => m.id === q.copyFromMission);
      const missionTitles: string[] = [];
      const missionId = q.copyFromMission;
      const agency = await loadMissionAgency(missionId);
      if (missionQuery?.commonsCoverFirst) missionTitles.push(missionQuery.commonsCoverFirst);
      else if (WIKIMEDIA_MISSION_FALLBACK[missionId])
        missionTitles.push(WIKIMEDIA_MISSION_FALLBACK[missionId]);
      for (const t of WIKIMEDIA_MISSION_GALLERY_FALLBACK[missionId] ?? []) missionTitles.push(t);
      for (let i = 0; i < files.length; i++) {
        const localPath = join(dir, files[i]);
        const slot = i + 1;
        const commonsTitle = missionTitles[slot - 1];
        const mods = ['copied-from-mission-gallery', ...(opts.modifications ?? [])];
        if (commonsTitle) {
          out.push(
            await buildWikimediaEntry({
              localPath,
              filename: commonsTitle,
              fallbackAuthor: agency,
              fallbackAgency: agency,
              fallbackLicense: defaultLicenseForAgency(agency),
              fallbackLicenseUrl: null,
              fallbackLicenseRationale: defaultRationaleForAgency(agency),
              modifications: ['downloaded-via-special-filepath', 'reencoded-jpeg', ...mods],
            }),
          );
        } else {
          out.push(
            buildNasaEntry({
              localPath,
              query: missionQuery?.query ?? q.query,
              missionId,
              agency: agencyForNasaTopup(missionId, agency),
              modifications: ['downloaded-via-nasa-images-api', 'reencoded-jpeg', ...mods],
            }),
          );
        }
      }
      continue;
    }
    const titles = panelCommonsTitles(q);
    for (let i = 0; i < files.length; i++) {
      const localPath = join(dir, files[i]);
      const slot = i + 1;
      const commonsTitle = titles[slot - 1];
      const mods = opts.modifications ?? ['downloaded-via-special-filepath', 'reencoded-jpeg'];
      if (commonsTitle) {
        out.push(
          await buildWikimediaEntry({
            localPath,
            filename: commonsTitle,
            fallbackAuthor: agency,
            fallbackAgency: agency,
            fallbackLicense: license,
            fallbackLicenseUrl: opts.defaultLicenseUrl ?? null,
            fallbackLicenseRationale: rationale,
            modifications: mods,
          }),
        );
      } else if (q.skipNasa) {
        // Curated-only panel (no NASA topup); fail closed here is the
        // honest answer — without a Commons title for this slot we
        // don't have provenance. Mark `direct-other` so validate flags
        // it. In practice the wikimediaGallery list should be long
        // enough that this branch is rare.
        out.push({
          id: entryId(staticToServed(localPath)),
          path: staticToServed(localPath),
          source_type: 'direct-other',
          title: `Curated panel image — ${q.id} slot ${slot}`,
          author: agency,
          agency,
          source_url: 'https://commons.wikimedia.org/',
          image_url: null,
          license_short: license,
          license_url: getAllowlistEntry(license)?.url ?? null,
          license_rationale: rationale,
          modifications: ['curated-no-upstream-record', ...(opts.modifications ?? [])],
          revid: null,
          pageid: null,
          nasa_id: null,
          fetched_at: new Date().toISOString(),
        });
      } else {
        out.push(
          buildNasaEntry({
            localPath,
            query: q.query,
            missionId: q.id,
            agency: 'NASA',
            modifications: [
              'downloaded-via-nasa-images-api',
              'reencoded-jpeg',
              ...(opts.modifications ?? []),
            ],
          }),
        );
      }
    }
  }
  return out;
}

// ──────────────────────────────────────────────────────────────────────
// Curated single-file directories: rockets, logos, lunar disc, textures
// ──────────────────────────────────────────────────────────────────────

interface CuratedFile {
  localPath: string;
  filename?: string; // Commons filename — if set, source_type = wikimedia-commons
  agency: string;
  license: string;
  licenseUrlOverride?: string | null;
  fallbackTitle?: string;
  modifications: string[];
  source_url?: string; // Override for non-Commons sources (Solar System Scope etc.)
  source_type?: SourceType;
  author?: string | null;
}

async function buildCuratedEntry(c: CuratedFile): Promise<ProvenanceEntry> {
  if (c.filename) {
    return buildWikimediaEntry({
      localPath: c.localPath,
      filename: c.filename,
      fallbackAuthor: c.author ?? c.agency,
      fallbackAgency: c.agency,
      fallbackLicense: c.license,
      fallbackLicenseUrl: c.licenseUrlOverride ?? null,
      fallbackLicenseRationale: getAllowlistEntry(c.license)?.rationale ?? 'See source page.',
      fallbackTitle: c.fallbackTitle,
      modifications: c.modifications,
    });
  }
  // Non-Commons curated source (e.g. Solar System Scope textures).
  const allow = getAllowlistEntry(c.license);
  return {
    id: entryId(staticToServed(c.localPath)),
    path: staticToServed(c.localPath),
    source_type: c.source_type ?? 'direct-other',
    title: c.fallbackTitle ?? basename(c.localPath),
    author: c.author ?? c.agency,
    agency: c.agency,
    source_url: c.source_url ?? SOLAR_SYSTEM_SCOPE_URL,
    image_url: null,
    license_short: c.license,
    license_url: c.licenseUrlOverride ?? allow?.url ?? null,
    license_rationale: allow?.rationale ?? 'See source page.',
    modifications: c.modifications,
    revid: null,
    pageid: null,
    nasa_id: null,
    fetched_at: new Date().toISOString(),
  };
}

// Mapping for static/textures/*. Solar System Scope publishes its
// textures under CC BY 4.0 (https://www.solarsystemscope.com/textures/).
const SSS_TEXTURES = new Set(TEXTURES);

// Björn Jónsson's planetary maps (https://bjj.mmedia.is) — publicly
// available with attribution; original source data NASA PDS public
// domain. Used for /explore natural-satellite textures where Solar
// System Scope doesn't publish a map (#287 Slice B + parts of D).
const BJJ_TEXTURES = new Set(['4k_io.jpg', '2k_europa.jpg', '2k_ganymede.jpg', '2k_callisto.jpg']);
const BJJ_URL = 'https://bjj.mmedia.is/data/planetary_maps.html';

// Wikimedia Commons — NASA mission imagery (public domain by US
// federal work-product rule). Per-file mapping below; titles match
// the original Commons filenames so credit lines remain traceable.
const WIKIMEDIA_TEXTURES: Record<string, { mission: string; commons_title: string }> = {
  '4k_titan.jpg': {
    mission: 'NASA / JPL-Caltech / University of Arizona / Cassini ISS',
    commons_title: 'PIA22770-SaturnMoon-Titan-Surface-20181206.jpg',
  },
  '4k_enceladus.jpg': {
    mission: 'NASA / JPL-Caltech / SSI / Cassini ISS',
    commons_title: 'Map of Enceladus December 2008 PIA11145.jpg',
  },
  '2k_phobos.jpg': {
    mission: 'ESA / DLR / FU Berlin / Mars Express HRSC',
    commons_title: 'Phobos colour 2008.jpg',
  },
  '2k_deimos.jpg': {
    mission: 'NASA / JPL-Caltech / Viking 1 orbiter',
    commons_title: 'Deimos-viking1.jpg',
  },
  '2k_charon.jpg': {
    mission: 'NASA / JHUAPL / SwRI / New Horizons LORRI',
    commons_title: 'Charon Basemap DEM Grid.jpg',
  },
  '4k_pluto.jpg': {
    mission: 'NASA / JHUAPL / SwRI / New Horizons LORRI',
    commons_title: 'NH-Pluto-GlobalMosaic-TrueColor-20150714-Released20150724.jpg',
  },
};

function textureLicense(filename: string): {
  license: string;
  agency: string;
  source_url: string;
  modifications: string[];
} {
  if (SSS_TEXTURES.has(filename)) {
    return {
      license: 'CC-BY-4.0',
      agency: 'Solar System Scope',
      source_url: SOLAR_SYSTEM_SCOPE_URL,
      modifications: ['downloaded-from-publisher'],
    };
  }
  if (BJJ_TEXTURES.has(filename)) {
    return {
      license: 'BJJ-attribution',
      agency: 'Björn Jónsson (bjj.mmedia.is, NASA PDS source data)',
      source_url: BJJ_URL,
      modifications: ['downloaded-from-publisher'],
    };
  }
  if (filename in WIKIMEDIA_TEXTURES) {
    const meta = WIKIMEDIA_TEXTURES[filename];
    return {
      license: 'PD-NASA',
      agency: meta.mission,
      source_url: `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(meta.commons_title).replace(/%20/g, '_')}`,
      modifications: ['downloaded-from-wikimedia-commons'],
    };
  }
  // Fallback — unknown texture. Keep SSS default but flag it so the
  // provenance index doesn't silently mis-attribute a new asset.
  return {
    license: 'CC-BY-4.0',
    agency: 'Solar System Scope',
    source_url: SOLAR_SYSTEM_SCOPE_URL,
    modifications: ['downloaded-from-publisher', 'NEEDS-VERIFICATION'],
  };
}

// ──────────────────────────────────────────────────────────────────────
// Asset walker
// ──────────────────────────────────────────────────────────────────────

async function buildIssEntries(): Promise<ProvenanceEntry[]> {
  const out: ProvenanceEntry[] = [];
  const moduleIds = await listDirs('static/images/iss-modules');
  for (const id of moduleIds) {
    const dir = `static/images/iss-modules/${id}`;
    const files = (await listFiles(dir)).filter((f) => /\.(jpe?g|png)$/i.test(f));
    const titles: string[] = [];
    if (WIKIMEDIA_ISS_FALLBACK[id]) titles.push(WIKIMEDIA_ISS_FALLBACK[id]);
    for (const t of WIKIMEDIA_ISS_MODULE_GALLERY[id] ?? []) titles.push(t);
    const { agency, license, rationale } = await loadIssModuleAgency(id);
    for (let i = 0; i < files.length; i++) {
      const localPath = join(dir, files[i]);
      const slot = i + 1;
      const commonsTitle = titles[slot - 1];
      if (commonsTitle) {
        out.push(
          await buildWikimediaEntry({
            localPath,
            filename: commonsTitle,
            fallbackAuthor: agency,
            fallbackAgency: agency,
            fallbackLicense: license,
            fallbackLicenseUrl: null,
            fallbackLicenseRationale: rationale,
            modifications: ['downloaded-via-special-filepath', 'reencoded-jpeg'],
          }),
        );
      } else {
        out.push(
          buildNasaEntry({
            localPath,
            query: `ISS ${id} module`,
            missionId: id,
            agency: 'NASA',
            modifications: ['downloaded-via-nasa-images-api', 'reencoded-jpeg'],
          }),
        );
      }
    }
  }
  return out;
}

/**
 * Fleet entries (PRD-012 v0.2 / Phase D). Reads the sidecar manifest
 * at `static/data/fleet-image-sources.json` written by
 * `scripts/fetch-assets.ts` during `--fleet-only` runs. Each entry
 * carries the agency tag + actual source URL of every fetched file
 * so we can route to either buildWikimediaEntry (for Commons files —
 * the per-file metadata then carries Roscosmos / ESA / JAXA / etc.
 * uploader attribution from Commons) or buildNasaEntry (for NASA
 * Images API URLs).
 */
// Sidecar manifest produced by fetch-assets.ts. Two shapes are emitted
// historically — the legacy `{agency, sourceUrl}` and the post-2026-06
// `{commons_file, commons_url, credit, license, fetched_at}`. Both have
// to keep working: the legacy 851 entries cannot be re-fetched without
// re-running fetch-assets, and the post-2026-06 fetcher won't switch
// back. Normalise inside the loop.
type LegacyFleetSource = { agency: string; sourceUrl: string };
type CommonsFleetSource = {
  commons_file: string;
  commons_url: string;
  credit: string;
  license?: string;
  fetched_at?: string;
};
type FleetSource = LegacyFleetSource | CommonsFleetSource;

function isCommonsShape(src: FleetSource): src is CommonsFleetSource {
  return 'commons_url' in src && typeof src.commons_url === 'string';
}

async function buildFleetEntries(): Promise<ProvenanceEntry[]> {
  const out: ProvenanceEntry[] = [];
  const manifestPath = 'static/data/fleet-image-sources.json';
  let sources: Record<string, FleetSource> = {};
  try {
    const txt = await readFile(manifestPath, 'utf8');
    sources = JSON.parse(txt) as typeof sources;
  } catch {
    return out;
  }

  // Map agency tag → fallback license/rationale per allowlist.
  const agencyToHumanReadable: Record<string, string> = {
    NASA: 'NASA',
    ROSCOSMOS: 'Roscosmos',
    ESA: 'ESA',
    JAXA: 'JAXA',
    CNSA: 'CNSA',
    CMSA: 'CMSA',
    ISRO: 'ISRO',
    SPACEX: 'SpaceX',
    BLUE_ORIGIN: 'Blue Origin',
    BOEING: 'Boeing',
    NORTHROP_GRUMMAN: 'Northrop Grumman',
    ULA: 'United Launch Alliance',
    ISPACE: 'ispace',
    INTUITIVE_MACHINES: 'Intuitive Machines',
    SPACEIL: 'SpaceIL',
    MULTI: 'Multi-agency',
  };

  for (const [relPath, src] of Object.entries(sources)) {
    // Commons-shape entries skip the upload.wikimedia.org URL regex
    // — they carry the Commons filename directly. Route them straight
    // into buildWikimediaEntry so per-file license + uploader attribution
    // still gets fetched from the Commons API. The legacy shape uses
    // keys like `saturn-v/01.jpg`; the new shape uses `luna10/01` —
    // we infer the extension from the on-disk file (jpg, then png).
    if (isCommonsShape(src)) {
      const agencyHuman = src.credit || 'Unknown';
      const baseLocal = join('static/images/fleet-galleries', relPath);
      let localPath = baseLocal;
      if (await pathExists(`${baseLocal}.jpg`)) localPath = `${baseLocal}.jpg`;
      else if (await pathExists(`${baseLocal}.png`)) localPath = `${baseLocal}.png`;
      else continue; // sidecar declares a slot but disk has no file — skip
      const filename = src.commons_file ?? deriveCommonsFilename(src.commons_url);
      if (!filename) {
        console.warn(
          `[provenance walker] skipping ${localPath}: fleet Commons-shape entry has no commons_file or derivable filename`,
        );
        continue;
      }
      out.push(
        await buildWikimediaEntry({
          localPath,
          filename,
          fallbackAuthor: agencyHuman,
          fallbackAgency: agencyHuman,
          fallbackLicense: defaultLicenseForAgency(agencyHuman),
          fallbackLicenseUrl: null,
          fallbackLicenseRationale: defaultRationaleForAgency(agencyHuman),
          modifications: ['downloaded-via-commons-search', 'reencoded-jpeg'],
        }),
      );
      continue;
    }
    const localPath = join('static/images/fleet-galleries', relPath);
    // Sidecar may declare slots whose on-disk file was later deleted
    // (Cat 1A/2 byte-dupe cleanup) or never sourced (no Commons hits).
    // Skip silently so the manifest stays in sync with disk reality.
    if (!(await pathExists(localPath))) continue;
    const agencyHuman = agencyToHumanReadable[src.agency] ?? src.agency ?? 'NASA';
    // 2026-06-17: legacy sidecars use `sourceUrl`; new agency-first
    // entries (post-#58 registry) use snake_case `source_url`/`image_url`.
    // Accept either to keep the walker working across both shapes.
    const url = src.sourceUrl ?? src.source_url ?? src.image_url ?? '';

    // Commons-hosted file → use buildWikimediaEntry so per-file
    // license + uploader metadata gets read from the Commons API.
    // upload.wikimedia.org thumb URLs encode the source filename in
    // the path: extract it.
    let commonsFilename: string | null = null;
    if (url.includes('upload.wikimedia.org')) {
      const match = url.match(/\/commons\/(?:thumb\/)?[0-9a-f]\/[0-9a-f]{2}\/([^/]+)/);
      if (match) commonsFilename = decodeURIComponent(match[1]);
    } else if (url.includes('commons.wikimedia.org/wiki/Special:FilePath/')) {
      const match = url.match(/Special:FilePath\/([^?]+)/);
      if (match) commonsFilename = decodeURIComponent(match[1]);
    }

    if (commonsFilename) {
      out.push(
        await buildWikimediaEntry({
          localPath,
          filename: commonsFilename,
          fallbackAuthor: agencyHuman,
          fallbackAgency: agencyHuman,
          fallbackLicense: defaultLicenseForAgency(agencyHuman),
          fallbackLicenseUrl: null,
          fallbackLicenseRationale: defaultRationaleForAgency(agencyHuman),
          modifications: ['downloaded-via-commons-search', 'reencoded-jpeg'],
        }),
      );
    } else {
      // NASA Images API or other direct download.
      out.push(
        buildNasaEntry({
          localPath,
          query: `fleet ${relPath.split('/')[0]}`,
          missionId: relPath.split('/')[0],
          agency: agencyHuman,
          modifications: ['downloaded-via-nasa-images-api', 'reencoded-jpeg'],
        }),
      );
    }
  }
  return out;
}

async function buildTiangongEntries(): Promise<ProvenanceEntry[]> {
  const out: ProvenanceEntry[] = [];
  const moduleIds = await listDirs('static/images/tiangong-modules');
  for (const id of moduleIds) {
    const dir = `static/images/tiangong-modules/${id}`;
    const files = (await listFiles(dir)).filter((f) => /\.(jpe?g|png)$/i.test(f));
    const titles: string[] = [];
    if (WIKIMEDIA_TIANGONG_FALLBACK[id]) titles.push(WIKIMEDIA_TIANGONG_FALLBACK[id]);
    for (const t of WIKIMEDIA_TIANGONG_MODULE_GALLERY[id] ?? []) titles.push(t);
    const { agency, license, rationale } = await loadTiangongModuleAgency(id);
    for (let i = 0; i < files.length; i++) {
      const localPath = join(dir, files[i]);
      const slot = i + 1;
      const commonsTitle = titles[slot - 1];
      if (commonsTitle) {
        out.push(
          await buildWikimediaEntry({
            localPath,
            filename: commonsTitle,
            fallbackAuthor: agency,
            fallbackAgency: agency,
            fallbackLicense: license,
            fallbackLicenseUrl: null,
            fallbackLicenseRationale: rationale,
            modifications: ['downloaded-via-special-filepath', 'reencoded-jpeg'],
          }),
        );
      } else {
        out.push(
          buildNasaEntry({
            localPath,
            query: `Tiangong ${id} module`,
            missionId: id,
            agency: 'NASA',
            modifications: ['downloaded-via-nasa-images-api', 'reencoded-jpeg'],
          }),
        );
      }
    }
  }
  return out;
}

async function loadEarthObjectAgencies(): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  try {
    const all = JSON.parse(await readFile('static/data/earth-objects.json', 'utf8')) as Array<{
      id: string;
      agencies?: string[];
    }>;
    for (const r of all) {
      // Multi-agency objects (ISS / Hubble / JWST) keep all agencies in
      // the manifest entry so the credits page shows the full list. A
      // single agency wins for license-default purposes.
      if (r.agencies && r.agencies.length > 0) {
        map.set(r.id, r.agencies.length === 1 ? r.agencies[0] : r.agencies.join(' / '));
      }
    }
  } catch {
    // empty map → caller falls back to defaultAgency
  }
  return map;
}

async function loadMoonSiteAgencies(): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  try {
    const all = JSON.parse(await readFile('static/data/moon-sites.json', 'utf8')) as Array<{
      id: string;
      agency?: string;
    }>;
    for (const r of all) {
      if (r.agency) map.set(r.id, r.agency);
    }
  } catch {
    // empty map → caller falls back to defaultAgency
  }
  return map;
}

async function loadMarsSiteAgencies(): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  try {
    const all = JSON.parse(await readFile('static/data/mars-sites.json', 'utf8')) as Array<{
      id: string;
      agency?: string;
    }>;
    for (const r of all) {
      if (r.agency) map.set(r.id, r.agency);
    }
  } catch {
    // empty map → caller falls back to defaultAgency
  }
  return map;
}

async function loadIssModuleAgency(id: string): Promise<{
  agency: string;
  license: string;
  rationale: string;
}> {
  try {
    const all = JSON.parse(await readFile('static/data/iss-modules.json', 'utf8')) as Array<{
      id: string;
      agency?: string;
    }>;
    const row = all.find((r) => r.id === id);
    const agency = row?.agency ?? 'NASA';
    const license = defaultLicenseForAgency(agency);
    return { agency, license, rationale: defaultRationaleForAgency(agency) };
  } catch {
    return { agency: 'NASA', license: 'PD-NASA', rationale: defaultRationaleForAgency('NASA') };
  }
}

async function loadTiangongModuleAgency(id: string): Promise<{
  agency: string;
  license: string;
  rationale: string;
}> {
  try {
    const moduleAll = JSON.parse(
      await readFile('static/data/tiangong-modules.json', 'utf8'),
    ) as Array<{ id: string; agency?: string }>;
    const visitorAll = JSON.parse(
      await readFile('static/data/tiangong-visitors.json', 'utf8'),
    ) as Array<{ id: string; agency?: string }>;
    const row = moduleAll.find((r) => r.id === id) ?? visitorAll.find((r) => r.id === id);
    const agency = row?.agency ?? 'CMSA';
    const license = defaultLicenseForAgency(agency);
    return { agency, license, rationale: defaultRationaleForAgency(agency) };
  } catch {
    return {
      agency: 'CMSA',
      license: 'CC-BY-SA-4.0',
      rationale: defaultRationaleForAgency('CMSA'),
    };
  }
}

// ──────────────────────────────────────────────────────────────────────
// Validation
// ──────────────────────────────────────────────────────────────────────

interface ValidationFailure {
  path: string;
  reason: string;
}

async function loadWaivers(): Promise<LicenseWaiver[]> {
  try {
    const raw = await readFile(WAIVERS_PATH, 'utf8');
    const j = JSON.parse(raw) as { waivers?: LicenseWaiver[] };
    return j.waivers ?? [];
  } catch {
    return [];
  }
}

function isWaived(licenseShort: string, path: string, waivers: LicenseWaiver[]): boolean {
  return waivers.some((w) => {
    if (w.license_short !== licenseShort) return false;
    if (w.scope === 'all') return true;
    if (w.scope === path) return true;
    // Glob support: trailing /* matches a directory.
    if (w.scope.endsWith('/*')) {
      return path.startsWith(w.scope.slice(0, -2));
    }
    return false;
  });
}

function requiredFieldsPresent(e: ProvenanceEntry): string[] {
  const missing: string[] = [];
  if (!e.id) missing.push('id');
  if (!e.path) missing.push('path');
  if (!e.title) missing.push('title');
  if (!e.agency) missing.push('agency');
  if (!e.source_url) missing.push('source_url');
  if (!e.license_short) missing.push('license_short');
  if (!e.license_rationale) missing.push('license_rationale');
  return missing;
}

async function validate(entries: ProvenanceEntry[]): Promise<ValidationFailure[]> {
  const failures: ValidationFailure[] = [];
  const waivers = await loadWaivers();
  for (const e of entries) {
    const missing = requiredFieldsPresent(e);
    if (missing.length > 0) {
      failures.push({ path: e.path, reason: `missing required fields: ${missing.join(', ')}` });
      continue;
    }
    if (!isAllowedLicense(e.license_short) && !isWaived(e.license_short, e.path, waivers)) {
      failures.push({
        path: e.path,
        reason: `license '${e.license_short}' is not in scripts/license-allowlist.ts and no waiver covers it`,
      });
    }
  }
  // Detect duplicate paths.
  const seen = new Map<string, number>();
  for (const e of entries) seen.set(e.path, (seen.get(e.path) ?? 0) + 1);
  for (const [p, n] of seen) {
    if (n > 1) failures.push({ path: p, reason: `duplicate manifest entry (${n} entries)` });
  }
  return failures;
}

// ──────────────────────────────────────────────────────────────────────
// Diff report
// ──────────────────────────────────────────────────────────────────────

async function loadPreviousManifest(): Promise<ProvenanceManifest | null> {
  try {
    const raw = await readFile(PROVENANCE_OUT, 'utf8');
    return JSON.parse(raw) as ProvenanceManifest;
  } catch {
    return null;
  }
}

function diffEntries(prev: ProvenanceEntry[], next: ProvenanceEntry[]) {
  const byPathPrev = new Map(prev.map((e) => [e.path, e]));
  const byPathNext = new Map(next.map((e) => [e.path, e]));
  const added: ProvenanceEntry[] = [];
  const removed: ProvenanceEntry[] = [];
  const changed: Array<{ before: ProvenanceEntry; after: ProvenanceEntry; fields: string[] }> = [];
  for (const [p, n] of byPathNext) {
    const b = byPathPrev.get(p);
    if (!b) {
      added.push(n);
      continue;
    }
    const fields: string[] = [];
    if (b.license_short !== n.license_short) fields.push('license_short');
    if ((b.author ?? '') !== (n.author ?? '')) fields.push('author');
    if (b.agency !== n.agency) fields.push('agency');
    if ((b.revid ?? null) !== (n.revid ?? null)) fields.push('revid');
    if (b.source_type !== n.source_type) fields.push('source_type');
    if (b.source_url !== n.source_url) fields.push('source_url');
    if (fields.length > 0) changed.push({ before: b, after: n, fields });
  }
  for (const [p, b] of byPathPrev) {
    if (!byPathNext.has(p)) removed.push(b);
  }
  return { added, removed, changed };
}

async function writeDiffReport(
  prev: ProvenanceManifest | null,
  next: ProvenanceManifest,
  failures: ValidationFailure[],
): Promise<void> {
  await mkdir(dirname(DIFF_REPORT_OUT), { recursive: true });
  const lines: string[] = [];
  lines.push('# Image provenance — last fetch diff');
  lines.push('');
  lines.push(`Generated: ${next.generated_at}`);
  lines.push(`Script: ${next.script_version}`);
  lines.push(`Commit: ${next.commit_sha ?? '(uncommitted tree)'}`);
  lines.push(`Total entries: ${next.entries.length}`);
  lines.push('');
  if (failures.length > 0) {
    lines.push('## ⚠ Validation failures');
    lines.push('');
    for (const f of failures) lines.push(`- \`${f.path}\` — ${f.reason}`);
    lines.push('');
  }
  if (!prev) {
    lines.push('## First-run manifest');
    lines.push('');
    lines.push('No previous `image-provenance.json` was on disk; nothing to diff against.');
    lines.push('');
  } else {
    const { added, removed, changed } = diffEntries(prev.entries, next.entries);
    lines.push(`## Added (${added.length})`);
    lines.push('');
    for (const e of added.slice(0, 50))
      lines.push(`- \`${e.path}\` — ${e.license_short} via ${e.source_type}`);
    if (added.length > 50) lines.push(`- … ${added.length - 50} more`);
    lines.push('');
    lines.push(`## Removed (${removed.length})`);
    lines.push('');
    for (const e of removed.slice(0, 50))
      lines.push(`- \`${e.path}\` — was ${e.license_short} via ${e.source_type}`);
    if (removed.length > 50) lines.push(`- … ${removed.length - 50} more`);
    lines.push('');
    lines.push(`## Changed (${changed.length})`);
    lines.push('');
    for (const c of changed.slice(0, 50)) {
      const beforeBits = c.fields.map(
        (f) =>
          `${f}: ${JSON.stringify((c.before as unknown as Record<string, unknown>)[f] ?? null)}`,
      );
      const afterBits = c.fields.map(
        (f) =>
          `${f}: ${JSON.stringify((c.after as unknown as Record<string, unknown>)[f] ?? null)}`,
      );
      lines.push(`- \`${c.after.path}\``);
      lines.push(`  - before — ${beforeBits.join(', ')}`);
      lines.push(`  - after — ${afterBits.join(', ')}`);
    }
    if (changed.length > 50) lines.push(`- … ${changed.length - 50} more`);
    lines.push('');
  }
  await writeFile(DIFF_REPORT_OUT, lines.join('\n'), 'utf8');
}

// ──────────────────────────────────────────────────────────────────────
// Main
// ──────────────────────────────────────────────────────────────────────

/**
 * /science section photos — captioned figures rendered inside section
 * pages from the optional `photo` field on the section schema. Each
 * entry resolves through `buildWikimediaEntry` (same as fleet) so the
 * Credits page lists the original Commons file + author + license.
 *
 * Map filename → Commons title + fallback attribution. With `--offline`
 * the fallback values are used verbatim; online runs enrich via the
 * Commons imageinfo API.
 */
const SCIENCE_PHOTO_SOURCES: Record<
  string,
  { commons: string; agency: string; fallbackLicense: string; fallbackAuthor: string }
> = {
  'black-holes-m87.jpg': {
    commons: 'Black hole - Messier 87 crop max res.jpg',
    agency: 'EHT',
    fallbackLicense: 'CC-BY-4.0',
    fallbackAuthor: 'Event Horizon Telescope Collaboration',
  },
  'spectroscopy-wasp39b.jpg': {
    commons: 'WASP-39 b Atmospheric Composition (NIRSpec PRISM) (weic2221f).jpeg',
    agency: 'NASA',
    fallbackLicense: 'PD-NASA',
    fallbackAuthor: 'NASA, ESA, CSA, and STScI',
  },
  'coronagraphs-hr8799.jpg': {
    commons: 'Hr8799 orbit hd.gif',
    agency: 'NASA',
    fallbackLicense: 'PD-NASA',
    fallbackAuthor: 'NASA / Jason Wang (Northwestern) / Christian Marois (NRC Herzberg)',
  },
  'interferometry-alma.jpg': {
    commons: 'ALMA antennas on Chajnantor.jpg',
    agency: 'ESA',
    fallbackLicense: 'CC-BY-4.0',
    fallbackAuthor: 'ESO/B. Tafreshi (twanight.org)',
  },
  'space-photography-deepfield.jpg': {
    commons: "Webb's First Deep Field.jpg",
    agency: 'NASA',
    fallbackLicense: 'PD-NASA',
    fallbackAuthor: 'NASA, ESA, CSA, and STScI',
  },
  'adaptive-optics-laser.jpg': {
    commons: 'Laser Towards Milky Ways Centre.jpg',
    agency: 'ESA',
    fallbackLicense: 'CC-BY-4.0',
    fallbackAuthor: 'ESO/Y. Beletsky',
  },
  'dsn-goldstone.jpg': {
    commons: 'Goldstone DSN antenna.jpg',
    agency: 'NASA',
    fallbackLicense: 'PD-NASA',
    fallbackAuthor: 'NASA/JPL-Caltech',
  },
  'history-kepler.jpg': {
    commons: 'Johannes Kepler, portrait by Hans von Aachen.jpg',
    agency: 'NASA',
    fallbackLicense: 'PD-Old',
    fallbackAuthor: 'Hans von Aachen (1612)',
  },
  'history-newton.jpg': {
    commons: 'Portrait of Sir Isaac Newton, 1689.jpg',
    agency: 'NASA',
    fallbackLicense: 'PD-Old',
    fallbackAuthor: 'Godfrey Kneller (1689)',
  },
  'history-tsiolkovsky.jpg': {
    commons: 'Tsiolkovsky 1913.jpg',
    agency: 'NASA',
    fallbackLicense: 'PD-Old',
    fallbackAuthor: 'Unknown photographer (1913, Russian Empire)',
  },
  'history-goddard.jpg': {
    commons:
      'Dr Robert H Goddard and a liquid oxygen-gasoline rocket in the frame from which it was fired on March 16, 1926.jpg',
    agency: 'NASA',
    fallbackLicense: 'PD-NASA',
    fallbackAuthor: 'NASA',
  },
  'microgravity-pettit.jpg': {
    commons:
      'Astronaut Don Pettit stares at a ball of water shaped by microgravity (iss072e742508).jpg',
    agency: 'NASA',
    fallbackLicense: 'PD-NASA',
    fallbackAuthor: 'NASA / Don Pettit (ISS Expedition 72, 2024)',
  },
  'eva-mccandless.jpg': {
    commons:
      '41B-43-2646 - STS-41B - Bruce McCandless during extravehicular activity (EVA) STS-41B mission - DPLA - 633d793267cf42aa8edbeead5d48c180.jpg',
    agency: 'NASA',
    fallbackLicense: 'PD-NASA',
    fallbackAuthor: 'NASA (STS-41B, Feb 1984)',
  },
  'muscle-atrophy-ared.jpg': {
    commons:
      "Iss072e126509 (Oct 29, 2024) --- NASA astronaut and Expedition 72 Flight Engineer Nick Hague exercises on the advanced resistive exercise device (ARED) aboard the International Space Station's Tranquility module.jpg",
    agency: 'NASA',
    fallbackLicense: 'PD-NASA',
    fallbackAuthor: 'NASA (ISS Expedition 72, 2024)',
  },
  'gravity-assist-voyager-jupiter.png': {
    commons: "Jupiter - Nasa's Voyager 2 - 1979 (52467971246).png",
    agency: 'NASA',
    fallbackLicense: 'PD-NASA',
    fallbackAuthor: 'NASA / JPL-Caltech (Voyager 2, 1979)',
  },
  'free-return-apollo13.jpg': {
    commons: 'Apollo 13 LM with Mailbox-p.jpg',
    agency: 'NASA',
    fallbackLicense: 'PD-NASA',
    fallbackAuthor: 'NASA (Apollo 13, Apr 1970)',
  },
  'patched-conics-cassini.jpg': {
    commons: 'PIA17218 – A Farewell to Saturn, Brightened Version.jpg',
    agency: 'NASA',
    fallbackLicense: 'PD-NASA',
    fallbackAuthor: 'NASA / JPL-Caltech / Space Science Institute (Cassini, Sep 2017)',
  },
  'iva-suits-crew10.jpg': {
    commons: 'SpaceX Crew-10 Astronaut Suit Up (KSC-20250314-PH-KLS01 0146).jpg',
    agency: 'NASA',
    fallbackLicense: 'PD-NASA',
    fallbackAuthor: 'NASA (Kennedy Space Center, SpaceX Crew-10, Mar 2025)',
  },
  'eva-suits-orlan.jpg': {
    commons: 'ISS-54 EVA-2 Orlan space suit No. 4.jpg',
    agency: 'NASA',
    fallbackLicense: 'PD-NASA',
    fallbackAuthor: 'NASA / Roscosmos (ISS Expedition 54, Feb 2018)',
  },
  'lunar-suits-aldrin.jpg': {
    commons: 'Aldrin Apollo 11.jpg',
    agency: 'NASA',
    fallbackLicense: 'PD-NASA',
    fallbackAuthor: 'NASA / Neil Armstrong (Apollo 11, Jul 1969)',
  },
  // Life-in-Space expansion (RFC follow-ups to the audit, May 2026)
  'crewed-station-design-iss.jpg': {
    commons: 'The station pictured from the SpaceX Crew Dragon 5.jpg',
    agency: 'NASA',
    fallbackLicense: 'PD-NASA',
    fallbackAuthor: 'NASA (SpaceX Crew-2 Dragon, Nov 2021)',
  },
  'eva-operations-sts117.jpg': {
    commons: 'STS-117 EVA3c.jpg',
    agency: 'NASA',
    fallbackLicense: 'PD-NASA',
    fallbackAuthor: 'NASA (STS-117, Jun 2007)',
  },
  'eclss-life-support-rack.jpg': {
    commons: 'SpaceStationCycle.svg',
    agency: 'NASA',
    fallbackLicense: 'PD-NASA',
    fallbackAuthor: 'NASA — ISS atmosphere + water + waste cycling overview',
  },
  'crew-selection-mercury-seven.jpg': {
    commons: 'The Mercury 7 (15258556433).jpg',
    agency: 'NASA',
    fallbackLicense: 'PD-NASA',
    fallbackAuthor: 'NASA (Mercury Seven group photograph, April 1959)',
  },
  'pre-flight-training.jpg': {
    commons: 'Reduced Gravity Walking Simulator - NASA 1963.jpg',
    agency: 'NASA',
    fallbackLicense: 'PD-NASA',
    fallbackAuthor: 'NASA Langley Research Center (Reduced Gravity Walking Simulator, 1963)',
  },
  'sleep-nutrition-iss.jpg': {
    commons: 'Iss016e008792.jpg',
    agency: 'NASA',
    fallbackLicense: 'PD-NASA',
    fallbackAuthor: 'NASA (ISS Expedition 16, 2007)',
  },
  'suit-lineage-sokol.jpg': {
    commons: 'Sokol KV2.JPG',
    agency: 'Roscosmos',
    fallbackLicense: 'CC-BY-SA-3.0',
    fallbackAuthor: 'Wikimedia Commons contributor — Sokol KV-2 IVA suit display',
  },
  'lunar-surface-ops-apollo17.jpg': {
    commons: 'Eugene Cernan at the LM, Apollo 17, AS17-134-20378.jpg',
    agency: 'NASA',
    fallbackLicense: 'PD-NASA',
    fallbackAuthor: 'NASA / Harrison Schmitt (Apollo 17, Dec 1972)',
  },
  'mars-human-architecture.jpg': {
    commons: 'Mars Ice Home concept.jpg',
    agency: 'NASA',
    fallbackLicense: 'PD-NASA',
    fallbackAuthor:
      'NASA Langley Research Center / Clouds AO / SEArch (Mars Ice Home concept, 2016)',
  },
  'crew-dynamics-mir.jpg': {
    commons: 'Mir Space Station viewed from Endeavour during STS-89.jpg',
    agency: 'NASA',
    fallbackLicense: 'PD-NASA',
    fallbackAuthor: 'NASA (Mir from Endeavour, STS-89, Jan 1998)',
  },
  // Photo coverage expansion 2026-05-24 — 22 articles previously missing photos.
  // life-in-space (4):
  'bone-density-loss-ared.jpg': {
    commons: 'ISS-44 Kjell Lindgren exercises using the Advanced Resistive Exercise Device.jpg',
    agency: 'NASA',
    fallbackLicense: 'PD-NASA',
    fallbackAuthor: 'NASA (ISS Expedition 44, Aug 2015)',
  },
  'long-duration-twins.jpg': {
    commons: 'One-Year Crew Mission commemorative poster.jpg',
    agency: 'NASA',
    fallbackLicense: 'PD-NASA',
    fallbackAuthor: 'NASA — One-Year Crew Mission (Scott Kelly + Mikhail Kornienko, 2015-16)',
  },
  'radiation-solar-flare.jpg': {
    commons: 'X Class Solar Flare Sends ‘Shockwaves’ on The Sun (6819094556).jpg',
    agency: 'NASA',
    fallbackLicense: 'PD-NASA',
    fallbackAuthor: 'NASA / Solar Dynamics Observatory (X-class flare, March 2012)',
  },
  'vestibular-system.jpg': {
    commons: 'Vertigo.png',
    agency: 'NASA',
    fallbackLicense: 'PD-NASA',
    fallbackAuthor: 'NASA (vestibular adaptation reference diagram)',
  },
  // mission-phases (5):
  'nrho.jpg': {
    commons: 'Near Rectilinear Halo Orbit (NRHO).png',
    agency: 'NASA',
    fallbackLicense: 'PD-NASA',
    fallbackAuthor: 'NASA — Near-Rectilinear Halo Orbit (Lunar Gateway reference)',
  },
  'star-tracker.jpg': {
    commons: 'STARS on EBEX ld2012 image.png',
    agency: 'NASA',
    fallbackLicense: 'PD-NASA',
    fallbackAuthor: 'NASA — STARS star-tracker on EBEX balloon experiment (LDB 2012)',
  },
  'trans-lunar-injection.jpg': {
    commons: 'Trans-lunar injection.svg.png',
    agency: 'NASA',
    fallbackLicense: 'PD-NASA',
    fallbackAuthor: 'NASA — Trans-lunar injection trajectory diagram',
  },
  'orbit-insertion-mro.jpg': {
    commons: "Mars Reconnaissance Orbiter, front view, artist's concept (PIA07245).jpg",
    agency: 'NASA',
    fallbackLicense: 'PD-NASA',
    fallbackAuthor: "NASA / JPL-Caltech (Mars Reconnaissance Orbiter artist's concept, PIA07245)",
  },
  'met-mission-control.jpg': {
    commons: 'Expedition 55 Soyuz Docking (NHQ201803230003).jpg',
    agency: 'NASA',
    fallbackLicense: 'PD-NASA',
    fallbackAuthor: 'NASA / Joel Kowsky (Mission Control during Soyuz MS-08 docking, March 2018)',
  },
  // orbits (3):
  'keplers-laws-portrait.jpg': {
    commons: 'JKepler.jpg',
    agency: 'public-domain',
    fallbackLicense: 'PD-Old',
    fallbackAuthor: 'Unknown artist — Johannes Kepler portrait (c. 1610)',
  },
  'lagrange-jwst.jpg': {
    commons: 'JWST spacecraft model 3.png',
    agency: 'NASA',
    fallbackLicense: 'PD-NASA',
    fallbackAuthor: 'NASA / Northrop Grumman — JWST spacecraft model (deployed at L2)',
  },
  'orbit-regimes-leo.jpg': {
    commons: 'ISS-44 Milky Way.jpg',
    agency: 'NASA',
    fallbackLicense: 'PD-NASA',
    fallbackAuthor: 'NASA (ISS Expedition 44 — Milky Way above the limb, Aug 2015)',
  },
  // propulsion (5):
  'tsiolkovsky-portrait.jpg': {
    commons: 'Константин Циолковский.jpg',
    agency: 'public-domain',
    fallbackLicense: 'PD-Old',
    fallbackAuthor: 'Soviet press archive — Konstantin Tsiolkovsky portrait',
  },
  'specific-impulse-rs25.jpg': {
    commons: 'Shuttle Main Engine Test Firing.jpg',
    agency: 'NASA',
    fallbackLicense: 'PD-NASA',
    fallbackAuthor: 'NASA / Stennis Space Center (SSME / RS-25 hot-fire test)',
  },
  'oberth-cassini.jpg': {
    commons: 'Cassini Saturn Orbit Insertion.jpg',
    agency: 'NASA',
    fallbackLicense: 'PD-NASA',
    fallbackAuthor: 'NASA / JPL-Caltech (Cassini Saturn Orbit Insertion artist concept, July 2004)',
  },
  'v-infinity-voyager.jpg': {
    commons: 'Voyager probes with the outer worlds.jpg',
    agency: 'NASA',
    fallbackLicense: 'PD-NASA',
    fallbackAuthor: 'NASA / JPL-Caltech (Voyager probes + outer worlds composite)',
  },
  'c3-parker-launch.jpg': {
    commons: 'Parker Solar Probe spacecraft model.png',
    agency: 'NASA',
    fallbackLicense: 'PD-NASA',
    fallbackAuthor: 'NASA / Johns Hopkins APL (Parker Solar Probe spacecraft, 2018)',
  },
  // propulsion (6 — GH #99 rocket-engines expansion):
  'engine-types-raptor.jpg': {
    commons: 'SpaceX sea-level Raptor at Hawthorne - 2.jpg',
    agency: 'SpaceX',
    fallbackLicense: 'CC-BY-2.0',
    fallbackAuthor: 'SpaceX (Raptor sea-level engine at Hawthorne)',
  },
  'fuels-and-oxidizers-lox-loading.jpg': {
    commons:
      'Artemis III Liquid Oxygen Tank Lifted to Mate to Intertank (MAF 20251107 CS3 LOX & IT mate-188).jpg',
    agency: 'NASA',
    fallbackLicense: 'PD-NASA',
    fallbackAuthor: 'NASA / Michoud Assembly Facility (Artemis III SLS LOX tank, Nov 2025)',
  },
  'thrust-and-twr-f1-static.jpg': {
    commons: 'F-1 rocket engine.jpg',
    agency: 'NASA',
    fallbackLicense: 'PD-NASA',
    fallbackAuthor: 'NASA / Marshall Space Flight Center (Saturn V F-1 engine)',
  },
  'engine-clustering-super-heavy.jpg': {
    commons: 'NASA Marshall visit to Super Heavy booster.jpg',
    agency: 'NASA',
    fallbackLicense: 'PD-NASA',
    fallbackAuthor: 'NASA / SpaceX (Super Heavy booster with 33 Raptor engines, Starbase, 2023)',
  },
  'rocket-stages-saturn-v.jpg': {
    commons: 'Apollo 11 Saturn V in VAB during stacking (48292558152).jpg',
    agency: 'NASA',
    fallbackLicense: 'PD-NASA',
    fallbackAuthor: 'NASA / Kennedy Space Center (Apollo 11 Saturn V stacking in VAB, 1969)',
  },
  'throttling-and-gimbaling-merlin-gimbal.jpg': {
    commons: 'Falcon 9 first stage in hangar; upgraded Merlin engines close-up (24175842635).jpg',
    agency: 'SpaceX',
    fallbackLicense: 'CC-BY-2.0',
    fallbackAuthor: 'SpaceX (Falcon 9 first-stage Merlin engines + gimbal hardware close-up)',
  },
  // life-in-space surface-stay (6 — GH #98 living on other planets):
  'lunar-habitat-design-base-camp.jpg': {
    commons: 'Lunar base concept drawing s78 23252.jpg',
    agency: 'NASA',
    fallbackLicense: 'PD-NASA',
    fallbackAuthor:
      'NASA (lunar base concept drawing, 1978 — historical reference for sustained-surface architectures)',
  },
  'mars-habitat-design-concept.jpg': {
    commons: 'PIA23302-FirstHumansOnMars-ArtistConcept.jpg',
    agency: 'NASA',
    fallbackLicense: 'PD-NASA',
    fallbackAuthor:
      'NASA / JPL-Caltech (First Humans on Mars artist concept, Mars Design Reference Architecture)',
  },
  'isru-resource-utilization-moxie.jpg': {
    commons:
      'PIA23154 MOXIE experience is installed into the chassis of the Mars rover Perseverance.jpg',
    agency: 'NASA',
    fallbackLicense: 'PD-NASA',
    fallbackAuthor:
      'NASA / JPL-Caltech (MOXIE being installed in Perseverance rover chassis, 2019)',
  },
  'food-production-veggie.jpg': {
    commons: 'ISS-44 VEGGIE Red Romaine Lettuce.jpg',
    agency: 'NASA',
    fallbackLicense: 'PD-NASA',
    fallbackAuthor:
      'NASA (ISS Expedition 44 — Veggie facility with Outredgeous red romaine lettuce, Aug 2015)',
  },
  'surface-mobility-lrv.jpg': {
    commons: 'Apollo 15 flag, rover, LM, Irwin.jpg',
    agency: 'NASA',
    fallbackLicense: 'PD-NASA',
    fallbackAuthor: 'NASA (Apollo 15 LRV at Hadley Rille with US flag, LM, James Irwin, July 1971)',
  },
  'surface-dust-cernan.jpg': {
    commons:
      'Astronaut Harrison Schmitt inside the lunar module on lunar surface after EVA (as17-134-20530).jpg',
    agency: 'NASA',
    fallbackLicense: 'PD-NASA',
    fallbackAuthor:
      'NASA (Apollo 17 — Harrison Schmitt inside LM after EVA, dust contamination visible, Dec 1972)',
  },
  // observation — Local Group galaxies (5 — GH #86 Lite):
  'local-group-map.jpg': {
    commons: 'The Local Group Top View.jpg',
    agency: 'public-domain',
    fallbackLicense: 'CC-BY-SA-3.0',
    fallbackAuthor: 'Wikimedia Commons contributor — Local Group top-view schematic map',
  },
  'andromeda-galaxy-m31.jpg': {
    commons: 'Andromeda galaxy - GALEX (rotated).jpg',
    agency: 'NASA',
    fallbackLicense: 'PD-NASA',
    fallbackAuthor: 'NASA / Galaxy Evolution Explorer (GALEX) — Andromeda Galaxy (M31) UV imaging',
  },
  'magellanic-clouds-eso.jpg': {
    commons: 'Magellanic Clouds at Paranal (beletsky paranal 10f).jpg',
    agency: 'ESA',
    fallbackLicense: 'CC-BY-4.0',
    fallbackAuthor: 'ESO / Y. Beletsky (LMC + SMC above the VLT at Paranal Observatory, Chile)',
  },
  'dwarf-spheroidals-fornax.jpg': {
    commons: 'Fornax dwarf galaxy.jpg',
    agency: 'ESA',
    fallbackLicense: 'CC-BY-4.0',
    fallbackAuthor: 'ESO / Digitized Sky Survey — Fornax Dwarf Spheroidal galaxy',
  },
  'galaxy-types-hubble-tuning-fork.jpg': {
    commons: 'HubbleTuningFork nl.png',
    agency: 'public-domain',
    fallbackLicense: 'CC-BY-SA-3.0',
    fallbackAuthor:
      'Wikimedia Commons contributor — Hubble galaxy-morphology tuning-fork diagram (1936 framework)',
  },
  // orbits — GH #83 (5 new orbit articles):
  'sun-synchronous-sentinel.jpg': {
    commons: 'South Georgia Island as seen by Sentinel-2.jpg',
    agency: 'ESA',
    fallbackLicense: 'CC-BY-SA-3.0-IGO',
    fallbackAuthor: 'ESA / Copernicus Sentinel-2 (South Georgia Island, sun-synchronous LEO)',
  },
  'special-orbits-molniya.jpg': {
    commons: 'Molniya.jpg',
    agency: 'public-domain',
    fallbackLicense: 'CC-BY-SA-3.0',
    fallbackAuthor: 'Wikimedia Commons contributor — Molniya orbit ground-track diagram',
  },
  'cislunar-orbits-gateway.jpg': {
    commons: 'Gateway with docked logistics module in lunar orbit.jpg',
    agency: 'NASA',
    fallbackLicense: 'PD-NASA',
    fallbackAuthor: 'NASA — Lunar Gateway with docked logistics module concept (NRHO)',
  },
  'disposal-end-of-life-deorbit.jpg': {
    commons: 'Hypothetical ISS Deorbit and Re-entry Scenarios Targeting Late 2030.png',
    agency: 'NASA',
    fallbackLicense: 'PD-NASA',
    fallbackAuthor: 'NASA — ISS hypothetical deorbit + re-entry scenarios (Point Nemo / SPOUA)',
  },
  'space-debris-population.jpg': {
    commons:
      'Tracking Satellites and Space Debris in Earth Orbit (Feb 2024) (SVS5258 - cos ir deb 2024 03750 print).jpg',
    agency: 'NASA',
    fallbackLicense: 'PD-NASA',
    fallbackAuthor:
      'NASA Scientific Visualization Studio — Earth orbit debris population (Feb 2024)',
  },
  // space-stations (4):
  'expedition-cadence-exp1.jpg': {
    commons: 'S97e5009.jpg',
    agency: 'NASA',
    fallbackLicense: 'PD-NASA',
    fallbackAuthor: 'NASA (Expedition 1 crew aboard ISS, STS-97 photograph, Dec 2000)',
  },
  'node-module-harmony.jpg': {
    commons: 'Node 2 - STS-134.jpg',
    agency: 'NASA',
    fallbackLicense: 'PD-NASA',
    fallbackAuthor: 'NASA (Harmony / Node 2 photographed during STS-134, May 2011)',
  },
  'pressurized-volume-destiny.jpg': {
    commons: 'ISS Destiny Lab.jpg',
    agency: 'NASA',
    fallbackLicense: 'PD-NASA',
    fallbackAuthor: 'NASA (Destiny laboratory module interior, ISS)',
  },
  'solar-power-iss-arrays.jpg': {
    commons:
      'Earth horizon and International Space Station solar panel array (Expedition 17 crew, August 2008).jpg',
    agency: 'NASA',
    fallbackLicense: 'PD-NASA',
    fallbackAuthor: 'NASA (ISS Expedition 17 — solar array against Earth limb, Aug 2008)',
  },
  // transfers (1):
  'transfer-ellipse-hohmann.jpg': {
    commons: 'Hohmann transfer orbit.svg.png',
    agency: 'public-domain',
    fallbackLicense: 'CC-BY-SA-3.0',
    fallbackAuthor: 'Wikimedia Commons contributor — Hohmann transfer orbit diagram',
  },
};

async function buildScienceEntries(): Promise<ProvenanceEntry[]> {
  const dir = 'static/images/science';
  if (!(await pathExists(dir))) return [];
  const files = (await readdir(dir)).sort();
  const out: ProvenanceEntry[] = [];
  for (const f of files) {
    if (!/\.(jpe?g|png|gif)$/i.test(f)) continue;
    const meta = SCIENCE_PHOTO_SOURCES[f];
    if (!meta) {
      console.warn(`    ⚠ science image without metadata mapping: ${f}`);
      continue;
    }
    out.push(
      await buildWikimediaEntry({
        localPath: join(dir, f),
        filename: meta.commons,
        fallbackAuthor: meta.fallbackAuthor,
        fallbackAgency: meta.agency,
        fallbackLicense: meta.fallbackLicense,
        fallbackLicenseUrl: getAllowlistEntry(meta.fallbackLicense)?.url ?? null,
        fallbackLicenseRationale:
          getAllowlistEntry(meta.fallbackLicense)?.rationale ??
          'Public-domain / CC-licensed Commons file used for /science section figure.',
        modifications: ['downloaded-via-commons-filepath', 'reencoded-jpeg'],
      }),
    );
  }
  return out;
}

// ──────────────────────────────────────────────────────────────────────
// Recommendation thumbnails  (/science/reading-list + /science/watch-list)
// ──────────────────────────────────────────────────────────────────────
//
// 31 thumbnails fetched from publisher-controlled CDNs for recommendation
// purposes. Each one is a low-resolution cover / poster / avatar used
// here for *identification* of the work — the same nominative-fair-use
// pattern every online bookshop, podcast directory, and film database
// uses. See `static/images/recommendations/README.md` for the rationale +
// the issue-tracker takedown contact.
//
// We file each under the project's existing "fair-use-cover" license
// rationale (registered in scripts/license-allowlist.ts via this
// expansion). Source URLs preserved so the Credits page can credit
// the originator.

type RecommendationSource = {
  /** Path under static/images/recommendations/, e.g. 'books/cosmos.jpg' */
  rel: string;
  /** Title of the underlying work (book title / film title / podcast / channel). */
  title: string;
  /** Author / publisher / studio / network as appropriate. */
  author: string;
  /** URL of the page or API endpoint we fetched from. */
  source_url: string;
};

const RECOMMENDATION_SOURCES: RecommendationSource[] = [
  // ── Books — Open Library Covers API ──────────────────────────────
  {
    rel: 'books/cosmos.jpg',
    title: 'Cosmos (Carl Sagan, 1980)',
    author: 'Random House (publisher)',
    source_url: 'https://covers.openlibrary.org/b/isbn/9780375508325-L.jpg',
  },
  {
    rel: 'books/pale-blue-dot.jpg',
    title: 'Pale Blue Dot (Carl Sagan, 1994)',
    author: 'Random House (publisher)',
    source_url: 'https://covers.openlibrary.org/b/isbn/9780345376596-L.jpg',
  },
  {
    rel: 'books/a-brief-history-of-time.jpg',
    title: 'A Brief History of Time (Stephen Hawking, 1988)',
    author: 'Bantam Books (publisher)',
    source_url: 'https://covers.openlibrary.org/b/isbn/9780553380163-L.jpg',
  },
  {
    rel: 'books/the-right-stuff.jpg',
    title: 'The Right Stuff (Tom Wolfe, 1979)',
    author: 'Farrar, Straus and Giroux (publisher)',
    source_url: 'https://covers.openlibrary.org/b/isbn/9780553381351-L.jpg',
  },
  {
    rel: 'books/packing-for-mars.jpg',
    title: 'Packing for Mars (Mary Roach, 2010)',
    author: 'W. W. Norton (publisher)',
    source_url: 'https://covers.openlibrary.org/b/isbn/9780393339918-L.jpg',
  },
  {
    rel: 'books/rocket-propulsion-elements.jpg',
    title: 'Rocket Propulsion Elements (Sutton & Biblarz, 2016)',
    author: 'Wiley (publisher)',
    source_url: 'https://covers.openlibrary.org/b/isbn/9781118753651-L.jpg',
  },
  {
    rel: 'books/fundamentals-of-astrodynamics.jpg',
    title: 'Fundamentals of Astrodynamics (Bate, Mueller & White, 1971)',
    author: 'Dover Publications (publisher)',
    source_url: 'https://covers.openlibrary.org/b/isbn/9780486600611-L.jpg',
  },
  {
    rel: 'books/how-to-read-the-solar-system.jpg',
    title: 'How to Read the Solar System (Riley & Campbell, 2014)',
    author: 'Aurum Press (publisher)',
    source_url: 'https://covers.openlibrary.org/b/isbn/9781845137748-L.jpg',
  },

  // ── Films — Wikipedia infobox posters ────────────────────────────
  {
    rel: 'films/contact.jpg',
    title: 'Contact (1997 film)',
    author: 'Warner Bros. (poster designer per Wikipedia infobox)',
    source_url: 'https://en.wikipedia.org/wiki/Contact_(1997_American_film)',
  },
  {
    rel: 'films/interstellar.jpg',
    title: 'Interstellar (2014 film)',
    author: 'Paramount Pictures / Warner Bros.',
    source_url: 'https://en.wikipedia.org/wiki/Interstellar_(film)',
  },
  {
    rel: 'films/2001-a-space-odyssey.jpg',
    title: '2001: A Space Odyssey (1968 film)',
    author: 'MGM (poster designer per Wikipedia infobox)',
    source_url: 'https://en.wikipedia.org/wiki/2001:_A_Space_Odyssey_(film)',
  },
  {
    rel: 'films/the-martian.jpg',
    title: 'The Martian (2015 film)',
    author: '20th Century Fox',
    source_url: 'https://en.wikipedia.org/wiki/The_Martian_(film)',
  },
  {
    rel: 'films/apollo-13.jpg',
    title: 'Apollo 13 (1995 film)',
    author: 'Universal Pictures',
    source_url: 'https://en.wikipedia.org/wiki/Apollo_13_(film)',
  },
  {
    rel: 'films/moon.jpg',
    title: 'Moon (2009 film)',
    author: 'Sony Pictures Classics',
    source_url: 'https://en.wikipedia.org/wiki/Moon_(2009_film)',
  },
  {
    rel: 'films/for-all-mankind-tv.jpg',
    title: 'For All Mankind (Apple TV+ series, 2019)',
    author: 'Apple Inc. / Sony Pictures Television',
    source_url: 'https://en.wikipedia.org/wiki/For_All_Mankind_(TV_series)',
  },

  // ── Documentaries — Wikipedia infobox posters ────────────────────
  {
    rel: 'docs/for-all-mankind-1989.jpg',
    title: 'For All Mankind (1989 documentary)',
    author: 'Apollo Associates / Al Reinert',
    source_url: 'https://en.wikipedia.org/wiki/For_All_Mankind_(film)',
  },
  {
    rel: 'docs/in-the-shadow-of-the-moon.jpg',
    title: 'In the Shadow of the Moon (2007 documentary)',
    author: 'ThinkFilm / Velocity Films',
    source_url: 'https://en.wikipedia.org/wiki/In_the_Shadow_of_the_Moon_(2007_film)',
  },
  {
    rel: 'docs/cosmos-personal-voyage.jpg',
    title: 'Cosmos: A Personal Voyage (PBS, 1980)',
    author: 'PBS / KCET',
    source_url: 'https://en.wikipedia.org/wiki/Cosmos:_A_Personal_Voyage',
  },
  {
    rel: 'docs/when-we-left-earth.jpg',
    title: 'When We Left Earth: The NASA Missions (Discovery, 2008)',
    author: 'Discovery Communications',
    source_url: 'https://en.wikipedia.org/wiki/When_We_Left_Earth',
  },

  // ── Podcasts — iTunes Search API artwork ─────────────────────────
  {
    rel: 'podcasts/off-nominal.jpg',
    title: 'Off-Nominal (podcast)',
    author: 'Jake Robins & Anthony Colangelo',
    source_url: 'https://itunes.apple.com/search?term=Off-Nominal&entity=podcast',
  },
  {
    rel: 'podcasts/main-engine-cut-off.jpg',
    title: 'Main Engine Cut Off (podcast)',
    author: 'Anthony Colangelo',
    source_url: 'https://itunes.apple.com/search?term=Main+Engine+Cut+Off&entity=podcast',
  },
  {
    rel: 'podcasts/are-we-there-yet.jpg',
    title: 'Are We There Yet? (podcast)',
    author: 'WMFE / Brendan Byrne',
    source_url: 'https://itunes.apple.com/search?term=Are+We+There+Yet+WMFE+space&entity=podcast',
  },

  // ── YouTube channels — public yt3.googleusercontent.com avatars ─
  {
    rel: 'channels/scott-manley.jpg',
    title: 'Scott Manley (YouTube channel)',
    author: 'Scott Manley',
    source_url: 'https://www.youtube.com/@scottmanley',
  },
  {
    rel: 'channels/everyday-astronaut.jpg',
    title: 'Everyday Astronaut (YouTube channel)',
    author: 'Tim Dodd',
    source_url: 'https://www.youtube.com/@EverydayAstronaut',
  },
  {
    rel: 'channels/veritasium.jpg',
    title: 'Veritasium (YouTube channel)',
    author: 'Derek Muller',
    source_url: 'https://www.youtube.com/@veritasium',
  },
  {
    rel: 'channels/pbs-space-time.jpg',
    title: 'PBS Space Time (YouTube channel)',
    author: "PBS Digital Studios / Matt O'Dowd",
    source_url: 'https://www.youtube.com/@pbsspacetime',
  },

  // ── Blogs — OG-image / apple-touch-icon ──────────────────────────
  {
    rel: 'blogs/the-planetary-society.jpg',
    title: 'The Planetary Society (site logo)',
    author: 'The Planetary Society',
    source_url: 'https://www.planetary.org/',
  },
  {
    rel: 'blogs/casey-handmer.jpg',
    title: "Casey Handmer's Blog (site avatar)",
    author: 'Casey Handmer',
    source_url: 'https://caseyhandmer.wordpress.com/',
  },
  {
    rel: 'blogs/ars-technica.jpg',
    title: 'Ars Technica (site logo)',
    author: 'Ars Technica / Condé Nast',
    source_url: 'https://arstechnica.com/',
  },
  {
    rel: 'blogs/nasaspaceflight.jpg',
    title: 'NASA Spaceflight (site logo)',
    author: 'NASASpaceflight.com',
    source_url: 'https://www.nasaspaceflight.com/',
  },
  {
    rel: 'blogs/damn-interesting.jpg',
    title: 'Damn Interesting (site logo)',
    author: 'Alan Bellows / Damn Interesting',
    source_url: 'https://www.damninteresting.com/',
  },
];

async function buildRecommendationEntries(): Promise<ProvenanceEntry[]> {
  const root = 'static/images/recommendations';
  if (!(await pathExists(root))) return [];
  const out: ProvenanceEntry[] = [];

  // Index for O(1) lookup of the curated metadata.
  const byRel = new Map(RECOMMENDATION_SOURCES.map((s) => [s.rel, s]));

  // Walk every JPG under each subdir.
  const subdirs = ['books', 'films', 'docs', 'podcasts', 'channels', 'blogs'];
  for (const sub of subdirs) {
    const dir = `${root}/${sub}`;
    if (!(await pathExists(dir))) continue;
    const files = (await readdir(dir)).sort();
    for (const f of files) {
      if (!/\.(jpe?g|png|webp)$/i.test(f)) continue;
      const rel = `${sub}/${f}`;
      const meta = byRel.get(rel);
      if (!meta) {
        console.warn(`    ⚠ recommendation thumbnail without source mapping: ${rel}`);
        continue;
      }
      out.push(
        await buildCuratedEntry({
          localPath: `${root}/${rel}`,
          filename: meta.title,
          source_url: meta.source_url,
          source_type: 'direct-other',
          author: meta.author,
          agency: 'publisher',
          license: 'fair-use-cover',
          modifications: ['downloaded', 'resized-300px', 'reencoded-jpeg-q80'],
        }),
      );
    }
  }
  return out;
}

async function buildAllEntries(): Promise<ProvenanceEntry[]> {
  const out: ProvenanceEntry[] = [];

  console.log('Mission galleries…');
  out.push(...(await buildMissionGalleryEntries()));
  // Sidecar coverage for missions not in MISSION_IMAGE_QUERIES (post-
  // 2026-06 Commons fetcher output for shenzhou-1, vostok-2..6, etc).
  out.push(
    ...(await buildMissionCommonsSidecarEntries(new Set(MISSION_IMAGE_QUERIES.map((q) => q.id)))),
  );

  console.log('ISS module galleries…');
  out.push(...(await buildIssEntries()));
  out.push(...(await buildTiangongEntries()));

  console.log('Fleet galleries…');
  out.push(...(await buildFleetEntries()));

  console.log('/science section photos…');
  out.push(...(await buildScienceEntries()));

  console.log('Earth-object galleries…');
  const earthAgencies = await loadEarthObjectAgencies();
  out.push(
    ...(await buildPanelEntries({
      queries: EARTH_OBJECT_QUERIES,
      rootDir: 'static/images/earth-objects',
      agencyById: (id) => earthAgencies.get(id) ?? 'NASA',
      defaultAgency: 'NASA',
      defaultLicense: 'PD-NASA',
      defaultLicenseRationale: getAllowlistEntry('PD-NASA')!.rationale,
    })),
  );

  console.log('Moon-site galleries…');
  const moonAgencies = await loadMoonSiteAgencies();
  out.push(
    ...(await buildPanelEntries({
      queries: MOON_SITE_QUERIES,
      rootDir: 'static/images/moon-sites',
      agencyById: (id) => moonAgencies.get(id) ?? 'NASA',
      defaultAgency: 'NASA',
      defaultLicense: 'PD-NASA',
      defaultLicenseRationale: getAllowlistEntry('PD-NASA')!.rationale,
    })),
  );

  console.log('Mars-site galleries…');
  const marsAgencies = await loadMarsSiteAgencies();
  out.push(
    ...(await buildPanelEntries({
      queries: MARS_SITE_QUERIES,
      rootDir: 'static/images/mars-sites',
      agencyById: (id) => marsAgencies.get(id) ?? 'NASA',
      defaultAgency: 'NASA',
      defaultLicense: 'PD-NASA',
      defaultLicenseRationale: getAllowlistEntry('PD-NASA')!.rationale,
    })),
  );

  // Panel sidecar (#5 Phase 4) — picks up panel surface ids that
  // source-known-gaps.ts fetched from Commons but that aren't in the
  // corresponding query arrays yet.
  // 2026-06-23 fix: extended to include planets + small-bodies + sun
  // + missions. The panel-image-sources.json sidecar carries keys for
  // EVERY panel surface, so the original knownIdsBySurface (which only
  // had moon-sites / mars-sites / earth-objects) was letting through
  // planet + small-body sidecar entries that the dedicated Planet +
  // Small-body walkers ALSO emitted — producing 49 duplicate manifest
  // entries that bailed the validate-before-write.
  out.push(
    ...(await buildPanelCommonsSidecarEntries(
      new Map<string, Set<string>>([
        ['moon-sites', new Set(MOON_SITE_QUERIES.map((q) => q.id))],
        ['mars-sites', new Set(MARS_SITE_QUERIES.map((q) => q.id))],
        ['earth-objects', new Set(EARTH_OBJECT_QUERIES.map((q) => q.id))],
        ['planets', new Set(PLANET_QUERIES.map((q) => q.id))],
        ['small-bodies', new Set(SMALL_BODY_QUERIES.map((q) => q.id))],
        ['sun', new Set(SUN_QUERIES.map((q) => q.id))],
        ['missions', new Set(MISSION_IMAGE_QUERIES.map((q) => q.id))],
      ]),
    )),
  );

  console.log('Planet galleries…');
  out.push(
    ...(await buildPanelEntries({
      queries: PLANET_QUERIES,
      rootDir: 'static/images/planets',
      defaultAgency: 'NASA',
      defaultLicense: 'PD-NASA',
      defaultLicenseRationale: getAllowlistEntry('PD-NASA')!.rationale,
    })),
  );

  console.log('Sun gallery…');
  // Sun is a singleton — files live directly under static/images/sun/.
  const sunDir = 'static/images/sun';
  const sunFiles = (await listFiles(sunDir)).filter((f) => /\.(jpe?g|png)$/i.test(f));
  for (const f of sunFiles) {
    out.push(
      buildNasaEntry({
        localPath: join(sunDir, f),
        query: SUN_QUERIES[0]?.query ?? 'sun corona',
        missionId: 'sun',
        agency: 'NASA',
        modifications: ['downloaded-via-nasa-images-api', 'reencoded-jpeg'],
      }),
    );
  }

  console.log('Small-body galleries…');
  out.push(
    ...(await buildPanelEntries({
      queries: SMALL_BODY_QUERIES,
      rootDir: 'static/images/small-bodies',
      defaultAgency: 'NASA',
      defaultLicense: 'PD-NASA',
      defaultLicenseRationale: getAllowlistEntry('PD-NASA')!.rationale,
    })),
  );

  console.log('Rocket reference imagery…');
  for (const r of ROCKET_IMAGES) {
    const localPath = `static/images/rockets/${r.id}.jpg`;
    if (!(await pathExists(localPath))) continue;
    const license = inferLicenseFromCuratedString(r.license);
    out.push(
      await buildCuratedEntry({
        localPath,
        filename: r.filename,
        agency: inferAgencyFromCuratedString(r.license, 'Wikimedia Commons contributors'),
        license,
        modifications: ['downloaded-via-special-filepath', 'reencoded-jpeg'],
      }),
    );
  }

  console.log('Agency logos…');
  for (const l of AGENCY_LOGOS) {
    const localPath = `static/logos/${l.id}.${l.ext}`;
    if (!(await pathExists(localPath))) continue;
    const license = inferLicenseFromCuratedString(l.license);
    out.push(
      await buildCuratedEntry({
        localPath,
        filename: l.filename,
        agency: agencyFromLogoId(l.id),
        license,
        modifications: ['downloaded-via-special-filepath'],
      }),
    );
  }

  console.log('Lunar / planetary disc photos…');
  for (const p of LUNAR_DISC_PHOTOS) {
    const localPath = `static/textures/${p.id}.jpg`;
    if (!(await pathExists(localPath))) continue;
    const license = inferLicenseFromCuratedString(p.license);
    out.push(
      await buildCuratedEntry({
        localPath,
        filename: p.filename,
        agency: inferAgencyFromCuratedString(p.license, 'Wikimedia Commons contributors'),
        license,
        modifications: ['downloaded-via-special-filepath', 'reencoded-jpeg'],
      }),
    );
  }

  console.log('Recommendation thumbnails (/science/reading-list + /science/watch-list)…');
  out.push(...(await buildRecommendationEntries()));

  console.log('Solar System Scope textures…');
  const textureDir = 'static/textures';
  const textureFiles = (await listFiles(textureDir)).filter((f) => /\.(jpe?g|png|webp)$/i.test(f));
  // Skip files we already covered as LUNAR_DISC_PHOTOS.
  const lunarPaths = new Set(LUNAR_DISC_PHOTOS.map((p) => `${p.id}.jpg`));
  for (const f of textureFiles) {
    if (lunarPaths.has(f)) continue;
    const localPath = join(textureDir, f);
    const lic = textureLicense(f);
    out.push(
      await buildCuratedEntry({
        localPath,
        agency: lic.agency,
        license: lic.license,
        source_url: lic.source_url,
        source_type: 'direct-other',
        author: 'Solar System Scope',
        fallbackTitle: f,
        modifications: lic.modifications,
      }),
    );
  }

  // Final safety net (#5 Phase 4b / Task C): emit `direct-other` entries
  // for any on-disk image file that the curated walkers above failed
  // to enumerate. These are files we know exist + ship + serve to
  // users, but for which the curated query maps lack an entry. Without
  // this fallback those files become provenance orphans — fine for the
  // build, embarrassing for the /credits page.
  //
  // Each emitted entry is tagged `curated-no-upstream-record` so it's
  // obvious in audits + the credits page that the attribution is
  // best-guess (default per-surface agency, default license fallback).
  // When a curated query lands later, the next build replaces the
  // direct-other row with the proper Wikimedia/NASA entry.
  console.log('Walker fallback (uncovered on-disk files)…');
  out.push(...(await buildWalkerFallbackEntries(out)));

  return out;
}

/**
 * Walk every image file under `static/images/<surface>/...` and emit
 * a `direct-other` entry for any path not already covered by an entry
 * in `out`. Variants (.16x9 / .4x3 / .1x1) and dash-naming legacy are
 * skipped — they're not provenance-worthy on their own (manifest tracks
 * bases only; Phase 6's prune-orphan-images keeps the tree variant-free
 * anyway).
 */
async function buildWalkerFallbackEntries(existing: ProvenanceEntry[]): Promise<ProvenanceEntry[]> {
  const out: ProvenanceEntry[] = [];
  const covered = new Set(existing.map((e) => e.path));
  const VARIANT_RE = /\.(16x9|4x3|1x1)\.|-(16x9|4x3|1x1)\./i;

  // Surface default is a last-resort. For each surface we first try
  // to look up the entity-specific agency from its catalog
  // (missions/index, fleet-image-sources, earth-objects, moon-sites,
  // mars-sites) so e.g. missions/luna16 gets "Roscosmos" not "NASA"
  // and earth-objects/change2 gets "CNSA" not "NASA".
  const SURFACE_AGENCY_DEFAULT: Record<string, string> = {
    missions: 'NASA',
    'fleet-galleries': 'NASA',
    hotspots: 'NASA',
    satellites: 'NASA',
    'moon-sites': 'NASA',
    'mars-sites': 'NASA',
    'earth-objects': 'NASA',
    'iss-modules': 'NASA',
    'tiangong-modules': 'CNSA',
    planets: 'NASA',
    'small-bodies': 'NASA',
    science: 'NASA',
    recommendations: 'Wikimedia Commons contributors',
    rockets: 'NASA',
    sun: 'NASA',
  };

  /** Map `surface/entity-id` → real agency name from the catalogs.
   *  Loaded once per build. Misses fall through to surface default. */
  const entityAgency: Map<string, string> = new Map();
  // Mission catalog
  try {
    const idx = JSON.parse(await readFile('static/data/missions/index.json', 'utf8')) as Array<{
      id: string;
      agency?: string;
    }>;
    for (const m of idx) if (m.id && m.agency) entityAgency.set(`missions/${m.id}`, m.agency);
  } catch {
    // missing catalog — fall back to surface default
  }
  // Fleet — fleet-image-sources gives per-slot agency; aggregate by id
  try {
    const fleet = JSON.parse(
      await readFile('static/data/fleet-image-sources.json', 'utf8'),
    ) as Record<string, { agency?: string; credit?: string }>;
    const HUMAN: Record<string, string> = {
      NASA: 'NASA',
      ROSCOSMOS: 'Roscosmos',
      ESA: 'ESA',
      JAXA: 'JAXA',
      CNSA: 'CNSA',
      CMSA: 'CMSA',
      ISRO: 'ISRO',
      SPACEX: 'SpaceX',
      BLUE_ORIGIN: 'Blue Origin',
      BOEING: 'Boeing',
      NORTHROP_GRUMMAN: 'Northrop Grumman',
      ULA: 'United Launch Alliance',
      ISPACE: 'ispace',
      INTUITIVE_MACHINES: 'Intuitive Machines',
      SPACEIL: 'SpaceIL',
      MULTI: 'Multi-agency',
    };
    for (const [relPath, src] of Object.entries(fleet)) {
      const id = relPath.split('/')[0];
      const key = `fleet-galleries/${id}`;
      if (entityAgency.has(key)) continue;
      const a = src.credit ?? (src.agency ? (HUMAN[src.agency] ?? src.agency) : null);
      if (a) entityAgency.set(key, a);
    }
  } catch {
    // missing catalog — fall back
  }
  // Earth objects (agencies is an array; take first)
  try {
    const eo = JSON.parse(await readFile('static/data/earth-objects.json', 'utf8')) as Array<{
      id: string;
      agencies?: string[];
    }>;
    for (const o of eo)
      if (o.id && o.agencies?.[0]) entityAgency.set(`earth-objects/${o.id}`, o.agencies[0]);
  } catch {
    // missing catalog
  }
  // Moon sites
  try {
    const ms = JSON.parse(await readFile('static/data/moon-sites.json', 'utf8')) as Array<{
      id: string;
      agency?: string;
    }>;
    const HUMAN: Record<string, string> = {
      NASA: 'NASA',
      ROSCOSMOS: 'Roscosmos',
      ESA: 'ESA',
      JAXA: 'JAXA',
      CNSA: 'CNSA',
      ISRO: 'ISRO',
      SPACEX: 'SpaceX',
      SPACEIL: 'SpaceIL',
      ISPACE: 'ispace',
    };
    for (const m of ms)
      if (m.id && m.agency) entityAgency.set(`moon-sites/${m.id}`, HUMAN[m.agency] ?? m.agency);
  } catch {
    // missing
  }
  // Mars sites
  try {
    const ms = JSON.parse(await readFile('static/data/mars-sites.json', 'utf8')) as Array<{
      id: string;
      agency?: string;
    }>;
    const HUMAN: Record<string, string> = {
      NASA: 'NASA',
      ROSCOSMOS: 'Roscosmos',
      ESA: 'ESA',
      JAXA: 'JAXA',
      CNSA: 'CNSA',
      ISRO: 'ISRO',
      'UAE Space Agency': 'MBRSC (UAE Space Agency)',
      MBRSC: 'MBRSC (UAE Space Agency)',
    };
    for (const m of ms)
      if (m.id && m.agency) entityAgency.set(`mars-sites/${m.id}`, HUMAN[m.agency] ?? m.agency);
  } catch {
    // missing
  }
  async function walk(dir: string): Promise<string[]> {
    const acc: string[] = [];
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return acc;
    }
    for (const e of entries) {
      const p = posix.join(dir, e.name);
      if (e.isDirectory()) acc.push(...(await walk(p)));
      else if (/\.(jpe?g|png|webp)$/i.test(e.name)) acc.push(p);
    }
    return acc;
  }
  const allFiles = await walk('static/images');
  for (const localPath of allFiles) {
    if (VARIANT_RE.test(localPath)) continue; // skip derivative variants
    const served = staticToServed(localPath);
    if (covered.has(served)) continue;
    const segments = served.split('/');
    const surface = segments[2] ?? 'unknown';
    const entityId = segments[3] ?? '';
    // Prefer the entity-specific agency (catalog lookup) over the
    // surface default — fixes attribution for non-NASA missions/fleet
    // entries that the walker would otherwise label "NASA" wholesale.
    const agency =
      entityAgency.get(`${surface}/${entityId}`) ?? SURFACE_AGENCY_DEFAULT[surface] ?? 'NASA';
    const license = defaultLicenseForAgency(agency);
    const rationale = defaultRationaleForAgency(agency);
    const idDescriptor = segments.slice(3, -1).join('/') || segments[segments.length - 1];
    out.push({
      id: entryId(served),
      path: served,
      source_type: 'direct-other',
      title: `Uncurated panel image — ${surface}/${idDescriptor}`,
      author: agency,
      agency,
      source_url: 'https://commons.wikimedia.org/',
      image_url: null,
      license_short: license,
      license_url: getAllowlistEntry(license)?.url ?? null,
      license_rationale: rationale,
      modifications: ['curated-no-upstream-record', 'walker-fallback'],
      revid: null,
      pageid: null,
      nasa_id: null,
      fetched_at: new Date().toISOString(),
    });
  }
  return out;
}

function inferLicenseFromCuratedString(raw: string): string {
  // Curated license strings in fetch-assets.ts are free-text; map to
  // the closest allowlist entry. Anything we can't map fails closed
  // through validate().
  const s = raw.toLowerCase();
  if (s.includes('cc by-sa 4')) return 'CC-BY-SA-4.0';
  if (s.includes('cc by-sa 3')) return 'CC-BY-SA-3.0';
  if (s.includes('cc by-sa 2.5')) return 'CC-BY-SA-2.5';
  if (s.includes('cc by-sa 2')) return 'CC-BY-SA-2.0';
  if (s.includes('cc by 4')) return 'CC-BY-4.0';
  if (s.includes('cc by 3')) return 'CC-BY-3.0';
  if (s.includes('cc by 2.5')) return 'CC-BY-2.5';
  if (s.includes('cc by 2')) return 'CC-BY-2.0';
  if (s.includes('cc-by-sa')) return 'CC-BY-SA-4.0';
  if (s.includes('cc-by') || s.includes('cc by')) return 'CC-BY-4.0';
  if (s.includes('cc0') || s.includes('public domain dedication')) return 'CC0';
  if (s.includes('pd-trivial') || s.includes('trivial')) return 'PD-trivial';
  if (s.includes('us government') || s.includes('u.s. government') || s.includes('nasa'))
    return 'PD-NASA';
  if (s.includes('government of india') || s.includes('government of the india')) return 'PD-self';
  if (s.includes('soviet') || s.includes('roscosmos') || s.includes('russian')) return 'PD-Russia';
  if (s.includes('public domain')) return 'PD-Old';
  if (s.includes('permissive')) return 'PD-self';
  return 'PD-Old';
}

function inferAgencyFromCuratedString(raw: string, fallback: string): string {
  const s = raw.toLowerCase();
  if (s.includes('nasa')) return 'NASA';
  if (s.includes('esa')) return 'ESA';
  if (s.includes('jaxa')) return 'JAXA';
  if (s.includes('isro')) return 'ISRO';
  if (s.includes('cnsa')) return 'CNSA';
  if (s.includes('roscosmos')) return 'Roscosmos';
  if (s.includes('uae') || s.includes('mbrsc')) return 'MBRSC (UAE Space Agency)';
  if (s.includes('spacex')) return 'SpaceX';
  if (s.includes('blue origin')) return 'Blue Origin';
  return fallback;
}

function agencyFromLogoId(id: string): string {
  switch (id) {
    case 'nasa':
      return 'NASA';
    case 'esa':
      return 'ESA';
    case 'roscosmos':
      return 'Roscosmos';
    case 'cnsa':
      return 'CNSA';
    case 'isro':
      return 'ISRO';
    case 'jaxa':
      return 'JAXA';
    case 'spacex':
      return 'SpaceX';
    case 'uaesa':
      return 'MBRSC (UAE Space Agency)';
    default:
      return 'Wikimedia Commons contributors';
  }
}

async function main() {
  console.log('Building image provenance manifest…');
  if (OFFLINE) {
    console.log('  --offline: Wikimedia imageinfo enrichment skipped; using fallbacks only.');
  }
  const entries = await buildAllEntries();
  console.log(`  → ${entries.length} entries`);
  const failures = await validate(entries);
  const manifest: ProvenanceManifest = {
    schema_version: SCHEMA_VERSION,
    generated_at: new Date().toISOString(),
    script_version: SCRIPT_VERSION,
    commit_sha: gitHeadSha(),
    entries: entries.sort((a, b) => a.path.localeCompare(b.path)),
  };
  const prev = await loadPreviousManifest();
  await writeDiffReport(prev, manifest, failures);
  if (failures.length > 0) {
    console.error(`\n${failures.length} validation failure(s) — manifest NOT written.`);
    for (const f of failures) console.error(`  ✗ ${f.path}: ${f.reason}`);
    console.error(`\nDiff report at ${DIFF_REPORT_OUT} (still written for triage).`);
    process.exit(1);
  }
  await mkdir(dirname(PROVENANCE_OUT), { recursive: true });
  await writeFile(PROVENANCE_OUT, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
  console.log(`  → wrote ${PROVENANCE_OUT}`);
  console.log(`  → wrote ${DIFF_REPORT_OUT}`);
}

const __thisFile = (() => {
  try {
    return new URL(import.meta.url).pathname;
  } catch {
    return '';
  }
})();
const __invokedAs = process.argv[1] ?? '';
if (__thisFile && __invokedAs && __thisFile === __invokedAs) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
