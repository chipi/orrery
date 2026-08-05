/**
 * Universe-domain data loaders (ADR-084 §universe module).
 *
 * Covers named stars, constellation lines, exoplanet systems, deep-sky
 * objects + gallery, Milky Way schematic, Local Group, black holes,
 * exoplanet i18n overlays, and culture doors. All caches + their loader
 * functions travel together — do not split them.
 */

import { get, type FetchLike } from './core';
import type { DeepSkyImage } from '$lib/deep-sky';

// ─── Named stars (PRD-030 / RFC-032 — /explore v2 Slice 1) ─────────────────
// The curated ~60 stars that get a marker + label + Panel in the stellar
// neighborhood. Base record from HYG; per-locale editorial overlay (description,
// facts, library) merged via getNamedStarI18n.
export interface NamedStar {
  id: string;
  hip: number | null;
  proper: string;
  con: string | null;
  spect: string | null;
  dist_pc: number;
  mag: number;
  absmag: number;
  bv: number | null;
  x: number;
  y: number;
  z: number;
}

export interface NamedStarOverlay {
  /** Localized proper name (falls back to the base `proper`). */
  name?: string;
  /** One-line overview. */
  fact?: string;
  /** Longer editorial paragraph. */
  bio?: string;
  /** Cultural / navigational significance across traditions. */
  cultural?: string;
  /** Curated learn-more links (same shape as planets): { l: label, u: url, t: tier }. */
  links?: Array<{ l: string; u: string; t: 'intro' | 'core' | 'deep' }>;
  /** Optional curated real image (served WebP under /images/stars/); provenance
   *  lives in image-provenance.json keyed on the path. `kind` labels it honestly. */
  photo?: { src: string; kind: 'real' | 'artist' };
}

export type LocalizedNamedStar = NamedStar & NamedStarOverlay;

interface NamedStarsManifest {
  schema_version: number;
  count: number;
  stars: NamedStar[];
}

export async function getNamedStars(fetchFn: FetchLike = fetch): Promise<NamedStar[]> {
  const doc = await get<NamedStarsManifest>('universe/named-stars.json', fetchFn).catch(() => null);
  return doc?.stars ?? [];
}

export interface ConstellationLineEntry {
  con: string;
  vertices: number[];
}
let constellationLinesCache: Promise<ConstellationLineEntry[]> | null = null;
/** Constellation line segments (baked 3D positions), cached. */
export async function getConstellationLines(
  fetchFn: FetchLike = fetch,
): Promise<ConstellationLineEntry[]> {
  if (!constellationLinesCache) {
    constellationLinesCache = get<{ constellations: ConstellationLineEntry[] }>(
      'universe/constellation-lines.json',
      fetchFn,
    )
      .then((doc) => doc.constellations ?? [])
      .catch(() => []);
  }
  return constellationLinesCache;
}

export async function getNamedStarI18n(
  locale: string,
  id: string,
  fetchFn: FetchLike = fetch,
): Promise<NamedStarOverlay | null> {
  const overlay = await get<NamedStarOverlay>(
    `i18n/${locale}/universe/named-stars/${id}.json`,
    fetchFn,
  ).catch(() => null);
  if (overlay) return overlay;
  if (locale === 'en-US') return null;
  return get<NamedStarOverlay>(`i18n/en-US/universe/named-stars/${id}.json`, fetchFn).catch(
    () => null,
  );
}

// ─── Exoplanet systems (PRD-030 / RFC-032 — /explore v2 Slice 2) ───────────
// Host stars with known planets, on real Keplerian elements (NASA Exoplanet
// Archive). Drives the BodyScene mini-orreries. Hosts already in the named-star
// catalog reuse their HYG xyz; iconic hosts are placed from ra/dec/distance.
export interface ExoplanetPlanet {
  id: string;
  letter: string;
  name: string;
  period_days: number;
  a_au: number;
  e: number;
  radius_earth: number | null;
  mass_earth: number | null;
  disc_year: number | null;
  disc_method: string | null;
}
export interface ExoplanetSystem {
  hostId: string;
  hip: number | null;
  star: {
    name: string;
    spect: string;
    dist_pc: number;
    bv: number | null;
    con: string | null;
    x: number;
    y: number;
    z: number;
    iconic: boolean;
  };
  planets: ExoplanetPlanet[];
}
interface ExoplanetSystemsManifest {
  schema_version: number;
  count: number;
  planet_count: number;
  systems: ExoplanetSystem[];
}

