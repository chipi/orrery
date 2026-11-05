/**
 * Give Curiosity's and Perseverance's traverse points a sol each
 * (`point_sols`, one per point), from NASA's MMGIS drive waypoints — the
 * rover-position layer behind the mission location maps, one record per
 * drive end with its sol and total distance.
 *
 * The traverse polyline itself carries no sols (MSL_traverse.json has only a
 * `Length`). Waypoints and points both run in drive order, so each point takes
 * the sol of the nearest waypoint among the next few, searching forward only: the result never
 * goes back in time even where the rover re-crossed its own track.
 *
 * Run: node --import tsx scripts/hotspots/add-mmgis-point-sols.ts --rover curiosity|perseverance
 * Geometry is untouched; only `point_sols` is written.
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';

const WAYPOINTS: Record<string, string> = {
  curiosity: 'https://mars.nasa.gov/mmgis-maps/MSL/Layers/json/MSL_waypoints.json',
  perseverance: 'https://mars.nasa.gov/mmgis-maps/M20/Layers/json/M20_waypoints.json',
};

interface Waypoint {
  sol: number;
  lat: number;
  lon: number;
}

function d2(lat: number, lon: number, w: Waypoint): number {
  const dLon = (lon - w.lon) * Math.cos((lat * Math.PI) / 180);
  return (lat - w.lat) ** 2 + dLon ** 2;
}

async function main() {
  const args = process.argv.slice(2);
  const rover = args.includes('--rover') ? args[args.indexOf('--rover') + 1] : undefined;
  const url = rover ? WAYPOINTS[rover] : undefined;
  if (!rover || !url) throw new Error(`--rover ${Object.keys(WAYPOINTS).join('|')}`);

  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  const fc = (await res.json()) as { features: { properties: Waypoint }[] };
  const wps = fc.features.map((f) => f.properties).filter((p) => Number.isFinite(p.sol));
  if (!wps.length) throw new Error('no waypoints');

  const outPath = path.join('static/data/mars-traverses', `${rover}.json`);
  const tr = JSON.parse(await fs.readFile(outPath, 'utf8'));
  const sols: number[] = [];
  let j = 0;
  // Nearest within the next WINDOW waypoints: a plain "advance while the next
  // one is closer" stalls on the first waypoint that is momentarily farther.
  const WINDOW = 60;
  for (const [lat, lon] of tr.points as [number, number][]) {
    let best = j;
    for (let k = j; k < Math.min(wps.length, j + WINDOW); k++) {
      if (d2(lat, lon, wps[k]) < d2(lat, lon, wps[best])) best = k;
    }
    j = best;
    sols.push(wps[j].sol);
  }
  const { stops, ...rest } = tr;
  await fs.writeFile(outPath, JSON.stringify({ ...rest, point_sols: sols, stops }, null, 2) + '\n');
  console.log(
    `${rover}: ${sols.length} points ← ${wps.length} waypoints; sols ${sols[0]}–${sols.at(-1)}`,
  );
}

main();
