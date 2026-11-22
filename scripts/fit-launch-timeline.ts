/**
 * Fit a launch profile's staging timeline to a sourced flight sequence (backlog F4 / S13).
 *
 * Burn times are fitted by scaling one lever's thrust (sea-level and vacuum together), which keeps
 * its propellant and Isp, so the stage's delta-v is unchanged and only its burn duration moves.
 * Fairing time and post-cutoff coasts are set directly. The script iterates (each lever's burn
 * time is about inversely proportional to its thrust), prints before / after, and with `--write`
 * rewrites the profile JSON. Always check the result still reaches orbit
 * (`npx vitest run src/lib/physics/ascent`) and pin the rows in `launch-timeline.test.ts`.
 *
 *   npx tsx scripts/fit-launch-timeline.ts <spec.json> [--write]
 *
 * spec.json: { "id": "h3", "set": { "fairingJettisonS": 197, "stages[0].separationDelayS": 7 },
 *   "targets": [ { "type": "meco", "nth": 0, "real": 292, "lever": "stages[0]",
 *                  "from": 0, "fromReal": 0 } ] }
 * `from` / `fromReal`: the lever's ignition in model and real time: a number, or
 * {"type": "staging", "nth": 0} to read the model event (fromReal is then a number).
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  integrateAscent,
  type AscentEvent,
  type LaunchProfile,
} from '../src/lib/physics/ascent/ascent-physics';
import { applySet, slot, stringifyProfile } from './lib/launch-profile-json';

type EventRef = { type: AscentEvent['type']; nth?: number };
interface Target extends EventRef {
  real: number;
  lever: string; // 'stages[i]' | 'boosters'
  from: number | EventRef;
  fromReal: number;
}
interface Spec {
  id: string;
  set?: Record<string, unknown>;
  targets: Target[];
}

const [specPath, flag] = process.argv.slice(2);
if (!specPath) {
  console.error('usage: tsx scripts/fit-launch-timeline.ts <spec.json> [--write]');
  process.exit(2);
}
const spec = JSON.parse(readFileSync(specPath, 'utf-8')) as Spec;
const file = resolve('static/data/launch-profiles', `${spec.id}.json`);
const original = JSON.parse(readFileSync(file, 'utf-8')) as LaunchProfile;

const leverObj = (p: LaunchProfile, lever: string) => {
  const [o, k] = slot(p as unknown as Record<string, unknown>, lever);
  return o[k] as { thrustVacKN?: number; thrustSlKN?: number };
};
const at = (ev: AscentEvent[], r: EventRef) => ev.filter((e) => e.type === r.type)[r.nth ?? 0]?.t;

const p = structuredClone(original);
applySet(p, spec.set);

const scale = new Map<string, number>();
for (const t of spec.targets) scale.set(t.lever, 1);
const base = new Map([...scale.keys()].map((l) => [l, { ...leverObj(original, l) }] as const));
function apply(): ReturnType<typeof integrateAscent> {
  for (const [l, k] of scale) {
    const o = leverObj(p, l);
    const b = base.get(l)!;
    if (b.thrustVacKN !== undefined) o.thrustVacKN = +(b.thrustVacKN * k).toFixed(1);
    if (b.thrustSlKN !== undefined) o.thrustSlKN = +(b.thrustSlKN * k).toFixed(1);
  }
  return integrateAscent(p);
}

const before = integrateAscent(original);
let sum = apply();
for (let i = 0; i < 25; i++) {
  let moved = false;
  for (const t of spec.targets) {
    const tm = at(sum.events, t);
    const fm = typeof t.from === 'number' ? t.from : at(sum.events, t.from);
    if (tm === undefined || fm === undefined) continue;
    const ratio = (tm - fm) / (t.real - t.fromReal);
    if (Math.abs(tm - t.real) > 0.5) {
      scale.set(t.lever, scale.get(t.lever)! * ratio);
      moved = true;
    }
  }
  sum = apply();
  if (!moved) break;
}

console.log(`${spec.id}`);
for (const t of spec.targets) {
  const b = at(before.events, t);
  const a = at(sum.events, t);
  console.log(
    `  ${t.type}[${t.nth ?? 0}] real ${t.real}  before ${b?.toFixed(1)}  after ${a?.toFixed(1)}  (${t.lever} thrust x${scale.get(t.lever)!.toFixed(3)})`,
  );
}
console.log('  events after:', sum.events.map((e) => `${e.type} ${e.t.toFixed(1)}`).join(' · '));
console.log(`  reaches orbit: ${sum.events.some((e) => e.type === 'orbit') ? 'yes' : 'NO'}`);

if (flag === '--write') {
  writeFileSync(file, stringifyProfile(p) + '\n');
  console.log(`  wrote ${file} (run prettier on it)`);
}
