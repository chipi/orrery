/**
 * Print a launch profile's ascent event times (the model's staging timeline), optionally with a
 * JSON override merged over the profile, to compare against a sourced flight sequence before
 * pinning it in `src/lib/orbital/launch-timeline.test.ts`.
 *
 *   npx tsx scripts/ascent-events.ts saturn-ib
 *   npx tsx scripts/ascent-events.ts saturn-ib '{"targetOrbitAltM":231000}'
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { integrateAscent, type LaunchProfile } from '../src/lib/physics/ascent/ascent-physics';

const [id, override] = process.argv.slice(2);
if (!id) {
  console.error('usage: tsx scripts/ascent-events.ts <launch-profile-id> [json-override]');
  process.exit(2);
}
const base = JSON.parse(
  readFileSync(resolve('static/data/launch-profiles', `${id}.json`), 'utf-8'),
) as LaunchProfile;
const profile = { ...base, ...(override ? JSON.parse(override) : {}) } as LaunchProfile;
const sum = integrateAscent(profile);
for (const e of sum.events) {
  const alt = (e as { altM?: number }).altM;
  console.log(
    `${e.type.padEnd(18)} T+${e.t.toFixed(1).padStart(7)} s${alt !== undefined ? `  ${(alt / 1000).toFixed(1)} km` : ''}${e.silent ? '  (silent)' : ''}`,
  );
}
console.log(`max_q              T+${sum.maxQ.t.toFixed(1).padStart(7)} s`);
const last = sum.states.at(-1);
if (last) console.log(`end state          T+${last.t.toFixed(1).padStart(7)} s`);
