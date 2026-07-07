import { promises as fs } from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

/**
 * Append Surface Hotspots Tier 2 patches to image-provenance.json
 * (PRD-014 / RFC-017 §S2 + ADR-046 / ADR-047).
 *
 * The Tier B fetch pipeline produces JPEGs at deterministic paths
 * (e.g. /images/hotspots/mars/curiosity/tier2-hirise.jpg). Each one
 * needs an entry in image-provenance.json so the fail-closed
 * validate-data gate accepts it.
 *
 * For HiRISE (Mars): NASA / JPL-Caltech / UAHiRISE attribution,
 * PD-NASA license, source URL = the published UAHiRISE PDS JP2 the
 * patch was cropped from.
 *
 * For LROC NAC (Moon, future): NASA / GSFC / ASU LROC team
 * attribution, PD-NASA license, source URL = LROC PDS path.
 *
 * Idempotent: re-running with the same input updates the existing
 * entry (matched by path); doesn't duplicate.
 */

export interface ProvenanceEntry {
  id: string;
  path: string;
  source_type: string;
  title: string;
  author: string;
  agency: string;
  source_url: string;
  image_url: string | null;
  license_short: string;
  license_url: string;
  license_rationale: string;
  modifications: string[];
  revid: number | null;
  pageid: number | null;
  nasa_id: string | null;
  fetched_at: string;
  // Capturing spacecraft + instrument (#360 / credits) — links the image to
  // the actual satellite on /credits. HiRISE + CTX → Mars Reconnaissance
  // Orbiter; LROC → Lunar Reconnaissance Orbiter; etc.
  spacecraft_id?: string;
  spacecraft_name?: string;
  instrument?: string;
}

interface ProvenanceFile {
  entries: Record<string, ProvenanceEntry> | ProvenanceEntry[];
}

const PROVENANCE_PATH = path.join('static', 'data', 'image-provenance.json');

/**
 * Build an image-provenance entry for a HiRISE-derived Mars hotspot
 * patch. Caller passes the local file path (e.g.
 * static/images/hotspots/mars/curiosity/tier2-hirise.jpg), the
 * HiRISE source URL, the product ID, and the published lat/lon.
 */
export function buildHiriseProvenanceEntry(input: {
  outputPath: string;
  sourceUrl: string;
  productId: string;
  siteId: string;
  centerLat: number;
  centerLon: number;
}): ProvenanceEntry {
  // image-provenance.json paths use /images/... (with leading slash);
  // convert from static/images/... → /images/...
  const provenancePath = input.outputPath.replace(/^static/, '');
  // Use first 16 chars of sha256(path) as the id — matches existing
  // pattern in image-provenance.json.
  const id = createHash('sha256').update(provenancePath).digest('hex').slice(0, 16);
  return {
    id,
    path: provenancePath,
    source_type: 'direct-agency',
    title: `HiRISE ${input.productId} — patch centred at ${input.centerLat.toFixed(3)}°N ${input.centerLon.toFixed(3)}°E`,
    author: 'NASA / JPL-Caltech / University of Arizona',
    agency: 'NASA',
    source_url: input.sourceUrl,
    image_url: input.sourceUrl,
    license_short: 'PD-NASA',
    license_url: 'https://www.nasa.gov/nasa-brand-center/images-and-media/',
    license_rationale:
      'HiRISE imagery is produced by NASA/JPL/University of Arizona; not subject to U.S. copyright per 17 U.S.C. §105. Use is permitted; provide source attribution.',
    modifications: ['cropped-2048x2048-around-site-coords', 'reencoded-jpeg-q88'],
    revid: null,
    pageid: null,
    nasa_id: input.productId,
    fetched_at: new Date().toISOString(),
    spacecraft_id: 'mro',
    spacecraft_name: 'Mars Reconnaissance Orbiter',
    instrument: 'HiRISE',
  };
}

/**
 * Build an image-provenance entry for a Murray Lab Global CTX
 * Mosaic-derived Mars hotspot regional patch (the Tier 2a layer
 * showing the lander's geological context, ~10 km × 10 km). The
 * source mosaic blends thousands of CTX images so the attribution
 * chain is layered: NASA / JPL / MSSS for the original CTX
 * acquisition, Caltech Murray Lab for the blended mosaic, with
 * the Dickson et al. 2024 paper cited per the Murray Lab
 * publication requirement.
 */
