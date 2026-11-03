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
import { lambertLeg } from './lib/conic-leg';
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
/** First perihelion (AU) of the missions whose /fly window ends there, not at a body.
 *  Parker: P1 2018-11-06 at 24.8 million km (NASA). Solar Orbiter: P1 2020-06-15 at
 *  77 million km (ESA). */
const SUN_PERIHELION_AU: Record<string, number> = {
  'parker-solar-probe': 0.166,
  'solar-orbiter': 0.515,
};

/** The prograde conic from (r1, θ1) at MET t1 down to perihelion rp at MET tp: the
 *  eccentricity is the one whose inbound fall from r1 takes tp − t1 days. Returns the
 *  position at any MET in [t1, tp]. */
function perihelionLeg(r1: number, th1: number, t1: number, rp: number, tp: number) {
  const fall = (e: number) => {
    const a = rp / (1 - e);
    const cosNu = Math.min(1, Math.max(-1, ((rp * (1 + e)) / r1 - 1) / e));
    const nu = Math.acos(cosNu);
    const E = 2 * Math.atan(Math.sqrt((1 - e) / (1 + e)) * Math.tan(nu / 2));
    const M = E - e * Math.sin(E);
    const n = (2 * Math.PI) / (365.25 * a ** 1.5);
    return { a, nu, n, days: M / n };
  };
  // From r1 = aphelion (the slowest fall, half a period) toward a near-parabola (faster).
  let lo = Math.max(1e-4, (r1 - rp) / (r1 + rp));
  let hi = 0.99;
  for (let i = 0; i < 80; i++) {
    const mid = (lo + hi) / 2;
    if (fall(mid).days > tp - t1) lo = mid;
    else hi = mid;
  }
  const e = (lo + hi) / 2;
  const { a, nu: nu1, n } = fall(e);
  const thP = th1 + nu1;
  return (met: number) => {
    const M = -n * (tp - met);
    let E = M;
    for (let i = 0; i < 50; i++) E -= (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
    const nu = 2 * Math.atan(Math.sqrt((1 + e) / (1 - e)) * Math.tan(E / 2));
    const r = a * (1 - e * Math.cos(E));
    return { x: r * Math.cos(thP + nu), z: r * Math.sin(thP + nu) };
  };
}

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
  const rp = SUN_PERIHELION_AU[id];
  if (!rp && (anchors.length < 2 || anchors[anchors.length - 1].met < arrMet - 2)) {
    console.log(`${id}: skipped (${anchors.length} anchors, last at MET ${anchors.at(-1)?.met})`);
    continue;
  }
  type Waypoint = { date: string; label?: string; x: number; y: number; z: number };
  type Anchor = (typeof anchors)[number];
  let solved = 0;
  let estimated = 0;
  /** The path through `list`: each anchor, then the leg to the next — with the body while
   *  captured, on the coasting conic within one revolution, else the estimate. */
  const fill = (list: Anchor[], out: Waypoint[]) => {
    for (let i = 0; i < list.length; i++) {
      const a = list[i];
      out.push({
        date: iso(dep, a.met),
        ...(a.label ? { label: a.label } : {}),
        x: +a.x.toFixed(4),
        y: 0,
        z: +a.z.toFixed(4),
      });
      const b = list[i + 1];
      if (!b) break;
      const dt = b.met - a.met;
      const n = Math.min(40, Math.max(2, Math.round(dt / 15)));
      const push = (met: number, p: { x: number; z: number }) =>
        out.push({ date: iso(dep, met), x: +p.x.toFixed(4), y: 0, z: +p.z.toFixed(4) });
      if (a.stays && a.body === b.body) {
        // Captured at a body (orbit insertion, then landing): the craft stays with it. Not
        // after a flyby — Rosetta's Earth passes were years apart.
        for (let j = 1; j < n; j++) {
          const met = a.met + (dt * j) / n;
          push(met, pos(a.body as DestinationId, met));
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
      // Within one revolution, the real conic between the two encounters (Lambert). Resonant
      // legs that loop the Sun more than once (MESSENGER's Mercury returns) keep the estimate.
      const conic = k === 0 ? lambertLeg({ x: a.x, z: a.z }, { x: b.x, z: b.z }, dt) : null;
      if (conic) {
        solved += 1;
        for (let j = 1; j < n; j++) push(a.met + (dt * j) / n, conic((dt * j) / n));
        continue;
      }
      estimated += 1;
      for (let j = 1; j < n; j++) {
        const f = j / n;
        // A coasting craft dips toward perihelion between two encounters at similar radius.
        const r =
          r0 + (r1 - r0) * f - 0.12 * rAvg * Math.sin(Math.PI * f) * Math.min(1, dTheta / Math.PI);
        const th = t0 + dTheta * f;
        push(a.met + dt * f, { x: r * Math.cos(th), z: r * Math.sin(th) });
      }
    }
  };
  const waypoints: Waypoint[] = [];
  fill(anchors, waypoints);
  if (rp) {
    // The window ends at the first perihelion: a real conic down from the last anchor.
    const last = anchors[anchors.length - 1];
    const leg = perihelionLeg(
      Math.hypot(last.x, last.z),
      Math.atan2(last.z, last.x),
      last.met,
      rp,
      arrMet,
    );
    const n = Math.max(8, Math.round((arrMet - last.met) / 3));
    for (let j = 1; j <= n; j++) {
      const met = last.met + ((arrMet - last.met) * j) / n;
      const p = leg(met);
      waypoints.push({ date: iso(dep, met), x: +p.x.toFixed(4), y: 0, z: +p.z.toFixed(4) });
    }
  }
  const file = {
    id,
    ...(rp ? { ends_at_perihelion_au: rp } : {}),
    _doc: 'Generated by scripts/generate-fly-trajectory.ts from the mission flight events (labelled waypoints are moved onto the body by /fly). Cruise points lie on the coasting conic between encounters (Lambert, in the ecliptic; no deep-space burns), or on an estimate for legs longer than one revolution.',
    waypoints,
  };
  writeFileSync(resolve(OUT, `${id}.json`), JSON.stringify(file, null, 1) + '\n');
  console.log(
    `${id}: ${anchors.length} anchors (${anchors.map((a) => a.label.split(' ')[0]).join(', ')}), ${waypoints.length} waypoints, ${solved} conic legs, ${estimated} estimated`,
  );
}
