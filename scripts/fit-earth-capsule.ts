/**
 * fit-earth-capsule.ts — fit an EARTH_CAPSULE_REENTRY profile to a sourced re-entry timeline.
 *
 * Sourced values are SET (chute altitudes, entry state when the report gives it). Only model
 * estimates are SEARCHED (bisection), in order, and each searched field is added to the
 * profile's `estimatedFields`:
 *   1. entry — `flightPathAngleDeg` against the sourced peak g, or (lifting, guided capsules)
 *      `targetDownrangeKm` against the sourced time from entry interface to drogue;
 *   2. `parachuteCdA` (drogue) against the sourced drogue → main interval;
 *   3. `terminalCdA` (main canopies) against the sourced main → touchdown interval.
 * Prints model vs source for every target; `--write` updates the profile JSON.
 *
 *   npx tsx scripts/fit-earth-capsule.ts <targets.json> [--write] [--only id,id]
 *
 * targets.json: { "<missionId>": { drogueAltKm?, mainAltKm?, drogueToMainS?, mainToTouchdownS?,
 *   peakG?, entryToDrogueS?, entry?: { altitudeM?, velocityMs?, flightPathAngleDeg? },
 *   provenance?: [{ l, u }] } }
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  expandDescentProfile,
  type RawDescentProfile,
} from '../src/lib/physics/descent/descent-profile-registry';
import { integrateDescent, type DescentSummary } from '../src/lib/physics/descent/descent-physics';

interface Target {
  drogueAltKm?: number;
  mainAltKm?: number;
  drogueToMainS?: number;
  mainToTouchdownS?: number;
  touchdownMs?: number;
  peakG?: number;
  entryToDrogueS?: number;
  entry?: { altitudeM?: number; velocityMs?: number; flightPathAngleDeg?: number };
  provenance?: { l: string; u: string }[];
}

const DIR = resolve(import.meta.dirname, '..', 'static/data/descent-profiles');
const [targetsPath, ...rest] = process.argv.slice(2);
const write = rest.includes('--write');
const onlyIdx = rest.indexOf('--only');
const only = onlyIdx >= 0 ? new Set(rest[onlyIdx + 1].split(',')) : null;
const targets = JSON.parse(readFileSync(targetsPath, 'utf8')) as Record<string, Target>;

const run = (raw: RawDescentProfile): DescentSummary => integrateDescent(expandDescentProfile(raw));
const evT = (s: DescentSummary, type: string): number | undefined =>
  s.events.find((e) => e.type === type)?.t;
/** Peak felt g during the entry pulse (phase 0), not the chute openings. */
const entryPeakG = (s: DescentSummary): number =>
  Math.max(0, ...s.states.filter((st) => st.phaseIndex === 0).map((st) => st.decelG));

