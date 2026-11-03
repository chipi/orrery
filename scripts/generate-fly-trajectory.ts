/**
 * generate-fly-trajectory.ts — a /fly trajectory for a mission whose flybys have no /explore
 * trajectory file (static/data/trajectories/), built from the mission's own flight events.
 *
 * Without one, /fly draws a single Earth→destination ellipse and the ship is never at its flyby
 * planets (MESSENGER flew past nothing). With one, /fly's spline path runs through every flyby
 * body at its event date (fly-mission-apply remaps each labelled waypoint onto the body's
 * position). This writes:
 * - a labelled waypoint per launch, flyby of a body /fly knows (labelToPlanetId) and arrival;
 * - unlabelled cruise points between them, going round the Sun prograde: radius interpolated,
 *   angle advanced by the whole turns a coasting craft at that radius would make in the time
 *   (so Mercury-resonant legs loop, short legs do not).
 * Output: static/data/fly-trajectories/<id>.json — /fly only; /explore's roster is unchanged.
 *
 *   npx tsx scripts/generate-fly-trajectory.ts <id>…
 */
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { earthPos, destinationPos } from '../src/lib/physics/transfer/mission-arc';
import { labelToPlanetId } from '../src/lib/fly-mission-apply';
import { dateToSimDay } from '../src/lib/sim-day';
import type { DestinationId } from '../src/lib/physics/transfer/lambert-grid.constants';

const ROOT = resolve(import.meta.dirname, '..');
const OUT = resolve(ROOT, 'static/data/fly-trajectories');
mkdirSync(OUT, { recursive: true });

interface MissionFile {
  departure_date: string;
  transit_days: number;
  flight?: { events?: { type: string; met_days: number; label?: string }[] };
}
const findMission = (id: string): MissionFile => {
  for (const d of readdirSync(resolve(ROOT, 'static/data/missions'), { withFileTypes: true })) {
    if (!d.isDirectory()) continue;
    try {
      return JSON.parse(
        readFileSync(resolve(ROOT, 'static/data/missions', d.name, `${id}.json`), 'utf8'),
      );
    } catch {
      /* not in this folder */
    }
  }
  throw new Error(`no mission ${id}`);
};
const iso = (dep: string, met: number): string =>
  new Date(Date.parse(`${dep}T00:00:00Z`) + Math.round(met) * 86400000).toISOString().slice(0, 10);

for (const id of process.argv.slice(2)) {
  const m = findMission(id);
  const dep = m.departure_date as string;
  const depDay = dateToSimDay(dep) as number;
  const events: { type: string; met_days: number; label?: string }[] = m.flight?.events ?? [];
  const arrMet = m.transit_days as number;
  const anchors: {
    met: number;
    label: string;
    body: string;
    stays: boolean;
    x: number;
    z: number;
  }[] = [];
  const pos = (body: DestinationId, met: number) =>
    body === ('earth' as DestinationId)
      ? earthPos(depDay + met)
      : destinationPos(depDay + met, body);
  anchors.push({
    met: 0,
    label: 'Launch',
    body: 'earth',
    stays: false,
    ...pos('earth' as DestinationId, 0),
  });
  for (const e of events) {
    if (e.met_days <= 0 || e.met_days > arrMet + 1) continue;
    if (e.type !== 'flyby' && e.type !== 'edl_or_oi' && e.type !== 'arrival') continue;
    const body = labelToPlanetId(e.label ?? '');
    if (!body) continue;
    if (anchors.some((a) => Math.abs(a.met - e.met_days) < 1)) continue;
    anchors.push({
      met: e.met_days,
      label: e.label ?? body,
      body,
      stays: e.type !== 'flyby',
      ...pos(body, e.met_days),
    });
  }
  anchors.sort((a, b) => a.met - b.met);
  // Only when the path ends at the arrival body (else the spline would stop short of it:
  // NEAR's Eros is not a /fly body). Launch + arrival alone is fine for a target the transfer
  // ellipse can't reach (Giotto's Halley, e = 0.97).
  if (anchors.length < 2 || anchors[anchors.length - 1].met < arrMet - 2) {
    console.log(`${id}: skipped (${anchors.length} anchors, last at MET ${anchors.at(-1)?.met})`);
    continue;
  }
  const waypoints: { date: string; label?: string; x: number; y: number; z: number }[] = [];
  for (let i = 0; i < anchors.length; i++) {
    const a = anchors[i];
    waypoints.push({
      date: iso(dep, a.met),
      label: a.label,
      x: +a.x.toFixed(4),
      y: 0,
      z: +a.z.toFixed(4),
    });
    const b = anchors[i + 1];
    if (!b) break;
    const dt = b.met - a.met;
    if (a.stays && a.body === b.body) {
      // Captured at a body (orbit insertion, then landing): the craft stays with it. Not after
      // a flyby — Rosetta's Earth passes were years apart.
      const n = Math.min(40, Math.max(2, Math.round(dt / 15)));
      for (let j = 1; j < n; j++) {
        const met = a.met + (dt * j) / n;
        const p = pos(a.body as DestinationId, met);
        waypoints.push({ date: iso(dep, met), x: +p.x.toFixed(4), y: 0, z: +p.z.toFixed(4) });
      }
      continue;
    }
    const r0 = Math.hypot(a.x, a.z);
    const r1 = Math.hypot(b.x, b.z);
    const t0 = Math.atan2(a.z, a.x);
    const base = (((Math.atan2(b.z, b.x) - t0) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    const rAvg = (r0 + r1) / 2;
    const expected = ((2 * Math.PI) / (365.25 * rAvg ** 1.5)) * dt;
    const k = Math.max(0, Math.round((expected - base) / (2 * Math.PI)));
    const dTheta = base + 2 * Math.PI * k;
    const n = Math.min(40, Math.max(2, Math.round(dt / 15)));
    for (let j = 1; j < n; j++) {
      const f = j / n;
      // A coasting craft dips toward perihelion between two encounters at similar radius.
      const r =
        r0 + (r1 - r0) * f - 0.12 * rAvg * Math.sin(Math.PI * f) * Math.min(1, dTheta / Math.PI);
      const th = t0 + dTheta * f;
      waypoints.push({
        date: iso(dep, a.met + dt * f),
        x: +(r * Math.cos(th)).toFixed(4),
        y: 0,
        z: +(r * Math.sin(th)).toFixed(4),
      });
    }
  }
  const file = {
    id,
    _doc: 'Generated by scripts/generate-fly-trajectory.ts from the mission flight events (labelled waypoints are moved onto the body by /fly). Cruise points are a coasting estimate, not a flown trajectory.',
    waypoints,
  };
  writeFileSync(resolve(OUT, `${id}.json`), JSON.stringify(file, null, 1) + '\n');
  console.log(
    `${id}: ${anchors.length} anchors (${anchors.map((a) => a.label.split(' ')[0]).join(', ')}), ${waypoints.length} waypoints`,
  );
}
