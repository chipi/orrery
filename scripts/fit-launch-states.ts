/**
 * Fit a launch profile's pitch table to a sourced trajectory: altitude and inertial speed at given
 * times (JAXA's launch plans, a guide's "fairing at 121-125 km") and, optionally, event times.
 *
 * The pitch table is the one ascent input no source publishes, so this is the lever for a state
 * mismatch; thrust, propellant and Isp stay the published values (`fit-launch-timeline.ts` scales
 * thrust, which is right for a burn time but wrong for a trajectory). For the fit to drive the
 * whole lower ascent, set `pitchTableStages` (in `set` or the profile). Nelder-Mead over the
 * knot angles, kept between -10 and 90 degrees and non-increasing in time; the knots in `fixed`
 * (the vertical rise) are not moved. Prints before / after and whether the profile still reaches
 * orbit; `--write` rewrites the profile JSON (run prettier on it). Pin the result in
 * `src/lib/orbital/launch-timeline.test.ts`.
 *
 *   npx tsx scripts/fit-launch-states.ts <spec.json> [--write]
 *
 * spec.json: { "id": "h3", "set": { "pitchTableStages": 1, "targetOrbitAltM": 329000 },
 *   "fixed": [[0, 90], [10, 89]], "knots": [30, 60, 100, 150, 200, 292],
 *   "states": [ { "t": 292, "altKm": 208, "kms": 6.2 } ],
 *   "events": [ { "type": "seco", "nth": 0, "real": 640, "tol": 30 } ], "iterations": 600 }
 * A state may give only `altKm` or only `kms`; an event type may be "max_q". Weights: 10 km, 0.1 km/s, an event's `tol`.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  integrateAscent,
  pitchAngleRad,
  type AscentEvent,
  type LaunchProfile,
} from '../src/lib/physics/ascent/ascent-physics';
import { applySet, stringifyProfile } from './lib/launch-profile-json';

interface StateTarget {
  t: number;
  altKm?: number;
  kms?: number;
}
interface EventTarget {
  type: AscentEvent['type'] | 'max_q';
  nth?: number;
  real: number;
  tol: number;
}
interface Spec {
  id: string;
  set?: Record<string, unknown>;
  fixed?: [number, number][];
  knots: number[];
  states?: StateTarget[];
  events?: EventTarget[];
  iterations?: number;
}

const [specPath, flag] = process.argv.slice(2);
if (!specPath) {
  console.error('usage: tsx scripts/fit-launch-states.ts <spec.json> [--write]');
  process.exit(2);
}
const spec = JSON.parse(readFileSync(specPath, 'utf-8')) as Spec;
const file = resolve('static/data/launch-profiles', `${spec.id}.json`);
const original = JSON.parse(readFileSync(file, 'utf-8')) as LaunchProfile;
const base = structuredClone(original);
applySet(base, spec.set);
const fixed = spec.fixed ?? [[0, 90]];

const withKnots = (x: number[]): LaunchProfile => ({
  ...base,
  pitchProgram: [...fixed, ...spec.knots.map((t, i) => [t, +x[i].toFixed(1)] as [number, number])],
});
type Sum = ReturnType<typeof integrateAscent>;
const eventAt = (sum: Sum, r: EventTarget) =>
  r.type === 'max_q' ? sum.maxQ.t : sum.events.filter((e) => e.type === r.type)[r.nth ?? 0]?.t;

const stateAt = (sum: Sum, t: number) =>
  sum.states.reduce((b, s) => (Math.abs(s.t - t) < Math.abs(b.t - t) ? s : b));
const reachesOrbit = (sum: Sum) => sum.events.some((e) => e.type === 'orbit');

function cost(x: number[]): number {
  const last = fixed.at(-1)![1];
  if (x.some((a) => a > 90 || a < -10) || x[0] > last) return 1e9;
  for (let i = 1; i < x.length; i++) if (x[i] > x[i - 1]) return 1e9;
  let sum: Sum;
  try {
    sum = integrateAscent(withKnots(x));
  } catch {
    return 1e9;
  }
  let c = reachesOrbit(sum) ? 0 : 1e6;
  for (const s of spec.states ?? []) {
    const q = stateAt(sum, s.t);
    if (s.altKm !== undefined) c += ((q.altKm - s.altKm) / 10) ** 2;
    if (s.kms !== undefined) c += ((q.speedKms - s.kms) / 0.1) ** 2;
  }
  for (const e of spec.events ?? []) {
    const t = eventAt(sum, e);
    c += t === undefined ? 1e4 : ((t - e.real) / e.tol) ** 2;
  }
  return c;
}

function nelderMead(x0: number[], iterations: number): { x: number[]; c: number } {
  const n = x0.length;
  let pts = [x0, ...x0.map((_, i) => x0.map((v, j) => (j === i ? v - 4 : v)))].map((x) => ({
    x,
    c: cost(x),
  }));
  for (let it = 0; it < iterations; it++) {
    pts.sort((a, b) => a.c - b.c);
    const cen = Array<number>(n).fill(0);
    for (const p of pts.slice(0, n)) p.x.forEach((v, i) => (cen[i] += v / n));
    const worst = pts[n];
    const along = (k: number) => cen.map((c, i) => c + k * (worst.x[i] - c));
    const r = along(-1);
    const cr = cost(r);
    if (cr < pts[0].c) {
      const e = along(-2);
      const ce = cost(e);
      pts[n] = ce < cr ? { x: e, c: ce } : { x: r, c: cr };
    } else if (cr < pts[n - 1].c) {
      pts[n] = { x: r, c: cr };
    } else {
      const k = along(0.5);
      const ck = cost(k);
      if (ck < worst.c) pts[n] = { x: k, c: ck };
      else {
        const best = pts[0].x;
        pts = pts.map((p, i) => {
          if (i === 0) return p;
          const x = p.x.map((v, j) => (v + best[j]) / 2);
          return { x, c: cost(x) };
        });
      }
    }
  }
  pts.sort((a, b) => a.c - b.c);
  return pts[0];
}

function report(label: string, sum: Sum) {
  console.log(`  ${label}: reaches orbit ${reachesOrbit(sum) ? 'yes' : 'NO'}`);
  for (const s of spec.states ?? []) {
    const q = stateAt(sum, s.t);
    console.log(
      `    T+${s.t}  alt ${q.altKm.toFixed(1)} km (real ${s.altKm ?? '-'})  v ${q.speedKms.toFixed(3)} km/s (real ${s.kms ?? '-'})`,
    );
  }
  for (const e of spec.events ?? []) {
    console.log(
      `    ${e.type}[${e.nth ?? 0}] ${eventAt(sum, e)?.toFixed(1)} (real ${e.real} ±${e.tol})`,
    );
  }
}

const x0 = spec.knots.map((t) => (pitchAngleRad(base, t) * 180) / Math.PI);
const best = nelderMead(x0, spec.iterations ?? 600);
const fitted = withKnots(best.x);
console.log(`${spec.id}  cost ${cost(x0).toFixed(2)} -> ${best.c.toFixed(2)}`);
report('before (spec set, profile table)', integrateAscent(base));
report('after', integrateAscent(fitted));
console.log(`  pitchProgram: ${JSON.stringify(fitted.pitchProgram)}`);

if (flag === '--write') {
  writeFileSync(file, stringifyProfile(fitted) + '\n');
  console.log(`  wrote ${file} (run prettier on it)`);
}
