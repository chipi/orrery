/**
 * Geometric co-registration proof for Mars HiRISE detail crops (#309 / #15).
 *
 * The honest co-registration test is NOT image-similarity (HiRISE-vs-CTX
 * NCC is unreliable — different sun angles flip shadows). It's geometric:
 * the fetch pipeline crops a window CENTRED on the published lat/lon using
 * the source raster's projection. This re-runs that exact transform for
 * each site — (lat,lon) → projected (+ HiRISE Equirectangular correction)
 * → pixel — then inverse-maps the resulting crop-centre pixel back to
 * lat/lon and reports the residual in metres. A correct crop round-trips
 * to within sub-metre rounding; a gross error (wrong product / projection
 * bug) shows up as kilometres.
 *
 * Reads each site's HiRISE source URL from image-provenance.json and the
 * cached source raster from .image-cache/hotspots/raw.
 *
 * Run (Node 20 for gdal-async):
 *   ~/.nvm/versions/node/v20.20.2/bin/node scripts/hotspots/verify-coreg-geometry.mjs
 */
import gdal from 'gdal-async';
import { createHash } from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs';

const ROOT = process.cwd();
const RAW = path.join(ROOT, '.image-cache/hotspots/raw');

function cachePath(url) {
  const ext = path.extname(new URL(url).pathname) || '.bin';
  const h = createHash('sha256').update(url).digest('hex').slice(0, 16);
  return path.join(RAW, `${h}${ext}`);
}

/** Re-run the production (lat,lon)→pixel transform, then inverse it on the
 *  crop-centre pixel. Returns the residual in metres. */
function roundTrip(rasterPath, lat, lon) {
  const ds = gdal.open(rasterPath);
  const gt = ds.geoTransform;
  const srs = ds.srs;
  const wkt = srs.toWKT();
  const projName = (wkt.match(/PROJECTION\["([^"]+)"\]/) ?? [])[1] ?? '';
  const lat0 = parseFloat(
    (wkt.match(/PARAMETER\["latitude_of_origin",([-0-9.]+)\]/) ?? [])[1] ?? '0',
  );
  const R = parseFloat((wkt.match(/SPHEROID\["[^"]*",([0-9.]+)/) ?? [])[1] ?? '3394839.8133163');
  const lat0r = (lat0 * Math.PI) / 180;
  const eqcorr = projName === 'Equirectangular' && lat0 !== 0;

  const geo = srs.cloneGeogCS();
  const fwd = new gdal.CoordinateTransformation(geo, srs);
  const inv = new gdal.CoordinateTransformation(srs, geo);

  const p = fwd.transformPoint(lon, lat);
  let xc = p.x,
    yc = p.y;
  if (eqcorr) {
    xc = p.x * Math.cos(lat0r);
    yc = p.y + R * lat0r;
  }
  const det = gt[1] * gt[5] - gt[2] * gt[4];
  const col = ((xc - gt[0]) * gt[5] - (yc - gt[3]) * gt[2]) / det;
  const row = (-(xc - gt[0]) * gt[4] + (yc - gt[3]) * gt[1]) / det;

  // inverse: pixel → projected → uncorrect → geographic
  const X = gt[0] + col * gt[1] + row * gt[2];
  const Y = gt[3] + col * gt[4] + row * gt[5];
  let xu = X,
    yu = Y;
  if (eqcorr) {
    xu = X / Math.cos(lat0r);
    yu = Y - R * lat0r;
  }
  const g = inv.transformPoint(xu, yu);

  const inBounds = col >= 0 && col < ds.rasterSize.x && row >= 0 && row < ds.rasterSize.y;
  // residual: great-circle metres between (lat,lon) and the round-tripped point
  const mPerDegLat = (Math.PI / 180) * R;
  const dLat = (g.y - lat) * mPerDegLat;
  // Normalise the longitude delta to [-180,180] before converting to
  // metres — the site lon (0–360 or ±180) and GDAL's returned lon may use
  // different conventions, so a raw subtraction can wrap by 360° and
  // report a spurious ~half-planet residual on an otherwise exact crop.
  let dLonDeg = ((((g.x - lon + 180) % 360) + 360) % 360) - 180;
  const dLon = dLonDeg * mPerDegLat * Math.cos((lat * Math.PI) / 180);
  return { residualM: Math.hypot(dLat, dLon), inBounds, projName, lat0, res: Math.abs(gt[1]) };
}

function main() {
  const prov = JSON.parse(
    fs.readFileSync(path.join(ROOT, 'static/data/image-provenance.json'), 'utf8'),
  );
  const sites = JSON.parse(fs.readFileSync(path.join(ROOT, 'static/data/mars-sites.json'), 'utf8'));
  const byId = new Map(sites.map((s) => [s.id, s]));
  const flat = [];
  (function walk(o) {
    if (o && typeof o === 'object') {
      if (o.path) flat.push(o);
      for (const v of Object.values(o)) walk(v);
    }
  })(prov);

  let pass = 0,
    fail = 0;
  const rows = [];
  for (const e of flat) {
    const m = e.path?.match(/\/hotspots\/mars\/([a-z0-9-]+)\/tier2-hirise\.jpg$/);
    if (!m || !e.source_url?.includes('hirise')) continue;
    const site = byId.get(m[1]);
    if (!site) continue;
    const cp = cachePath(e.source_url);
    if (!fs.existsSync(cp)) {
      rows.push({ id: m[1], note: 'source raster not cached' });
      continue;
    }
    try {
      const r = roundTrip(cp, site.lat, site.lon);
      const ok = r.inBounds && r.residualM < 5;
      ok ? pass++ : fail++;
      rows.push({ id: m[1], ...r, ok });
    } catch (err) {
      fail++;
      rows.push({ id: m[1], note: `ERR ${err.message}` });
    }
  }
  rows.sort((a, b) => a.id.localeCompare(b.id));
  for (const r of rows) {
    if (r.note) {
      console.log(`  ${r.id.padEnd(16)} ${r.note}`);
      continue;
    }
    const flag = r.ok ? '✓' : '✗';
    console.log(
      `  ${flag} ${r.id.padEnd(16)} residual=${r.residualM.toFixed(2)}m  inBounds=${r.inBounds}  ${r.projName}${r.lat0 ? ` lat0=${r.lat0}` : ''} ${r.res}m/px`,
    );
  }
  console.log(`\n${pass}/${pass + fail} sites round-trip to site coords (<5 m residual)`);
  if (fail) process.exit(1);
}

main();