let exoplanetSystemsCache: Promise<ExoplanetSystem[]> | null = null;
/** All exoplanet host systems (cached). */
export async function getExoplanetSystems(fetchFn: FetchLike = fetch): Promise<ExoplanetSystem[]> {
  if (!exoplanetSystemsCache) {
    exoplanetSystemsCache = get<ExoplanetSystemsManifest>(
      'universe/exoplanet-systems.json',
      fetchFn,
    )
      .then((doc) => doc.systems ?? [])
      .catch(() => []);
  }
  return exoplanetSystemsCache;
}
/** The exoplanet system for a given host id, or null. */
export async function getExoplanetSystem(
  hostId: string,
  fetchFn: FetchLike = fetch,
): Promise<ExoplanetSystem | null> {
  const systems = await getExoplanetSystems(fetchFn);
  return systems.find((s) => s.hostId === hostId) ?? null;
}

// Deep-sky catalogue (Slice 4) — Messier set + curated-gallery NGC/IC objects,
// placed by unit sky-sphere direction. photoKey resolves to a static/data/
// deep-sky.json gallery entry when a curated photo backs the object.
export type DeepSkyCategory =
  | 'galaxy'
  | 'galaxy-cluster'
  | 'nebula'
  | 'planetary-nebula'
  | 'supernova-remnant'
  | 'star-forming-region'
  | 'dark-nebula'
  | 'star-cluster'
  | 'globular-cluster'
  | 'star'
  | 'other';
export interface DeepSkyObject {
  id: string;
  designation: string;
  name: string;
  category: DeepSkyCategory;
  ra: number;
  dec: number;
  x: number;
  y: number;
  z: number;
  mag: number | null;
  /** Major-axis angular size in arcmin (for glint sizing); null if unknown. */
  size_arcmin: number | null;
  con: string;
  dist_ly: number | null;
  dist_label: string | null;
  photoKey: string | null;
  photoTitle: string | null;
  /** Curated exoplanet host id this star-forming region gateways to, or null. */
  gatewaySystem: string | null;
}
interface DeepSkyObjectsManifest {
  _count: number;
  objects: DeepSkyObject[];
}
let deepSkyObjectsCache: Promise<DeepSkyObject[]> | null = null;
/** All deep-sky objects (cached). */
export async function getDeepSkyObjects(fetchFn: FetchLike = fetch): Promise<DeepSkyObject[]> {
  if (!deepSkyObjectsCache) {
    deepSkyObjectsCache = get<DeepSkyObjectsManifest>('universe/deep-sky-objects.json', fetchFn)
      .then((doc) => doc.objects ?? [])
      .catch(() => []);
  }
  return deepSkyObjectsCache;
}
/** A deep-sky object by id or exact designation, or null. */
export async function getDeepSkyObject(
  idOrDesignation: string,
  fetchFn: FetchLike = fetch,
): Promise<DeepSkyObject | null> {
  const objs = await getDeepSkyObjects(fetchFn);
  return objs.find((o) => o.id === idOrDesignation || o.designation === idOrDesignation) ?? null;
}
let deepSkyGalleryCache: Promise<DeepSkyImage[]> | null = null;
/** The curated deep-sky gallery images (cached) — the caption/credit/telescope
 *  source joined to deep-sky objects via photoKey. */
