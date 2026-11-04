/**
 * Context layer fetcher (surface-context.ts) — one true-scale crop of a global
 * mosaic around each landing site, the layer between the 4K globe texture and
 * the regional patch.
 *
 *   Moon: LRO WAC global morphology mosaic (USGS ARD COG, 44.7 m native)
 *   Mars: THEMIS day-IR controlled mosaics (USGS ARD COGs, 100 m, one per
 *         MC quadrangle; neighbouring quads are joined in a VRT so a site near
 *         a quad edge still gets a centred box)
 *
 * The box is ±(km/2) of true ground around the site, so it is wider in
 * longitude than in latitude by 1/cos(lat). It is read straight from the COG
 * by HTTP range requests (no full download) and averaged down to OUT_W px wide.
 *
 * Colour (detail transfer): the mosaics are grey; the globe texture is colour
 * (Mars) and has the brightness the cap must meet at its edge. Each output
 * pixel is the globe's colour at that spot times the mosaic's local contrast
 * (mosaic / mosaic blurred to the globe's resolution), so the low frequencies
 * are the globe's own and only the sharp detail comes from the mosaic.
 *
 * Writes masters/hotspots/<body>/<site>/context.jpg (the ladder makes the
 * served WebP rungs: build-display-ladder.mjs --only hotspots/<body>/<site>),
 * hotspot_context_source + hotspot_context_bounds in surface-hotspots.json and
 * an image-provenance row.
 *
 * Usage:
 *   node --import tsx scripts/hotspots/fetch-context-layer.ts --body moon --only apollo17
 *   node --import tsx scripts/hotspots/fetch-context-layer.ts --body mars [--km 400] [--force]
 */
import gdal from 'gdal-async';
import sharp from 'sharp';
import path from 'node:path';
import { existsSync, promises as fs } from 'node:fs';
import { createHash } from 'node:crypto';
import { upsertProvenanceEntries, type ProvenanceEntry } from './provenance.ts';
import { contextBounds, type ContextBounds } from '../../src/lib/surface-scene/context-bounds.ts';

const OUT_W = 4096;
const WAC_COG =
  'https://astrogeo-ard.s3.us-west-2.amazonaws.com/moon/basemaps/lroc_wac_mosaic/lroc_wac_mosaic_global_303ppd_v3/lroc_wac_mosaic_global_303ppd_v3.tif';
const THEMIS_STAC =
  'https://stac.astrogeology.usgs.gov/api/collections/mo_themis_controlled_mosaics/items?limit=100';
const THEMIS_CACHE = '.image-cache/context/themis-items.json';
/** Mars sphere radius used by the THEMIS controlled-mosaic projection (metres). */
const THEMIS_R = 3396190;
const RADIUS_KM = { moon: 1737.4, mars: 3389.5, earth: 6371 } as const;
const GLOBE_TEXTURE = {
  moon: 'static/textures/4k_moon.jpg',
  mars: 'static/textures/4k_mars.jpg',
  earth: 'static/textures/4k_earth_daymap.jpg',
} as const;
/** Earth: the EOX Sentinel-2 cloudless mosaic (10 m, CC BY-NC-SA 4.0; Orrery is
 *  non-commercial), one WMS GetMap per box — already colour, already cloud-free. */
const EOX_WMS = 'https://tiles.maps.eox.at/wms';
const EOX_YEAR = 2025;
/** Earth pads cluster (nine at Cape Canaveral): a pad whose centre lies this far
 *  inside an earlier pad's box reuses that crop instead of a near-copy. */
const SHARE_MARGIN_KM = 150;
/** THEMIS quads above this latitude are polar stereographic; not joined here. */
const THEMIS_MAX_LAT = 65;

type Body = 'moon' | 'mars' | 'earth';
type Bounds = ContextBounds;

function flag(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}
const BODY = flag('body') as Body;
if (BODY !== 'moon' && BODY !== 'mars' && BODY !== 'earth')
  throw new Error('--body moon|mars|earth');