export function buildCtxMosaicProvenanceEntry(input: {
  outputPath: string;
  sourceUrl: string;
  tileName: string;
  siteId: string;
  centerLat: number;
  centerLon: number;
}): ProvenanceEntry {
  const provenancePath = input.outputPath.replace(/^static/, '');
  const id = createHash('sha256').update(provenancePath).digest('hex').slice(0, 16);
  return {
    id,
    path: provenancePath,
    source_type: 'derived-mosaic',
    title: `Murray Lab Global CTX Mosaic V01 tile ${input.tileName} — regional patch centred at ${input.centerLat.toFixed(3)}°N ${input.centerLon.toFixed(3)}°E`,
    author:
      'Caltech Murray Lab (J. Dickson et al. 2024) · derived from NASA / JPL-Caltech / MSSS CTX',
    agency: 'NASA',
    source_url: input.sourceUrl,
    image_url: input.sourceUrl,
    license_short: 'CC-BY-Murray-Lab',
    license_url: 'https://agupubs.onlinelibrary.wiley.com/doi/10.1029/2024EA003555',
    license_rationale:
      'Murray Lab CTX Mosaic V01 (Dickson et al. 2024, doi:10.1029/2024EA003555). Underlying CTX imagery from NASA/JPL-Caltech/MSSS is U.S. Government work (17 U.S.C. §105). Use of the mosaic requires citation of the Dickson 2024 paper.',
    modifications: [
      'cropped-2048x2048-around-site-coords',
      'extracted-from-murray-lab-tile-zip',
      'reencoded-jpeg-q88',
    ],
    revid: null,
    pageid: null,
    nasa_id: input.tileName,
    fetched_at: new Date().toISOString(),
    spacecraft_id: 'mro',
    spacecraft_name: 'Mars Reconnaissance Orbiter',
    instrument: 'CTX',
  };
}

/**
 * Build an image-provenance entry for a Kaguya (SELENE) Terrain Camera
 * regional patch (#361) — the Moon's CTX-equivalent Tier 2a context
 * layer. Source is the USGS Astrogeology ARD cloud-optimized GeoTIFF
 * of an individual JAXA/SELENE TC monoscopic observation (~6 m/px),
 * window-cropped to a ~16 km regional patch. JAXA imagery surfaced via
 * the JAXA-OPEN license precedent; the credits page groups these into a
 * dedicated "JAXA · Kaguya TC" section via the `instrument` field.
 *
 * No spacecraft_id is set: there is no kaguya/selene orbiter site to
 * deep-link the 📡 credit chip to yet, so the section groups by
 * instrument but the per-row satellite chip stays off (avoids a dead
 * link). Add a Kaguya orbiter site later to light the chip up.
 */
export function buildKaguyaTcProvenanceEntry(input: {
  outputPath: string;
  sourceUrl: string;
  productId: string;
  siteId: string;
  centerLat: number;
  centerLon: number;
  cropSize: number;
}): ProvenanceEntry {
  const provenancePath = input.outputPath.replace(/^static/, '');
  const id = createHash('sha256').update(provenancePath).digest('hex').slice(0, 16);
  return {
    id,
    path: provenancePath,
    source_type: 'direct-agency',
    title: `Kaguya (SELENE) Terrain Camera ${input.productId} — regional patch centred at ${input.centerLat.toFixed(3)}°N ${input.centerLon.toFixed(3)}°E`,
    author: 'JAXA / SELENE (Kaguya) Terrain Camera · USGS Astrogeology ARD',
    agency: 'JAXA',
    source_url: input.sourceUrl,
    image_url: input.sourceUrl,
    license_short: 'JAXA-OPEN',
    license_url: 'https://www.jaxa.jp/about/copyright_e.html',
    license_rationale:
      'Kaguya (SELENE) Terrain Camera imagery is produced by JAXA and published for non-commercial reuse with attribution under JAXA’s open-data policy; redistributed here as USGS Astrogeology Analysis Ready Data (cloud-optimized GeoTIFF). Attribution: JAXA / SELENE (Kaguya) Terrain Camera. Mirrors the JAXA-OPEN allowlist precedent.',
    modifications: [
      `cropped-${input.cropSize}x${input.cropSize}-around-site-coords`,
      'p2-p98-linear-stretch-to-8bit',
      'reencoded-jpeg-q88',
    ],
    revid: null,
    pageid: null,
    nasa_id: input.productId,
    fetched_at: new Date().toISOString(),
    spacecraft_name: 'Kaguya (SELENE)',
    instrument: 'Kaguya TC',
  };
}