export async function getDeepSkyGallery(fetchFn: FetchLike = fetch): Promise<DeepSkyImage[]> {
  if (!deepSkyGalleryCache) {
    deepSkyGalleryCache = get<DeepSkyImage[]>('deep-sky.json', fetchFn).catch(() => []);
  }
  return deepSkyGalleryCache;
}

// Milky Way schematic (Slice 5) — a face-on galactocentric MODEL (not to scale).
// Positions are schematic; sun_galactocentric_* and Sag A*'s mass are real,
// cited astrometry. Drives the /explore v2 Milky Way context.
export interface MilkyWayObject {
  id: string;
  name: string;
  kind: 'supermassive-black-hole' | 'star';
  x: number;
  z: number;
  mass_solar?: number;
  dist_from_sun_ly?: number;
  arm?: string;
  science_section: string;
}
export interface MilkyWayArm {
  id: string;
  name: string;
  label_x: number;
  label_z: number;
  minor: boolean;
}
export interface MilkyWaySchematic {
  disk_radius_kpc: number;
  sun_galactocentric_kpc: number;
  sun_galactocentric_ly: number;
  objects: MilkyWayObject[];
  arms: MilkyWayArm[];
}
let milkyWayCache: Promise<MilkyWaySchematic | null> | null = null;
/** The Milky Way schematic (cached), or null if unavailable. */
export async function getMilkyWaySchematic(
  fetchFn: FetchLike = fetch,
): Promise<MilkyWaySchematic | null> {
  if (!milkyWayCache) {
    milkyWayCache = get<MilkyWaySchematic>('universe/milky-way-schematic.json', fetchFn).catch(
      () => null,
    );
  }
  return milkyWayCache;
}

// Local Group (Slice 8) — the real catalogued member galaxies of our galaxy group,
// laid out as a schematic (NOT to scale). Distances + classifications are real; the
// xyz layout is illustrative (satellites compressed toward their parent).
export type LocalGroupKind =
  'spiral' | 'irregular' | 'dwarf-elliptical' | 'dwarf-spheroidal' | 'dwarf-irregular';
export interface LocalGroupMember {
  id: string;
  name: string;
  kind: LocalGroupKind;
  parent: string;
  headliner: boolean;
  dist_mly: number;
  diam_kly: number;
  x: number;
  y: number;
  z: number;
}
export interface LocalGroupData {
  extent_mly: number;
  members: LocalGroupMember[];
}
let localGroupCache: Promise<LocalGroupData | null> | null = null;
/** The Local Group schematic census (cached), or null if unavailable. */
export async function getLocalGroup(fetchFn: FetchLike = fetch): Promise<LocalGroupData | null> {
  if (!localGroupCache) {
    localGroupCache = get<LocalGroupData>('universe/local-group.json', fetchFn).catch(() => null);
  }
  return localGroupCache;
}

// Black holes (Slice 6) — three real + one fictional (Gargantua), rendered with
// the geodesic gravitational-lensing shader. Real cited GR parameters; Gargantua
// is badged fiction.
export type BlackHoleKind = 'supermassive' | 'stellar' | 'fictional';
export interface BlackHole {
  id: string;
  name: string;
  kind: BlackHoleKind;
  mass_solar: number;
  dist_ly: number;
  spin: number;
  rs_km: number;
  inclination_deg: number;
  ra: number | null;
  dec: number | null;
  science_section: string;
  culture_door: string | null;
  discovery: string;
}
interface BlackHolesManifest {
  objects: BlackHole[];
}
let blackHolesCache: Promise<BlackHole[]> | null = null;
/** All black holes (cached). */
export async function getBlackHoles(fetchFn: FetchLike = fetch): Promise<BlackHole[]> {
  if (!blackHolesCache) {
    blackHolesCache = get<BlackHolesManifest>('universe/black-holes.json', fetchFn)
      .then((doc) => doc.objects ?? [])
      .catch(() => []);
  }
  return blackHolesCache;
}
/** A black hole by id, or null. */
export async function getBlackHole(
  id: string,
  fetchFn: FetchLike = fetch,
): Promise<BlackHole | null> {
  const holes = await getBlackHoles(fetchFn);
  return holes.find((h) => h.id === id) ?? null;
}

