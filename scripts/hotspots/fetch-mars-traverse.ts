/**
 * Fetch HiRISE detail crops ALONG a rover's traverse (#360) so there's
 * high-res zoom capability anywhere the rover drove, not just at the
 * landing site. Companion to fetch-mars.ts (which does the single landing
 * patch) — reuses its candidate ranking (findHiriseCandidates) + crop
 * machinery (cropRemoteRasterToLatLon).
 *
 * Sampling: every curated `stop` (drill/sample/pano/feature) + an interval
 * fill (default 2 km) along the polyline, de-duped so an interval point
 * never lands on top of a stop. Each sample → a 512 m HiRISE crop.
 *
 * Cache locality: consecutive route points usually fall in the SAME HiRISE
 * swath, so we try the previous point's winning product first → most points
 * reuse an already-downloaded raster (near-free crops).
 *
 * Output:
 *   static/images/hotspots/mars/<rover>/traverse/<id>.jpg
 *   static/data/mars-traverses/<rover>.route-patches.json  (render manifest)
 *
 * Run (Node 20 for gdal-async):
 *   node --import tsx scripts/hotspots/fetch-mars-traverse.ts --rover curiosity [--interval-km 2]
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { findHiriseCandidates, hiriseProductIdToJP2Url } from './hirise-catalog.ts';
import { cropRemoteRasterToLatLon, CropError } from './gdal-crop.ts';
import { buildHiriseProvenanceEntry, upsertProvenanceEntries } from './provenance.ts';

const MARS_RADIUS_M = 3389500;
const M_PER_DEG = (Math.PI / 180) * MARS_RADIUS_M;
// Crop 2048 source px (≈512 m of ground at 0.25 m/px) for the true ground
// extent, then downsample the OUTPUT to OUTPUT_PX. Route patches render
// small (0.1u) until the deepest zoom, so 1024² is plenty and ~4× lighter
// than the full-res landing patches (#360 repo-weight decision).
const CROP_PX = 2048;
const OUTPUT_PX = 1024;
const POLITE_PAUSE_MS = 1500;
const MAX_CANDIDATES = 8;

interface RoverTraverse {
  rover_id: string;
  points: [number, number][];
  stops?: { id: string; lat: number; lon: number; kind: string; label?: string; sol?: number }[];
}
interface Sample {
  id: string;
  lat: number;
  lon: number;
  kind: string;
  label?: string;
}

function metresBetween(a: [number, number], b: [number, number]): number {
  const dLat = (b[0] - a[0]) * M_PER_DEG;
  const dLon = (b[1] - a[1]) * M_PER_DEG * Math.cos((a[0] * Math.PI) / 180);
  return Math.hypot(dLat, dLon);
}

/** Resample the polyline at a fixed ground interval — walk cumulative arc
 *  length and emit an interpolated point each time we pass a multiple of
 *  `intervalM`. */
function resample(points: [number, number][], intervalM: number): [number, number][] {
  const out: [number, number][] = [points[0]];
  let cum = 0;
  let nextAt = intervalM;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    const segLen = metresBetween(a, b);
    if (segLen === 0) continue;
    while (nextAt <= cum + segLen) {
      const t = (nextAt - cum) / segLen;
      out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
      nextAt += intervalM;
    }
    cum += segLen;
  }
  return out;
}

function buildSamples(tr: RoverTraverse, intervalM: number): Sample[] {
  const samples: Sample[] = [];
  for (const s of tr.stops ?? []) {
    samples.push({ id: s.id, lat: s.lat, lon: s.lon, kind: s.kind, label: s.label });
  }
  // Interval fill. Drop a fill point only when it nearly coincides with a
  // stop — half the interval (capped at 300 m) so we don't double-crop the
  // exact same ground, while keeping near-continuous coverage between stops.
  const dedupM = Math.min(300, intervalM * 0.5);
  const interval = resample(tr.points, intervalM);
  let n = 0;
  for (const [lat, lon] of interval) {
    const tooClose = samples.some((s) => metresBetween([s.lat, s.lon], [lat, lon]) < dedupM);
    if (tooClose) continue;
    samples.push({ id: `km-${String(++n).padStart(2, '0')}`, lat, lon, kind: 'route' });
  }
  return samples;
}