const KM = Number(flag('km') ?? 400);
const ONLY = flag('only')?.split(',');
const FORCE = process.argv.includes('--force');

gdal.config.set('GDAL_DISABLE_READDIR_ON_OPEN', 'EMPTY_DIR');
gdal.config.set('CPL_VSIL_CURL_ALLOWED_EXTENSIONS', '.tif,.TIF,.vrt');
gdal.config.set('GDAL_HTTP_MAX_RETRY', '4');
gdal.config.set('GDAL_HTTP_RETRY_DELAY', '5');

interface ThemisItem {
  id: string;
  href: string;
  lonMin: number;
  lonMax: number;
  latMin: number;
  latMax: number;
}

async function themisItems(): Promise<ThemisItem[]> {
  let raw: string;
  if (existsSync(THEMIS_CACHE)) raw = await fs.readFile(THEMIS_CACHE, 'utf8');
  else {
    const res = await fetch(THEMIS_STAC);
    if (!res.ok) throw new Error(`THEMIS STAC ${res.status}`);
    raw = await res.text();
    await fs.mkdir(path.dirname(THEMIS_CACHE), { recursive: true });
    await fs.writeFile(THEMIS_CACHE, raw);
  }
  const deg = (m: number) => (m / THEMIS_R) * (180 / Math.PI);
  return (
    JSON.parse(raw) as {
      features: { id: string; bbox: number[]; assets: { image: { href: string } } }[];
    }
  ).features
    .filter((f) => f.id.endsWith('_dir'))
    .map((f) => {
      const latMin = deg(Math.min(f.bbox[1], f.bbox[3]));
      const latMax = deg(Math.max(f.bbox[1], f.bbox[3]));
      let lonMin = deg(f.bbox[0]);
      let lonMax = deg(f.bbox[2]);
      // The quads that start at 180°W (MC-2, 8, 16, 24) carry a degenerate
      // STAC bbox spanning the whole globe. Their real extent is one quad
      // wide: 60° in the 30–65° bands, 45° in the equatorial bands.
      if (lonMax - lonMin > 180) {
        lonMin = -180;
        lonMax = -180 + (Math.max(Math.abs(latMin), Math.abs(latMax)) > 31 ? 60 : 45);
      }
      return { id: f.id, href: f.assets.image.href, lonMin, lonMax, latMin, latMax };
    });
}

/** Open the source for one box: the WAC COG, or a VRT of the THEMIS quads it touches. */
async function openSource(b: Bounds): Promise<{ ds: gdal.Dataset; ids: string[]; urls: string[] }> {
  if (BODY === 'moon')
    return { ds: gdal.open(`/vsicurl/${WAC_COG}`), ids: ['WAC'], urls: [WAC_COG] };
  if (Math.max(Math.abs(b.lat_min), Math.abs(b.lat_max)) > THEMIS_MAX_LAT)
    throw new Error(`box reaches past ±${THEMIS_MAX_LAT}° (polar THEMIS quads not joined)`);
  const wrap = (l: number) => ((((l + 180) % 360) + 360) % 360) - 180;
  const lo = wrap(b.lon_min);
  const hi = wrap(b.lon_max);
  const hitsLon = (it: ThemisItem) =>
    lo <= hi ? it.lonMax > lo && it.lonMin < hi : it.lonMax > lo || it.lonMin < hi;
  const items = (await themisItems()).filter(
    (it) => hitsLon(it) && it.latMax > b.lat_min && it.latMin < b.lat_max,
  );
  if (!items.length) throw new Error('no THEMIS quad covers the box');
  if (lo > hi) throw new Error('box crosses the ±180° seam (not joined)');
  const urls = items.map((it) => it.href);
  const vrt = `/vsimem/context-${Date.now()}.vrt`;
  const ds = gdal.buildVRT(
    vrt,
    urls.map((u) => `/vsicurl/${u}`),
  );
  return { ds, ids: items.map((it) => it.id), urls };
}

