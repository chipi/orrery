/**
 * Hera's arrival moved a month earlier (ESA: November 2026, no day published; 2026-11-28 used).
 * Run after `remap-event-dates.ts hera-arrival.json --write`, which retimes the events and
 * waypoints but leaves the last cruise leg aimed at where Didymos was on 2026-12-28.
 * This re-solves that leg as a Lambert conic from the DSM-2 waypoint to Didymos on the new
 * arrival day (the /fly mean-element position), and parks the post-arrival waypoints on it.
 *
 *   npx tsx scripts/i18n-tools/maps/2026-11-06-mission-factcheck/hera-retarget.ts [--write]
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { destinationPos } from '../../../../src/lib/physics/transfer/mission-arc';
import { dateToSimDay } from '../../../../src/lib/sim-day';
import type { DestinationId } from '../../../../src/lib/physics/transfer/lambert-grid.constants';
import { lambertLeg } from '../../../lib/conic-leg';

const FILE = 'static/data/missions/didymos/hera.json';
const write = process.argv.includes('--write');
const m = JSON.parse(readFileSync(FILE, 'utf8'));
const dep = dateToSimDay(m.departure_date)!;
const arrMet: number = m.transit_days;
const events: { met_days: number; label: string }[] = m.flight.events;
const dsm2 = events.find((e) => e.label === 'DSM-2')!.met_days;
const wp: number[][] = m.flight.interplanetary_profile.waypoints_helio_au;

const start = wp.reduce((best, w) => (Math.abs(w[0] - dsm2) < Math.abs(best[0] - dsm2) ? w : best));
const end = destinationPos(dep + arrMet, 'didymos' as DestinationId);
const leg = lambertLeg({ x: start[1], z: start[3] }, { x: end.x, z: end.z }, arrMet - start[0]);
if (!leg) throw new Error('no Lambert solution for the retargeted leg');

const r6 = (v: number) => Math.round(v * 1e6) / 1e6;
let moved = 0;
for (const w of wp) {
  if (w[0] <= start[0]) continue;
  const p = w[0] >= arrMet ? end : leg(w[0] - start[0]);
  const before = [w[1], w[3]];
  w[1] = r6(p.x);
  w[3] = r6(p.z);
  if (before[0] !== w[1] || before[1] !== w[3]) moved++;
}
const last = wp.find((w) => w[0] === arrMet);
console.log(
  `leg from MET ${start[0]} to ${arrMet}: ${moved} waypoints moved; arrival point ` +
    `${last ? `${last[1]}, ${last[3]}` : 'none at transit_days'} vs Didymos ${r6(end.x)}, ${r6(end.z)}`,
);
if (write) writeFileSync(FILE, JSON.stringify(m, null, 2) + '\n');