// Per-planet editorial overlay (Slice 2) — a "why this world matters" note that
// leans into the planet's science + its sci-fi / news / cultural fame. Keyed by
// planet id under i18n-src/<locale>/universe/exoplanets/<id>.json.
export interface ExoplanetOverlay {
  /** One-line hook. */
  fact?: string;
  /** Longer editorial paragraph (science + cultural/sci-fi/news significance). */
  bio?: string;
  /** Curated learn-more links: { l: label, u: url, t: tier }. */
  links?: Array<{ l: string; u: string; t: 'intro' | 'core' | 'deep' }>;
}

export async function getExoplanetI18n(
  locale: string,
  id: string,
  fetchFn: FetchLike = fetch,
): Promise<ExoplanetOverlay | null> {
  const overlay = await get<ExoplanetOverlay>(
    `i18n/${locale}/universe/exoplanets/${id}.json`,
    fetchFn,
  ).catch(() => null);
  if (overlay) return overlay;
  if (locale === 'en-US') return null;
  return get<ExoplanetOverlay>(`i18n/en-US/universe/exoplanets/${id}.json`, fetchFn).catch(
    () => null,
  );
}

// ─── Culture doors (PRD-030 / RFC-032 — /explore v2 Slice 3) ───────────────
// Optional "culture layer": badged fiction / message / visitor story cards
// attached to real objects (Vega→Contact, Kepler-16b→Tatooine, the Voyager
// Golden Record). The catalog holds non-translatable metadata; the localized
// blurb lives in i18n-src/<locale>/culture-doors/<id>.json. Fiction is always
// badged over fact (UXS-014).
export interface CultureDoor {
  id: string;
  objectId: string;
  objectType: 'star' | 'exoplanet' | 'message';
  type: 'fiction' | 'message' | 'visitor';
  work: string;
  year: number;
  author: string;
  media: string;
  links: Array<{ l: string; u: string }>;
}
export type LocalizedCultureDoor = CultureDoor & { blurb: string };
interface CultureDoorsManifest {
  schema_version: number;
  doors: CultureDoor[];
}

let cultureDoorsCache: Promise<CultureDoor[]> | null = null;
async function getCultureDoorCatalog(fetchFn: FetchLike = fetch): Promise<CultureDoor[]> {
  if (!cultureDoorsCache) {
    cultureDoorsCache = get<CultureDoorsManifest>('culture-doors.json', fetchFn)
      .then((d) => d.doors ?? [])
      .catch(() => []);
  }
  return cultureDoorsCache;
}

/** The set of object ids that have at least one culture door — drives the
 *  "has culture" marker + filter in the star index (sparse: a handful of ids). */
export async function getCultureObjectIds(fetchFn: FetchLike = fetch): Promise<Set<string>> {
  return new Set((await getCultureDoorCatalog(fetchFn)).map((d) => d.objectId));
}

/** The culture doors attached to a given object id, localized. Empty if none. */
export async function getCultureDoors(
  objectId: string,
  locale = 'en-US',
  fetchFn: FetchLike = fetch,
): Promise<LocalizedCultureDoor[]> {
  const doors = (await getCultureDoorCatalog(fetchFn)).filter((d) => d.objectId === objectId);
  return Promise.all(
    doors.map(async (d) => {
      let ov = await get<{ blurb?: string }>(
        `i18n/${locale}/culture-doors/${d.id}.json`,
        fetchFn,
      ).catch(() => null);
      if (!ov && locale !== 'en-US') {
        ov = await get<{ blurb?: string }>(`i18n/en-US/culture-doors/${d.id}.json`, fetchFn).catch(
          () => null,
        );
      }
      return { ...d, blurb: ov?.blurb ?? '' };
    }),
  );
}
