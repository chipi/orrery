/**
 * Print a launch profile's ascent event times (the model's staging timeline), optionally with a
 * JSON override merged over the profile, to compare against a sourced flight sequence before
 * pinning it in `src/lib/orbital/launch-timeline.test.ts`. `--states` adds the altitude, inertial
 * speed and climb rate at each event (for sources that give the state, e.g. JAXA's "MECO at
 * 208 km, 6.2 km/s").
 *
 *   npx tsx scripts/ascent-events.ts saturn-ib
 *   npx tsx scripts/ascent-events.ts saturn-ib '{"targetOrbitAltM":231000}'
 *   npx tsx scripts/ascent-events.ts h3 --states
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { integrateAscent, type LaunchProfile } from '../src/lib/physics/ascent/ascent-physics';

const args = process.argv.slice(2);
const states = args.includes('--states');
const [id, override] = args.filter((a) => a !== '--states');
if (!id) {
  console.error(
    'usage: tsx scripts/ascent-events.ts <launch-profile-id> [json-override] [--states]',
  );
  process.exit(2);
}
const base = JSON.parse(
  readFileSync(resolve('static/data/launch-profiles', `${id}.json`), 'utf-8'),
) as LaunchProfile;
const profile = { ...base, ...(override ? JSON.parse(override) : {}) } as LaunchProfile;
const sum = integrateAscent(profile);
const stateAt = (t: number) =>
  sum.states.reduce((best, s) => (Math.abs(s.t - t) < Math.abs(best.t - t) ? s : best));
for (const e of sum.events) {
  const alt = (e as { altM?: number }).altM;
  const s = states ? stateAt(e.t) : undefined;
  console.log(
    `${e.type.padEnd(18)} T+${e.t.toFixed(1).padStart(7)} s${alt !== undefined ? `  ${(alt / 1000).toFixed(1)} km` : ''}${e.silent ? '  (silent)' : ''}${s ? `  alt ${s.altKm.toFixed(1)} km  v ${s.speedKms.toFixed(3)} km/s  vUp ${s.velUpKms.toFixed(3)} km/s` : ''}`,
  );
}
console.log(`max_q              T+${sum.maxQ.t.toFixed(1).padStart(7)} s`);
const last = sum.states.at(-1);
if (last) console.log(`end state          T+${last.t.toFixed(1).padStart(7)} s`);
