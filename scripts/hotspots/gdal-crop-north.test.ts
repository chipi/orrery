import gdal from 'gdal-async';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { cropRemoteRasterToLatLon } from './gdal-crop.ts';

// The surface scene draws every Tier 2 patch as a NORTH-UP texture
// (hotspot-surface-patch.ts, lat_offset_m -> -Z). A HiRISE RDR in a polar
// stereographic grid (Phoenix, 68 N) has image-up != north, so the crop must be
// warped to the site-local north-up frame. This raster is such a grid with a
// meridian painted through the target: in a north-up crop it is a vertical line.
const POLAR_WKT =
  'PROJCS["Polar_Stereographic MARS",GEOGCS["GCS_MARS",DATUM["unnamed",SPHEROID["unnamed",3376200,0]],PRIMEM["Reference meridian",0],UNIT["degree",0.0174532925199433]],PROJECTION["Polar_Stereographic"],PARAMETER["latitude_of_origin",90],PARAMETER["central_meridian",0],PARAMETER["false_easting",0],PARAMETER["false_northing",0],UNIT["metre",1],AXIS["Easting",SOUTH],AXIS["Northing",SOUTH]]';

const dir = mkdtempSync(path.join(tmpdir(), 'gdal-crop-north-'));
afterAll(() => rmSync(dir, { recursive: true, force: true }));

function buildPolarRaster(rasterPath: string): { lat: number; lon: number } {
  const size = 3000;
  const gt = [-1072121.375, 0.25, 0, 768993.875, 0, -0.25];
  const srs = gdal.SpatialReference.fromWKT(POLAR_WKT);
  const geo = srs.cloneGeogCS()!;
  const fwd = new gdal.CoordinateTransformation(geo, srs);
  const inv = new gdal.CoordinateTransformation(srs, geo);
  const centre = inv.transformPoint(gt[0] + 1500 * gt[1], gt[3] + 1500 * gt[5]);
  const lon = centre.x;
  const lat = centre.y;

  const ds = gdal.drivers.get('GTiff').create(rasterPath, size, size, 1, gdal.GDT_UInt16);
  ds.srs = srs;
  ds.geoTransform = gt;
  const band = ds.bands.get(1);
  const data = new Uint16Array(size * size);
  for (let i = 0; i < data.length; i++)
    data[i] = 800 + (((i % size) + Math.floor(i / size)) % 16) * 10;
  for (let dLat = -0.012; dLat <= 0.012; dLat += 0.00002) {
    const p = fwd.transformPoint(lon, lat + dLat);
    const col = Math.round((p.x - gt[0]) / gt[1]);
    const row = Math.round((p.y - gt[3]) / gt[5]);
    for (let dy = -4; dy <= 4; dy++) {
      for (let dx = -4; dx <= 4; dx++) {
        const c = col + dx;
        const r = row + dy;
        if (c >= 0 && c < size && r >= 0 && r < size) data[r * size + c] = 4000;
      }
    }
  }
  band.pixels.write(0, 0, size, size, data);
  ds.flush();
  ds.close();
  return { lat, lon };
}

// Centre of the densest 13-px window of saturated pixels: the painted line (9 px wide)
// fills it, the stretched background fills at most a few px of any window.
function lineColAtRow(px: Uint8Array, w: number, row: number): number {
  let best = -1000;
  let bestCount = 0;
  for (let c = 6; c < w - 6; c++) {
    let n = 0;
    for (let k = -6; k <= 6; k++) if (px[row * w + c + k] >= 250) n++;
    if (n > bestCount) {
      bestCount = n;
      best = c;
    }
  }
  return best;
}

// HiRISE RDRs are Equirectangular with latitude_of_origin = the swath's centre latitude
// (Perseverance 15 N), and GDAL's reading of that needs correctHiriseProjection. North is
// straight up there, so the crop must stay a plain window (no re-projection, no black).
const EQUIRECT_LAT0_WKT =
  'PROJCS["Equirectangular MARS",GEOGCS["GCS_MARS",DATUM["unnamed",SPHEROID["unnamed",3394839.8133163,0]],PRIMEM["Reference meridian",0],UNIT["degree",0.0174532925199433]],PROJECTION["Equirectangular"],PARAMETER["latitude_of_origin",15],PARAMETER["central_meridian",180],PARAMETER["standard_parallel_1",0],PARAMETER["false_easting",0],PARAMETER["false_northing",0],UNIT["metre",1],AXIS["Easting",EAST],AXIS["Northing",NORTH]]';

