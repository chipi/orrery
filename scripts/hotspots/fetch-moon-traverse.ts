import { promises as fs } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { cropRemoteRasterToLatLon, CropError } from './gdal-crop.ts';
import {
  buildLrocProvenanceEntry,
  pruneProvenanceUnder,
  upsertProvenanceEntries,
} from './provenance.ts';

/**
 * Moon along-route DETAIL imagery (#361) — the lunar analogue of
 * fetch-mars-traverse.ts (#360). Samples a rover-traverse polyline and crops a
 * genuine zoom-in tile at every sample so the magnified route has HiRISE-class
 * detail along its length.
 *
 * LROC NAC ONLY. A detail tile is only worth rendering if it out-resolves the
 * regional context it sits on — Mars works because HiRISE (0.25 m/px) is ~20×
 * finer than the CTX regional. On the Moon only LROC NAC (~0.5-2 m/px) clears
 * that bar. It exists map-projected for just two traverse sites:
 *   - Apollo 17 — per-site 0.5 m/px orthomosaic (USGS Astrogeology), complete.
 *   - Apollo 16 — ODE (Orbital Data Explorer) map-projected NAC photometric
 *     (SDPPHO): bbox lat/lon catalog over the LROC PDS; crop band 1
 *     (reflectance; bands 2-4 are incidence/emission/phase).
 * The other 6 sites (Hadley + the robotic rovers) have only Kaguya TC
 * (~6-10 m/px) — the SAME resolution class as their regional context, so a
 * per-point "zoom" tile is mush. Those sites are REGIONAL-ONLY: no tiles here,
 * the scene renders their single landing tier-2 patch + polyline (Marko's call).
 *
 * Tiles are cropped at NATIVE resolution (no downsample below the source GSD) so
 * the zoom-in actually reveals detail — cropping wide + downsampling threw the
 * resolution away and made every tile a shrunk copy of one big image.
 * NASA/GSFC/ASU · PD-NASA.
 *
 * Output:
 *   static/images/hotspots/moon/<rover>/traverse/<id>.jpg
 *   static/data/moon-traverses/<rover>.route-patches.json  (render manifest)
 *
 * Run:  npx tsx scripts/hotspots/fetch-moon-traverse.ts [--rover apollo17]
 */

const DETAIL_PX = 1024; // output tile size (Mars route-patch parity)
const MOON_RADIUS_M = 1737400;
// Only the two sites with map-projected LROC NAC get along-route detail tiles.
const ALL_ROVERS = ['apollo16', 'apollo17'];

process.env.GDAL_DISABLE_READDIR_ON_OPEN ??= 'EMPTY_DIR';
process.env.CPL_VSIL_CURL_ALLOWED_EXTENSIONS ??= '.IMG,.tif';
process.env.VSI_CACHE ??= 'TRUE';