async function main() {
  const args = process.argv.slice(2);
  const rover = args[args.indexOf('--rover') + 1] ?? 'curiosity';
  const intervalKm = parseFloat(args[args.indexOf('--interval-km') + 1] ?? '2');
  const intervalM = intervalKm * 1000;

  const trPath = path.join('static/data/mars-traverses', `${rover}.json`);
  const tr = JSON.parse(await fs.readFile(trPath, 'utf8')) as RoverTraverse;
  const samples = buildSamples(tr, intervalM);
  console.log(
    `${rover}: ${tr.points.length} points, ${tr.stops?.length ?? 0} stops → ${samples.length} HiRISE samples (interval ${intervalKm} km)`,
  );

  const outDir = path.join('static/images/hotspots/mars', rover, 'traverse');
  await fs.mkdir(outDir, { recursive: true });

  const manifest: Array<Record<string, unknown>> = [];
  let lastProduct: string | null = null;
  for (let i = 0; i < samples.length; i++) {
    const s = samples[i];
    const outputPath = path.join(outDir, `${s.id}.jpg`);
    // Candidate list: previous winning product first (cache locality),
    // then the catalog ranking for this point.
    const ranked = await findHiriseCandidates({
      targetLat: s.lat,
      targetLon: s.lon,
      searchRadiusKm: 100,
    });
    const ids = [
      ...(lastProduct ? [lastProduct] : []),
      ...ranked.slice(0, MAX_CANDIDATES).map((c) => c.productId),
    ].filter((v, idx, a) => a.indexOf(v) === idx);

    let done = false;
    const rejections: string[] = [];
    for (const productId of ids) {
      try {
        const crop = await cropRemoteRasterToLatLon({
          sourceUrl: hiriseProductIdToJP2Url(productId),
          targetLat: s.lat,
          targetLon: s.lon,
          outputPath,
          cropSize: CROP_PX,
        });
        // Downsample the 2048² crop → OUTPUT_PX in place (ground extent
        // unchanged; just lighter pixels). Read to a buffer first since
        // sharp can't read+write the same path.
        const full = await fs.readFile(outputPath);
        await fs.writeFile(
          outputPath,
          await sharp(full)
            .resize(OUTPUT_PX, OUTPUT_PX, { fit: 'fill' })
            .jpeg({ quality: 85 })
            .toBuffer(),
        );
        lastProduct = productId;
        manifest.push({
          id: s.id,
          lat: s.lat,
          lon: s.lon,
          kind: s.kind,
          label: s.label,
          image: `/${path.relative('static', outputPath)}`,
          product_id: productId,
          resolution_m_per_px: crop.resolutionMPerPx,
          ground_m: Math.round(CROP_PX * crop.resolutionMPerPx),
        });
        console.log(
          `  ✓ ${s.id.padEnd(10)} ${s.kind.padEnd(8)} ← ${productId} (${crop.resolutionMPerPx.toFixed(2)} m/px)${productId === ids[0] && lastProduct === productId && ids[0] === productId ? '' : ''}`,
        );
        done = true;
        break;
      } catch (err) {
        const code = err instanceof CropError ? err.code : 'ERR';
        rejections.push(`${productId}:${code}`);
        if (!(err instanceof CropError)) throw err;
      }
    }
    if (!done) {
      console.log(
        `  ✗ ${s.id.padEnd(10)} ${s.kind.padEnd(8)} — no covering product (${rejections.join(', ')})`,
      );
    }
    if (i < samples.length - 1) await new Promise((r) => setTimeout(r, POLITE_PAUSE_MS));
  }

  const manifestPath = path.join('static/data/mars-traverses', `${rover}.route-patches.json`);
  await fs.writeFile(
    manifestPath,
    JSON.stringify({ rover_id: rover, patches: manifest }, null, 2) + '\n',
  );
  console.log(`\n${manifest.length}/${samples.length} crops written → ${manifestPath}`);

  // Self-credit (#360 / credits): upsert an image-provenance entry for each
  // route crop so /credits attributes them (NASA · HiRISE · MRO) without a
  // separate backfill. buildHiriseProvenanceEntry stamps the MRO spacecraft
  // fields. Idempotent by id (path hash).
  if (manifest.length) {
    const provEntries = manifest.map((m) =>
      buildHiriseProvenanceEntry({
        outputPath: `static${m.image as string}`,
        sourceUrl: hiriseProductIdToJP2Url(m.product_id as string),
        productId: m.product_id as string,
        siteId: rover,
        centerLat: m.lat as number,
        centerLon: m.lon as number,
      }),
    );
    await upsertProvenanceEntries(provEntries);
    console.log(`Provenance: ${provEntries.length} route entries upserted (MRO · HiRISE).`);
  }
}

main();