async function readBox(ds: gdal.Dataset, b: Bounds) {
  const srs = ds.srs;
  const gt = ds.geoTransform;
  if (!srs || !gt) throw new Error('source has no SRS / geotransform');
  const ct = new gdal.CoordinateTransformation(srs.cloneGeogCS(), srs);
  const pix = (lon: number, lat: number) => {
    const p = ct.transformPoint(lon, lat);
    return [(p.x - gt[0]) / gt[1], (p.y - gt[3]) / gt[5]];
  };
  const W = ds.rasterSize.x;
  const [x0, y0] = pix(b.lon_min, b.lat_max);
  const [x1Raw, y1] = pix(b.lon_max, b.lat_min);
  // A box across the raster's own longitude edge (the WAC COG starts at 0°E,
  // so Apollo 15 at 3.6°E crosses it) wraps: its east end lands at a small x.
  const wraps = x1Raw <= x0;
  const x1 = wraps ? x1Raw + W : x1Raw;
  const left = Math.round(x0);
  const top = Math.round(y0);
  const w = Math.round(x1 - x0);
  const h = Math.round(y1 - y0);
  if (left < 0 || top < 0 || (!wraps && left + w > W) || top + h > ds.rasterSize.y)
    throw new Error(`box falls outside the source (${left},${top} ${w}×${h})`);
  const outH = Math.round((OUT_W * h) / w);
  const band = ds.bands.get(1);
  const read = async (x: number, width: number, outW: number) =>
    (await band.pixels.readAsync(x, top, width, h, undefined, {
      buffer_width: outW,
      buffer_height: outH,
      resampling: gdal.GRA_Average,
    })) as Uint8Array;
  if (!wraps || left + w <= W) return { data: await read(left, w, OUT_W), outH };
  const wA = W - left;
  const outA = Math.round((OUT_W * wA) / w);
  const a = await read(left, wA, outA);
  const c = await read(0, w - wA, OUT_W - outA);
  const data = new Uint8Array(OUT_W * outH);
  for (let row = 0; row < outH; row++) {
    data.set(a.subarray(row * outA, (row + 1) * outA), row * OUT_W);
    data.set(c.subarray(row * (OUT_W - outA), (row + 1) * (OUT_W - outA)), row * OUT_W + outA);
  }
  return { data, outH };
}

/** Globe texture colour over the box, resized to the output. */
async function globeOver(b: Bounds, outH: number): Promise<Buffer> {
  const tex = sharp(GLOBE_TEXTURE[BODY]);
  const { width: W = 0, height: H = 0 } = await tex.metadata();
  const u = (lon: number) => ((lon + 180) / 360) * W;
  const v = (lat: number) => ((90 - lat) / 180) * H;
  // Pad half a texture of wrapped longitude on each side so a box across
  // ±180° (Chang'e 4 at 177.6°E) reads straight through the seam.
  const pad = W / 2;
  const left = Math.floor(u(b.lon_min) + pad);
  const top = Math.floor(v(b.lat_max));
  const right = Math.ceil(u(b.lon_max) + pad);
  const bottom = Math.ceil(v(b.lat_min));
  const wrapped = await sharp(GLOBE_TEXTURE[BODY])
    .extend({ left: pad, right: pad, extendWith: 'repeat' })
    .toBuffer();
  return sharp(wrapped)
    .extract({ left, top, width: right - left, height: bottom - top })
    .resize(OUT_W, outH, { fit: 'fill', kernel: 'cubic' })
    .blur(2)
    .removeAlpha()
    .raw()
    .toBuffer();
}

/**
 * Source detail on the globe's own low frequencies: per channel,
 * out = globe_low × (src / src_low). A grey source (1 channel: WAC, THEMIS)
 * takes all its colour from the globe; a colour source (EOX on Earth) keeps
 * its local colour but meets the globe's brightness and hue at the edges.
 */