interface Traverse {
  rover_id: string;
  points: [number, number][];
  stops?: Array<{ id: string; lat: number; lon: number; kind?: string; label?: string }>;
}
function metresBetween(a: [number, number], b: [number, number]): number {
  const dLat = ((b[0] - a[0]) * Math.PI * MOON_RADIUS_M) / 180;
  const dLon = ((b[1] - a[1]) * Math.PI * MOON_RADIUS_M * Math.cos((a[0] * Math.PI) / 180)) / 180;
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

// ─── LROC NAC via ODE (Orbital Data Explorer) ──────────────────────────
const ODE_REST = 'https://oderest.rsl.wustl.edu/live2/';
// Crop cropSize² SOURCE pixels then re-encode at DETAIL_PX WITHOUT downsampling
// below native — so the tile shows the source's finest resolution:
//   orthomosaic 0.5 m/px → ~512 m window at native 0.5 m/px (crisp zoom-in);
//   SDPPHO ~2 m/px       → ~2 km window at native 2 m/px.
const ORTHO_CROP_PX = 1024;
// Match A17's ~512 m ground window so the SDPPHO route tiles the same way —
// same native resolution (~2 m/px here), just more tiles closing the gaps
// (256 src px × ~2 m/px ≈ 512 m). Quality is unchanged; only the count goes up.
const NAC_SDP_CROP_PX = 256;

interface NacProduct {
  pdsid: string;
  imgUrl: string;
}

// Per-site LROC NAC orthomosaic (USGS Astrogeology, 0.5 m/px, single-band,
// covers the whole traverse). Curated (no orthomosaic index to query, so this
// is a hand-maintained allowlist; only Apollo 17 is public).
const SITE_ORTHOMOSAIC: Record<string, string> = {
  apollo17:
    'https://asc-astropedia.s3.us-west-2.amazonaws.com/Moon/Apollo/Traverse/Apollo17/ancillary/APOLLO17_ORTHOMOSAIC_50CM.TIFF',
};

/** Re-encode the crop to DETAIL_PX (never enlarging past the crop's own px, so
 *  native resolution is preserved) for consistent, light delivery. */
async function normalizeInPlace(outputPath: string): Promise<void> {
  const buf = await fs.readFile(outputPath);
  const meta = await sharp(buf).metadata();
  const target = Math.min(DETAIL_PX, meta.width ?? DETAIL_PX);
  await fs.writeFile(
    outputPath,
    await sharp(buf).resize(target, target, { fit: 'fill' }).jpeg({ quality: 88 }).toBuffer(),
  );
}

type NacCrop = { productId: string; resolutionMPerPx: number; sourceUrl: string; groundM: number };

/** ODE bbox product search for map-projected LROC NAC photometric (SDPPHO). */
async function odeNacSearch(lat: number, lon: number, halfDeg: number): Promise<NacProduct[]> {
  const p = new URLSearchParams({
    query: 'products',
    results: 'fp',
    output: 'JSON',
    target: 'moon',
    ihid: 'lro',
    iid: 'lroc',
    pt: 'SDPPHO',
    loc: 'b',
    limit: '40',
    minlat: String(lat - halfDeg),
    maxlat: String(lat + halfDeg),
    westernlon: String(lon - halfDeg),
    easternlon: String(lon + halfDeg),
  });
  const res = await fetch(`${ODE_REST}?${p}`);
  if (!res.ok) throw new Error(`ODE ${res.status}`);
  const j = (await res.json()) as { ODEResults?: { Products?: { Product?: unknown } } };
  const raw = j.ODEResults?.Products?.Product;
  const arr = (Array.isArray(raw) ? raw : raw ? [raw] : []) as Array<Record<string, unknown>>;
  const out: NacProduct[] = [];
  for (const prod of arr) {
    const filesNode = (prod.Product_files as Record<string, unknown> | undefined)?.Product_file;
    const files = (Array.isArray(filesNode) ? filesNode : filesNode ? [filesNode] : []) as Array<
      Record<string, string>
    >;
    const img = files.find((f) => /\.IMG$/i.test(f?.URL || f?.FileName || ''));
    const url = img?.URL || img?.FileName;
    const pdsid = (prod.pdsid || prod.ProductId) as string | undefined;
    if (url && /^https?:/i.test(url) && pdsid) out.push({ pdsid, imgUrl: url });
  }
  return out;
}

/** Crop a native-res tile from the per-site 0.5 m/px orthomosaic (download-once
 *  + cache via sourceUrl). Returns null when this site has no orthomosaic. */
async function cropFromOrthomosaic(
  rover: string,
  lat: number,
  lon: number,
  outputPath: string,
): Promise<NacCrop | null> {
  const ortho = SITE_ORTHOMOSAIC[rover];
  if (!ortho) return null;
  try {
    const crop = await cropRemoteRasterToLatLon({
      sourceUrl: ortho,
      targetLat: lat,
      targetLon: lon,
      outputPath,
      cropSize: ORTHO_CROP_PX,
      jpegQuality: 92,
      bandIndex: 1,
    });
    await normalizeInPlace(outputPath);
    return {
      productId: `${rover.toUpperCase()}_NAC_ORTHOMOSAIC_50CM`,
      resolutionMPerPx: crop.resolutionMPerPx,
      sourceUrl: ortho,
      groundM: Math.round(ORTHO_CROP_PX * crop.resolutionMPerPx),
    };
  } catch (err) {
    if (!(err instanceof CropError)) throw err;
    return null;
  }
}

/** Crop a native-res tile from ODE map-projected NAC (SDPPHO) — ~2 m/px. Sharp
 *  but patchy: the crop's fail-fast no-data check skips frames whose swath
 *  misses the target. */
async function cropFromOde(lat: number, lon: number, outputPath: string): Promise<NacCrop | null> {
  let prods: NacProduct[] = [];
  for (const half of [0.02, 0.05, 0.12]) {
    const round = await odeNacSearch(lat, lon, half);
    const seen = new Set(prods.map((p) => p.pdsid));
    prods = prods.concat(round.filter((p) => !seen.has(p.pdsid)));
    if (prods.length >= 12) break;
  }
  for (const p of prods.slice(0, 12)) {
    try {
      const crop = await cropRemoteRasterToLatLon({
        localRasterPath: `/vsicurl/${p.imgUrl}`,
        targetLat: lat,
        targetLon: lon,
        outputPath,
        cropSize: NAC_SDP_CROP_PX,
        jpegQuality: 92,
        bandIndex: 1,
      });
      await normalizeInPlace(outputPath);
      return {
        productId: p.pdsid,
        resolutionMPerPx: crop.resolutionMPerPx,
        sourceUrl: p.imgUrl,
        groundM: Math.round(NAC_SDP_CROP_PX * crop.resolutionMPerPx),
      };
    } catch (err) {
      if (!(err instanceof CropError)) throw err;
    }
  }
  return null;
}

/** Best-available LROC NAC tile: per-site orthomosaic, else ODE SDPPHO. */
async function cropNacAt(
  rover: string,
  lat: number,
  lon: number,
  outputPath: string,
): Promise<NacCrop | null> {
  return (
    (await cropFromOrthomosaic(rover, lat, lon, outputPath)) ??
    (await cropFromOde(lat, lon, outputPath))
  );
}

/** dHash signature (64-bit) for perceptual near-duplicate detection. */
async function dHash(imagePath: string): Promise<boolean[]> {
  const buf = await sharp(imagePath).greyscale().resize(9, 8, { fit: 'fill' }).raw().toBuffer();
  const bits: boolean[] = [];
  for (let y = 0; y < 8; y++)
    for (let x = 0; x < 8; x++) bits.push(buf[y * 9 + x] > buf[y * 9 + x + 1]);
  return bits;
}
function hamming(a: boolean[], b: boolean[]): number {
  let d = 0;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) d++;
  return d;
}

