/**
 * audit-cislunar.ts — check every Moon mission's cislunar waypoints against its own flight events:
 * where the craft is (distance to Earth's centre and to the Moon's) at each lunar event, and whether
 * the waypoint tail jumps back to the Moon after the flight has ended. Waypoints are authored for a
 * departure at sim-day 0 (the renderer turns them to the real date), so the Moon here is
 * moonEciPos(met), or the flyby-day Moon where the generator parks the craft for a stay. Flags:
 *   LOI/DESCENT/ASCENT/TEI not near the Moon  (> 30,000 km from it at the event's MET)
 *   SPLASHDOWN not near Earth                 (> 30,000 km from Earth at the event's MET)
 *   TAIL                                      waypoints after the last event that sit at the Moon
 *
 *   npx tsx scripts/audit-cislunar.ts [id…]
 */
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { cislunarEventTimes, moonEciPos } from '../src/lib/orbital/cislunar/cislunar-geometry';

const DIR = resolve(import.meta.dirname, '..', 'static/data/missions/moon');
const only = new Set(process.argv.slice(2));
type Wp = [number, number, number, number];

const at = (wps: Wp[], met: number): [number, number, number] => {
  if (met <= wps[0][0]) return [wps[0][1], wps[0][2], wps[0][3]];
  for (let i = 1; i < wps.length; i++) {
    if (met <= wps[i][0]) {
      const [t0, ...a] = wps[i - 1];
      const [t1, ...b] = wps[i];
      const f = t1 > t0 ? (met - t0) / (t1 - t0) : 0;
      return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
    }
  }
  const l = wps[wps.length - 1];
  return [l[1], l[2], l[3]];
};
const NEAR_MOON = new Set(['loi', 'descent_start', 'ascent', 'tei', 'edl_or_oi']);

let flagged = 0;
for (const f of readdirSync(DIR).filter((x) => x.endsWith('.json') && x !== 'index.json')) {
  const m = JSON.parse(readFileSync(resolve(DIR, f), 'utf8'));
  if (only.size && !only.has(m.id)) continue;
  const wps: Wp[] | undefined = m.flight?.cislunar_profile?.waypoints_km;
  const events: { type: string; met_days: number; label?: string }[] = m.flight?.events ?? [];
  if (!wps || wps.length < 2) continue;
  const parked = moonEciPos(cislunarEventTimes(m.flight?.events).arrival ?? m.transit_days ?? 0);
  const moonDist = (p: number[], met: number): number => {
    const mo = moonEciPos(met);
    return Math.min(
      Math.hypot(p[0] - mo.x, p[1] - mo.y, p[2] - mo.z),
      Math.hypot(p[0] - parked.x, p[1] - parked.y, p[2] - parked.z),
    );
  };
  const issues: string[] = [];
  for (const e of events) {
    const p = at(wps, e.met_days);
    const dMoon = moonDist(p, e.met_days);
    const dEarth = Math.hypot(...p);
    if (NEAR_MOON.has(e.type) && dMoon > 30000)
      issues.push(
        `${e.type}@${e.met_days}d is ${Math.round(dMoon / 1000)}k km from the Moon (${Math.round(dEarth / 1000)}k from Earth)`,
      );
    if (e.type === 'earth_return' && dEarth > 30000)
      issues.push(`earth_return@${e.met_days}d is ${Math.round(dEarth / 1000)}k km from Earth`);
  }
  const lastEvent = Math.max(0, ...events.map((e) => e.met_days));
  const tail = wps.filter((w) => w[0] > lastEvent + 0.01);
  if (tail.length && events.some((e) => e.type === 'earth_return')) {
    const last = tail[tail.length - 1];
    if (Math.hypot(last[1], last[2], last[3]) > 300000)
      issues.push(
        `TAIL: ${tail.length} waypoints after the last event (${lastEvent}d) sit at the Moon`,
      );
  }
  // When the craft first comes within 30,000 km of the Moon, vs the LOI/descent event.
  const firstNear = wps.find((w) => moonDist([w[1], w[2], w[3]], w[0]) < 30000);
  const loi = events.find(
    (e) => e.type === 'loi' || e.type === 'descent_start' || e.type === 'edl_or_oi',
  );
  const line = `${m.id.padEnd(18)} wps ${String(wps.length).padStart(3)}  reaches Moon ${firstNear ? firstNear[0].toFixed(2) + 'd' : 'never'}  ${loi ? `${loi.type} ${loi.met_days}d` : 'no LOI event'}`;
  console.log(issues.length ? `${line}\n  ✘ ${issues.join('\n  ✘ ')}` : `${line}  ✓`);
  if (issues.length) flagged++;
}
console.log(`audit-cislunar: ${flagged} mission(s) flagged`);
