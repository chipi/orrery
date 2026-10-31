/** Descent and landing formulas: descent burn, powered descent, entry steering, terminal velocity, soft-landing / airbag checks, touchdown. */
import type { FormulaDef, FormulaResult, Vec2, Quantity } from '../spec';
import { poweredDescentDvKms } from '../mechanics/descent';
import { MU_BODY_M3_S2, R_BODY_M } from '../descent/descent-physics-constants';
import { terminalVelocityMs, SURFACE_DENSITY_KGM3 } from '../mechanics/atmosphere';
import { bodyGravityMs2 } from '../mechanics/bodies';
import { locationModel } from '../util/location';
import { poweredDescentThrottle } from '../systems/powered-descent';
import {
  simulateLiftingEntry,
  liftCorridor,
  solveEntryBankForRange,
} from '../systems/entry-steering';
import { ENGINE_REGISTRY, getEngineMeta } from '../propulsion/engine-registry';
import { G0 } from '../util/constants';

/**
 * Powered-descent Δv — M3 "land on the Moon" rung. A constant-thrust braking burn from
 * orbital speed to rest: Δv = v_orbit·TWR/(TWR−1). The gravity loss is v_orbit/(TWR−1)
 * — a high-thrust lander is nearly loss-free, and TWR→1 diverges (you can't out-thrust
 * gravity → you crash). `vOrbitKms` wires from orbital-velocity, `twr` from the TWR rung.
 */
export const descentBurn: FormulaDef<{ vOrbitKms: number; twr: number }> = {
  id: 'descent-burn',
  titleKey: 'lab.f.descent-burn.title',
  plainKey: 'lab.f.descent-burn.plain',
  citationKey: 'mission-phases/propulsive-landing',
  learnMore: { url: 'https://en.wikipedia.org/wiki/Powered_descent', source: 'wikipedia' },
  domain: 'descent',
  tier: 8,
  prereqs: ['orbital-velocity', 'twr'],
  latex: '\\Delta v = v_{\\text{orb}}\\,\\dfrac{\\text{TWR}}{\\text{TWR} - 1}',
  inputs: [
    {
      key: 'vOrbitKms',
      labelKey: 'lab.f.descent.vorbit',
      units: 'km/s',
      kind: 'number',
      default: 1.63,
      min: 0,
      max: 12,
    },
    {
      key: 'twr',
      labelKey: 'lab.f.descent.twr',
      units: '',
      kind: 'number',
      default: 3,
      min: 0,
      max: 20,
    },
  ],
  outputs: [{ key: 'descentDv', labelKey: 'lab.f.descent.dv', units: 'km/s' }],
  compute: ({ vOrbitKms, twr }) => {
    // Untrusted (MCP) inputs must reject fail-honest — never a NaN readout (review M-1).
    if (!Number.isFinite(vOrbitKms) || !Number.isFinite(twr) || vOrbitKms < 0) {
      const values: Record<string, Quantity> = {};
      return {
        values,
        status: { ok: false, reasonKey: 'lab.f.descent.err-input' },
        assumptions: ['lab.assume.uniform-g'],
      } satisfies FormulaResult;
    }
    // TWR ≤ 1: the engine can't out-thrust gravity — you never stop falling.
    if (twr <= 1) {
      const values: Record<string, Quantity> = {};
      return {
        values,
        status: { ok: false, reasonKey: 'lab.f.descent.err-twr' },
        assumptions: ['lab.assume.uniform-g'],
      } satisfies FormulaResult;
    }
    const dv = poweredDescentDvKms(vOrbitKms, twr);
    const gLossKms = dv - vOrbitKms; // v_orbit/(TWR−1)
    return {
      values: { descentDv: { value: dv, units: 'km/s' } },
      status: { ok: true },
      assumptions: ['lab.assume.uniform-g', 'lab.assume.no-drag', 'lab.assume.constant-thrust'],
      figure: {
        kind: 'dv-waterfall',
        provenance: { fidelity: 'computed', module: 'mechanics/descent' },
        assumptions: ['lab.assume.uniform-g', 'lab.assume.constant-thrust'],
        segments: [
          { labelKey: 'lab.f.descent.cancel-orbit', dv: vOrbitKms, kind: 'cost' },
          { labelKey: 'lab.f.descent.gravity-loss', dv: gLossKms, kind: 'cost' },
        ],
      },
    } satisfies FormulaResult;
  },
};

const DESCENT_BODY_IDS = ['moon', 'mars'] as const;

/**
 * Powered-descent guidance (SYSTEMS) — the landing computer, made playable. On an airless or
 * near-airless world you cannot parachute down; the only brake is the engine, and a human
 * cannot eyeball a burn that must null the velocity at exactly zero altitude with seconds of
 * fuel to spare. So the vehicle runs the kernel SYSTEMS powered-descent controller
 * (`systems/poweredDescentThrottle`, the SAME one the /fly descent sim flies): a descent-rate
 * schedule `v_target = gain · altitude` that eases the speed to a survivable touchdown, throttle
 * rate-limited so the g-load stays bounded. This lesson drives that controller step by step from
 * a starting altitude and shows it land — or, if you arrive too fast or cap the braking too low,
 * watch it stay above the schedule and hit hard. Apollo's LM, the Mars sky-crane, and SpaceX's
 * landing burn all fly this loop.
 */