async function doRover(rover: string): Promise<void> {
  const trPath = path.join('static/data/moon-traverses', `${rover}.json`);
  const tr = JSON.parse(await fs.readFile(trPath, 'utf8')) as Traverse;
  const len = totalLengthM(tr.points);

  const outDir = path.join('static/images/hotspots/moon', rover, 'traverse');
  // Clear stale tiles: a re-run may produce a different tile set (count /
  // spacing), and leftover higher-numbered files from a prior run would linger.
  await fs.rm(outDir, { recursive: true, force: true });
  await fs.mkdir(outDir, { recursive: true });

  // Probe the tile window at the start, then tile the route at ~0.85× the window
  // so tiles ABUT into continuous coverage (no gaps) instead of sparse islands.
  // The window is source-driven: orthomosaic ~0.5 km, SDPPHO ~2 km.
  const probePath = path.join(outDir, '_probe.jpg');
  const probe = await cropNacAt(rover, tr.points[0][0], tr.points[0][1], probePath);
  await fs.rm(probePath, { force: true });
  if (!probe) {
    console.log(`▶ ${rover}: no LROC NAC coverage — skipped`);
    return;
  }
  const intervalM = Math.max(300, probe.groundM * 0.85);
  const pts = resample(tr.points, intervalM);
  console.log(
    `▶ ${rover}: ${(len / 1000).toFixed(2)} km drive · ${(probe.groundM / 1000).toFixed(2)} km window → ${pts.length} tiles (every ${(intervalM / 1000).toFixed(2)} km)`,
  );

  type Tile = { id: string; lat: number; lon: number; outputPath: string; crop: NacCrop };
  const tiles: Tile[] = [];
  for (let i = 0; i < pts.length; i++) {
    const [lat, lon] = pts[i];
    const id =
      i === 0 ? 'start' : i === pts.length - 1 ? 'end' : `km-${String(i).padStart(2, '0')}`;
    const outputPath = path.join(outDir, `${id}.jpg`);
    const crop = await cropNacAt(rover, lat, lon, outputPath);
    if (!crop) {
      console.log(`  ✗ ${id}: no LROC NAC coverage`);
      continue;
    }
    tiles.push({ id, lat, lon, outputPath, crop });
    console.log(
      `  ✓ ${id.padEnd(8)} ← ${crop.productId} (${crop.resolutionMPerPx.toFixed(2)} m/px · ${(crop.groundM / 1000).toFixed(2)} km)`,
    );
  }

  // Perceptual-dedup safety net: drop any same-image tile (keep the first).
  const kept: Tile[] = [];
  const keptHashes: boolean[][] = [];
  for (const t of tiles) {
    const h = await dHash(t.outputPath);
    const dup = kept.find((_, j) => hamming(h, keptHashes[j]) <= 6);
    if (dup) {
      console.log(`  ⊖ ${t.id.padEnd(8)} dropped — near-duplicate of ${dup.id}`);
      await fs.rm(t.outputPath, { force: true });
      continue;
    }
    kept.push(t);
    keptHashes.push(h);
  }

  const manifest = kept.map((t) => ({
    id: t.id,
    lat: Number(t.lat.toFixed(5)),
    lon: Number(t.lon.toFixed(5)),
    kind: 'feature',
    label:
      t.id === 'start'
        ? 'Landing / drive start'
        : t.id === 'end'
          ? 'Final position'
          : 'Along route',
    image: `/${path.relative('static', t.outputPath)}`,
    product_id: t.crop.productId,
    instrument: 'LROC NAC',
    resolution_m_per_px: Number(t.crop.resolutionMPerPx.toFixed(2)),
    ground_m: t.crop.groundM,
  }));

  const manifestPath = path.join('static/data/moon-traverses', `${rover}.route-patches.json`);
  await fs.writeFile(
    manifestPath,
    JSON.stringify({ rover_id: rover, patches: manifest }, null, 2) + '\n',
  );
  const drops = tiles.length - kept.length;
  console.log(
    `  ${kept.length}/${pts.length} → ${manifestPath}${drops ? ` (${drops} deduped)` : ''}`,
  );

  // Prune stale provenance (deduped-away / no-longer-produced) so nothing
  // points at a deleted file (ADR-046), then upsert the kept tiles.
  const keptPaths = kept.map((t) => `/${path.relative('static', t.outputPath)}`);
  await pruneProvenanceUnder(`/images/hotspots/moon/${rover}/traverse/`, keptPaths);
  if (kept.length) {
    const prov = kept.map((t) =>
      buildLrocProvenanceEntry({
        outputPath: t.outputPath,
        sourceUrl: t.crop.sourceUrl,
        productId: t.crop.productId,
        siteId: rover,
        centerLat: t.lat,
        centerLon: t.lon,
      }),
    );
    await upsertProvenanceEntries(prov);
    console.log(`  provenance: ${prov.length} route entries (NASA · LROC NAC)`);
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const idx = args.indexOf('--rover');
  const rovers = idx >= 0 ? [args[idx + 1]] : ALL_ROVERS;
  for (const r of rovers) await doRover(r);
  console.log('\nDone.');
}

await main();
