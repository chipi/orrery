/**
 * Do the precomputed /plan porkchops put their launch windows where the real planets allow them?
 * For each destination: the porkchop's lowest-Δv departure dates (local minima along the
 * departure axis), against the dates the JPL ephemeris gives the Hohmann phase angle
 * (target longitude − Earth longitude = π·(1 − ((1+r)/2r)^1.5 … the classic lead angle).
 *
 *   npx tsx scripts/fly/porkchop-window-check.ts [dest …]   (default: venus mars jupiter saturn)
 *
 * Read-only. A real window and a porkchop minimum should fall within a few weeks (the Hohmann
 * phase ignores eccentricity and inclination; Lambert optima differ by days to weeks).
 */
import { readFileSync } from 'node:fs';
import { heliocentric, julianDay, type PlanetId } from '../../src/lib/physics/ephemeris';

const dests = process.argv.slice(2).length
  ? process.argv.slice(2)
  : ['venus', 'mars', 'jupiter', 'saturn'];
const A: Record<string, number> = { venus: 0.7233, mars: 1.5237, jupiter: 5.2034, saturn: 9.5371 };
const EPOCH = Date.UTC(2026, 0, 1);
const iso = (ms: number) => new Date(ms).toISOString().slice(0, 10);
const lon = (p: { x: number; y: number }) => Math.atan2(p.y, p.x);
const wrap = (a: number) =>
  ((((a + Math.PI) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)) - Math.PI;

for (const d of dests) {
  const pk = JSON.parse(readFileSync(`static/data/porkchop/earth-to-${d}.json`, 'utf8')) as {
    grid: number[][];
    dep_range_days: [number, number];
  };
  const g = pk.grid;
  const W = g[0]!.length;
  const [a, b] = pk.dep_range_days;
  const col = Array.from({ length: W }, (_, i) => Math.min(...g.map((r) => r[i]!)));
  const minima: string[] = [];
  for (let i = 1; i < W - 1; i++)
    if (col[i]! <= col[i - 1]! && col[i]! <= col[i + 1]! && col[i]! < 20)
      minima.push(
        `${iso(EPOCH + (a + ((b - a) * i) / (W - 1)) * 86400000)} (${col[i]!.toFixed(2)} km/s)`,
      );
  // Hohmann lead angle: target must be ahead of Earth by θ = π(1 − ((1 + r)/(2r))^1.5).
  const r = A[d]!;
  const theta = Math.PI * (1 - Math.pow((1 + r) / (2 * r), 1.5));
  const ideal: string[] = [];
  let prev: number | null = null;
  for (let day = a; day <= b; day += 1) {
    const ms = EPOCH + day * 86400000;
    const jd = julianDay(new Date(ms));
    const e = heliocentric('earth' as PlanetId, jd);
    const t = heliocentric(d as PlanetId, jd);
    const f = wrap(lon(t) - lon(e) - theta);
    if (prev !== null && Math.sign(prev) !== Math.sign(f) && Math.abs(prev - f) < 1)
      ideal.push(iso(ms));
    prev = f;
  }
  console.log(`${d.padEnd(8)} porkchop minima: ${minima.join(', ') || 'none'}`);
  console.log(`${''.padEnd(8)} JPL Hohmann phase: ${ideal.join(', ') || 'none'}`);
}