export const poweredDescent: FormulaDef<{
  body: string;
  startSpeedMs: number;
  maxBrakeG: number;
}> = {
  id: 'powered-descent',
  titleKey: 'lab.f.pdescent.title',
  plainKey: 'lab.f.pdescent.plain',
  citationKey: 'mission-phases/propulsive-landing',
  learnMore: { url: 'https://en.wikipedia.org/wiki/Powered_descent', source: 'wikipedia' },
  domain: 'descent',
  tier: 3,
  prereqs: ['descent-burn'],
  latex:
    'v_{\\text{target}} = \\min(v,\\; g_{\\text{sched}}\\cdot h),\\quad a_{\\text{cmd}} \\le a_{\\max}',
  inputs: [
    {
      key: 'body',
      labelKey: 'lab.f.pdescent.body',
      units: '',
      kind: 'body',
      default: 'moon',
      bodyIds: [...DESCENT_BODY_IDS],
    },
    {
      key: 'startSpeedMs',
      labelKey: 'lab.f.pdescent.speed',
      units: 'm/s',
      kind: 'number',
      default: 200,
      min: 50,
      max: 700,
      step: 10,
    },
    {
      key: 'maxBrakeG',
      labelKey: 'lab.f.pdescent.brake',
      units: '',
      kind: 'number',
      default: 4,
      min: 1,
      max: 8,
      step: 0.5,
    },
  ],
  outputs: [
    { key: 'touchdownMs', labelKey: 'lab.f.pdescent.touchdown', units: 'm/s' },
    { key: 'peakDecelG', labelKey: 'lab.f.pdescent.decel', units: '' },
    { key: 'dvUsedMs', labelKey: 'lab.f.pdescent.dv', units: 'm/s' },
  ],
  compute: ({ body, startSpeedMs, maxBrakeG }) => {
    const gMs2 = bodyGravityMs2(body);
    if (
      !Number.isFinite(gMs2) ||
      !Number.isFinite(startSpeedMs) ||
      !Number.isFinite(maxBrakeG) ||
      startSpeedMs <= 0 ||
      maxBrakeG <= 0
    ) {
      const values: Record<string, Quantity> = {};
      return {
        values,
        status: { ok: false, reasonKey: 'lab.f.descent.err-input' },
        assumptions: ['lab.assume.vertical-descent'],
      } satisfies FormulaResult;
    }
    const START_ALT_M = 2500;
    const GAIN = 0.09; // schedule slope: v_target = 0.09 · altitude
    const TERM_MS = 1; // survivable touchdown speed
    const dt = 0.1;
    let h = START_ALT_M;
    let v = startSpeedMs;
    let dvUsed = 0;
    let peakG = 0;
    const samples: { altKm: number; speedMs: number }[] = [{ altKm: h / 1000, speedMs: v }];
    for (let t = 0; h > 0 && t < 600; t += dt) {
      const cmd = poweredDescentThrottle({
        altitudeM: h,
        speedMs: v,
        gravityMs2: gMs2,
        maxBrakeMs2: maxBrakeG * G0,
        descentRateGain: GAIN,
        terminalVelocityMs: TERM_MS,
        dtS: dt,
      });
      v = cmd.nextSpeedMs;
      h -= v * dt;
      dvUsed += cmd.thrustAccelMs2 * dt;
      peakG = Math.max(peakG, cmd.thrustAccelMs2 / G0);
      if (samples.length < 400) samples.push({ altKm: Math.max(0, h) / 1000, speedMs: v });
    }
    const touchdownMs = v;
    const landedSoft = touchdownMs < 3;
    const values: Record<string, Quantity> = {
      touchdownMs: { value: touchdownMs, units: 'm/s' },
      peakDecelG: { value: peakG, units: '' },
      dvUsedMs: { value: dvUsed, units: 'm/s' },
    };
    const figure = {
      kind: 'descent-guidance' as const,
      provenance: { fidelity: 'computed' as const, module: 'systems/powered-descent' },
      assumptions: ['lab.assume.vertical-descent', 'lab.assume.constant-gravity'],
      samples,
      scheduleGain: GAIN,
      terminalMs: TERM_MS,
      touchdownMs,
      peakDecelG: peakG,
      dvUsedMs: dvUsed,
      landedSoft,
      bodyLabelKey: `lab.body.${body}`,
    };
    // Fail-honest on a crash — but still draw the descent so you see what went wrong.
    return {
      values,
      status: landedSoft ? { ok: true } : { ok: false, reasonKey: 'lab.f.pdescent.err-crash' },
      assumptions: ['lab.assume.vertical-descent', 'lab.assume.constant-gravity'],
      figure,
    } satisfies FormulaResult;
  },
};

/**
 * Re-entry lift-vector steering (SYSTEMS) — the payoff of the ballistic entry-corridor lesson,
 * and the last of the three flight computers. A capsule coming back from the Moon at ~11 km/s
 * has ONE control: BANK. By rolling, it points its lift vector up (pull out of the dive, avoid
 * over-g) or down (dig in, avoid skipping back to space). This lesson flies the kernel SYSTEMS
 * bank controller (`systems/entry-steering`) through a real 2-DOF lifting entry and — the honest
 * teaching claim — measures the SURVIVABLE ENTRY-ANGLE CORRIDOR: a ballistic capsule's is a
 * knife-edge (the entry-corridor lesson showed a lunar-return ballistic corridor barely exists),
 * and lift + steering roughly DOUBLES it (Apollo's L/D≈0.3). Raise the lift-to-drag and the
 * corridor widens; that widening is why every crewed lunar return has flown a lifting entry.
 */
