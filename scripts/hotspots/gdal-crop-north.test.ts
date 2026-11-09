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
    // Centre of the densest 13-px window of saturated pixels: the painted line (9 px wide)
    // fills it, the stretched background fills at most a few px of any window.
    const colAtRow = (row: number): number => {
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
    };
    const top = colAtRow(h / 2 - 300);
    const bottom = colAtRow(h / 2 + 300);
    expect(Math.abs(top - w / 2)).toBeLessThanOrEqual(4);
    expect(Math.abs(bottom - w / 2)).toBeLessThanOrEqual(4);
  }, 60_000);
});
