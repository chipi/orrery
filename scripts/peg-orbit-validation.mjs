/**
 * Before/after orbit-insertion validation harness for #416 (PEG).
 *
 * Runs the ascent integrator on every flagship launcher profile — one
 * representative real mission per launcher — and reports whether it reaches a
 * GENUINE stable orbit, with the osculating elements (apoapsis / perigee /
 * eccentricity) at the end of flight. Run it BEFORE the PEG change to capture
 * the baseline (the low-TWR launchers fail), and AFTER to prove they all close.
 *
 *   NODE_OPTIONS= npx tsx scripts/peg-orbit-validation.mjs
 */
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { integrateAscent } from '../src/lib/orbital/ascent-physics.ts';
import { R_EARTH_M, MU_EARTH_M3_S2 } from '../src/lib/orbital/ascent-physics-constants.ts';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// One representative real mission per launcher (narrative label for the matrix).
// The four marked ★ are the low-TWR upper stages that soft-insert without PEG.
const MATRIX = [
  ['atlas-v', 'Curiosity (MSL)', true],
  ['ariane-5', 'JWST', true],
  ['h-iia', 'Hayabusa2', true],
  ['space-shuttle-stack', 'STS-31 (Hubble deploy)', true],
  ['falcon-9', 'Crew Dragon Demo-2', false],
  ['saturn-v', 'Apollo 11', false],
  ['saturn-ib', 'Apollo 7', false],
  ['proton-k', 'Salyut / Zond', false],
  ['titan-ii-glv', 'Gemini 4', false],
  ['soyuz', 'Soyuz MS-01', false],
  ['vostok-k', 'Vostok 1 (Gagarin)', false],
  ['voskhod-11a57', 'Voskhod 1', false],
  ['atlas-lv-3b', 'Friendship 7 (Glenn)', false],
  ['long-march-2f', 'Shenzhou 5', false],
];

const load = (id) =>
  JSON.parse(readFileSync(resolve(ROOT, `static/data/launch-profiles/${id}.json`), 'utf-8'));

/** Osculating apoapsis/perigee/eccentricity (km / km / -) from the final state. */
function elements(s) {
  const r = R_EARTH_M + s.finalAltKm * 1000;
  const v = s.finalSpeedKms * 1000;
  const vr = s.velUpKms != null ? s.velUpKms * 1000 : 0;
  const vh = Math.sqrt(Math.max(0, v * v - vr * vr));
  const energy = (v * v) / 2 - MU_EARTH_M3_S2 / r;
  const h = r * vh;
  if (energy >= 0) return { apoKm: Infinity, periKm: -Infinity, ecc: Infinity };
  const a = -MU_EARTH_M3_S2 / (2 * energy);
  const ecc = Math.sqrt(Math.max(0, 1 + (2 * energy * h * h) / MU_EARTH_M3_S2 ** 2));
  return {
    apoKm: (a * (1 + ecc) - R_EARTH_M) / 1000,
    periKm: (a * (1 - ecc) - R_EARTH_M) / 1000,
    ecc,
  };
}

const fmt = (n) => (Number.isFinite(n) ? n.toFixed(n < 10 ? 3 : 0).padStart(7) : '   n/a ');
console.log(
  'launcher              mission                        orbit?  apoKm   periKm   ecc     secoT  finalKm  finalKm/s',
);
console.log('─'.repeat(118));
let fails = 0;
for (const [id, mission, lowTwr] of MATRIX) {
  const s = integrateAscent(load(id));
  const last = s.states[s.states.length - 1];
  const el = elements({ ...s, velUpKms: last?.velUpKms });
  const seco = s.events.find((e) => e.type === 'seco');
  const ok = s.reachedOrbit;
  if (lowTwr && !ok) fails++;
  console.log(
    `${(lowTwr ? '★ ' : '  ') + id.padEnd(20)}${mission.padEnd(30)} ` +
      `${ok ? ' ORBIT' : 'SOFT ✗'}  ${fmt(el.apoKm)} ${fmt(el.periKm)} ${el.ecc.toFixed(4).padStart(7)} ` +
      `${(seco ? seco.t.toFixed(0) : '—').padStart(5)}  ${s.finalAltKm.toFixed(0).padStart(6)}  ${s.finalSpeedKms.toFixed(3).padStart(8)}`,
  );
}
console.log('─'.repeat(118));
console.log(`★ low-TWR launchers not reaching orbit: ${fails}/4`);