export const entrySteering: FormulaDef<{
  liftToDrag: number;
  entryAngleDeg: number;
  gLimitG: number;
}> = {
  id: 'entry-steering',
  titleKey: 'lab.f.esteer.title',
  plainKey: 'lab.f.esteer.plain',
  citationKey: 'mission-phases/lifting-entry',
  learnMore: { url: 'https://en.wikipedia.org/wiki/Atmospheric_entry', source: 'wikipedia' },
  domain: 'descent',
  tier: 4,
  prereqs: ['entry-corridor'],
  latex:
    '\\dot\\gamma = \\dfrac{(L/D)\\,a_D\\cos\\phi}{v} + \\ldots,\\quad \\cos\\phi = \\text{bank command}',
  inputs: [
    {
      key: 'liftToDrag',
      labelKey: 'lab.f.esteer.ld',
      units: '',
      kind: 'number',
      default: 0.3,
      min: 0,
      max: 0.6,
      step: 0.05,
    },
    {
      key: 'entryAngleDeg',
      labelKey: 'lab.f.esteer.angle',
      units: 'deg',
      kind: 'number',
      default: 5.75,
      min: 3,
      max: 9,
      step: 0.25,
    },
    {
      key: 'gLimitG',
      labelKey: 'lab.f.esteer.glimit',
      units: '',
      kind: 'number',
      default: 12,
      min: 6,
      max: 20,
    },
  ],
  outputs: [
    { key: 'liftWidthDeg', labelKey: 'lab.f.esteer.liftwidth', units: 'deg' },
    { key: 'ballWidthDeg', labelKey: 'lab.f.esteer.ballwidth', units: 'deg' },
    { key: 'peakGeeAtEntry', labelKey: 'lab.f.esteer.peakg', units: '' },
  ],
  compute: ({ liftToDrag, entryAngleDeg, gLimitG }) => {
    if (
      !Number.isFinite(liftToDrag) ||
      !Number.isFinite(entryAngleDeg) ||
      !Number.isFinite(gLimitG) ||
      liftToDrag < 0 ||
      entryAngleDeg <= 0 ||
      gLimitG <= 0
    ) {
      const values: Record<string, Quantity> = {};
      return {
        values,
        status: { ok: false, reasonKey: 'lab.f.escape.err-input' },
        assumptions: ['lab.assume.two-dof-entry'],
      } satisfies FormulaResult;
    }
    const V0 = 11000; // lunar-return entry speed
    const BC = 400; // ballistic coefficient (Apollo-class capsule, kg/m²)
    const TARGET_G = 6;
    const lift = liftCorridor({
      entryVelocityMs: V0,
      liftToDrag,
      ballisticCoeff: BC,
      targetDecelG: TARGET_G,
      gLimitG,
    });
    const ball = liftCorridor({
      entryVelocityMs: V0,
      liftToDrag: 0,
      ballisticCoeff: BC,
      targetDecelG: TARGET_G,
      gLimitG,
    });
    const traj = simulateLiftingEntry({
      entryVelocityMs: V0,
      entryAngleDeg,
      liftToDrag,
      ballisticCoeff: BC,
      targetDecelG: TARGET_G,
    });
    const captured = traj.outcome === 'captured' && traj.peakG <= gLimitG;
    const values: Record<string, Quantity> = {
      liftWidthDeg: { value: lift.widthDeg, units: 'deg' },
      ballWidthDeg: { value: ball.widthDeg, units: 'deg' },
      peakGeeAtEntry: { value: traj.peakG, units: '' },
    };
    const figure = {
      kind: 'entry-steering' as const,
      provenance: { fidelity: 'computed' as const, module: 'systems/entry-steering' },
      assumptions: ['lab.assume.two-dof-entry', 'lab.assume.exponential-atmosphere'],
      trajectory: traj.trajectory,
      liftShallowDeg: lift.shallowDeg ?? 0,
      liftSteepDeg: lift.steepDeg ?? 0,
      liftWidthDeg: lift.widthDeg,
      ballShallowDeg: ball.shallowDeg ?? 0,
      ballSteepDeg: ball.steepDeg ?? 0,
      ballWidthDeg: ball.widthDeg,
      entryAngleDeg,
      peakGeeAtEntry: traj.peakG,
      gLimitG,
      liftToDrag,
      captured,
    };
    // Fail-honest when this particular entry doesn't survive (skip or over-g) — figure still drawn.
    return {
      values,
      status: captured ? { ok: true } : { ok: false, reasonKey: 'lab.f.esteer.err-lost' },
      assumptions: ['lab.assume.two-dof-entry', 'lab.assume.exponential-atmosphere'],
      figure,
    } satisfies FormulaResult;
  },
};

/**
 * Range-control entry guidance (#29 · ADR-088) — the OTHER job of the entry computer: not just to
 * survive the corridor, but to STEER to a chosen landing point. Downrange is monotone in the
 * vertical lift fraction cos(bank): full lift-up flies the farthest (a long shallow skim), lift-down
 * digs in short. So the computer bisects the bank that lands at your target
 * (systems/entry-steering `solveEntryBankForRange`). The curve is the FOOTPRINT — every reachable
 * landing range and the g it costs: a near target forces a lift-down dig-in that spikes the g, a far
 * target rides lift-up gently. The lesson: range and g TRADE against each other, and the computer
 * picks the single bank that hits the target. An out-of-footprint target fails honest (clamped).
 */