describe('gdal-crop: polar-stereographic raster is cut north-up', () => {
  it('a meridian through the target is a vertical line in the crop', async () => {
    const rasterPath = path.join(dir, 'polar.tif');
    const { lat, lon } = buildPolarRaster(rasterPath);
    const outputPath = path.join(dir, 'out.jpg');
    await cropRemoteRasterToLatLon({
      localRasterPath: rasterPath,
      targetLat: lat,
      targetLon: lon,
      outputPath,
      cropSize: 1024,
    });
    const out = gdal.open(outputPath);
    const w = out.rasterSize.x;
    const h = out.rasterSize.y;
    const px = out.bands.get(1).pixels.read(0, 0, w, h) as Uint8Array;
    out.close();
    const top = lineColAtRow(px, w, h / 2 - 300);
    const bottom = lineColAtRow(px, w, h / 2 + 300);
    expect(Math.abs(top - w / 2)).toBeLessThanOrEqual(4);
    expect(Math.abs(bottom - w / 2)).toBeLessThanOrEqual(4);
  }, 60_000);
});

describe('gdal-crop: equirectangular raster with latitude_of_origin != 0 is not re-projected', () => {
  it('keeps a vertical line vertical and the crop whole', async () => {
    const size = 3000;
    const lat0 = 15;
    const R = 3394839.8133163;
    const gt = [-5873740.125, 0.25, 0, 1101732.875, 0, -0.25];
    const srs = gdal.SpatialReference.fromWKT(EQUIRECT_LAT0_WKT);
    const inv = new gdal.CoordinateTransformation(srs, srs.cloneGeogCS()!);
    const xCorr = gt[0] + 1500 * gt[1];
    const yCorr = gt[3] + 1500 * gt[5];
    const centre = inv.transformPoint(
      xCorr / Math.cos((lat0 * Math.PI) / 180),
      yCorr - (R * lat0 * Math.PI) / 180,
    );
    const rasterPath = path.join(dir, 'equirect.tif');
    const ds = gdal.drivers.get('GTiff').create(rasterPath, size, size, 1, gdal.GDT_UInt16);
    ds.srs = srs;
    ds.geoTransform = gt;
    const data = new Uint16Array(size * size);
    for (let i = 0; i < data.length; i++)
      data[i] = 800 + (((i % size) + Math.floor(i / size)) % 16) * 10;
    for (let r = 0; r < size; r++) for (let c = 1496; c <= 1504; c++) data[r * size + c] = 4000;
    ds.bands.get(1).pixels.write(0, 0, size, size, data);
    ds.flush();
    ds.close();
    const outputPath = path.join(dir, 'equirect-out.jpg');
    await cropRemoteRasterToLatLon({
      localRasterPath: rasterPath,
      targetLat: centre.y,
      targetLon: centre.x,
      outputPath,
      cropSize: 1024,
    });
    const out = gdal.open(outputPath);
    const w = out.rasterSize.x;
    const h = out.rasterSize.y;
    const px = out.bands.get(1).pixels.read(0, 0, w, h) as Uint8Array;
    out.close();
    expect(Math.abs(lineColAtRow(px, w, h / 2 - 300) - w / 2)).toBeLessThanOrEqual(4);
    expect(Math.abs(lineColAtRow(px, w, h / 2 + 300) - w / 2)).toBeLessThanOrEqual(4);
  }, 60_000);
});