/**
 * Build an image-provenance entry for an LROC-derived Moon hotspot
 * patch. Same shape as HiRISE; different attribution + URLs.
 */
export function buildLrocProvenanceEntry(input: {
  outputPath: string;
  sourceUrl: string;
  productId: string;
  siteId: string;
  centerLat: number;
  centerLon: number;
}): ProvenanceEntry {
  const provenancePath = input.outputPath.replace(/^static/, '');
  const id = createHash('sha256').update(provenancePath).digest('hex').slice(0, 16);
  return {
    id,
    path: provenancePath,
    source_type: 'direct-agency',
    title: `LROC NAC ${input.productId} — patch centred at ${input.centerLat.toFixed(3)}°N ${input.centerLon.toFixed(3)}°E`,
    author: 'NASA / GSFC / Arizona State University',
    agency: 'NASA',
    source_url: input.sourceUrl,
    image_url: input.sourceUrl,
    license_short: 'PD-NASA',
    license_url: 'https://www.nasa.gov/nasa-brand-center/images-and-media/',
    license_rationale:
      'LROC NAC imagery is produced by NASA/GSFC/Arizona State University; not subject to U.S. copyright per 17 U.S.C. §105. Use is permitted; provide source attribution.',
    modifications: [
      'cropped-around-site-coords',
      'band1-reflectance-contrast-stretch-to-8bit',
      'downsampled-768x768',
      'reencoded-jpeg-q85',
    ],
    revid: null,
    pageid: null,
    nasa_id: input.productId,
    fetched_at: new Date().toISOString(),
    // No spacecraft_id (mirrors the Kaguya TC entry): there is no LRO orbiter
    // site to deep-link the 📡 chip to, so the credits page groups by
    // instrument via the field below but the per-row satellite chip stays off.
    spacecraft_name: 'Lunar Reconnaissance Orbiter',
    instrument: 'LROC NAC',
  };
}

/**
 * Build an image-provenance entry for a Mars Tier 3 ground-view
 * panorama. Per-mission credit chain — for NASA missions the
 * attribution string already encodes the full chain ("NASA /
 * JPL-Caltech / MSSS" for Curiosity, "NASA / JPL-Caltech / Cornell"
 * for MER, etc.); for CNSA (Zhurong) the attribution is "CNSA / PEC"
 * with the CNSA-EDU license-allowlist tag covering the fair-use
 * rationale.
 *
 * Source media is the agency-published panorama (cylindrical or
 * partial-360); we pad it to equirectangular 4096×2048 for the
 * skybox renderer — recorded in `modifications`.
 */