export const entryRangeControl: FormulaDef<{
  liftToDrag: number;
  targetRangeKm: number;
  entryAngleDeg: number;
}> = {
  id: 'entry-range-control',
  titleKey: 'lab.f.rangectl.title',
  plainKey: 'lab.f.rangectl.plain',
  citationKey: 'mission-phases/entry-footprint',
  learnMore: { url: 'https://en.wikipedia.org/wiki/Atmospheric_entry', source: 'wikipedia' },
  domain: 'descent',
  tier: 5,
  prereqs: ['entry-steering'],
  latex:
    'R(\\cos\\phi)\\ \\text{monotone} \\Rightarrow \\text{bisect}\\ \\cos\\phi\\ \\text{s.t.}\\ R = R_\\text{target}',
  inputs: [
    {
      key: 'liftToDrag',
      labelKey: 'lab.f.rangectl.ld',
      units: '',
      kind: 'number',
      default: 0.3,
      min: 0.1,
      max: 0.5,
      step: 0.02,
    },
    {
      key: 'targetRangeKm',
      labelKey: 'lab.f.rangectl.target',
      units: 'km',
      kind: 'number',
      default: 3000,
      min: 2000,
      max: 4500,
      step: 100,
    },
    {
      key: 'entryAngleDeg',
      labelKey: 'lab.f.rangectl.angle',
      units: 'deg',
      kind: 'number',
      default: 1.5,
      min: 1,
      max: 3,
      step: 0.25,
    },
  ],
  outputs: [
    { key: 'bankDeg', labelKey: 'lab.f.rangectl.bank', units: 'deg' },
    { key: 'landedRangeKm', labelKey: 'lab.f.rangectl.landed', units: 'km' },
    { key: 'peakGeeAtSolve', labelKey: 'lab.f.rangectl.peakg', units: '' },
  ],
  compute: ({ liftToDrag, targetRangeKm, entryAngleDeg }) => {
    if (
      !Number.isFinite(liftToDrag) ||
      !Number.isFinite(targetRangeKm) ||
      !Number.isFinite(entryAngleDeg) ||
      liftToDrag <= 0 ||
      targetRangeKm <= 0 ||
      entryAngleDeg <= 0
    ) {
      return {
        values: {},
        status: { ok: false, reasonKey: 'lab.f.escape.err-input' },
        assumptions: ['lab.assume.two-dof-entry'],
      } satisfies FormulaResult;
    }
    const V0 = 7820; // LEO-return entry speed
    const BC = 400; // Apollo-class capsule ballistic coefficient (kg/m²)
    const dyn = { entryVelocityMs: V0, entryAngleDeg, liftToDrag, ballisticCoeff: BC };
    const solve = solveEntryBankForRange(dyn, targetRangeKm * 1000);
    const bankDeg = (Math.acos(Math.max(-1, Math.min(1, solve.bankCos))) * 180) / Math.PI;
    // Footprint: sweep a CONSTANT bank from lift-down (short + high-g) to lift-up (far + low-g); each
    // point is (landing range, peak-g) — the trade the computer navigates.
    const footprint: { rangeKm: number; peakG: number }[] = [];
    for (let u = -1; u <= 1.0001; u += 0.08) {
      const r = simulateLiftingEntry({ ...dyn, targetDecelG: 0, bankCommand: () => u });
      footprint.push({ rangeKm: r.downrangeM / 1000, peakG: r.peakG });
    }
    const footLoKm = Math.min(...footprint.map((p) => p.rangeKm));
    const footHiKm = Math.max(...footprint.map((p) => p.rangeKm));
    const values: Record<string, Quantity> = {
      bankDeg: { value: bankDeg, units: 'deg' },
      landedRangeKm: { value: solve.landedRangeM / 1000, units: 'km' },
      peakGeeAtSolve: { value: solve.peakG, units: '' },
    };
    return {
      values,
      status: solve.reachable
        ? { ok: true }
        : { ok: false, reasonKey: 'lab.f.rangectl.err-unreachable' },
      assumptions: ['lab.assume.two-dof-entry', 'lab.assume.exponential-atmosphere'],
      figure: {
        kind: 'entry-range',
        provenance: { fidelity: 'computed', module: 'systems/entry-steering' },
        assumptions: ['lab.assume.two-dof-entry', 'lab.assume.exponential-atmosphere'],
        footprint,
        footLoKm,
        footHiKm,
        targetKm: targetRangeKm,
        solvedRangeKm: solve.landedRangeM / 1000,
        solvedPeakG: solve.peakG,
        bankDeg,
        reachable: solve.reachable,
        liftToDrag,
      },
    } satisfies FormulaResult;
  },
};

// Titan joined for the Huygens lesson (P3 · #527) — the only moon with a real
// atmosphere; Jupiter for the Galileo probe dive (P4 · #528, 1-bar datum — no
// surface, no landing); the Moon/Mercury stay for the airless fail-honest branch.
const ATMO_BODY_IDS = ['earth', 'mars', 'venus', 'titan', 'jupiter', 'moon', 'mercury'] as const;

/**
 * Terminal velocity in an atmosphere (M5 "land on Mars") — v_t = √(2mg/(ρ·A·C_d)),
 * the speed where drag balances weight. The Mars lesson: its air is ~1/60 of Earth's,
 * so a capsule still falls at hundreds of m/s — a parachute isn't enough. Airless
 * worlds (Moon/Mercury, ρ=0) have NO terminal velocity → fail-honest (M3's burn is
 * the only way down). Curve shows how a bigger drag area (a chute) lowers v_t.
 */