// Earth launch pads are cut from Sentinel-2 UTM tiles (fetch-earth-pads.ts). The surface scene
// draws every patch north-up, so a UTM crop whose grid convergence exceeds the 0.5 degree
// threshold (Vandenberg, UTM 10N, 2.4 degrees from the meridian: about 1.4 degrees) must be
// warped north-up, whole and three-band; one on the central meridian stays a plain window.
function meridianCentroidCol(px: Uint8Array, w: number, row: number): number {
  let sum = 0;
  let n = 0;
  for (let r = row - 5; r <= row + 5; r++)
    for (let c = 0; c < w; c++)
      if (px[r * w + c] >= 200) {
        sum += c;
        n++;
      }
  return n ? sum / n : -1000;
}

function buildUtmRaster(rasterPath: string, lat: number, lon: number): void {
  const size = 3000;
  const utm = gdal.SpatialReference.fromEPSG(32610);
  const geo = utm.cloneGeogCS()!;
  const fwd = new gdal.CoordinateTransformation(geo, utm);
  const toUtm = (la: number, lo: number) =>
    geo.EPSGTreatsAsLatLong() ? fwd.transformPoint(la, lo) : fwd.transformPoint(lo, la);
  const c = toUtm(lat, lon);
  const gt = [c.x - 1500 * 10, 10, 0, c.y + 1500 * 10, 0, -10];
  const ds = gdal.drivers.get('GTiff').create(rasterPath, size, size, 3, gdal.GDT_Byte);
  ds.srs = utm;
  ds.geoTransform = gt;
  const data = new Uint8Array(size * size);
  for (let i = 0; i < data.length; i++)
    data[i] = 60 + (((i % size) + Math.floor(i / size)) % 16) * 5;
  for (let dLat = -0.07; dLat <= 0.07; dLat += 0.0001) {
    const p = toUtm(lat + dLat, lon);
    const col = Math.round((p.x - gt[0]) / gt[1]);
    const row = Math.round((p.y - gt[3]) / gt[5]);
    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -1; dx <= 1; dx++) {
        const cc = col + dx;
        const rr = row + dy;
        if (cc >= 0 && cc < size && rr >= 0 && rr < size) data[rr * size + cc] = 255;
      }
  }
  for (let b = 1; b <= 3; b++) ds.bands.get(b).pixels.write(0, 0, size, size, data);
  ds.flush();
  ds.close();
}

async function cropUtm(
  name: string,
  lat: number,
  lon: number,
): Promise<{ px: Uint8Array; w: number; h: number; bands: number }> {
  const rasterPath = path.join(dir, `${name}.tif`);
  buildUtmRaster(rasterPath, lat, lon);
  const outputPath = path.join(dir, `${name}-out.jpg`);
  await cropRemoteRasterToLatLon({
    localRasterPath: rasterPath,
    targetLat: lat,
    targetLon: lon,
    outputPath,
    cropSize: 1024,
    requireCentered: true,
  });
  const out = gdal.open(outputPath);
  const w = out.rasterSize.x;
  const h = out.rasterSize.y;
  const px = out.bands.get(1).pixels.read(0, 0, w, h) as Uint8Array;
  const bands = out.bands.count();
  out.close();
  return { px, w, h, bands };
}

describe('gdal-crop: Earth UTM pad raster', () => {
  it('far from the zone meridian (convergence ~1.4 deg) is warped north-up, whole, 3 bands', async () => {
    const { px, w, h, bands } = await cropUtm('utm-far', 34.632, -120.611);
    expect(bands).toBe(3);
    let black = 0;
    for (const v of px) if (v < 10) black++;
    expect(black / px.length).toBeLessThan(0.01);
    expect(Math.abs(meridianCentroidCol(px, w, h / 2 - 300) - w / 2)).toBeLessThanOrEqual(2);
    expect(Math.abs(meridianCentroidCol(px, w, h / 2 + 300) - w / 2)).toBeLessThanOrEqual(2);
  }, 60_000);

  it('on the central meridian (convergence 0) stays a plain window, meridian vertical', async () => {
    const { px, w, h } = await cropUtm('utm-centre', 34.632, -123);
    expect(Math.abs(meridianCentroidCol(px, w, h / 2 - 300) - w / 2)).toBeLessThanOrEqual(2);
    expect(Math.abs(meridianCentroidCol(px, w, h / 2 + 300) - w / 2)).toBeLessThanOrEqual(2);
  }, 60_000);
});