async function detailTransfer(
  src: Uint8Array,
  channels: number,
  globe: Buffer,
  outH: number,
  sigma: number,
) {
  const low = await sharp(Buffer.from(src), {
    raw: { width: OUT_W, height: outH, channels: channels as 1 | 3 },
  })
    .blur(sigma)
    .raw()
    .toBuffer();
  const out = Buffer.alloc(OUT_W * outH * 3);
  let nodata = 0;
  for (let i = 0; i < OUT_W * outH; i++) {
    let sum = 0;
    for (let k = 0; k < channels; k++) sum += src[i * channels + k];
    if (sum === 0) nodata++;
    for (let c = 0; c < 3; c++) {
      const k = channels === 1 ? 0 : c;
      const v = src[i * channels + k];
      const ratio =
        sum === 0 ? 1 : Math.min(3, Math.max(0.25, (v + 4) / (low[i * channels + k] + 4)));
      out[i * 3 + c] = Math.min(255, Math.round(globe[i * 3 + c] * ratio));
    }
  }
  return { out, nodataFrac: nodata / (OUT_W * outH) };
}

/** Earth: one EOX GetMap over the box, OUT_W wide (RGB, 3 channels). */
async function readEox(b: Bounds): Promise<{ data: Uint8Array; outH: number; url: string }> {
  const outH = Math.round((OUT_W * (b.lat_max - b.lat_min)) / (b.lon_max - b.lon_min));
  const url = `${EOX_WMS}?service=WMS&version=1.1.1&request=GetMap&layers=s2cloudless-${EOX_YEAR}&styles=&srs=EPSG:4326&bbox=${b.lon_min},${b.lat_min},${b.lon_max},${b.lat_max}&width=${OUT_W}&height=${outH}&format=image/jpeg`;
  for (let attempt = 1; attempt <= 3; attempt++) {
    const res = await fetch(url).catch(() => null);
    if (res?.ok) {
      const buf = Buffer.from(await res.arrayBuffer());
      const { data, info } = await sharp(buf)
        .removeAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
      if (info.width !== OUT_W || info.height !== outH)
        throw new Error(`EOX returned ${info.width}×${info.height}`);
      return { data, outH, url };
    }
  }
  throw new Error('EOX WMS failed 3×');
}