export const terminalVelocity: FormulaDef<{
  massKg: number;
  areaM2: number;
  cd: number;
  body: string;
}> = {
  id: 'terminal-velocity',
  titleKey: 'lab.f.terminal.title',
  plainKey: 'lab.f.terminal.plain',
  citationKey: 'mission-phases/terminal-velocity',
  learnMore: { url: 'https://www.grc.nasa.gov/www/k-12/airplane/termv.html', source: 'nasa-glenn' },
  domain: 'descent',
  tier: 6,
  prereqs: ['weight'],
  latex: 'v_t = \\sqrt{\\dfrac{2mg}{\\rho\\,A\\,C_d}}',
  inputs: [
    {
      key: 'massKg',
      labelKey: 'lab.f.terminal.mass',
      units: 'kg',
      kind: 'number',
      default: 2000,
      min: 1,
      max: 1e6,
    },
    {
      key: 'areaM2',
      labelKey: 'lab.f.terminal.area',
      units: '',
      kind: 'number',
      default: 10,
      min: 0.1,
      max: 2000,
    },
    {
      key: 'cd',
      labelKey: 'lab.f.terminal.cd',
      units: '',
      kind: 'number',
      default: 1.5,
      min: 0.1,
      max: 3,
    },
    {
      key: 'body',
      labelKey: 'lab.f.terminal.body',
      units: '',
      kind: 'body',
      default: 'mars',
      bodyIds: [...ATMO_BODY_IDS],
    },
  ],
  outputs: [{ key: 'vTerminal', labelKey: 'lab.f.terminal.vt', units: 'm/s' }],
  compute: ({ massKg, areaM2, cd, body }) => {
    const loc = locationModel(body);
    if (!loc) {
      const values: Record<string, Quantity> = {};
      return {
        values,
        status: { ok: false, reasonKey: 'lab.f.orbits.err-unknown-body' },
        assumptions: ['lab.assume.uniform-g'],
      } satisfies FormulaResult;
    }
    const rho = SURFACE_DENSITY_KGM3[body] ?? 0;
    if (rho <= 0) {
      const values: Record<string, Quantity> = {};
      return {
        values,
        status: { ok: false, reasonKey: 'lab.f.terminal.err-airless' },
        assumptions: ['lab.assume.uniform-g'],
      } satisfies FormulaResult;
    }
    if (!Number.isFinite(massKg) || !Number.isFinite(areaM2) || !Number.isFinite(cd)) {
      const values: Record<string, Quantity> = {};
      return {
        values,
        status: { ok: false, reasonKey: 'lab.f.descent.err-input' },
        assumptions: ['lab.assume.uniform-g'],
      } satisfies FormulaResult;
    }
    const vt = terminalVelocityMs(massKg, loc.gMs2, rho, areaM2, cd);
    const points: Vec2[] = [];
    for (let A = 1; A <= 400.001; A += 8) {
      points.push({ x: A, y: terminalVelocityMs(massKg, loc.gMs2, rho, A, cd) });
    }
    return {
      values: { vTerminal: { value: vt, units: 'm/s' } },
      status: { ok: true },
      assumptions: ['lab.assume.uniform-g', 'lab.assume.constant-density'],
      figure: {
        kind: 'curve',
        provenance: { fidelity: 'computed', module: 'mechanics/atmosphere' },
        assumptions: ['lab.assume.constant-density'],
        x: { labelKey: 'lab.axis.area', units: '' },
        y: { labelKey: 'lab.axis.speed', units: 'm/s' },
        series: [{ points }],
        marks: [{ at: { x: areaM2, y: vt }, labelKey: 'lab.mark.you-are-here', kind: 'point' }],
      },
    } satisfies FormulaResult;
  },
};

/**
 * Soft-landing check (M5 verdict) — is your terminal velocity slow enough to touch
 * down intact? margin = safe − terminal. On Mars, even under a big chute the terminal
 * speed dwarfs a survivable ~5 m/s → fail-honest: you MUST fire engines (the sky-crane).
 * That failure IS the lesson — why Mars EDL is the "seven minutes of terror".
 */
export const softLandingCheck: FormulaDef<{ terminalMs: number; safeMs: number }> = {
  id: 'soft-landing-check',
  titleKey: 'lab.f.soft-land.title',
  plainKey: 'lab.f.soft-land.plain',
  citationKey: 'mission-phases/propulsive-landing',
  learnMore: {
    url: 'https://en.wikipedia.org/wiki/Soft_landing_(aeronautics)',
    source: 'wikipedia',
  },
  domain: 'descent',
  tier: 7,
  prereqs: ['terminal-velocity'],
  latex: '\\text{margin} = v_{\\text{safe}} - v_t',
  inputs: [
    {
      key: 'terminalMs',
      labelKey: 'lab.f.soft-land.terminal',
      units: 'm/s',
      kind: 'number',
      default: 50,
      min: 0,
      max: 2000,
    },
    {
      key: 'safeMs',
      labelKey: 'lab.f.soft-land.safe',
      units: 'm/s',
      kind: 'number',
      default: 5,
      min: 0,
      max: 50,
    },
  ],
  outputs: [{ key: 'margin', labelKey: 'lab.f.soft-land.margin', units: 'm/s' }],
  compute: ({ terminalMs, safeMs }) => {
    if (!Number.isFinite(terminalMs) || !Number.isFinite(safeMs)) {
      const values: Record<string, Quantity> = {};
      return {
        values,
        status: { ok: false, reasonKey: 'lab.f.descent.err-input' },
        assumptions: ['lab.assume.ideal-no-losses'],
      } satisfies FormulaResult;
    }
    const margin = safeMs - terminalMs;
    const base = {
      assumptions: ['lab.assume.ideal-no-losses'],
      figure: {
        kind: 'dv-waterfall' as const,
        provenance: { fidelity: 'computed' as const, module: 'mechanics/atmosphere' },
        assumptions: ['lab.assume.ideal-no-losses'],
        segments: [
          { labelKey: 'lab.f.soft-land.safe', dv: safeMs, kind: 'gain' as const },
          { labelKey: 'lab.f.soft-land.terminal', dv: terminalMs, kind: 'cost' as const },
        ],
      },
    };
    if (margin < 0) {
      const values: Record<string, Quantity> = {};
      return {
        values,
        status: { ok: false, reasonKey: 'lab.f.soft-land.err-too-fast' },
        ...base,
      } satisfies FormulaResult;
    }
    return {
      values: { margin: { value: margin, units: 'm/s' } },
      status: { ok: true },
      ...base,
    } satisfies FormulaResult;
  },
};

