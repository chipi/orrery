import { promises as fs } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { cropRemoteRasterToLatLon, CropError } from './gdal-crop.ts';
import { buildKaguyaTcProvenanceEntry, upsertProvenanceEntries } from './provenance.ts';

/**
 * Moon along-route imagery (#361 follow-on) — the lunar analogue of
 * fetch-mars-traverse.ts (#360). Samples each rover-traverse polyline and
 * crops a Kaguya TC patch at every sample so the magnified traverse has
 * zoomable detail along its length, exactly like the Mars HiRISE route
 * patches. Source is Kaguya (~6-10 m/px) — there's no programmatic sharp
 * LROC NAC for these sites (verified) — so these are softer than the Mars
 * HiRISE patches but real, georegistered and self-crediting.
 *
 * Output:
 *   static/images/hotspots/moon/<rover>/traverse/<id>.jpg
 *   static/data/moon-traverses/<rover>.route-patches.json  (render manifest)
 *
 * Run (Node 20 + gdal-async):
 *   ~/.nvm/.../v20.20.2/bin/node --import tsx \
 *     scripts/hotspots/fetch-moon-traverse.ts --rover luna17
 *   (omit --rover to do all five)
 */

const STAC_SEARCH = 'https://stac.astrogeology.usgs.gov/api/search';
const COLLECTIONS = [
  'kaguya_terrain_camera_monoscopic_uncontrolled_observations',
  'kaguya_terrain_camera_stereoscopic_uncontrolled_observations',
  'kaguya_terrain_camera_spsupport_uncontrolled_observations',
].join(',');
const CROP_PX = 1024; // ~6-10 km patch at Kaguya GSD
const OUTPUT_PX = 768; // downsample for lighter delivery
const MOON_RADIUS_M = 1737400;
const ALL_ROVERS = ['luna17', 'luna21', 'change3', 'change4', 'chandrayaan3'];

process.env.GDAL_DISABLE_READDIR_ON_OPEN ??= 'EMPTY_DIR';
process.env.CPL_VSIL_CURL_ALLOWED_EXTENSIONS ??= '.tif';
process.env.VSI_CACHE ??= 'TRUE';

interface Traverse {
  rover_id: string;
  points: [number, number][];
  stops?: Array<{ id: string; lat: number; lon: number; kind?: string; label?: string }>;
}
interface StacFeature {
  id: string;
  bbox: [number, number, number, number];
  assets: Record<string, { href?: string }>;
}

function metresBetween(a: [number, number], b: [number, number]): number {
  const dLat = ((b[0] - a[0]) * Math.PI * MOON_RADIUS_M) / 180;
  const dLon =
    ((b[1] - a[1]) * Math.PI * MOON_RADIUS_M * Math.cos((a[0] * Math.PI) / 180)) / 180;
  return Math.hypot(dLat, dLon);
}

/** Resample the polyline at a fixed ground interval (arc-length walk). */
function resample(points: [number, number][], intervalM: number): [number, number][] {
  if (points.length < 2) return points.slice();
  const out: [number, number][] = [points[0]];
  let nextAt = intervalM;
  let acc = 0;
  for (let i = 1; i < points.length; i++) {
    const seg = metresBetween(points[i - 1], points[i]);
    while (acc + seg >= nextAt) {
      const t = seg ? (nextAt - acc) / seg : 0;
      out.push([
        points[i - 1][0] + (points[i][0] - points[i - 1][0]) * t,
        points[i - 1][1] + (points[i][1] - points[i - 1][1]) * t,
      ]);
      nextAt += intervalM;
    }
    acc += seg;
  }
  const last = points[points.length - 1];
  if (metresBetween(out[out.length - 1], last) > intervalM * 0.4) out.push(last);
  return out;
}

function totalLengthM(points: [number, number][]): number {
  let s = 0;
  for (let i = 1; i < points.length; i++) s += metresBetween(points[i - 1], points[i]);
  return s;
}

async function stacSearch(lat: number, lon: number, halfDeg: number): Promise<StacFeature[]> {
  const bbox = [lon - halfDeg, lat - halfDeg, lon + halfDeg, lat + halfDeg].join(',');
  const url = `${STAC_SEARCH}?collections=${COLLECTIONS}&bbox=${bbox}&limit=80`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`STAC ${res.status}`);
  return ((await res.json()) as { features?: StacFeature[] }).features ?? [];
}

function collectionRank(f: StacFeature): number {
  const h = f.assets?.image?.href ?? '';
  if (h.includes('/monoscopic/')) return 0;
  if (h.includes('/stereoscopic/')) return 1;
  return 2;
}
function rankScore(f: StacFeature, lat: number, lon: number): number {
  const [w, s, e, n] = f.bbox;
  const cx = (w + e) / 2;
  const cy = (s + n) / 2;
  const dist = Math.hypot(lon - cx, lat - cy);
  const contains = lon >= w && lon <= e && lat >= s && lat <= n;
  return collectionRank(f) * 1_000_000 + (contains ? dist : dist + 1000);
}