/** Bisection on a monotone f(x) toward `goal` over [lo, hi]. */
function bisect(
  f: (x: number) => number,
  goal: number,
  lo: number,
  hi: number,
  iters = 40,
): number {
  const fLo = f(lo) - goal;
  for (let i = 0; i < iters; i++) {
    const mid = (lo + hi) / 2;
    const fm = f(mid) - goal;
    if (Math.sign(fm) === Math.sign(fLo)) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

const estimate = (raw: RawDescentProfile, field: string): void => {
  raw.estimatedFields = [...new Set([...(raw.estimatedFields ?? []), field])];
};

for (const [id, t] of Object.entries(targets)) {
  if (id.startsWith('_') || (only && !only.has(id))) continue;
  const path = resolve(DIR, `${id}.json`);
  const raw = JSON.parse(readFileSync(path, 'utf8')) as RawDescentProfile;
  raw.params = { ...(raw.params ?? {}) };
  const sourced = new Set<string>();

  // Sourced: set.
  if (t.entry) {
    for (const [k, v] of Object.entries(t.entry)) {
      if (v == null) continue;
      (raw.entryState as Record<string, number>)[k] = v;
      raw.estimatedFields = (raw.estimatedFields ?? []).filter((f) => f !== k);
      sourced.add(k);
    }
  }
  if (t.drogueAltKm != null) raw.params.chuteDeployAltM = Math.round(t.drogueAltKm * 1000);
  if (t.mainAltKm != null) raw.params.terminalHandoffAltM = Math.round(t.mainAltKm * 1000);

  // 1. Entry.
  const guided = raw.targetDownrangeKm != null;
  if (guided && t.entryToDrogueS != null) {
    raw.targetDownrangeKm = Math.round(
      bisect(
        (x) => evT(run({ ...raw, targetDownrangeKm: x }), 'parachute_deploy') ?? 0,
        t.entryToDrogueS,
        300,
        4000,
        24,
      ),
    );
    estimate(raw, 'targetDownrangeKm');
  } else if (t.peakG != null && !sourced.has('flightPathAngleDeg')) {
    const fpa = bisect(
      (x) => entryPeakG(run({ ...raw, entryState: { ...raw.entryState, flightPathAngleDeg: x } })),
      t.peakG,
      0.5,
      raw.entryState.velocityMs < 5000 ? 60 : 12,
      24,
    );
    raw.entryState.flightPathAngleDeg = +fpa.toFixed(2);
    estimate(raw, 'flightPathAngleDeg');
  }

  // When the main-chute altitude is NOT sourced but the touchdown speed and main → touchdown
  // interval are, the speed fixes the main's area and the interval fixes the altitude (both
  // declared estimates). Two passes: the drogue interval depends on where the main opens.
  const fitMainAlt = t.mainAltKm == null && t.touchdownMs != null && t.mainToTouchdownS != null;
  for (let pass = 0; pass < (fitMainAlt ? 2 : 1); pass++) {
    // 2. Drogue drag area against the drogue → main interval (bigger area = slower = longer).
    if (t.drogueToMainS != null) {
      raw.params.parachuteCdA = +bisect(
        (x) => {
          const s = run({ ...raw, params: { ...raw.params, parachuteCdA: x } });
          return (evT(s, 'parachute_jettison') ?? 0) - (evT(s, 'parachute_deploy') ?? 0);
        },
        t.drogueToMainS,
        1,
        600,
      ).toFixed(1);
      estimate(raw, 'parachuteCdA');
    }

    // 3. Main canopies against the main → touchdown interval (or the touchdown speed + altitude).
    if (fitMainAlt) {
      raw.params.terminalCdA = Math.round(
        bisect(
          (x) => -run({ ...raw, params: { ...raw.params, terminalCdA: x } }).touchdownVelocityMs,
          -(t.touchdownMs as number),
          20,
          6000,
        ),
      );
      estimate(raw, 'terminalCdA');
      raw.params.terminalHandoffAltM = Math.round(
        bisect(
          (x) => {
            const s = run({ ...raw, params: { ...raw.params, terminalHandoffAltM: x } });
            return s.totalDurationS - (evT(s, 'parachute_jettison') ?? 0);
          },
          t.mainToTouchdownS as number,
          500,
          Math.max(1000, (raw.params.chuteDeployAltM ?? 8000) - 200),
        ),
      );
      estimate(raw, 'terminalHandoffAltM');
    } else if (t.mainToTouchdownS != null) {
      raw.params.terminalCdA = Math.round(
        bisect(
          (x) => {
            const s = run({ ...raw, params: { ...raw.params, terminalCdA: x } });
            return s.totalDurationS - (evT(s, 'parachute_jettison') ?? 0);
          },
          t.mainToTouchdownS,
          20,
          6000,
        ),
      );
      estimate(raw, 'terminalCdA');
    }
  }

  if (t.provenance) {
    const have = new Set((raw.provenance ?? []).map((p) => p.u));
    raw.provenance = [...(raw.provenance ?? []), ...t.provenance.filter((p) => !have.has(p.u))];
  }

  const s = run(raw);
  const dep = evT(s, 'parachute_deploy') ?? 0;
  const jet = evT(s, 'parachute_jettison') ?? 0;
  const cmp = (name: string, model: number, src: number | undefined, unit: string): string =>
    `${name} ${model.toFixed(1)}${unit}${src != null ? ` (src ${src}${unit})` : ''}`;
  console.log(
    [
      id.padEnd(15),
      cmp('peakEntryG', entryPeakG(s), t.peakG, ''),
      cmp('peakAllG', s.peakDecel.g, undefined, ''),
      cmp('EI→drogue', dep, t.entryToDrogueS, 's'),
      cmp('drogue→main', jet - dep, t.drogueToMainS, 's'),
      cmp('main→TD', s.totalDurationS - jet, t.mainToTouchdownS, 's'),
      cmp('TD', s.touchdownVelocityMs, t.touchdownMs, 'm/s'),
      `| fpa ${raw.entryState.flightPathAngleDeg} drogueCdA ${raw.params.parachuteCdA} mainCdA ${raw.params.terminalCdA}${guided ? ` dr ${raw.targetDownrangeKm}` : ''}`,
    ].join('  '),
  );
  if (write) writeFileSync(path, JSON.stringify(raw, null, 2) + '\n');
}