export function buildPanoramaProvenanceEntry(input: {
  siteId: string;
  publicPath: string;
  sourceLabel: string;
  sourceUrl: string;
  attribution: string;
  license:
    'PD-NASA' | 'CNSA-EDU' | 'CC-BY-4.0' | 'ISRO-EDU' | 'JAXA-OPEN' | 'PD-Russia' | 'SpaceIL-EDU';
  caption: string;
  /** Output equirectangular dimensions (PRD-022 / ADR-074, #286 Phase
   *  1A). Defaults to 4096×2048 — marquee showcase sites pass 8192×4096
   *  for the higher-resolution master. Recorded in `modifications` so
   *  the provenance manifest stays accurate. */
  outWidth?: number;
  outHeight?: number;
}): ProvenanceEntry {
  const id = createHash('sha256').update(input.publicPath).digest('hex').slice(0, 16);
  const licenseUrl =
    input.license === 'PD-NASA'
      ? 'https://www.nasa.gov/nasa-brand-center/images-and-media/'
      : input.license === 'CC-BY-4.0'
        ? 'https://creativecommons.org/licenses/by/4.0/'
        : 'https://www.cnsa.gov.cn/english/';
  const licenseRationale =
    input.license === 'PD-NASA'
      ? 'Surface panorama produced by NASA / JPL or partner institution; not subject to U.S. copyright per 17 U.S.C. §105. Use is permitted with source attribution.'
      : input.license === 'CC-BY-4.0'
        ? 'Creative Commons Attribution 4.0 International. Source: academic publication / Wikimedia Commons. Permitted with attribution to the original authors.'
        : 'China National Space Administration publishes Tianwen-1 / Zhurong imagery without a formal Creative Commons license; embedded here under educational fair-use with full attribution per CNSA release page (cnsa.gov.cn). See license-allowlist.ts CNSA-EDU entry for the full rationale.';
  // Map source URL → schema-valid source_type.
  // Wikimedia URLs → wikimedia-commons; PD-NASA → direct-agency;
  // anything else (e.g. CNSA direct from cnsa.gov.cn) → direct-other.
  const sourceType = /wikimedia\.org|wikipedia\.org/.test(input.sourceUrl)
    ? 'wikimedia-commons'
    : input.license === 'PD-NASA'
      ? 'direct-agency'
      : 'direct-other';
  return {
    id,
    path: input.publicPath,
    source_type: sourceType,
    title: input.caption,
    author: input.attribution,
    agency: input.license === 'PD-NASA' ? 'NASA' : 'CNSA',
    // For CC-BY-4.0 entries (e.g. Zhurong via Wikimedia Commons),
    // agency stays "CNSA" since that's who operated the rover; the
    // license tag carries the redistribution path. Identical to how
    // Murray Lab's CTX tag inherits NASA imagery via Caltech.
    source_url: input.sourceUrl,
    image_url: input.sourceUrl,
    license_short: input.license,
    license_url: licenseUrl,
    license_rationale: licenseRationale,
    modifications: [
      `padded-to-${input.outWidth ?? 4096}x${input.outHeight ?? 2048}-equirectangular`,
      'reencoded-jpeg-q88',
    ],
    revid: null,
    pageid: null,
    nasa_id: input.license === 'PD-NASA' ? input.sourceLabel : null,
    fetched_at: new Date().toISOString(),
  };
}

/**
 * Read image-provenance.json, upsert the given entries (matched by
 * `path`), write back. Preserves entry order — new entries appended
 * to the end of an array OR added as keys for object-style manifests.
 */
export async function upsertProvenanceEntries(entries: ProvenanceEntry[]): Promise<void> {
  if (entries.length === 0) return;
  const raw = await fs.readFile(PROVENANCE_PATH, 'utf-8');
  const data = JSON.parse(raw) as ProvenanceFile;
  if (Array.isArray(data.entries)) {
    const byPath = new Map(data.entries.map((e, i) => [e.path, i]));
    for (const entry of entries) {
      const existingIdx = byPath.get(entry.path);
      if (existingIdx !== undefined) {
        data.entries[existingIdx] = entry;
      } else {
        data.entries.push(entry);
      }
    }
  } else {
    for (const entry of entries) {
      data.entries[entry.path] = entry;
    }
  }
  await fs.writeFile(PROVENANCE_PATH, JSON.stringify(data, null, 2) + '\n', 'utf-8');
}

/**
 * Remove provenance entries whose `path` starts with `prefix` and is NOT in
 * `keep`. Prunes deduped-away / no-longer-produced crops so the manifest never
 * points at a deleted file (ADR-046 orphan guard) after a re-fetch drops or
 * reduces a site's patch set.
 */
export async function pruneProvenanceUnder(prefix: string, keep: string[]): Promise<void> {
  const raw = await fs.readFile(PROVENANCE_PATH, 'utf-8');
  const data = JSON.parse(raw) as ProvenanceFile;
  const keepSet = new Set(keep);
  let changed = false;
  if (Array.isArray(data.entries)) {
    const before = data.entries.length;
    data.entries = data.entries.filter((e) => !e.path.startsWith(prefix) || keepSet.has(e.path));
    changed = data.entries.length !== before;
  } else {
    for (const p of Object.keys(data.entries)) {
      if (p.startsWith(prefix) && !keepSet.has(p)) {
        delete data.entries[p];
        changed = true;
      }
    }
  }
  if (changed) await fs.writeFile(PROVENANCE_PATH, JSON.stringify(data, null, 2) + '\n', 'utf-8');
}