/**
 * Airbags (M5, a landing METHOD) — the cheap way the early rovers landed: bounce down
 * cushioned by inflated bags. They survive an impact only up to a limit (~25 m/s for
 * Pathfinder/MER). On Mars the parachute leaves you at ~50 m/s → too hard → you still
 * need SOME retro first (which is exactly what Pathfinder did). Fails-honest above the
 * limit — the honest reason airbags don't scale to heavy landers (hence the sky-crane).
 */
export const airbagsCheck: FormulaDef<{ impactMs: number; airbagLimitMs: number }> = {
  id: 'airbags-check',
  titleKey: 'lab.f.airbags.title',
  plainKey: 'lab.f.airbags.plain',
  citationKey: 'mission-phases/edl',
  learnMore: { url: 'https://en.wikipedia.org/wiki/Mars_Pathfinder', source: 'wikipedia' },
  domain: 'descent',
  tier: 8,
  prereqs: ['terminal-velocity'],
  latex: 'v_{\\text{impact}} \\le v_{\\text{airbag}}',
  inputs: [
    {
      key: 'impactMs',
      labelKey: 'lab.f.airbags.impact',
      units: 'm/s',
      kind: 'number',
      default: 50,
      min: 0,
      max: 2000,
    },
    {
      key: 'airbagLimitMs',
      labelKey: 'lab.f.airbags.limit',
      units: 'm/s',
      kind: 'number',
      default: 25,
      min: 0,
      max: 100,
    },
  ],
  outputs: [{ key: 'margin', labelKey: 'lab.f.airbags.margin', units: 'm/s' }],
  compute: ({ impactMs, airbagLimitMs }) => {
    if (!Number.isFinite(impactMs) || !Number.isFinite(airbagLimitMs)) {
      const values: Record<string, Quantity> = {};
      return {
        values,
        status: { ok: false, reasonKey: 'lab.f.descent.err-input' },
        assumptions: ['lab.assume.ideal-no-losses'],
      } satisfies FormulaResult;
    }
    const margin = airbagLimitMs - impactMs;
    const base = {
      assumptions: ['lab.assume.ideal-no-losses'],
      figure: {
        kind: 'dv-waterfall' as const,
        provenance: { fidelity: 'computed' as const, module: 'mechanics/atmosphere' },
        assumptions: ['lab.assume.ideal-no-losses'],
        segments: [
          { labelKey: 'lab.f.airbags.limit', dv: airbagLimitMs, kind: 'gain' as const },
          { labelKey: 'lab.f.airbags.impact', dv: impactMs, kind: 'cost' as const },
        ],
      },
    };
    if (margin < 0) {
      const values: Record<string, Quantity> = {};
      return {
        values,
        status: { ok: false, reasonKey: 'lab.f.airbags.err-too-hard' },
        ...base,
      } satisfies FormulaResult;
    }
    return {
      values: { margin: { value: margin, units: 'm/s' } },
      status: { ok: true },
      ...base,
    } satisfies FormulaResult;
  },
};

/**
 * Engine performance (P7 · #531 — the propulsion domain's first formula). Looks a
 * real engine up in the kernel's curated registry (~22, every major agency) and
 * derives the number that actually matters: effective exhaust velocity
 * v_e = Isp·g0 — the ONLY engine parameter in the rocket equation. Thrust decides
 * whether you lift off; v_e decides how far you go. Rows publishing only a
 * sea-level Isp fall back to it (disclosed via the assumption keys); a row
 * with no Isp at all fails HONEST, never with an invented number.
 */
export const enginePerformance: FormulaDef<{ engine: string }> = {
  id: 'engine-performance',
  titleKey: 'lab.f.engine-perf.title',
  titleFromInput: 'engine', // "Engine Performance — F-1" (×3 identical headings otherwise)
  plainKey: 'lab.f.engine-perf.plain',
  citationKey: 'propulsion/specific-impulse',
  learnMore: { url: 'https://www.grc.nasa.gov/www/k-12/rocket/specimp.html', source: 'nasa-glenn' },
  domain: 'propulsion',
  tier: 4,
  prereqs: ['tsiolkovsky'],
  latex: 'v_e = I_{sp}\\,g_0',
  inputs: [
    {
      key: 'engine',
      labelKey: 'lab.f.engine-perf.engine',
      units: '',
      kind: 'enum',
      default: 'merlin-1d',
      enumValues: ENGINE_REGISTRY.map((e) => ({ value: e.id, labelKey: `lab.engine.${e.id}` })),
    },
  ],
  outputs: [
    { key: 'thrustN', labelKey: 'lab.f.engine-perf.thrust', units: 'N' },
    { key: 'ispS', labelKey: 'lab.f.engine-perf.isp', units: 's' },
    { key: 'veKms', labelKey: 'lab.f.engine-perf.ve', units: 'km/s' },
  ],
  compute: ({ engine }) => {
    const meta = getEngineMeta(engine);
    if (!meta) {
      const values: Record<string, Quantity> = {};
      return {
        values,
        status: { ok: false, reasonKey: 'lab.f.engine-perf.err-unknown' },
        assumptions: ['lab.assume.registry-datasheet'],
      } satisfies FormulaResult;
    }
    const isp = meta.isp_vac_s ?? meta.isp_sl_s;
    if (!isp) {
      // A registry row without a published Isp — surface the gap, don't guess.
      const values: Record<string, Quantity> = {
        thrustN: { value: meta.thrust_kn * 1000, units: 'N' },
      };
      return {
        values,
        status: { ok: false, reasonKey: 'lab.f.engine-perf.err-no-isp' },
        assumptions: ['lab.assume.registry-datasheet'],
      } satisfies FormulaResult;
    }
    return {
      values: {
        thrustN: { value: meta.thrust_kn * 1000, units: 'N' },
        ispS: { value: isp, units: 's' },
        veKms: { value: (isp * G0) / 1000, units: 'km/s' },
      },
      status: { ok: true },
      assumptions: ['lab.assume.registry-datasheet', 'lab.assume.vacuum-isp-preferred'],
    } satisfies FormulaResult;
  },
};

