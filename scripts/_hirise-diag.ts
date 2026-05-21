/**
 * Diagnostic: load a HiRISE JP2 from cache, print projection metadata,
 * map a target (lat, lon) to pixel coordinates BOTH with and without
 * the correctHiriseProjection compensation, and read a 32×32 sample
 * around the target so we can see if the projection lands us on real
 * pixel data or out-of-footprint void.
 *
 * Usage:
 *   npx tsx scripts/_hirise-diag.ts <productId> <lat> <lon>
 */
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import path from 'node:path';
import gdal from 'gdal-async';
import { hiriseProductIdToJP2Url } from './hotspots/hirise-catalog.ts';

const [, , productId, latStr, lonStr] = process.argv;
if (!productId || !latStr || !lonStr) {
  console.error('Usage: tsx scripts/_hirise-diag.ts <productId> <lat> <lon>');
  process.exit(2);
}
const targetLat = parseFloat(latStr);
const targetLon = parseFloat(lonStr);

const url = hiriseProductIdToJP2Url(productId);
const hash = createHash('sha256').update(url).digest('hex').slice(0, 16);
const cachePath = path.join('.image-cache/hotspots/raw', `${hash}.JP2`);
console.log(`URL:      ${url}`);
console.log(`Cache:    ${cachePath}`);
if (!existsSync(cachePath)) {
  console.log('  (cache miss — JP2 not yet downloaded. Run a fetch first.)');
  process.exit(1);
}

const ds = await gdal.openAsync(cachePath);
const w = ds.rasterSize.x;
const h = ds.rasterSize.y;
const srs = ds.srs;
const gt = ds.geoTransform;
const wkt = srs?.toWKT() ?? '(no SRS)';

console.log(`\nRaster:   ${w} × ${h}`);
console.log(`GeoTransform:`);
console.log(`  X = ${gt![0].toFixed(2)} + col·${gt![1].toFixed(4)} + row·${gt![2].toFixed(4)}`);
console.log(`  Y = ${gt![3].toFixed(2)} + col·${gt![4].toFixed(4)} + row·${gt![5].toFixed(4)}`);
console.log(`\nWKT (first 400 chars):`);
console.log(wkt.slice(0, 400));

// lat/lon → projected (GDAL transform)
const llSrs = srs!.cloneGeogCS()!;
const xform = new gdal.CoordinateTransformation(llSrs, srs!);
const projected = xform.transformPoint(targetLon, targetLat);
console.log(`\nGDAL transform of (lat=${targetLat}, lon=${targetLon}):`);
console.log(`  projected.x = ${projected.x.toFixed(2)}`);
console.log(`  projected.y = ${projected.y.toFixed(2)}`);

// Apply correctHiriseProjection
const lat0Match = wkt.match(/PARAMETER\["latitude_of_origin",([-0-9.]+)\]/);
const lat0Deg = lat0Match ? parseFloat(lat0Match[1]) : 0;
console.log(`\nlatitude_of_origin from WKT: ${lat0Deg}°`);
const lat0Rad = (lat0Deg * Math.PI) / 180;
const rMatch = wkt.match(/SPHEROID\["[^"]*",([0-9.]+)/);
const R = rMatch ? parseFloat(rMatch[1]) : 3394839.8133163;
console.log(`Spheroid R from WKT: ${R}`);

const xCorr = lat0Deg === 0 ? projected.x : projected.x * Math.cos(lat0Rad);
const yCorr = lat0Deg === 0 ? projected.y : projected.y + R * lat0Rad;
console.log(`\nAfter correctHiriseProjection:`);
console.log(`  xCorr = ${xCorr.toFixed(2)}`);
console.log(`  yCorr = ${yCorr.toFixed(2)}`);

// Project to pixel (with and without correction)
function projToPixel(x: number, y: number): [number, number] {
  const dx = x - gt![0];
  const dy = y - gt![3];
  const det = gt![1] * gt![5] - gt![2] * gt![4];
  const col = (dx * gt![5] - dy * gt![2]) / det;
  const row = (-dx * gt![4] + dy * gt![1]) / det;
  return [col, row];
}
const [pxRaw, pyRaw] = projToPixel(projected.x, projected.y);
const [pxC, pyC] = projToPixel(xCorr, yCorr);
console.log(`\nPixel coords for target:`);
console.log(
  `  RAW (no correction):   col=${pxRaw.toFixed(0)}, row=${pyRaw.toFixed(0)}  ${inRange(pxRaw, pyRaw, w, h)}`,
);
console.log(
  `  CORRECTED:             col=${pxC.toFixed(0)}, row=${pyC.toFixed(0)}  ${inRange(pxC, pyC, w, h)}`,
);

// Sample 32×32 around the CORRECTED pixel and around the RAW pixel
async function sample(label: string, px: number, py: number) {
  if (px < 0 || py < 0 || px >= w || py >= h) {
    console.log(`  ${label}: pixel out of bounds — would read garbage`);
    return;
  }
  const half = 16;
  const left = Math.max(0, Math.min(w - 32, Math.round(px - half)));
  const top = Math.max(0, Math.min(h - 32, Math.round(py - half)));
  const band = ds.bands.get(1);
  const data = await band.pixels.readAsync(left, top, 32, 32);
  const buf = Buffer.from(data.buffer, data.byteOffset, data.byteLength);
  let sum = 0,
    sum2 = 0,
    lo = 255,
    hi = 0,
    zeroes = 0;
  for (let i = 0; i < buf.length; i++) {
    const v = buf[i];
    sum += v;
    sum2 += v * v;
    if (v < lo) lo = v;
    if (v > hi) hi = v;
    if (v <= 2) zeroes++;
  }
  const mean = sum / buf.length;
  const stddev = Math.sqrt(sum2 / buf.length - mean * mean);
  console.log(
    `  ${label}: mean=${mean.toFixed(1)}, stddev=${stddev.toFixed(1)}, min=${lo}, max=${hi}, zeroes=${((zeroes / buf.length) * 100).toFixed(0)}%`,
  );
}
console.log(`\n32×32 sample around each pixel:`);
await sample('  RAW       ', pxRaw, pyRaw);
await sample('  CORRECTED ', pxC, pyC);

function inRange(c: number, r: number, w: number, h: number): string {
  return c >= 0 && r >= 0 && c < w && r < h ? '✓ in-bounds' : '✗ OUT OF BOUNDS';
}
