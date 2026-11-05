/**
 * Elevation along each Mars traverse (#641): `point_elev_m`, one per point,
 * for the Journey tab's profile.
 *
 * - Curiosity / Perseverance: the rover's own localized elevation from NASA's
 *   MMGIS drive waypoints (`elev_geoid`, m above the areoid), matched to points
 *   the same way add-mmgis-point-sols.ts matches sols.
 * - Spirit / Opportunity / Zhurong: no elevation in their tables (MER z = 0), so
 *   sampled from the USGS HRSC + MOLA blended DEM (200 m/px, m above the
 *   areoid) by range reads of its cloud-optimised GeoTIFF — no 11 GB download.
 *   200 m blurs small relief (Victoria's 70 m walls); it shows the climbs
 *   (Husband Hill, Endeavour's rim).
 *
 * Run (repo Node 22 via mise, for gdal-async):
 *   node --import tsx scripts/hotspots/add-route-elevation.ts [--rover spirit]
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';
import gdal from 'gdal-async';

const DEM_URL =
  '/vsicurl/https://asc-pds-services.s3.us-west-2.amazonaws.com/mosaic/Mars/HRSC_MOLA_Blend/Mars_HRSC_MOLA_BlendDEM_Global_200mp_v2.tif';
const DEM_SOURCE = 'USGS HRSC + MOLA blended DEM v2, 200 m/px';
const MMGIS: Record<string, string> = {
  curiosity: 'https://mars.nasa.gov/mmgis-maps/MSL/Layers/json/MSL_waypoints.json',
  perseverance: 'https://mars.nasa.gov/mmgis-maps/M20/Layers/json/M20_waypoints.json',
};
const ROVERS = ['spirit', 'opportunity', 'zhurong', 'curiosity', 'perseverance'];

interface Waypoint {
  lat: number;
  lon: number;
  elev_geoid?: number;
}

function d2(lat: number, lon: number, w: Waypoint): number {
  const dLon = (lon - w.lon) * Math.cos((lat * Math.PI) / 180);
  return (lat - w.lat) ** 2 + dLon ** 2;
}

async function fromWaypoints(url: string, points: [number, number][]): Promise<number[]> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  const wps = ((await res.json()) as { features: { properties: Waypoint }[] }).features
    .map((f) => f.properties)
    .filter((p) => Number.isFinite(p.elev_geoid));
  const out: number[] = [];
  let j = 0;
  const WINDOW = 60;
  for (const [lat, lon] of points) {
    let best = j;
    for (let k = j; k < Math.min(wps.length, j + WINDOW); k++) {
      if (d2(lat, lon, wps[k]) < d2(lat, lon, wps[best])) best = k;
    }
    j = best;
    out.push(Math.round(wps[j].elev_geoid as number));
  }
  return out;
}

async function fromDem(points: [number, number][]): Promise<number[]> {
  const ds = await gdal.openAsync(DEM_URL);
  const band = await ds.bands.getAsync(1);
  const srs = ds.srs;
  const gt = ds.geoTransform;
  if (!srs || !gt) throw new Error('DEM has no georeferencing');
  const geo = srs.cloneGeogCS();
  const tr = new gdal.CoordinateTransformation(geo, srs);
  const out: number[] = [];
  for (const [lat, lon] of points) {
    const p = tr.transformPoint(lon, lat);
    const px = Math.floor((p.x - gt[0]) / gt[1]);
    const py = Math.floor((p.y - gt[3]) / gt[5]);
    const v = (await band.pixels.readAsync(px, py, 1, 1)) as ArrayLike<number>;
    out.push(Math.round(v[0]));
  }
  return out;
}

async function main() {
  const args = process.argv.slice(2);
  const only = args.includes('--rover') ? args[args.indexOf('--rover') + 1] : undefined;
  for (const rover of ROVERS.filter((r) => !only || r === only)) {
    const p = path.join('static/data/mars-traverses', `${rover}.json`);
    const tr = JSON.parse(await fs.readFile(p, 'utf8'));
    const pts = tr.points as [number, number][];
    const elev = MMGIS[rover] ? await fromWaypoints(MMGIS[rover], pts) : await fromDem(pts);
    const { stops, ...rest } = tr;
    const out = {
      ...rest,
      point_elev_m: elev,
      elev_source: MMGIS[rover] ? 'NASA MMGIS drive waypoints (elev_geoid)' : DEM_SOURCE,
      stops,
    };
    await fs.writeFile(p, JSON.stringify(out, null, 2) + '\n');
    console.log(`${rover}: ${elev.length} points, ${Math.min(...elev)}…${Math.max(...elev)} m`);
  }
}

main();