// The five micro-g worlds the descent kernel models (P5 · #529) — every one has
// been touched by a real spacecraft: Philae/67P, Hayabusa/Itokawa, Hayabusa2/
// Ryugu, OSIRIS-REx/Bennu, NEAR Shoemaker/Eros.
const MICROG_BODY_IDS = ['comet_67p', 'itokawa', 'ryugu', 'bennu', 'eros'] as const;

function isMicrogBody(id: string): id is (typeof MICROG_BODY_IDS)[number] {
  return (MICROG_BODY_IDS as readonly string[]).includes(id);
}

/**
 * Micro-g surface (A8 "touch a small world" · #529) — the two numbers that make
 * small-body operations a DIFFERENT sport: surface gravity g = μ/R² and escape
 * velocity v_esc = √(2μ/R), straight from the descent kernel's IAU/JPL body
 * table. On Bennu v_esc is ~0.2 m/s — slower than a walking pace — so "landing"
 * in the planetary sense barely exists; every mission here either bounced,
 * hopped, or touched-and-went.
 */
export const microGSurface: FormulaDef<{ body: string }> = {
  id: 'micro-g-surface',
  titleKey: 'lab.f.microg.title',
  plainKey: 'lab.f.microg.plain',
  citationKey: 'orbits/hill-sphere',
  learnMore: { url: 'https://en.wikipedia.org/wiki/Surface_gravity', source: 'wikipedia' },
  domain: 'descent',
  tier: 7,
  prereqs: ['weight'],
  latex: 'g = \\dfrac{\\mu}{R^2}, \\quad v_{esc} = \\sqrt{\\dfrac{2\\mu}{R}}',
  inputs: [
    {
      key: 'body',
      labelKey: 'lab.f.microg.body',
      units: '',
      kind: 'body',
      default: 'comet_67p',
      bodyIds: [...MICROG_BODY_IDS],
    },
  ],
  outputs: [
    { key: 'gMs2', labelKey: 'lab.f.microg.g', units: 'm/s2' },
    { key: 'vEscMs', labelKey: 'lab.f.microg.vesc', units: 'm/s' },
  ],
  compute: ({ body }) => {
    if (!isMicrogBody(body)) {
      const values: Record<string, Quantity> = {};
      return {
        values,
        status: { ok: false, reasonKey: 'lab.f.orbits.err-unknown-body' },
        assumptions: ['lab.assume.point-mass', 'lab.assume.mean-radius'],
      } satisfies FormulaResult;
    }
    const mu = MU_BODY_M3_S2[body];
    const r = R_BODY_M[body];
    return {
      values: {
        gMs2: { value: mu / (r * r), units: 'm/s2' },
        vEscMs: { value: Math.sqrt((2 * mu) / r), units: 'm/s' },
      },
      status: { ok: true },
      assumptions: ['lab.assume.point-mass', 'lab.assume.mean-radius'],
    } satisfies FormulaResult;
  },
};

/**
 * Touchdown bounce (A8 · #529) — what actually happens when you hit a micro-g
 * world: you BOUNCE, at e·v_td, and the point-mass energy equation says how
 * high — h = (1/R − v_b²/2μ)⁻¹ − R. The uniform-g h = v²/2g would lie badly
 * here: bounce apexes rival the body's own radius. If the bounce clears v_esc
 * the world cannot hold you at all → fail-honest: you have LEFT (why
 * OSIRIS-REx touched-and-went BY DESIGN, and why Philae's failed harpoons
 * nearly lost it). Hayabusa2's MINERVA rovers inverted the bug into the
 * feature: in micro-g, hopping IS driving.
 */
