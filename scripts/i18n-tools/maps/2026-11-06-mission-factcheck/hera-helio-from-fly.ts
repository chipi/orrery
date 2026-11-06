/**
 * Hera's `interplanetary_profile.waypoints_helio_au` were hand-pinned with the Mars flyby at
 * r ≈ 0.95 AU (Mars is ~1.5). /fly draws Hera from static/data/fly-trajectories/hera.json, so
 * this resamples that path (labelled anchors on the body's /fly position, cruise points on the
 * conics) at the existing waypoint METs, so both describe the same flight.
 *
 *   npx tsx scripts/i18n-tools/maps/2026-11-06-mission-factcheck/hera-helio-from-fly.ts [--write]
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { destinationPos, earthPos } from '../../../../src/lib/physics/transfer/mission-arc';
import { labelToPlanetId } from '../../../../src/lib/fly-mission-apply';
import { dateToSimDay } from '../../../../src/lib/sim-day';
import type { DestinationId } from '../../../../src/lib/physics/transfer/lambert-grid.constants';

const FILE = 'static/data/missions/didymos/hera.json';
const write = process.argv.includes('--write');
const m = JSON.parse(readFileSync(FILE, 'utf8'));
const fly = JSON.parse(readFileSync('static/data/fly-trajectories/hera.json', 'utf8')) as {
  waypoints: { date: string; label?: string; x: number; z: number }[];
};
const dep = dateToSimDay(m.departure_date)!;
// The /fly path as /fly flies it: labelled points moved onto their body (fly-mission-apply).
const path = fly.waypoints.map((w) => {
  const met = dateToSimDay(w.date.slice(0, 10))! - dep;
  const body = w.label ? labelToPlanetId(w.label) : null;
  if (!body) return { met, x: w.x, z: w.z };
  const p =
    body === ('earth' as DestinationId) ? earthPos(dep + met) : destinationPos(dep + met, body);
  return { met, x: p.x, z: p.z };
});
const at = (t: number) => {
  if (t <= path[0]!.met) return path[0]!;
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1]!;
    const b = path[i]!;
    if (t <= b.met) {
      const f = (t - a.met) / (b.met - a.met || 1);
      return { met: t, x: a.x + (b.x - a.x) * f, z: a.z + (b.z - a.z) * f };
    }
  }
  return path[path.length - 1]!;
};
const r6 = (v: number) => Math.round(v * 1e6) / 1e6;
const wp: number[][] = m.flight.interplanetary_profile.waypoints_helio_au;
for (const w of wp) {
  const p = at(w[0]!);
  w[1] = r6(p.x);
  w[3] = r6(p.z);
}
const mars = m.flight.events.find((e: { label: string }) => /mars/i.test(e.label));
const near = wp.reduce((b, w) =>
  Math.abs(w[0]! - mars.met_days) < Math.abs(b[0]! - mars.met_days) ? w : b,
);
const mp = destinationPos(dep + near[0]!, 'mars');
console.log(
  `${wp.length} waypoints resampled; at the Mars flyby (MET ${near[0]}) r = ${Math.hypot(near[1]!, near[3]!).toFixed(3)} AU, ` +
    `${Math.hypot(near[1]! - mp.x, near[3]! - mp.z).toFixed(3)} AU from Mars`,
);
if (write) writeFileSync(FILE, JSON.stringify(m, null, 2) + '\n');
