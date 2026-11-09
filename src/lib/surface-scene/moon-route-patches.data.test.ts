import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const MOON_RADIUS_M = 1737400;
const ROVERS = ['apollo16', 'apollo17'];

interface Patch {
  id: string;
  lat: number;
  lon: number;
  label: string;
  ground_m: number;
}

function load<T>(file: string): T {
  return JSON.parse(readFileSync(`static/data/moon-traverses/${file}`, 'utf8')) as T;
}

function toXY(lat: number, lon: number, lat0: number): [number, number] {
  const k = (Math.PI * MOON_RADIUS_M) / 180;
  return [lon * k * Math.cos((lat0 * Math.PI) / 180), lat * k];
}

function distToSegment(p: [number, number], a: [number, number], b: [number, number]) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len2 = dx * dx + dy * dy;
  const t = len2 ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / len2)) : 0;
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
}

/** Distance to the polyline and the arc-length position of the nearest point. */
function project(points: [number, number][], lat: number, lon: number) {
  const p = toXY(lat, lon, lat);
  let best = { dist: Infinity, s: 0 };
  let acc = 0;
  for (let i = 1; i < points.length; i++) {
    const a = toXY(points[i - 1][0], points[i - 1][1], lat);
    const b = toXY(points[i][0], points[i][1], lat);
    const d = distToSegment(p, a, b);
    const seg = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (d < best.dist) {
      const dx = b[0] - a[0];
      const dy = b[1] - a[1];
      const t = seg
        ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (seg * seg)))
        : 0;
      best = { dist: d, s: acc + t * seg };
    }
    acc += seg;
  }
  return best;
}

/** Every arc-length position (m) at which the polyline passes within tol metres of the point. */
function arcPositions(points: [number, number][], lat: number, lon: number, tol: number) {
  const p = toXY(lat, lon, lat);
  const out: number[] = [];
  let acc = 0;
  for (let i = 1; i < points.length; i++) {
    const a = toXY(points[i - 1][0], points[i - 1][1], lat);
    const b = toXY(points[i][0], points[i][1], lat);
    const seg = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (distToSegment(p, a, b) <= tol) {
      const t = seg
        ? Math.max(
            0,
            Math.min(
              1,
              ((p[0] - a[0]) * (b[0] - a[0]) + (p[1] - a[1]) * (b[1] - a[1])) / (seg * seg),
            ),
          )
        : 0;
      out.push(acc + t * seg);
    }
    acc += seg;
  }
  return out;
}

function metres(a: [number, number], lat: number, lon: number) {
  const p = toXY(lat, lon, lat);
  const q = toXY(a[0], a[1], lat);
  return Math.hypot(p[0] - q[0], p[1] - q[1]);
}

describe.each(ROVERS)('%s route patches follow the route direction', (rover) => {
  const tr = load<{ points: [number, number][] }>(`${rover}.json`);
  const patches = load<{ patches: Patch[] }>(`${rover}.route-patches.json`).patches;
  const first = tr.points[0];
  const last = tr.points[tr.points.length - 1];

  it('start tile sits at the first route point, end tile at the last', () => {
    const start = patches.find((p) => p.id === 'start')!;
    const end = patches.find((p) => p.id === 'end')!;
    // The point must lie inside the tile window with a margin (0.3 of the
    // window = 154 m of 512 m): the tiles were cut before the Apollo 16 LM
    // point moved ~140 m onto the module.
    expect(metres(first, start.lat, start.lon)).toBeLessThanOrEqual(start.ground_m * 0.3);
    expect(metres(last, end.lat, end.lon)).toBeLessThanOrEqual(end.ground_m * 0.3);
  });

  it('every tile centre lies within half its ground window of the polyline', () => {
    for (const p of patches) {
      expect(project(tr.points, p.lat, p.lon).dist, p.id).toBeLessThanOrEqual(p.ground_m / 2);
    }
  });

  it('tiles are ordered start, km-01.., end along the route', () => {
    const ids = patches.map((p) => p.id);
    expect(ids[0]).toBe('start');
    expect(ids[ids.length - 1]).toBe('end');
    const km = ids.slice(1, -1).map((id) => Number(/^km-(\d+)$/.exec(id)?.[1]));
    expect(km.every((n) => Number.isInteger(n))).toBe(true);
    expect([...km].sort((a, b) => a - b)).toEqual(km);
    // The routes revisit the same track (EVAs overlap), so a tile has several
    // arc positions; walk forward taking the earliest one that does not go back.
    let prev = -Infinity;
    for (const p of patches) {
      const cand = arcPositions(tr.points, p.lat, p.lon, 10).filter((s) => s >= prev - 40);
      expect(
        cand.length,
        `${p.id} cannot follow the previous tile along the route`,
      ).toBeGreaterThan(0);
      prev = Math.min(...cand);
    }
  });

  it('start and end labels name the drive start and final position', () => {
    expect(patches[0].label).toMatch(/Landing|drive start/i);
    expect(patches[patches.length - 1].label).toMatch(/final/i);
  });
});
