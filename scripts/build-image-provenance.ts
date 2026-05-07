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
  EARTH_OBJECT_QUERIES,
  MOON_SITE_QUERIES,
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
} from './fetch-assets.js';
import {
  getAllowlistEntry,
  isAllowedLicense,
  normaliseLicenseShortName,
} from './license-allowlist.js';

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
}): ProvenanceEntry {
  const allow = getAllowlistEntry('PD-NASA')!;
  const titleBase = opts.missionId ?? basename(opts.localPath, extname(opts.localPath));
  return {
    id: entryId(staticToServed(opts.localPath)),
    path: staticToServed(opts.localPath),
    source_type: 'nasa-images-api',
    title: `NASA Images search result — ${titleBase} / "${opts.query}"`,
    author: opts.agency,
    agency: opts.agency,
    source_url: nasaSearchUrl(opts.query, opts.missionId),
    image_url: null,
    license_short: 'PD-NASA',
    license_url: allow.url,
    license_rationale: allow.rationale,
    modifications: opts.modifications,
    revid: null,
    pageid: null,
    nasa_id: null,
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
  if (missionId === 'mars2' || missionId === 'mars6') return 'ROSCOSMOS';
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
  if (a.includes('cnsa')) return 'CC-BY-SA-4.0';
  if (a.includes('mbrsc') || a.includes('uae')) return 'CC-BY-4.0';
  if (a.includes('spacex')) return 'CC-BY-2.0';
  return 'PD-Old';
}

function defaultRationaleForAgency(agency: string): string {
  return getAllowlistEntry(defaultLicenseForAgency(agency))?.rationale ?? 'See source page.';
}

function agencyForNasaTopup(missionId: string, primary: string): string {
  const extras = MISSION_NASA_CREDIT_EXTRAS[missionId];
  if (!extras) return 'NASA';
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
  return {
    license: 'CC-BY-4.0',
    agency: 'Solar System Scope',
    source_url: SOLAR_SYSTEM_SCOPE_URL,
    modifications: ['downloaded-from-publisher'],
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

async function buildAllEntries(): Promise<ProvenanceEntry[]> {
  const out: ProvenanceEntry[] = [];

  console.log('Mission galleries…');
  out.push(...(await buildMissionGalleryEntries()));

  console.log('ISS module galleries…');
  out.push(...(await buildIssEntries()));

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