async function cropKaguyaAt(
  lat: number,
  lon: number,
  outputPath: string,
): Promise<{ productId: string; resolutionMPerPx: number } | null> {
  let feats: StacFeature[] = [];
  for (const half of [0.25, 0.5, 1.0]) {
    const round = await stacSearch(lat, lon, half);
    const seen = new Set(feats.map((f) => f.id));
    feats = feats.concat(round.filter((f) => !seen.has(f.id)));
    if (feats.length >= 12) break;
  }
  const ranked = feats
    .map((f) => ({ f, sc: rankScore(f, lat, lon) }))
    .sort((a, b) => a.sc - b.sc);
  let tried = 0;
  for (const { f } of ranked) {
    if (tried >= 10) break;
    const href = f.assets?.image?.href;
    if (!href?.endsWith('.tif')) continue;
    tried++;
    try {
      const crop = await cropRemoteRasterToLatLon({
        localRasterPath: `/vsicurl/${href}`,
        targetLat: lat,
        targetLon: lon,
        outputPath,
        cropSize: CROP_PX,
        jpegQuality: 88,
      });
      // Downsample in place for lighter delivery.
      const full = await fs.readFile(outputPath);
      await fs.writeFile(
        outputPath,
        await sharp(full).resize(OUTPUT_PX, OUTPUT_PX, { fit: 'fill' }).jpeg({ quality: 85 }).toBuffer(),
      );
      return { productId: f.id, resolutionMPerPx: crop.resolutionMPerPx };
    } catch (err) {
      if (!(err instanceof CropError)) throw err;
    }
  }
  return null;
}

async function doRover(rover: string): Promise<void> {
  const trPath = path.join('static/data/moon-traverses', `${rover}.json`);
  const tr = JSON.parse(await fs.readFile(trPath, 'utf8')) as Traverse;
  // Adaptive interval: ~4-6 patches along the drive, min 250 m so the very
  // short rovers (Yutu, Pragyan) still get a couple.
  const len = totalLengthM(tr.points);
  const intervalM = Math.max(250, len / 5);
  const pts = resample(tr.points, intervalM);
  console.log(`▶ ${rover}: ${(len / 1000).toFixed(2)} km drive → ${pts.length} patches (every ${(intervalM / 1000).toFixed(2)} km)`);

  const outDir = path.join('static/images/hotspots/moon', rover, 'traverse');
  await fs.mkdir(outDir, { recursive: true });

  const manifest: Array<Record<string, unknown>> = [];
  for (let i = 0; i < pts.length; i++) {
    const [lat, lon] = pts[i];
    const id = i === 0 ? 'start' : i === pts.length - 1 ? 'end' : `km-${String(i).padStart(2, '0')}`;
    const outputPath = path.join(outDir, `${id}.jpg`);
    const r = await cropKaguyaAt(lat, lon, outputPath);
    if (!r) {
      console.log(`  ✗ ${id}: no Kaguya coverage`);
      continue;
    }
    manifest.push({
      id,
      lat: Number(lat.toFixed(5)),
      lon: Number(lon.toFixed(5)),
      kind: 'feature',
      label: id === 'start' ? 'Landing / drive start' : id === 'end' ? 'Final position' : `Along route`,
      image: `/${path.relative('static', outputPath)}`,
      product_id: r.productId,
      resolution_m_per_px: r.resolutionMPerPx,
      ground_m: Math.round(CROP_PX * r.resolutionMPerPx),
    });
    console.log(`  ✓ ${id.padEnd(8)} ← ${r.productId} (${r.resolutionMPerPx.toFixed(1)} m/px)`);
  }

  const manifestPath = path.join('static/data/moon-traverses', `${rover}.route-patches.json`);
  await fs.writeFile(manifestPath, JSON.stringify({ rover_id: rover, patches: manifest }, null, 2) + '\n');
  console.log(`  ${manifest.length}/${pts.length} → ${manifestPath}`);

  if (manifest.length) {
    const prov = manifest.map((m) =>
      buildKaguyaTcProvenanceEntry({
        outputPath: `static${m.image as string}`,
        sourceUrl: `https://astrogeo-ard.s3-us-west-2.amazonaws.com/ (Kaguya TC ${m.product_id})`,
        productId: m.product_id as string,
        siteId: rover,
        centerLat: m.lat as number,
        centerLon: m.lon as number,
        cropSize: CROP_PX,
      }),
    );
    await upsertProvenanceEntries(prov);
    console.log(`  provenance: ${prov.length} route entries (JAXA · Kaguya TC)`);
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const idx = args.indexOf('--rover');
  const rovers = idx >= 0 ? [args[idx + 1]] : ALL_ROVERS;
  for (const r of rovers) await doRover(r);
  console.log('\nDone.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
