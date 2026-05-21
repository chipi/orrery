/**
 * Inspect the actual pixel pattern at the target — find out whether
 * "50 % no-data" is genuine swath gaps or an artifact of our read
 * (wrong band, stride, sub-sampling, etc.).
 */
import { createHash } from 'node:crypto';
import path from 'node:path';
import gdal from 'gdal-async';
import { hiriseProductIdToJP2Url } from './hotspots/hirise-catalog.ts';

const [, , productId, latStr, lonStr] = process.argv;
if (!productId || !latStr || !lonStr) {
  console.error('Usage: tsx scripts/_hirise-pattern.ts <productId> <lat> <lon>');
  process.exit(2);
}
const targetLat = parseFloat(latStr);
const targetLon = parseFloat(lonStr);
const url = hiriseProductIdToJP2Url(productId);
const hash = createHash('sha256').update(url).digest('hex').slice(0, 16);
const cachePath = path.join('.image-cache/hotspots/raw', `${hash}.JP2`);

const ds = await gdal.openAsync(cachePath);
const w = ds.rasterSize.x;
const h = ds.rasterSize.y;
const srs = ds.srs!;
const gt = ds.geoTransform!;
console.log(`${productId}: raster ${w}×${h}, bands=${ds.bands.count()}`);

// projection → pixel
const wkt = srs.toWKT();
const lat0Match = wkt.match(/PARAMETER\["latitude_of_origin",([-0-9.]+)\]/);
const lat0Deg = lat0Match ? parseFloat(lat0Match[1]) : 0;
const lat0Rad = (lat0Deg * Math.PI) / 180;
const rMatch = wkt.match(/SPHEROID\["[^"]*",([0-9.]+)/);
const R = rMatch ? parseFloat(rMatch[1]) : 3396190;
const llSrs = srs.cloneGeogCS()!;
const xform = new gdal.CoordinateTransformation(llSrs, srs);
const projected = xform.transformPoint(targetLon, targetLat);
const xCorr = lat0Deg === 0 ? projected.x : projected.x * Math.cos(lat0Rad);
const yCorr = lat0Deg === 0 ? projected.y : projected.y + R * lat0Rad;
const dx = xCorr - gt[0];
const dy = yCorr - gt[3];
const px = Math.round(dx / gt[1]);
const py = Math.round(dy / gt[5]);
console.log(`Target pixel: (${px}, ${py})`);

// Read 16×16 sample, dump as ASCII grid showing which pixels are zero
const SIZE = 16;
const left = Math.max(0, Math.min(w - SIZE, px - SIZE / 2));
const top = Math.max(0, Math.min(h - SIZE, py - SIZE / 2));

for (let bandIdx = 1; bandIdx <= ds.bands.count(); bandIdx++) {
  const band = ds.bands.get(bandIdx);
  const data = await band.pixels.readAsync(left, top, SIZE, SIZE);
  const buf = Buffer.from(data.buffer, data.byteOffset, data.byteLength);
  console.log(`\nBand ${bandIdx} sample (16×16 at offset ${left},${top}):`);
  console.log('  values:');
  for (let r = 0; r < SIZE; r++) {
    const row: string[] = [];
    for (let c = 0; c < SIZE; c++) {
      const v = buf[r * SIZE + c];
      row.push(String(v).padStart(3, ' '));
    }
    console.log('    ' + row.join(' '));
  }
  console.log('  zero-mask (. = data, X = zero):');
  for (let r = 0; r < SIZE; r++) {
    let row = '    ';
    for (let c = 0; c < SIZE; c++) {
      const v = buf[r * SIZE + c];
      row += v <= 2 ? 'X' : '.';
    }
    console.log(row);
  }
}