export const touchdownBounce: FormulaDef<{
  body: string;
  touchdownMs: number;
  restitution: number;
}> = {
  id: 'touchdown-bounce',
  titleKey: 'lab.f.bounce.title',
  plainKey: 'lab.f.bounce.plain',
  learnMore: {
    url: 'https://en.wikipedia.org/wiki/Coefficient_of_restitution',
    source: 'wikipedia',
  },
  domain: 'descent',
  tier: 7,
  prereqs: ['micro-g-surface'],
  latex:
    'v_b = e\\,v_{td},\\quad h = \\left(\\tfrac{1}{R} - \\tfrac{v_b^2}{2\\mu}\\right)^{-1} - R',
  inputs: [
    {
      key: 'body',
      labelKey: 'lab.f.bounce.body',
      units: '',
      kind: 'body',
      default: 'comet_67p',
      bodyIds: [...MICROG_BODY_IDS],
    },
    {
      key: 'touchdownMs',
      labelKey: 'lab.f.bounce.touchdown',
      units: 'm/s',
      kind: 'number',
      default: 1,
      min: 0.01,
      max: 20,
    },
    {
      key: 'restitution',
      labelKey: 'lab.f.bounce.restitution',
      units: '',
      kind: 'number',
      default: 0.4,
      min: 0,
      max: 0.95,
    },
  ],
  outputs: [
    { key: 'bounceMs', labelKey: 'lab.f.bounce.speed', units: 'm/s' },
    { key: 'apexM', labelKey: 'lab.f.bounce.apex', units: 'm' },
  ],
  compute: ({ body, touchdownMs, restitution }) => {
    const assumptions = [
      'lab.assume.point-mass',
      'lab.assume.mean-radius',
      'lab.assume.vertical-bounce',
    ];
    if (!isMicrogBody(body)) {
      const values: Record<string, Quantity> = {};
      return {
        values,
        status: { ok: false, reasonKey: 'lab.f.orbits.err-unknown-body' },
        assumptions,
      } satisfies FormulaResult;
    }
    if (!Number.isFinite(touchdownMs) || !Number.isFinite(restitution)) {
      const values: Record<string, Quantity> = {};
      return {
        values,
        status: { ok: false, reasonKey: 'lab.f.descent.err-input' },
        assumptions,
      } satisfies FormulaResult;
    }
    const mu = MU_BODY_M3_S2[body];
    const r = R_BODY_M[body];
    const vEsc = Math.sqrt((2 * mu) / r);
    const vb = restitution * touchdownMs;
    const apexAt = (v: number): number => 1 / (1 / r - (v * v) / (2 * mu)) - r;
    // Apex-vs-restitution curve — it diverges where e·v_td reaches v_esc, so
    // the mark shows how close the chosen bounce sits to the escape cliff.
    const points: Vec2[] = [];
    for (let e = 0; e <= 0.9501; e += 0.02) {
      const v = e * touchdownMs;
      if (v >= vEsc) break;
      points.push({ x: e, y: apexAt(v) });
    }
    const base = {
      assumptions,
      figure: {
        kind: 'curve' as const,
        provenance: { fidelity: 'computed' as const, module: 'descent/descent-physics' },
        assumptions: ['lab.assume.point-mass'],
        x: { labelKey: 'lab.axis.restitution', units: '' as const },
        y: { labelKey: 'lab.axis.height', units: 'm' as const },
        series: [{ points }],
        marks:
          vb < vEsc
            ? [
                {
                  at: { x: restitution, y: apexAt(vb) },
                  labelKey: 'lab.mark.you-are-here',
                  kind: 'point' as const,
                },
              ]
            : [],
      },
    };
    if (vb >= vEsc) {
      // The world cannot hold you — there is no apex to report.
      const values: Record<string, Quantity> = { bounceMs: { value: vb, units: 'm/s' } };
      return {
        values,
        status: { ok: false, reasonKey: 'lab.f.bounce.err-escaped' },
        ...base,
      } satisfies FormulaResult;
    }
    return {
      values: {
        bounceMs: { value: vb, units: 'm/s' },
        apexM: { value: apexAt(vb), units: 'm' },
      },
      status: { ok: true },
      ...base,
    } satisfies FormulaResult;
  },
};

/**
 * Retro-descent (M5, the second landing METHOD) — the powered burn that finishes what
 * the parachute can't: it must null the terminal speed you arrive at down to a safe
 * touchdown, so it provides Δv = v_t − v_safe. Compare it to the parachute (which alone
 * fails on Mars): the parachute is free but limited by the air; the booster costs
 * propellant but works anywhere, even the airless Moon. Every Mars lander uses both.
 */
export const retroDescent: FormulaDef<{ terminalMs: number; safeMs: number }> = {
  id: 'retro-descent',
  titleKey: 'lab.f.retro.title',
  plainKey: 'lab.f.retro.plain',
  citationKey: 'mission-phases/propulsive-landing',
  learnMore: { url: 'https://en.wikipedia.org/wiki/Retrorocket', source: 'wikipedia' },
  domain: 'descent',
  tier: 8,
  prereqs: ['terminal-velocity'],
  latex: '\\Delta v_{\\text{retro}} = v_t - v_{\\text{safe}}',
  inputs: [
    {
      key: 'terminalMs',
      labelKey: 'lab.f.retro.terminal',
      units: 'm/s',
      kind: 'number',
      default: 50,
      min: 0,
      max: 2000,
    },
    {
      key: 'safeMs',
      labelKey: 'lab.f.retro.safe',
      units: 'm/s',
      kind: 'number',
      default: 5,
      min: 0,
      max: 50,
    },
  ],
  outputs: [{ key: 'retroDv', labelKey: 'lab.f.retro.dv', units: 'm/s' }],
  compute: ({ terminalMs, safeMs }) => {
    if (!Number.isFinite(terminalMs) || !Number.isFinite(safeMs)) {
      const values: Record<string, Quantity> = {};
      return {
        values,
        status: { ok: false, reasonKey: 'lab.f.descent.err-input' },
        assumptions: ['lab.assume.ideal-no-losses'],
      } satisfies FormulaResult;
    }
    const retro = Math.max(0, terminalMs - safeMs);
    return {
      values: { retroDv: { value: retro, units: 'm/s' } },
      status: { ok: true },
      assumptions: ['lab.assume.ideal-no-losses', 'lab.assume.uniform-g'],
      figure: {
        kind: 'dv-waterfall',
        provenance: { fidelity: 'computed', module: 'mechanics/atmosphere' },
        assumptions: ['lab.assume.ideal-no-losses'],
        segments: [
          { labelKey: 'lab.f.retro.terminal', dv: terminalMs, kind: 'cost' },
          { labelKey: 'lab.f.retro.dv', dv: retro, kind: 'gain' },
        ],
      },
    } satisfies FormulaResult;
  },
};
