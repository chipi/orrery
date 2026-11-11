import { promises as fs } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

/**
 * Moon rover traverse from an LROC traverse GeoJSON (the track the LRO Camera
 * team mapped from NAC images). LROC stores a drive as many LineString
 * features in NO drive order, with stray pieces (e.g. a stub that is not
 * linked to the lander). Concatenating them in file order draws straight
 * lines between the pieces, so the pieces are chained instead: start at the
 * end nearest the landing site, repeatedly take the unused piece whose end
 * lies closest to where the chain stops (flipping it if needed, within
 * `--tol` metres), and leave out whatever never connects.
 *
 * Run:  npx tsx scripts/hotspots/build-lroc-traverse.ts --rover change4 \
 *         --url https://www.lroc.asu.edu/geojson/luna_change_4_traverse.geojson \
 *         [--geojson local.geojson] [--dp 0.5] [--tol 25] [--dry]
 * Writes static/data/moon-traverses/<rover>.json (points + credit), taking
 * the landing site from static/data/moon-sites.json.
 */

const MOON_RADIUS_M = 1737400;
const K = (Math.PI / 180) * MOON_RADIUS_M;
export type LatLon = [number, number];

export function metres(a: LatLon, b: LatLon): number {
  return Math.hypot((b[1] - a[1]) * K * Math.cos((a[0] * Math.PI) / 180), (b[0] - a[0]) * K);
}

export function pathLengthM(p: LatLon[]): number {
  let s = 0;
  for (let i = 1; i < p.length; i++) s += metres(p[i - 1], p[i]);
  return s;
}

export interface JoinResult {
  points: LatLon[];
  used: number[];
  dropped: number[];
}

/** Chain track pieces (each an ordered [lat, lon] list) into one route from `site`. */
export function joinTrack(pieces: LatLon[][], site: LatLon, tolM: number): JoinResult {
  const live = pieces.map((p, i) => ({ p, i })).filter((x) => x.p.length > 0);
  let best = { d: Infinity, idx: -1, flip: false };
  live.forEach((x, idx) => {
    const d0 = metres(site, x.p[0]);
    const d1 = metres(site, x.p[x.p.length - 1]);
    if (d0 < best.d) best = { d: d0, idx, flip: false };
    if (d1 < best.d) best = { d: d1, idx, flip: true };
  });
  if (best.idx < 0) return { points: [], used: [], dropped: [] };

  const taken = new Set<number>();
  const points: LatLon[] = [];
  const used: number[] = [];
  const take = (idx: number, flip: boolean) => {
    taken.add(idx);
    used.push(live[idx].i);
    points.push(...(flip ? [...live[idx].p].reverse() : live[idx].p));
  };
  take(best.idx, best.flip);
  for (;;) {
    const end = points[points.length - 1];
    let next = { d: Infinity, idx: -1, flip: false };
    live.forEach((x, idx) => {
      if (taken.has(idx)) return;
      const d0 = metres(end, x.p[0]);
      const d1 = metres(end, x.p[x.p.length - 1]);
      if (d0 < next.d) next = { d: d0, idx, flip: false };
      if (d1 < next.d) next = { d: d1, idx, flip: true };
    });
    if (next.idx < 0 || next.d > tolM) break;
    take(next.idx, next.flip);
  }
  const dropped = live.filter((_, idx) => !taken.has(idx)).map((x) => x.i);
  return { points, used, dropped };
}

/** Douglas–Peucker in metres (local equirectangular about the polyline). */
export function simplify(p: LatLon[], tolM: number): LatLon[] {
  if (p.length < 3) return p.slice();
  const cosLat = Math.cos((p[0][0] * Math.PI) / 180);
  const xy = p.map(([la, lo]) => [lo * K * cosLat, la * K]);
  const keep = new Array<boolean>(p.length).fill(false);
  keep[0] = keep[p.length - 1] = true;
  const stack: Array<[number, number]> = [[0, p.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop()!;
    const [ax, ay] = xy[a];
    const [bx, by] = xy[b];
    const len = Math.hypot(bx - ax, by - ay);
    let maxD = -1;
    let at = -1;
    for (let i = a + 1; i < b; i++) {
      const [x, y] = xy[i];
      const d = len
        ? Math.abs((bx - ax) * (ay - y) - (ax - x) * (by - ay)) / len
        : Math.hypot(x - ax, y - ay);
      if (d > maxD) {
        maxD = d;
        at = i;
      }
    }
    if (maxD > tolM) {
      keep[at] = true;
      stack.push([a, at], [at, b]);
    }
  }
  return p.filter((_, i) => keep[i]);
}

interface GeoFeature {
  geometry: { type: string; coordinates: number[][] | number[][][] };
}

export function piecesOf(geojson: { features: GeoFeature[] }): LatLon[][] {
  const out: LatLon[][] = [];
  for (const f of geojson.features) {
    const lines =
      f.geometry.type === 'MultiLineString'
        ? (f.geometry.coordinates as number[][][])
        : [f.geometry.coordinates as number[][]];
    for (const l of lines) out.push(l.map(([lo, la]) => [la, lo] as LatLon));
  }
  return out;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const arg = (n: string, d?: string) => {
    const i = args.indexOf(`--${n}`);
    return i >= 0 ? args[i + 1] : d;
  };
  const rover = arg('rover');
  if (!rover) throw new Error('--rover required');
  const url = arg('url');
  const local = arg('geojson');
  const dp = Number(arg('dp', '0.5'));
  const tol = Number(arg('tol', '25'));
  const dry = args.includes('--dry');

  const raw = local ? await fs.readFile(local, 'utf8') : await (await fetch(url!)).text();
  const pieces = piecesOf(JSON.parse(raw));
  const sites = JSON.parse(await fs.readFile('static/data/moon-sites.json', 'utf8')) as Array<{
    id: string;
    lat: number;
    lon: number;
  }>;
  const s = sites.find((x) => x.id === rover);
  if (!s) throw new Error(`no ${rover} in moon-sites.json`);

  const { points, used, dropped } = joinTrack(pieces, [s.lat, s.lon], tol);
  const simp = simplify(points, dp).map(([la, lo]) => [
    Number(la.toFixed(6)),
    Number(lo.toFixed(6)),
  ]);
  const km = pathLengthM(points) / 1000;
  console.log(
    `${rover}: ${pieces.length} pieces, ${used.length} chained (${km.toFixed(2)} km), dropped ${JSON.stringify(dropped)} → ${simp.length} pts`,
  );
  for (const i of dropped)
    console.log(
      `  dropped piece ${i}: ${pieces[i].length} pts, ${pathLengthM(pieces[i]).toFixed(0)} m, nearest to site ${Math.min(...pieces[i].map((p) => metres([s.lat, s.lon], p))).toFixed(0)} m`,
    );
  if (dry) return;

  const file = path.join('static/data/moon-traverses', `${rover}.json`);
  const doc = JSON.parse(await fs.readFile(file, 'utf8'));
  doc.points = simp;
  await fs.writeFile(file, JSON.stringify(doc, null, 2) + '\n');
  console.log(
    `wrote ${file} (edit the credit text by hand: length ${km.toFixed(2)} km, ${simp.length} points)`,
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