function provenanceRow(
  site: string,
  b: Bounds,
  ids: string[],
  urls: string[],
  mPerPx: number,
): ProvenanceEntry {
  const p = `/images/hotspots/${BODY}/${site}/context.webp`;
  if (BODY === 'earth')
    return {
      id: createHash('sha256').update(p).digest('hex').slice(0, 16),
      path: p,
      source_type: 'derived-mosaic',
      title: `EOxCloudless Sentinel-2 cloudless ${EOX_YEAR} — context crop ${b.lat_min}…${b.lat_max}°N ${b.lon_min}…${b.lon_max}°E`,
      author: `EOxCloudless https://cloudless.eox.at by EOX IT Services GmbH (Contains modified Copernicus Sentinel data ${EOX_YEAR})`,
      agency: 'ESA',
      source_url: 'https://cloudless.eox.at/',
      image_url: urls[0],
      license_short: 'CC-BY-NC-SA-4.0',
      license_url: 'https://creativecommons.org/licenses/by-nc-sa/4.0/',
      license_rationale:
        'EOX Sentinel-2 cloudless mosaic, CC BY-NC-SA 4.0 for non-commercial use; Orrery is non-commercial. This crop is a derivative shared under the same licence; its broad brightness is matched to the globe texture (NASA Blue Marble based, credited on the globe).',
      modifications: [
        `cropped-${KM}km-true-scale-lat-lon-box`,
        `wms-${OUT_W}px-wide-${mPerPx.toFixed(0)}m-per-px`,
        'low-frequencies-matched-to-globe-texture',
        'reencoded-webp-ladder',
      ],
      revid: null,
      pageid: null,
      nasa_id: null,
      fetched_at: new Date().toISOString(),
      spacecraft_name: 'Sentinel-2',
      instrument: 'Sentinel-2 MSI',
    };
  const moon = BODY === 'moon';
  return {
    id: createHash('sha256').update(p).digest('hex').slice(0, 16),
    path: p,
    source_type: 'derived-mosaic',
    title: `${moon ? 'LRO WAC global morphology mosaic' : `THEMIS day-IR controlled mosaic (${ids.join(', ')})`} — context crop ${b.lat_min}…${b.lat_max}°N ${b.lon_min}…${b.lon_max}°E`,
    author: moon
      ? 'NASA / GSFC / Arizona State University (LROC WAC) · USGS Astrogeology ARD · colour from the globe texture (Solar System Scope)'
      : 'NASA / JPL / Arizona State University (THEMIS, Mars Odyssey) · USGS Astrogeology · colour from the globe texture (Solar System Scope)',
    agency: 'NASA',
    source_url: moon ? 'https://www.lroc.asu.edu/' : 'https://themis.asu.edu/',
    image_url: urls[0],
    license_short: 'PD-NASA',
    license_url: 'https://www.nasa.gov/nasa-brand-center/images-and-media/',
    license_rationale: moon
      ? 'LROC WAC mosaic: NASA/GSFC/ASU, U.S. Government work (17 U.S.C. §105). The colour layer is the CC-BY-4.0 Solar System Scope globe texture already credited on the globe.'
      : 'THEMIS controlled mosaics: NASA/JPL/ASU, U.S. Government work, distributed by USGS Astrogeology (STAC licence CC0-1.0). The colour layer is the CC-BY-4.0 Solar System Scope globe texture already credited on the globe.',
    modifications: [
      `cropped-${KM}km-true-scale-lat-lon-box`,
      `averaged-to-${OUT_W}px-wide-${mPerPx.toFixed(0)}m-per-px`,
      'colour-from-globe-texture-detail-transfer',
      'reencoded-webp-ladder',
    ],
    revid: null,
    pageid: null,
    nasa_id: null,
    fetched_at: new Date().toISOString(),
    spacecraft_id: moon ? 'lro' : 'mars-odyssey',
    spacecraft_name: moon ? 'Lunar Reconnaissance Orbiter' : 'Mars Odyssey',
    instrument: moon ? 'LROC WAC' : 'THEMIS',
  };
}

