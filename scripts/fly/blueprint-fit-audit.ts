/**
 * How well /fly's flyby anchors fit reality, per mission: for every labelled waypoint in
 * static/data/trajectories/<id>.json, where /fly puts that planet on that date (its mean-element
 * model, `destinationPos` / `earthPos` — the anchor the spline is pinned to) against the JPL
 * Keplerian ephemeris the blueprints use, plus the mission's own event dates for the same body.
 *
 *   npx tsx scripts/fly/blueprint-fit-audit.ts [mission-id …]
 *
 * Output per waypoint: date, label, body, Δλ (deg, /fly − JPL), Δr (AU), and the nearest mission
 * event date for that body (Δdays). Read-only.
 */
import { readFileSync, existsSync } from 'node:fs';
import { heliocentric, julianDay, type PlanetId } from '../../src/lib/physics/ephemeris';
import { destinationPos, earthPos } from '../../src/lib/physics/transfer/mission-arc';
import { labelToPlanetId } from '../../src/lib/fly-mission-apply';
import { dateToSimDay } from '../../src/lib/sim-day';
import type { DestinationId } from '../../src/lib/physics/transfer/lambert-grid.constants';

const DEFAULT = [
  'voyager-2',
  'cassini',
  'rosetta',
  'ulysses',
  'new-horizons',
  'venera-13',
  'galileo',
  'dawn',
  'hayabusa2',
  'juno',
  'bepicolombo',
  'juice',
  'giotto',
  'pioneer-10',
];
const PLANETS = new Set([
  'mercury',
  'venus',
  'earth',
  'mars',
  'jupiter',
  'saturn',
  'uranus',
  'neptune',
]);
const ids = process.argv.slice(2).length ? process.argv.slice(2) : DEFAULT;

const missionFile = (id: string) => {
  const idx = JSON.parse(readFileSync('static/data/missions/index.json', 'utf8')) as {
    id: string;
    dest?: string;
    path?: string;
  }[];
  for (const d of [
    'earth',
    'moon',
    'mars',
    'venus',
    'mercury',
    'jupiter',
    'saturn',
    'sun',
    'pluto',
    'comet',
    'asteroid',
    'ceres',
    'uranus',
    'neptune',
    'bennu',
    'didymos',
    'psyche',
    'eurybates',
    'itokawa',
    'dimorphos',
  ]) {
    const f = `static/data/missions/${d}/${id}.json`;
    if (existsSync(f)) return f;
  }
  void idx;
  return null;
};
const lon = (x: number, y: number) => ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
const wrap = (d: number) => ((d + 540) % 360) - 180;

for (const id of ids) {
  const tf = `static/data/trajectories/${id}.json`;
  const mf = missionFile(id);
  if (!existsSync(tf) || !mf) {
    console.log(`\n${id}: no trajectory file or mission file`);
    continue;
  }
  const t = JSON.parse(readFileSync(tf, 'utf8')) as {
    waypoints: { date: string; label?: string }[];
  };
  const m = JSON.parse(readFileSync(mf, 'utf8')) as {
    departure_date?: string;
    transit_days?: number;
    flight?: { events?: { met_days?: number; label?: string }[] };
  };
  const dep = m.departure_date!;
  const depMs = Date.parse(dep + 'T00:00:00Z');
  const events = (m.flight?.events ?? []).map((e) => ({
    label: e.label ?? '',
    date: new Date(depMs + (e.met_days ?? 0) * 86400000).toISOString().slice(0, 10),
    body: labelToPlanetId(e.label ?? ''),
  }));
  console.log(`\n${id}  (departure ${dep}, transit ${m.transit_days} d)`);
  for (const wp of t.waypoints) {
    if (!wp.label) continue;
    const body = labelToPlanetId(wp.label);
    if (!body) {
      console.log(`  ${wp.date}  ${wp.label.padEnd(34)}  — no body`);
      continue;
    }
    const day = dateToSimDay(wp.date.slice(0, 10))!;
    const sim = body === ('earth' as DestinationId) ? earthPos(day) : destinationPos(day, body);
    let cmp: string;
    if (PLANETS.has(body)) {
      const j = heliocentric(
        body as PlanetId,
        julianDay(new Date(wp.date.slice(0, 10) + 'T12:00:00Z')),
      );
      const dl = wrap(lon(sim.x, sim.z) - lon(j.x, j.y));
      const dr = Math.hypot(sim.x, sim.z) - Math.hypot(j.x, j.y);
      cmp = `Δλ ${dl.toFixed(1).padStart(6)}°  Δr ${dr.toFixed(3).padStart(6)} AU`;
    } else
      cmp = `(small body: /fly λ ${lon(sim.x, sim.z).toFixed(0)}°, r ${Math.hypot(sim.x, sim.z).toFixed(2)})`;
    const evs = events.filter((e) => e.body === body);
    const near = evs.sort(
      (a, b) =>
        Math.abs(Date.parse(a.date) - Date.parse(wp.date)) -
        Math.abs(Date.parse(b.date) - Date.parse(wp.date)),
    )[0];
    const dd = near
      ? Math.round((Date.parse(wp.date.slice(0, 10)) - Date.parse(near.date)) / 86400000)
      : null;
    console.log(
      `  ${wp.date.slice(0, 10)}  ${wp.label.slice(0, 34).padEnd(34)}  ${String(body).padEnd(8)}  ${cmp}   event ${near ? `${near.date} (Δ${dd} d)` : 'none'}`,
    );
  }
}