async function main() {
  const hsPath = 'static/data/surface-hotspots.json';
  const hs = JSON.parse(await fs.readFile(hsPath, 'utf8'));
  let sites: { id: string; lat: number; lon: number }[];
  if (BODY === 'earth') {
    // Launch pads: the fleet launch-site entries that have a hotspot sidecar.
    const dir = 'static/data/fleet/launch-site';
    sites = [];
    for (const f of (await fs.readdir(dir)).sort()) {
      const d = JSON.parse(await fs.readFile(path.join(dir, f), 'utf8'));
      if (hs.entries[d.id] && Number.isFinite(d.lat))
        sites.push({ id: d.id, lat: d.lat, lon: d.lon });
    }
  } else {
    const sitesRaw = JSON.parse(await fs.readFile(`static/data/${BODY}-sites.json`, 'utf8'));
    sites = Array.isArray(sitesRaw) ? sitesRaw : sitesRaw.sites;
  }
  const kmPerDeg = (RADIUS_KM[BODY] * Math.PI) / 180;
  /** An earlier site's crop whose box holds this site with SHARE_MARGIN_KM to spare. */
  const shareFrom = (s: { lat: number; lon: number }) =>
    Object.entries(
      hs.entries as Record<
        string,
        { hotspot_context_source?: string; hotspot_context_bounds?: Bounds }
      >,
    ).find(([, e]) => {
      const b = e.hotspot_context_bounds;
      if (!b || !e.hotspot_context_source?.includes(`/${BODY}/`)) return false;
      // Never "share" a crop that is this site's own (a --force re-fetch).
      if (e.hotspot_context_source === `/images/hotspots/${BODY}/${s.id}/context.webp`)
        return false;
      const mLat = SHARE_MARGIN_KM / kmPerDeg;
      const mLon = mLat / Math.cos((s.lat * Math.PI) / 180);
      return (
        s.lat > b.lat_min + mLat &&
        s.lat < b.lat_max - mLat &&
        s.lon > b.lon_min + mLon &&
        s.lon < b.lon_max - mLon
      );
    });
  const todo = sites.filter((s) => hs.entries[s.id] && (!ONLY || ONLY.includes(s.id)));
  const prov: ProvenanceEntry[] = [];
  let ok = 0;
  const failed: string[] = [];
  for (const s of todo) {
    const master = path.join('masters', 'hotspots', BODY, s.id, 'context.jpg');
    if (!FORCE && existsSync(master)) {
      console.log(`  · ${s.id} has a master (use --force)`);
      continue;
    }
    const shared = BODY === 'earth' ? shareFrom(s) : undefined;
    if (shared && shared[0] !== s.id) {
      hs.entries[s.id].hotspot_context_source = shared[1].hotspot_context_source;
      hs.entries[s.id].hotspot_context_bounds = shared[1].hotspot_context_bounds;
      console.log(`  = ${s.id} shares ${shared[0]}'s crop`);
      ok++;
      continue;
    }
    const b = contextBounds(s.lat, s.lon, KM, RADIUS_KM[BODY]);
    const t0 = Date.now();
    try {
      let data: Uint8Array;
      let outH: number;
      let channels = 1;
      let ids: string[];
      let urls: string[];
      if (BODY === 'earth') {
        const r = await readEox(b);
        ({ data, outH } = r);
        channels = 3;
        ids = [`EOX s2cloudless-${EOX_YEAR}`];
        urls = [r.url];
      } else {
        const src = await openSource(b);
        ({ ids, urls } = src);
        ({ data, outH } = await readBox(src.ds, b));
        src.ds.close();
      }
      const mPerPx = (KM * 1000) / OUT_W;
      const globe = await globeOver(b, outH);
      // Blur to the globe's own resolution: 4K texture px → output px.
      const globeMPerPx = (2 * Math.PI * RADIUS_KM[BODY] * 1000) / 4096;
      const { out, nodataFrac } = await detailTransfer(
        data,
        channels,
        globe,
        outH,
        Math.max(1, globeMPerPx / mPerPx / 2),
      );
      if (process.env.CTX_DEBUG) {
        const mean = (x: Uint8Array | Buffer) =>
          (x.reduce((a: number, v: number) => a + v, 0) / x.length).toFixed(1);
        console.log(`    debug: src ${mean(data)} globe ${mean(globe)} out ${mean(out)}`);
      }
      // Zero = no data or, near the poles, unlit crater floor; those pixels keep
      // the globe colour. A quarter of the box is the most we accept.
      if (nodataFrac > 0.25)
        throw new Error(`${(nodataFrac * 100).toFixed(1)}% no-data in the box`);
      await fs.mkdir(path.dirname(master), { recursive: true });
      await sharp(out, { raw: { width: OUT_W, height: outH, channels: 3 } })
        .jpeg({ quality: 92 })
        .toFile(master);
      hs.entries[s.id].hotspot_context_source = `/images/hotspots/${BODY}/${s.id}/context.webp`;
      hs.entries[s.id].hotspot_context_bounds = b;
      prov.push(provenanceRow(s.id, b, ids, urls, mPerPx));
      ok++;
      console.log(
        `  ✓ ${s.id} ${OUT_W}×${outH} from ${ids.join('+')} (${((Date.now() - t0) / 1000).toFixed(0)} s)`,
      );
    } catch (e) {
      failed.push(s.id);
      console.log(`  ✗ ${s.id}: ${(e as Error).message}`);
    }
  }
  await fs.writeFile(hsPath, JSON.stringify(hs, null, 2) + '\n');
  await upsertProvenanceEntries(prov);
  console.log(
    `context ${BODY}: ${ok} written, ${failed.length} failed${failed.length ? ` (${failed.join(', ')})` : ''}`,
  );
}

if (process.argv[1]?.endsWith('fetch-context-layer.ts')) await main();
