/**
 * The formula registry (S2a · RFC-037 §5). The single source the palette, the
 * Lab views, the MCP tool generator, and the coverage CI all derive from. Pure:
 * each `FormulaDef` wraps a kernel function and emits a `FigureSpec` — the app
 * and the standalone MCP process import this unchanged.
 *
 * Registers 8 formulas at S2: Tsiolkovsky (S2a proof) + the M1 mechanics rungs
 * (F=ma, weight, momentum, TWR, free-fall, projectile — S2b) + the Δv-margin
 * verdict (S2c). Every later formula is pulled demand-driven by a goal.
 */
import type { FormulaDef, FormulaResult, Registry, Vec2, Quantity } from '../spec';
import { tsiolkovskyDv } from '../ascent/ascent-physics';
import { fMaAccel, weightN, twr } from '../mechanics/dynamics';
import { momentum } from '../mechanics/momentum';
import { freeFall, projectile } from '../mechanics/kinematics';
import {
  circularVelocityKms,
  visVivaKms,
  hohmannTransfer,
  escapeVelocityKms,
} from '../mechanics/orbits';
import { poweredDescentDvKms } from '../mechanics/descent';
import { terminalVelocityMs, SURFACE_DENSITY_KGM3 } from '../mechanics/atmosphere';
import { bodyGravityMs2 } from '../mechanics/bodies';
import { locationModel, rotationVelocityKms } from '../util/location';
import { helioModel, synodicPeriodS } from '../util/heliocentric';
import { MOON_ORBIT_RADIUS_KM, MU_SUN_KM3_S2, AU_TO_KM } from '../util/constants';

/** Planets on a tabulated heliocentric orbit — the interplanetary transfer set (M4). */
const HELIO_PLANET_IDS = ['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn'] as const;

// Primaries a learner can orbit — resolved through the ONE launch-location model
// (radius + µ + rotation from PLANET_STATS), so the orbital formulas run on any
// body, not a hardcoded Earth. `locationModel` returns undefined for an unknown id,
// and every compute fails HONEST on undefined (review MAJOR-2 + the operator's
// "separate Earth from physics" — no silent Earth default).
const ORBIT_BODY_IDS = ['earth', 'moon', 'mars', 'venus', 'mercury'] as const;

/**
 * Tsiolkovsky ideal rocket equation: Δv = Isp·g₀·ln(m₀/m_f). Rung 4 of the
 * "launch a rocket" goal — mass ratio → Δv capacity, with the sensitivity curve.
 */
export const tsiolkovsky: FormulaDef<{ ispS: number; m0Kg: number; mfKg: number }> = {
  id: 'tsiolkovsky',
  titleKey: 'lab.f.tsiolkovsky.title',
  domain: 'ascent',
  tier: 4,
  prereqs: [],
  citationKey: 'propulsion/tsiolkovsky',
  latex: '\\Delta v = I_{sp}\\,g_0\\ln\\dfrac{m_0}{m_f}',
  inputs: [
    {
      key: 'ispS',
      labelKey: 'lab.f.tsiolkovsky.isp',
      units: 's',
      kind: 'number',
      default: 350,
      min: 100,
      max: 480,
    },
    {
      key: 'm0Kg',
      labelKey: 'lab.f.tsiolkovsky.m0',
      units: 'kg',
      kind: 'number',
      default: 12,
      min: 1,
      max: 1e6,
    },
    {
      key: 'mfKg',
      labelKey: 'lab.f.tsiolkovsky.mf',
      units: 'kg',
      kind: 'number',
      default: 1,
      min: 0.001,
      max: 1e6,
    },
  ],
  outputs: [{ key: 'deltaV', labelKey: 'lab.f.tsiolkovsky.dv', units: 'km/s' }],
  compute: ({ ispS, m0Kg, mfKg }) => {
    const dvKms = tsiolkovskyDv(ispS, m0Kg, mfKg) / 1000;
    if (!(mfKg > 0) || !(m0Kg > mfKg)) {
      const values: Record<string, Quantity> = {};
      return {
        values,
        status: { ok: false, reasonKey: 'lab.f.tsiolkovsky.err-mass-ratio' },
        assumptions: ['lab.assume.ideal-no-losses'],
      } satisfies FormulaResult;
    }
    // Sensitivity curve: Δv vs mass ratio at the current Isp (mf ≡ 1, m0 ≡ ratio).
    const points: Vec2[] = [];
    for (let mr = 1.2; mr <= 20.0001; mr += 0.2) {
      points.push({ x: mr, y: tsiolkovskyDv(ispS, mr, 1) / 1000 });
    }
    return {
      values: { deltaV: { value: dvKms, units: 'km/s' } },
      status: { ok: true },
      assumptions: ['lab.assume.ideal-no-losses', 'lab.assume.constant-isp'],
      figure: {
        kind: 'curve',
        provenance: { fidelity: 'computed', module: 'ascent/ascent-physics' },
        assumptions: ['lab.assume.ideal-no-losses'],
        x: { labelKey: 'lab.axis.mass-ratio', units: '' },
        y: { labelKey: 'lab.axis.delta-v', units: 'km/s' },
        series: [{ points }],
        marks: [
          { at: { x: m0Kg / mfKg, y: dvKms }, labelKey: 'lab.mark.you-are-here', kind: 'point' },
        ],
      },
    } satisfies FormulaResult;
  },
};

/** F = ma: net force on a point mass → acceleration. Mechanics rung 1. */
export const newtonSecondLaw: FormulaDef<{ forceN: number; massKg: number }> = {
  id: 'newton-second-law',
  titleKey: 'lab.f.newton-second-law.title',
  domain: 'mechanics',
  tier: 1,
  prereqs: [],
  latex: 'F = ma',
  inputs: [
    {
      key: 'forceN',
      labelKey: 'lab.f.newton-second-law.force',
      units: 'N',
      kind: 'number',
      default: 100,
      min: 0,
      max: 1e9,
    },
    {
      key: 'massKg',
      labelKey: 'lab.f.newton-second-law.mass',
      units: 'kg',
      kind: 'number',
      default: 100,
      min: 0.001,
      max: 1e9,
    },
  ],
  outputs: [{ key: 'acceleration', labelKey: 'lab.f.newton-second-law.accel', units: 'm/s2' }],
  compute: ({ forceN, massKg }) => {
    const accel = fMaAccel(forceN, massKg);
    return {
      values: { acceleration: { value: accel, units: 'm/s2' } },
      status: { ok: true },
      assumptions: ['lab.assume.point-mass', 'lab.assume.no-friction'],
      figure: {
        kind: 'force-diagram',
        provenance: { fidelity: 'computed', module: 'mechanics/dynamics' },
        assumptions: ['lab.assume.point-mass', 'lab.assume.no-friction'],
        bodyLabelKey: 'lab.body.payload',
        vectors: [{ labelKey: 'lab.vec.applied-force', dir: { x: 1, y: 0 }, magN: forceN }],
      },
    } satisfies FormulaResult;
  },
};

const WEIGHT_BODY_IDS = ['earth', 'moon', 'mars', 'venus', 'mercury'] as const;

/** Weight on a solar-system body: W = m·g(body). Mechanics rung 1. */
export const weight: FormulaDef<{ massKg: number; body: string }> = {
  id: 'weight',
  titleKey: 'lab.f.weight.title',
  domain: 'mechanics',
  tier: 1,
  prereqs: [],
  latex: 'W = m\\,g',
  inputs: [
    {
      key: 'massKg',
      labelKey: 'lab.f.weight.mass',
      units: 'kg',
      kind: 'number',
      default: 100,
      min: 0.001,
      max: 1e9,
    },
    {
      key: 'body',
      labelKey: 'lab.f.weight.body',
      units: '',
      kind: 'body',
      default: 'earth',
      bodyIds: [...WEIGHT_BODY_IDS],
    },
  ],
  outputs: [{ key: 'weight', labelKey: 'lab.f.weight.weight', units: 'N' }],
  compute: ({ massKg, body }) => {
    const gMs2 = bodyGravityMs2(body);
    const w = weightN(massKg, gMs2);
    return {
      values: { weight: { value: w, units: 'N' } },
      status: { ok: true },
      assumptions: ['lab.assume.point-mass', 'lab.assume.uniform-g'],
      figure: {
        kind: 'force-diagram',
        provenance: { fidelity: 'computed', module: 'mechanics/dynamics' },
        assumptions: ['lab.assume.point-mass', 'lab.assume.uniform-g'],
        bodyLabelKey: 'lab.body.payload',
        vectors: [{ labelKey: 'lab.vec.weight', dir: { x: 0, y: -1 }, magN: w }],
      },
    } satisfies FormulaResult;
  },
};

/** Linear momentum p = m·v. Mechanics rung 2. */
export const momentumFormula: FormulaDef<{ massKg: number; velMs: number }> = {
  id: 'momentum',
  titleKey: 'lab.f.momentum.title',
  domain: 'mechanics',
  tier: 2,
  prereqs: ['newton-second-law'],
  latex: 'p = mv',
  inputs: [
    {
      key: 'massKg',
      labelKey: 'lab.f.momentum.mass',
      units: 'kg',
      kind: 'number',
      default: 100,
      min: 0.001,
      max: 1e9,
    },
    {
      key: 'velMs',
      labelKey: 'lab.f.momentum.vel',
      units: 'm/s',
      kind: 'number',
      default: 10,
      min: 0,
      max: 3e8,
    },
  ],
  outputs: [{ key: 'momentum', labelKey: 'lab.f.momentum.p', units: 'kg*m/s' }],
  compute: ({ massKg, velMs }) => {
    const p = momentum(massKg, velMs);
    return {
      values: { momentum: { value: p, units: 'kg*m/s' } },
      status: { ok: true },
      assumptions: ['lab.assume.point-mass'],
    } satisfies FormulaResult;
  },
};

/** Thrust-to-weight ratio. TWR < 1 → fail-honest (won't lift). Mechanics rung 3. */
export const twrFormula: FormulaDef<{ thrustN: number; massKg: number; body: string }> = {
  id: 'twr',
  titleKey: 'lab.f.twr.title',
  domain: 'mechanics',
  tier: 3,
  prereqs: ['newton-second-law', 'weight'],
  latex: '\\mathrm{TWR} = \\dfrac{T}{m\\,g}',
  inputs: [
    {
      key: 'thrustN',
      labelKey: 'lab.f.twr.thrust',
      units: 'N',
      kind: 'number',
      default: 1.5e7,
      min: 0,
      max: 1e10,
    },
    {
      key: 'massKg',
      labelKey: 'lab.f.twr.mass',
      units: 'kg',
      kind: 'number',
      default: 1e6,
      min: 0.001,
      max: 1e10,
    },
    {
      key: 'body',
      labelKey: 'lab.f.twr.body',
      units: '',
      kind: 'body',
      default: 'earth',
      bodyIds: [...WEIGHT_BODY_IDS],
    },
  ],
  outputs: [{ key: 'twr', labelKey: 'lab.f.twr.twr', units: '' }],
  compute: ({ thrustN, massKg, body }) => {
    const gMs2 = bodyGravityMs2(body);
    const w = weightN(massKg, gMs2);
    const ratio = twr(thrustN, massKg, gMs2);
    // Keep the value + the thrust-vs-weight figure on BOTH branches: a TWR < 1
    // (thrust shorter than weight) IS the lesson, not an error to hide (MINOR-6;
    // consistent with delta-v-margin's fail-honest behaviour).
    return {
      values: { twr: { value: ratio, units: '' } },
      status: ratio >= 1 ? { ok: true } : { ok: false, reasonKey: 'lab.f.twr.err-wont-lift' },
      assumptions: ['lab.assume.rigid-body', 'lab.assume.uniform-g'],
      figure: {
        kind: 'force-diagram',
        provenance: { fidelity: 'computed', module: 'mechanics/dynamics' },
        assumptions: ['lab.assume.rigid-body', 'lab.assume.uniform-g'],
        bodyLabelKey: 'lab.body.rocket',
        vectors: [
          { labelKey: 'lab.vec.thrust', dir: { x: 0, y: 1 }, magN: thrustN },
          { labelKey: 'lab.vec.weight', dir: { x: 0, y: -1 }, magN: w },
        ],
      },
    } satisfies FormulaResult;
  },
};

const FREE_FALL_BODY_IDS = ['earth', 'moon', 'mars', 'venus', 'mercury'] as const;

/** Free-fall from rest under uniform gravity. Kinematics rung 1. */
export const freeFallFormula: FormulaDef<{ heightM: number; body: string }> = {
  id: 'free-fall',
  titleKey: 'lab.f.free-fall.title',
  domain: 'mechanics',
  tier: 1,
  prereqs: [],
  latex: 't=\\sqrt{\\dfrac{2h}{g}},\\quad v=\\sqrt{2gh}',
  inputs: [
    {
      key: 'heightM',
      labelKey: 'lab.f.free-fall.height',
      units: 'm',
      kind: 'number',
      default: 100,
      min: 0.01,
      max: 1e6,
    },
    {
      key: 'body',
      labelKey: 'lab.f.free-fall.body',
      units: '',
      kind: 'body',
      default: 'earth',
      bodyIds: [...FREE_FALL_BODY_IDS],
    },
  ],
  outputs: [
    { key: 'fallTime', labelKey: 'lab.f.free-fall.time', units: 's' },
    { key: 'impactSpeed', labelKey: 'lab.f.free-fall.speed', units: 'm/s' },
  ],
  compute: ({ heightM, body }) => {
    const gMs2 = bodyGravityMs2(body);
    const { timeS, impactMs } = freeFall(heightM, gMs2);
    // Velocity-vs-time line: v(t) = g·t from t=0 to t=timeS.
    const steps = 20;
    const points: Vec2[] = [];
    for (let i = 0; i <= steps; i++) {
      const t = (timeS * i) / steps;
      points.push({ x: t, y: gMs2 * t });
    }
    return {
      values: {
        fallTime: { value: timeS, units: 's' },
        impactSpeed: { value: impactMs, units: 'm/s' },
      },
      status: { ok: true },
      assumptions: ['lab.assume.no-drag', 'lab.assume.uniform-g'],
      figure: {
        kind: 'curve',
        provenance: { fidelity: 'computed', module: 'mechanics/kinematics' },
        assumptions: ['lab.assume.no-drag', 'lab.assume.uniform-g'],
        x: { labelKey: 'lab.axis.time', units: 's' },
        y: { labelKey: 'lab.axis.speed', units: 'm/s' },
        series: [{ points }],
      },
    } satisfies FormulaResult;
  },
};

const PROJECTILE_BODY_IDS = ['earth', 'moon', 'mars', 'venus', 'mercury'] as const;

/** Parabolic projectile on a flat surface, no drag. Kinematics rung 2. */
export const projectileFormula: FormulaDef<{ v0Ms: number; angleDeg: number; body: string }> = {
  id: 'projectile',
  titleKey: 'lab.f.projectile.title',
  domain: 'mechanics',
  tier: 2,
  prereqs: ['free-fall'],
  latex: 'R = \\dfrac{v_0^2 \\sin 2\\theta}{g}',
  inputs: [
    {
      key: 'v0Ms',
      labelKey: 'lab.f.projectile.v0',
      units: 'm/s',
      kind: 'number',
      default: 100,
      min: 0.1,
      max: 1e4,
    },
    {
      key: 'angleDeg',
      labelKey: 'lab.f.projectile.angle',
      units: 'deg',
      kind: 'number',
      default: 45,
      min: 0,
      max: 90,
    },
    {
      key: 'body',
      labelKey: 'lab.f.projectile.body',
      units: '',
      kind: 'body',
      default: 'earth',
      bodyIds: [...PROJECTILE_BODY_IDS],
    },
  ],
  outputs: [
    { key: 'range', labelKey: 'lab.f.projectile.range', units: 'm' },
    { key: 'maxHeight', labelKey: 'lab.f.projectile.max-height', units: 'm' },
    { key: 'flightTime', labelKey: 'lab.f.projectile.flight-time', units: 's' },
  ],
  compute: ({ v0Ms, angleDeg, body }) => {
    const gMs2 = bodyGravityMs2(body);
    const { rangeM, maxHeightM, flightTimeS } = projectile(v0Ms, angleDeg, gMs2);
    // Trajectory arc: sample x(t), y(t) over [0, flightTimeS].
    const steps = 50;
    const theta = (angleDeg * Math.PI) / 180;
    const vx = v0Ms * Math.cos(theta);
    const vy = v0Ms * Math.sin(theta);
    const points: Vec2[] = [];
    for (let i = 0; i <= steps; i++) {
      const t = (flightTimeS * i) / steps;
      points.push({ x: vx * t, y: vy * t - 0.5 * gMs2 * t * t });
    }
    return {
      values: {
        range: { value: rangeM, units: 'm' },
        maxHeight: { value: maxHeightM, units: 'm' },
        flightTime: { value: flightTimeS, units: 's' },
      },
      status: { ok: true },
      assumptions: ['lab.assume.no-drag', 'lab.assume.uniform-g', 'lab.assume.flat-ground'],
      figure: {
        kind: 'curve',
        provenance: { fidelity: 'computed', module: 'mechanics/kinematics' },
        assumptions: ['lab.assume.no-drag', 'lab.assume.uniform-g', 'lab.assume.flat-ground'],
        x: { labelKey: 'lab.axis.range', units: 'm' },
        y: { labelKey: 'lab.axis.height', units: 'm' },
        series: [{ points }],
      },
    } satisfies FormulaResult;
  },
};

/**
 * Δv verdict — rung 6 of "launch a rocket": do you have enough? margin =
 * capacity − required. Fail-honest when negative (you can't reach it). The
 * `capacity` input is wired from Tsiolkovsky's Δv output in the goal (S2c).
 */
export const deltaVMargin: FormulaDef<{ capacityKms: number; requiredKms: number }> = {
  id: 'delta-v-margin',
  titleKey: 'lab.f.delta-v-margin.title',
  domain: 'transfer',
  tier: 5,
  prereqs: ['tsiolkovsky'],
  latex: '\\text{margin} = v_{\\text{cap}} - v_{\\text{req}}',
  inputs: [
    {
      key: 'capacityKms',
      labelKey: 'lab.f.dvm.capacity',
      units: 'km/s',
      kind: 'number',
      default: 8.5,
      min: 0,
      max: 50,
    },
    {
      key: 'requiredKms',
      labelKey: 'lab.f.dvm.required',
      units: 'km/s',
      kind: 'number',
      default: 9.4,
      min: 0,
      max: 50,
    },
  ],
  outputs: [{ key: 'margin', labelKey: 'lab.f.dvm.margin', units: 'km/s' }],
  compute: ({ capacityKms, requiredKms }) => {
    const margin = capacityKms - requiredKms;
    const base = {
      assumptions: ['lab.assume.ideal-no-losses'],
      figure: {
        kind: 'dv-waterfall' as const,
        provenance: { fidelity: 'computed' as const, module: 'transfer/delta-v-margin' },
        assumptions: ['lab.assume.ideal-no-losses'],
        segments: [
          { labelKey: 'lab.f.dvm.capacity', dv: capacityKms, kind: 'gain' as const },
          { labelKey: 'lab.f.dvm.required', dv: requiredKms, kind: 'cost' as const },
        ],
      },
    };
    if (margin < 0) {
      const values: Record<string, Quantity> = {};
      return {
        values,
        status: { ok: false, reasonKey: 'lab.f.dvm.err-insufficient' },
        ...base,
      } satisfies FormulaResult;
    }
    return {
      values: { margin: { value: margin, units: 'km/s' } },
      status: { ok: true },
      ...base,
    } satisfies FormulaResult;
  },
};

/**
 * Circular orbital velocity: v = √(µ/r). M2 rung 1 — "to stay up, go sideways fast
 * enough." Curve shows the 1/√r falloff with altitude.
 */
export const orbitalVelocity: FormulaDef<{ altitudeKm: number; body: string }> = {
  id: 'orbital-velocity',
  titleKey: 'lab.f.orbital-velocity.title',
  domain: 'satellite',
  tier: 5,
  prereqs: [],
  latex: 'v = \\sqrt{\\dfrac{\\mu}{r}}',
  inputs: [
    {
      key: 'altitudeKm',
      labelKey: 'lab.f.orbvel.altitude',
      units: 'km',
      kind: 'number',
      default: 200,
      min: 100,
      max: 40000,
    },
    {
      key: 'body',
      labelKey: 'lab.f.orbvel.body',
      units: '',
      kind: 'body',
      default: 'earth',
      bodyIds: [...ORBIT_BODY_IDS],
    },
  ],
  outputs: [{ key: 'vCirc', labelKey: 'lab.f.orbvel.vcirc', units: 'km/s' }],
  compute: ({ altitudeKm, body }) => {
    const b = locationModel(body);
    if (!b) {
      const values: Record<string, Quantity> = {};
      return {
        values,
        status: { ok: false, reasonKey: 'lab.f.orbits.err-unknown-body' },
        assumptions: ['lab.assume.point-mass'],
      } satisfies FormulaResult;
    }
    const v = circularVelocityKms(b.rKm + altitudeKm, b.muKm3s2);
    const points: Vec2[] = [];
    for (let alt = 100; alt <= 40000.001; alt += 800) {
      points.push({ x: alt, y: circularVelocityKms(b.rKm + alt, b.muKm3s2) });
    }
    return {
      values: { vCirc: { value: v, units: 'km/s' } },
      status: { ok: true },
      assumptions: ['lab.assume.point-mass', 'lab.assume.ideal-no-losses'],
      figure: {
        kind: 'curve',
        provenance: { fidelity: 'computed', module: 'mechanics/orbits' },
        assumptions: ['lab.assume.point-mass'],
        x: { labelKey: 'lab.axis.altitude', units: 'km' },
        y: { labelKey: 'lab.axis.speed', units: 'km/s' },
        series: [{ points }],
        marks: [{ at: { x: altitudeKm, y: v }, labelKey: 'lab.mark.you-are-here', kind: 'point' }],
      },
    } satisfies FormulaResult;
  },
};

/**
 * Vis-viva: v = √(µ(2/r − 1/a)) — the speed at any point of any orbit. M2 rung 2,
 * the tool the transfer is built from. Fail-honest when r isn't on the orbit (r ≥ 2a).
 */
export const visVivaFormula: FormulaDef<{ rKm: number; aKm: number; body: string }> = {
  id: 'vis-viva',
  titleKey: 'lab.f.vis-viva.title',
  domain: 'satellite',
  tier: 6,
  prereqs: ['orbital-velocity'],
  latex: 'v = \\sqrt{\\mu\\left(\\dfrac{2}{r} - \\dfrac{1}{a}\\right)}',
  inputs: [
    {
      key: 'rKm',
      labelKey: 'lab.f.visviva.r',
      units: 'km',
      kind: 'number',
      default: 6571,
      min: 6471,
      max: 400000,
    },
    {
      key: 'aKm',
      labelKey: 'lab.f.visviva.a',
      units: 'km',
      kind: 'number',
      default: 24368,
      min: 6471,
      max: 400000,
    },
    {
      key: 'body',
      labelKey: 'lab.f.visviva.body',
      units: '',
      kind: 'body',
      default: 'earth',
      bodyIds: [...ORBIT_BODY_IDS],
    },
  ],
  outputs: [{ key: 'v', labelKey: 'lab.f.visviva.v', units: 'km/s' }],
  compute: ({ rKm, aKm, body }) => {
    const b = locationModel(body);
    if (!b) {
      const values: Record<string, Quantity> = {};
      return {
        values,
        status: { ok: false, reasonKey: 'lab.f.orbits.err-unknown-body' },
        assumptions: ['lab.assume.point-mass'],
      } satisfies FormulaResult;
    }
    if (!(rKm > 0) || !(aKm > 0) || rKm >= 2 * aKm) {
      const values: Record<string, Quantity> = {};
      return {
        values,
        status: { ok: false, reasonKey: 'lab.f.vis-viva.err-off-orbit' },
        assumptions: ['lab.assume.point-mass'],
      } satisfies FormulaResult;
    }
    const v = visVivaKms(rKm, aKm, b.muKm3s2);
    const points: Vec2[] = [];
    const rMax = 2 * aKm * 0.999;
    const rMin = Math.max(100, aKm * 0.05);
    for (let r = rMin; r <= rMax; r += (rMax - rMin) / 60) {
      points.push({ x: r, y: visVivaKms(r, aKm, b.muKm3s2) });
    }
    return {
      values: { v: { value: v, units: 'km/s' } },
      status: { ok: true },
      assumptions: ['lab.assume.point-mass', 'lab.assume.ideal-no-losses'],
      figure: {
        kind: 'curve',
        provenance: { fidelity: 'computed', module: 'mechanics/orbits' },
        assumptions: ['lab.assume.point-mass'],
        x: { labelKey: 'lab.axis.radius', units: 'km' },
        y: { labelKey: 'lab.axis.speed', units: 'km/s' },
        series: [{ points }],
        marks: [{ at: { x: rKm, y: v }, labelKey: 'lab.mark.you-are-here', kind: 'point' }],
      },
    } satisfies FormulaResult;
  },
};

/**
 * Hohmann transfer: the two-burn ellipse between coplanar circular orbits. M2 rung 3
 * — LEO → lunar distance. Emits the geocentric transfer-ellipse figure (new renderer).
 * `total` wires into the verdict's `requiredKms` in the reach-the-Moon goal.
 */
export const hohmannFormula: FormulaDef<{ r1Km: number; r2Km: number; body: string }> = {
  id: 'hohmann-transfer',
  titleKey: 'lab.f.hohmann.title',
  domain: 'transfer',
  tier: 7,
  prereqs: ['vis-viva'],
  latex: '\\Delta v = \\Delta v_1 + \\Delta v_2',
  inputs: [
    {
      key: 'r1Km',
      labelKey: 'lab.f.hohmann.r1',
      units: 'km',
      kind: 'number',
      default: 6571,
      min: 6471,
      max: 400000,
    },
    {
      key: 'r2Km',
      labelKey: 'lab.f.hohmann.r2',
      units: 'km',
      kind: 'number',
      default: MOON_ORBIT_RADIUS_KM,
      min: 6471,
      max: 400000,
    },
    {
      key: 'body',
      labelKey: 'lab.f.hohmann.body',
      units: '',
      kind: 'body',
      default: 'earth',
      bodyIds: [...ORBIT_BODY_IDS],
    },
  ],
  outputs: [
    { key: 'dv1', labelKey: 'lab.f.hohmann.dv1', units: 'km/s' },
    { key: 'dv2', labelKey: 'lab.f.hohmann.dv2', units: 'km/s' },
    { key: 'total', labelKey: 'lab.f.hohmann.total', units: 'km/s' },
    { key: 'tof', labelKey: 'lab.f.hohmann.tof', units: 'day' },
  ],
  compute: ({ r1Km, r2Km, body }) => {
    const b = locationModel(body);
    if (!b) {
      const values: Record<string, Quantity> = {};
      return {
        values,
        status: { ok: false, reasonKey: 'lab.f.orbits.err-unknown-body' },
        assumptions: ['lab.assume.coplanar'],
      } satisfies FormulaResult;
    }
    if (!(r1Km > 0) || !(r2Km > 0)) {
      const values: Record<string, Quantity> = {};
      return {
        values,
        status: { ok: false, reasonKey: 'lab.f.hohmann.err-radius' },
        assumptions: ['lab.assume.coplanar'],
      } satisfies FormulaResult;
    }
    const h = hohmannTransfer(r1Km, r2Km, b.muKm3s2);
    // Geocentric transfer-ellipse: perigee at +x (θ=0), apogee at −x (θ=π), scaled to
    // the larger orbit. The two burn marks double as the start/target orbit radii, so
    // the renderer draws both circles without an extra spec field.
    const a = h.aTransferKm;
    const rp = Math.min(r1Km, r2Km);
    const ra = Math.max(r1Km, r2Km);
    const e = (ra - rp) / (ra + rp);
    const scale = 1 / ra;
    const arc: Vec2[] = [];
    for (let i = 0; i <= 48; i++) {
      const th = (Math.PI * i) / 48;
      const r = (a * (1 - e * e)) / (1 + e * Math.cos(th));
      arc.push({ x: r * Math.cos(th) * scale, y: r * Math.sin(th) * scale });
    }
    return {
      values: {
        dv1: { value: h.dv1Kms, units: 'km/s' },
        dv2: { value: h.dv2Kms, units: 'km/s' },
        total: { value: h.totalKms, units: 'km/s' },
        tof: { value: h.tofS / 86400, units: 'day' },
      },
      status: { ok: true },
      assumptions: ['lab.assume.coplanar', 'lab.assume.ideal-no-losses', 'lab.assume.point-mass'],
      figure: {
        kind: 'transfer-ellipse',
        frame: 'geocentric',
        provenance: { fidelity: 'computed', module: 'mechanics/orbits' },
        assumptions: ['lab.assume.coplanar', 'lab.assume.ideal-no-losses'],
        bodies: [{ labelKey: 'lab.body.primary', at: { x: 0, y: 0 } }],
        arc,
        marks: [
          { at: { x: rp * scale, y: 0 }, labelKey: 'lab.mark.burn-1', kind: 'point' },
          { at: { x: -ra * scale, y: 0 }, labelKey: 'lab.mark.burn-2', kind: 'point' },
        ],
      },
    } satisfies FormulaResult;
  },
};

/**
 * Launch-site head-start: the free eastward speed a launch gets from the planet's
 * rotation, v = v_eq·cos(latitude). THE practical-impact lesson (operator 2026-08-30)
 * — choose a point on Earth and see what it's worth: near the equator (Kourou, a sea
 * platform) the planet hands you the most; near the poles, nothing. That saved Δv is
 * exponential in the rocket equation, so the site choice reaches all the way into the
 * rocket's size. Marks the famous pads so the "why launch from Guiana / from the sea"
 * is visible. Removes a slice of the "launch from rest" assumption.
 */
export const launchSite: FormulaDef<{ latitudeDeg: number; body: string }> = {
  id: 'launch-site',
  titleKey: 'lab.f.launch-site.title',
  domain: 'ascent',
  tier: 3,
  prereqs: [],
  latex: 'v_{\\text{boost}} = v_{\\text{eq}}\\cos\\varphi',
  inputs: [
    {
      key: 'latitudeDeg',
      labelKey: 'lab.f.launchsite.lat',
      units: 'deg',
      kind: 'number',
      default: 5.2, // Kourou
      min: 0,
      max: 90,
    },
    {
      key: 'body',
      labelKey: 'lab.f.launchsite.body',
      units: '',
      kind: 'body',
      default: 'earth',
      bodyIds: [...ORBIT_BODY_IDS],
    },
  ],
  outputs: [{ key: 'boost', labelKey: 'lab.f.launchsite.boost', units: 'km/s' }],
  compute: ({ latitudeDeg, body }) => {
    const loc = locationModel(body);
    if (!loc) {
      const values: Record<string, Quantity> = {};
      return {
        values,
        status: { ok: false, reasonKey: 'lab.f.orbits.err-unknown-body' },
        assumptions: ['lab.assume.prograde-launch'],
      } satisfies FormulaResult;
    }
    if (!Number.isFinite(latitudeDeg) || latitudeDeg < -90 || latitudeDeg > 90) {
      const values: Record<string, Quantity> = {};
      return {
        values,
        status: { ok: false, reasonKey: 'lab.f.launchsite.err-latitude' },
        assumptions: ['lab.assume.prograde-launch'],
      } satisfies FormulaResult;
    }
    const boost = rotationVelocityKms(loc, latitudeDeg);
    const points: Vec2[] = [];
    for (let lat = 0; lat <= 90.001; lat += 2) {
      points.push({ x: lat, y: rotationVelocityKms(loc, lat) });
    }
    const marks = [
      {
        at: { x: latitudeDeg, y: boost },
        labelKey: 'lab.mark.you-are-here',
        kind: 'point' as const,
      },
    ];
    // Real pads make the lesson concrete — Earth only (their latitudes are Earth sites).
    if (body === 'earth') {
      for (const pad of [
        { lat: 0, key: 'lab.mark.sea-launch' },
        { lat: 5.2, key: 'lab.mark.kourou' },
        { lat: 28.5, key: 'lab.mark.canaveral' },
        { lat: 45.9, key: 'lab.mark.baikonur' },
      ]) {
        marks.push({
          at: { x: pad.lat, y: rotationVelocityKms(loc, pad.lat) },
          labelKey: pad.key,
          kind: 'point' as const,
        });
      }
    }
    return {
      values: { boost: { value: boost, units: 'km/s' } },
      status: { ok: true },
      assumptions: ['lab.assume.rigid-body', 'lab.assume.prograde-launch'],
      figure: {
        kind: 'curve',
        provenance: { fidelity: 'computed', module: 'util/location' },
        assumptions: ['lab.assume.rigid-body', 'lab.assume.prograde-launch'],
        x: { labelKey: 'lab.axis.latitude', units: 'deg' },
        y: { labelKey: 'lab.axis.speed', units: 'km/s' },
        series: [{ points }],
        marks,
      },
    } satisfies FormulaResult;
  },
};

/**
 * Reach-orbit verdict — the M1 payoff that CONNECTS the dots: your rocket's Δv plus
 * the launch-site head-start, against the Δv orbit demands. margin = capacity + boost
 * − required. `capacity` wires from Tsiolkovsky, `boost` from launch-site — so a
 * better site visibly buys margin (or lets the rocket shrink). Fail-honest if short.
 */
export const reachOrbitVerdict: FormulaDef<{
  capacityKms: number;
  boostKms: number;
  requiredKms: number;
}> = {
  id: 'reach-orbit-verdict',
  titleKey: 'lab.f.reach-orbit.title',
  domain: 'ascent',
  tier: 5,
  prereqs: ['tsiolkovsky', 'launch-site'],
  latex: '\\text{margin} = v_{\\text{cap}} + v_{\\text{boost}} - v_{\\text{req}}',
  inputs: [
    {
      key: 'capacityKms',
      labelKey: 'lab.f.dvm.capacity',
      units: 'km/s',
      kind: 'number',
      default: 8.5,
      min: 0,
      max: 50,
    },
    {
      key: 'boostKms',
      labelKey: 'lab.f.reach-orbit.boost',
      units: 'km/s',
      kind: 'number',
      default: 0.46,
      min: 0,
      max: 1,
    },
    {
      key: 'requiredKms',
      labelKey: 'lab.f.dvm.required',
      units: 'km/s',
      kind: 'number',
      default: 9.4,
      min: 0,
      max: 50,
    },
  ],
  outputs: [{ key: 'margin', labelKey: 'lab.f.dvm.margin', units: 'km/s' }],
  compute: ({ capacityKms, boostKms, requiredKms }) => {
    const margin = capacityKms + boostKms - requiredKms;
    const base = {
      assumptions: ['lab.assume.ideal-no-losses', 'lab.assume.prograde-launch'],
      figure: {
        kind: 'dv-waterfall' as const,
        provenance: { fidelity: 'computed' as const, module: 'ascent/reach-orbit' },
        assumptions: ['lab.assume.ideal-no-losses', 'lab.assume.prograde-launch'],
        segments: [
          { labelKey: 'lab.f.dvm.capacity', dv: capacityKms, kind: 'gain' as const },
          { labelKey: 'lab.f.reach-orbit.boost', dv: boostKms, kind: 'gain' as const },
          { labelKey: 'lab.f.dvm.required', dv: requiredKms, kind: 'cost' as const },
        ],
      },
    };
    if (margin < 0) {
      const values: Record<string, Quantity> = {};
      return {
        values,
        status: { ok: false, reasonKey: 'lab.f.dvm.err-insufficient' },
        ...base,
      } satisfies FormulaResult;
    }
    return {
      values: { margin: { value: margin, units: 'km/s' } },
      status: { ok: true },
      ...base,
    } satisfies FormulaResult;
  },
};

/**
 * Powered-descent Δv — M3 "land on the Moon" rung. A constant-thrust braking burn from
 * orbital speed to rest: Δv = v_orbit·TWR/(TWR−1). The gravity loss is v_orbit/(TWR−1)
 * — a high-thrust lander is nearly loss-free, and TWR→1 diverges (you can't out-thrust
 * gravity → you crash). `vOrbitKms` wires from orbital-velocity, `twr` from the TWR rung.
 */
export const descentBurn: FormulaDef<{ vOrbitKms: number; twr: number }> = {
  id: 'descent-burn',
  titleKey: 'lab.f.descent-burn.title',
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

/**
 * Interplanetary Hohmann transfer (M4 "get to Mars") — the SAME two-burn transfer as
 * M2, one frame out: everything orbits the Sun. Reuses `hohmannTransfer(r1, r2, µ)`
 * with the Sun's µ + the planets' heliocentric orbit radii (the kernel's frame-
 * independence is the point). Δv is HELIOCENTRIC — from the departure planet's solar
 * orbit, NOT from its surface (that's the launch + escape, earlier rungs).
 */
export const interplanetaryTransfer: FormulaDef<{ depart: string; arrive: string }> = {
  id: 'interplanetary-transfer',
  titleKey: 'lab.f.interplanetary.title',
  domain: 'transfer',
  tier: 9,
  prereqs: ['hohmann-transfer'],
  latex: '\\Delta v = \\Delta v_1 + \\Delta v_2',
  inputs: [
    {
      key: 'depart',
      labelKey: 'lab.f.interplanetary.depart',
      units: '',
      kind: 'body',
      default: 'earth',
      bodyIds: [...HELIO_PLANET_IDS],
    },
    {
      key: 'arrive',
      labelKey: 'lab.f.interplanetary.arrive',
      units: '',
      kind: 'body',
      default: 'mars',
      bodyIds: [...HELIO_PLANET_IDS],
    },
  ],
  outputs: [
    { key: 'dv1', labelKey: 'lab.f.interplanetary.dv1', units: 'km/s' },
    { key: 'dv2', labelKey: 'lab.f.interplanetary.dv2', units: 'km/s' },
    { key: 'total', labelKey: 'lab.f.interplanetary.total', units: 'km/s' },
    { key: 'tof', labelKey: 'lab.f.interplanetary.tof', units: 'day' },
  ],
  compute: ({ depart, arrive }) => {
    const d = helioModel(depart);
    const a = helioModel(arrive);
    if (!d || !a) {
      const values: Record<string, Quantity> = {};
      return {
        values,
        status: { ok: false, reasonKey: 'lab.f.interplanetary.err-planet' },
        assumptions: ['lab.assume.coplanar'],
      } satisfies FormulaResult;
    }
    if (depart === arrive) {
      const values: Record<string, Quantity> = {};
      return {
        values,
        status: { ok: false, reasonKey: 'lab.f.interplanetary.err-same' },
        assumptions: ['lab.assume.coplanar'],
      } satisfies FormulaResult;
    }
    const h = hohmannTransfer(d.orbitRadiusKm, a.orbitRadiusKm, MU_SUN_KM3_S2);
    const aTr = h.aTransferKm;
    const rp = Math.min(d.orbitRadiusKm, a.orbitRadiusKm);
    const ra = Math.max(d.orbitRadiusKm, a.orbitRadiusKm);
    const e = (ra - rp) / (ra + rp);
    const scale = 1 / ra;
    const arc: Vec2[] = [];
    for (let i = 0; i <= 48; i++) {
      const th = (Math.PI * i) / 48;
      const r = (aTr * (1 - e * e)) / (1 + e * Math.cos(th));
      arc.push({ x: r * Math.cos(th) * scale, y: r * Math.sin(th) * scale });
    }
    return {
      values: {
        dv1: { value: h.dv1Kms, units: 'km/s' },
        dv2: { value: h.dv2Kms, units: 'km/s' },
        total: { value: h.totalKms, units: 'km/s' },
        tof: { value: h.tofS / 86400, units: 'day' },
      },
      status: { ok: true },
      assumptions: [
        'lab.assume.coplanar',
        'lab.assume.circular-orbits',
        'lab.assume.from-planet-orbit',
      ],
      figure: {
        kind: 'transfer-ellipse',
        frame: 'heliocentric',
        provenance: { fidelity: 'computed', module: 'util/heliocentric' },
        assumptions: ['lab.assume.coplanar', 'lab.assume.circular-orbits'],
        bodies: [{ labelKey: 'lab.body.sun', at: { x: 0, y: 0 } }],
        arc,
        marks: [
          { at: { x: rp * scale, y: 0 }, labelKey: 'lab.mark.burn-1', kind: 'point' },
          { at: { x: -ra * scale, y: 0 }, labelKey: 'lab.mark.burn-2', kind: 'point' },
        ],
      },
    } satisfies FormulaResult;
  },
};

/**
 * Launch window — the synodic period, how often two planets realign for a transfer.
 * 1/S = |1/T₁ − 1/T₂|. Earth↔Mars ≈ 780 days (~26 months) — the ~2-year wait.
 */
export const launchWindow: FormulaDef<{ depart: string; arrive: string }> = {
  id: 'launch-window',
  titleKey: 'lab.f.synodic.title',
  domain: 'transfer',
  tier: 9,
  prereqs: [],
  latex: '\\dfrac{1}{S} = \\left|\\dfrac{1}{T_1} - \\dfrac{1}{T_2}\\right|',
  inputs: [
    {
      key: 'depart',
      labelKey: 'lab.f.synodic.depart',
      units: '',
      kind: 'body',
      default: 'earth',
      bodyIds: [...HELIO_PLANET_IDS],
    },
    {
      key: 'arrive',
      labelKey: 'lab.f.synodic.arrive',
      units: '',
      kind: 'body',
      default: 'mars',
      bodyIds: [...HELIO_PLANET_IDS],
    },
  ],
  outputs: [{ key: 'synodic', labelKey: 'lab.f.synodic.period', units: 'day' }],
  compute: ({ depart, arrive }) => {
    const d = helioModel(depart);
    const a = helioModel(arrive);
    if (!d || !a || depart === arrive) {
      const values: Record<string, Quantity> = {};
      return {
        values,
        status: {
          ok: false,
          reasonKey:
            depart === arrive ? 'lab.f.interplanetary.err-same' : 'lab.f.interplanetary.err-planet',
        },
        assumptions: ['lab.assume.circular-orbits'],
      } satisfies FormulaResult;
    }
    const synodicDays = synodicPeriodS(d.orbitalPeriodS, a.orbitalPeriodS) / 86400;
    return {
      values: { synodic: { value: synodicDays, units: 'day' } },
      status: { ok: true },
      assumptions: ['lab.assume.circular-orbits', 'lab.assume.coplanar'],
    } satisfies FormulaResult;
  },
};

const ATMO_BODY_IDS = ['earth', 'mars', 'venus', 'moon', 'mercury'] as const;

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
 * Retro-descent (M5, the second landing METHOD) — the powered burn that finishes what
 * the parachute can't: it must null the terminal speed you arrive at down to a safe
 * touchdown, so it provides Δv = v_t − v_safe. Compare it to the parachute (which alone
 * fails on Mars): the parachute is free but limited by the air; the booster costs
 * propellant but works anywhere, even the airless Moon. Every Mars lander uses both.
 */
export const retroDescent: FormulaDef<{ terminalMs: number; safeMs: number }> = {
  id: 'retro-descent',
  titleKey: 'lab.f.retro.title',
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

/**
 * Δv to orbit (M1, body-parametric) — the required Δv is DERIVED, not the magic 9.4:
 * the orbital speed you must reach (from the body's gravity + radius) plus the ascent
 * losses (gravity + drag). On Earth ≈ 7.8 + 1.6 = 9.4; the Moon needs far less, and an
 * airless world has almost no drag loss. This is what the launch verdict compares
 * against — so switching worlds updates the target honestly (retrospective #2).
 */
export const dvToOrbit: FormulaDef<{ body: string; altitudeKm: number; lossesKms: number }> = {
  id: 'dv-to-orbit',
  titleKey: 'lab.f.dvorbit.title',
  domain: 'ascent',
  tier: 5,
  prereqs: ['orbital-velocity'],
  latex: 'v_{\\text{req}} = v_{\\text{orbit}} + v_{\\text{loss}}',
  inputs: [
    {
      key: 'body',
      labelKey: 'lab.f.dvorbit.body',
      units: '',
      kind: 'body',
      default: 'earth',
      bodyIds: [...ORBIT_BODY_IDS],
    },
    {
      key: 'altitudeKm',
      labelKey: 'lab.f.dvorbit.altitude',
      units: 'km',
      kind: 'number',
      default: 200,
      min: 100,
      max: 2000,
    },
    {
      key: 'lossesKms',
      labelKey: 'lab.f.dvorbit.losses',
      units: 'km/s',
      kind: 'number',
      default: 1.6,
      min: 0,
      max: 3,
    },
  ],
  outputs: [{ key: 'required', labelKey: 'lab.f.dvorbit.required', units: 'km/s' }],
  compute: ({ body, altitudeKm, lossesKms }) => {
    const loc = locationModel(body);
    if (!loc) {
      const values: Record<string, Quantity> = {};
      return {
        values,
        status: { ok: false, reasonKey: 'lab.f.orbits.err-unknown-body' },
        assumptions: ['lab.assume.point-mass'],
      } satisfies FormulaResult;
    }
    if (!Number.isFinite(altitudeKm) || !Number.isFinite(lossesKms) || lossesKms < 0) {
      const values: Record<string, Quantity> = {};
      return {
        values,
        status: { ok: false, reasonKey: 'lab.f.descent.err-input' },
        assumptions: ['lab.assume.point-mass'],
      } satisfies FormulaResult;
    }
    const vOrbit = circularVelocityKms(loc.rKm + altitudeKm, loc.muKm3s2);
    const required = vOrbit + lossesKms;
    return {
      values: { required: { value: required, units: 'km/s' } },
      status: { ok: true },
      assumptions: ['lab.assume.point-mass', 'lab.assume.ascent-losses-input'],
      figure: {
        kind: 'dv-waterfall',
        provenance: { fidelity: 'computed', module: 'mechanics/orbits' },
        assumptions: ['lab.assume.ascent-losses-input'],
        segments: [
          { labelKey: 'lab.f.orbvel.vcirc', dv: vOrbit, kind: 'cost' },
          { labelKey: 'lab.f.dvorbit.losses', dv: lossesKms, kind: 'cost' },
        ],
      },
    } satisfies FormulaResult;
  },
};

// ─── M6 "leave the solar system" — escape velocity + gravity assist ──────────

/**
 * Solar escape velocity at a heliocentric distance: v_esc = √(2µ_sun/r) (M6). At 1 AU
 * it's ~42.1 km/s — the speed a craft must reach, relative to the Sun, to never fall
 * back. The curve shows it dropping with distance (√ falloff): it's easier to escape
 * from further out, which is exactly what a gravity assist buys you.
 */
export const solarEscapeVelocity: FormulaDef<{ distanceAu: number }> = {
  id: 'solar-escape-velocity',
  titleKey: 'lab.f.solesc.title',
  domain: 'transfer',
  tier: 6,
  prereqs: ['orbital-velocity'],
  latex: 'v_{\\text{esc}} = \\sqrt{\\dfrac{2\\mu_\\odot}{r}}',
  inputs: [
    {
      key: 'distanceAu',
      labelKey: 'lab.f.solesc.distance',
      units: 'AU',
      kind: 'number',
      default: 1,
      min: 0.1,
      max: 50,
    },
  ],
  outputs: [{ key: 'vEsc', labelKey: 'lab.f.solesc.vesc', units: 'km/s' }],
  compute: ({ distanceAu }) => {
    if (!Number.isFinite(distanceAu) || distanceAu <= 0) {
      const values: Record<string, Quantity> = {};
      return {
        values,
        status: { ok: false, reasonKey: 'lab.f.solesc.err-distance' },
        assumptions: ['lab.assume.point-mass'],
      } satisfies FormulaResult;
    }
    const vEsc = escapeVelocityKms(distanceAu * AU_TO_KM, MU_SUN_KM3_S2);
    const points: Vec2[] = [];
    for (let au = 0.2; au <= 30.001; au += 0.5) {
      points.push({ x: au, y: escapeVelocityKms(au * AU_TO_KM, MU_SUN_KM3_S2) });
    }
    return {
      values: { vEsc: { value: vEsc, units: 'km/s' } },
      status: { ok: true },
      assumptions: ['lab.assume.point-mass', 'lab.assume.sun-only'],
      figure: {
        kind: 'curve',
        provenance: { fidelity: 'computed', module: 'mechanics/orbits' },
        assumptions: ['lab.assume.sun-only'],
        x: { labelKey: 'lab.axis.distance-au', units: 'AU' },
        y: { labelKey: 'lab.axis.speed', units: 'km/s' },
        series: [{ points }],
        marks: [
          { at: { x: distanceAu, y: vEsc }, labelKey: 'lab.mark.you-are-here', kind: 'point' },
        ],
      },
    } satisfies FormulaResult;
  },
};

/**
 * Heliocentric escape Δv (M6) — you're NOT starting from rest: a craft at Earth already
 * shares Earth's ~29.8 km/s orbit of the Sun. So the extra speed to leave is only
 * v_esc − v_orbital ≈ 42.1 − 29.8 ≈ 12.3 km/s (a prograde departure spends the orbital
 * motion you already have). Honest assumption: this is the heliocentric Δv, ON TOP of
 * climbing out of the departure planet's own gravity well.
 */
export const heliocentricEscapeDv: FormulaDef<{ escapeKms: number; orbitalKms: number }> = {
  id: 'heliocentric-escape-dv',
  titleKey: 'lab.f.helesc.title',
  domain: 'transfer',
  tier: 7,
  prereqs: ['solar-escape-velocity'],
  latex: '\\Delta v = v_{\\text{esc}} - v_{\\text{orb}}',
  inputs: [
    {
      key: 'escapeKms',
      labelKey: 'lab.f.helesc.escape',
      units: 'km/s',
      kind: 'number',
      default: 42.1,
      min: 0,
      max: 100,
    },
    {
      key: 'orbitalKms',
      labelKey: 'lab.f.helesc.orbital',
      units: 'km/s',
      kind: 'number',
      default: 29.78, // Earth's mean heliocentric speed
      min: 0,
      max: 100,
    },
  ],
  outputs: [{ key: 'dvKms', labelKey: 'lab.f.helesc.dv', units: 'km/s' }],
  compute: ({ escapeKms, orbitalKms }) => {
    if (!Number.isFinite(escapeKms) || !Number.isFinite(orbitalKms)) {
      const values: Record<string, Quantity> = {};
      return {
        values,
        status: { ok: false, reasonKey: 'lab.f.escape.err-input' },
        assumptions: ['lab.assume.prograde-launch'],
      } satisfies FormulaResult;
    }
    const dv = Math.max(0, escapeKms - orbitalKms);
    return {
      values: { dvKms: { value: dv, units: 'km/s' } },
      status: { ok: true },
      assumptions: ['lab.assume.prograde-launch', 'lab.assume.ignore-planet-well'],
      figure: {
        kind: 'dv-waterfall',
        provenance: { fidelity: 'computed', module: 'mechanics/orbits' },
        assumptions: ['lab.assume.prograde-launch'],
        segments: [
          { labelKey: 'lab.f.helesc.orbital', dv: orbitalKms, kind: 'gain' },
          { labelKey: 'lab.f.helesc.escape', dv: escapeKms, kind: 'cost' },
        ],
      },
    } satisfies FormulaResult;
  },
};

/**
 * Oberth departure Δv (M6) — the honest cost of leaving, and the twist that makes it
 * possible. You need a hyperbolic-excess speed v∞ (the ~12.3 km/s heliocentric figure)
 * once clear of the planet — but you don't buy it in open space. You burn from a LOW
 * parking orbit, deep in the planet's gravity well, where kinetic energy is cheap: the
 * Oberth effect. From LEO the Δv to reach v∞ = 12.3 is only ~8.7 km/s, not 12.3 —
 * v_periapsis = √(v∞² + v_esc²), Δv = v_periapsis − v_circular. That ~8.7 IS within a
 * strong chemical upper stage: New Horizons launched straight onto a Sun-escaping orbit.
 */
export const oberthDepartureDv: FormulaDef<{ vInfKms: number; body: string; altitudeKm: number }> =
  {
    id: 'oberth-departure-dv',
    titleKey: 'lab.f.oberth.title',
    domain: 'transfer',
    tier: 7,
    prereqs: ['heliocentric-escape-dv'],
    latex: '\\Delta v = \\sqrt{v_\\infty^2 + v_{\\text{esc}}^2} - v_{\\text{circ}}',
    inputs: [
      {
        key: 'vInfKms',
        labelKey: 'lab.f.oberth.vinf',
        units: 'km/s',
        kind: 'number',
        default: 12.3,
        min: 0,
        max: 100,
      },
      {
        key: 'body',
        labelKey: 'lab.f.oberth.body',
        units: '',
        kind: 'body',
        default: 'earth',
        bodyIds: [...ORBIT_BODY_IDS],
      },
      {
        key: 'altitudeKm',
        labelKey: 'lab.f.oberth.altitude',
        units: 'km',
        kind: 'number',
        default: 200,
        min: 100,
        max: 2000,
      },
    ],
    outputs: [{ key: 'dvFromLeo', labelKey: 'lab.f.oberth.dv', units: 'km/s' }],
    compute: ({ vInfKms, body, altitudeKm }) => {
      const loc = locationModel(body);
      if (!loc) {
        const values: Record<string, Quantity> = {};
        return {
          values,
          status: { ok: false, reasonKey: 'lab.f.orbits.err-unknown-body' },
          assumptions: ['lab.assume.point-mass'],
        } satisfies FormulaResult;
      }
      if (!Number.isFinite(vInfKms) || !Number.isFinite(altitudeKm) || vInfKms < 0) {
        const values: Record<string, Quantity> = {};
        return {
          values,
          status: { ok: false, reasonKey: 'lab.f.escape.err-input' },
          assumptions: ['lab.assume.point-mass'],
        } satisfies FormulaResult;
      }
      const rKm = loc.rKm + altitudeKm;
      const vCirc = circularVelocityKms(rKm, loc.muKm3s2);
      const vEscLeo = escapeVelocityKms(rKm, loc.muKm3s2);
      const vPeri = Math.sqrt(vInfKms * vInfKms + vEscLeo * vEscLeo);
      const dv = vPeri - vCirc;
      return {
        values: { dvFromLeo: { value: dv, units: 'km/s' } },
        status: { ok: true },
        assumptions: ['lab.assume.point-mass', 'lab.assume.impulsive-burn'],
        figure: {
          kind: 'dv-waterfall',
          provenance: { fidelity: 'computed', module: 'mechanics/orbits' },
          assumptions: ['lab.assume.impulsive-burn'],
          segments: [
            { labelKey: 'lab.f.oberth.periapsis', dv: vPeri, kind: 'cost' },
            { labelKey: 'lab.f.oberth.circular', dv: vCirc, kind: 'gain' },
          ],
        },
      } satisfies FormulaResult;
    },
  };

/**
 * Gravity assist (M6) — the slingshot. In the planet's frame a flyby is elastic (speed in
 * = speed out), but that frame is MOVING at the planet's orbital velocity, so in the Sun's
 * frame your speed can change. The true ceiling for a single flyby is Δv = 2·v∞ — a full
 * 180° reversal of your velocity relative to the planet. Real flybys turn LESS than that
 * (the deflection is set by how close you pass and the planet's mass), so this is an honest
 * UPPER bound, not a delivered value. A massive planet like Jupiter can bend a fast
 * approach hardest, which is why every outer-system probe flew past it.
 */
export const gravityAssist: FormulaDef<{ vInfKms: number }> = {
  id: 'gravity-assist',
  titleKey: 'lab.f.grav.title',
  domain: 'transfer',
  tier: 7,
  prereqs: [],
  latex: '\\Delta v_{\\max} = 2\\,v_\\infty',
  inputs: [
    {
      key: 'vInfKms',
      labelKey: 'lab.f.grav.vinf',
      units: 'km/s',
      kind: 'number',
      default: 6, // a representative outer-planet approach speed
      min: 0,
      max: 30,
    },
  ],
  outputs: [{ key: 'boost', labelKey: 'lab.f.grav.boost', units: 'km/s' }],
  compute: ({ vInfKms }) => {
    if (!Number.isFinite(vInfKms) || vInfKms < 0) {
      const values: Record<string, Quantity> = {};
      return {
        values,
        status: { ok: false, reasonKey: 'lab.f.escape.err-input' },
        assumptions: ['lab.assume.patched-conic'],
      } satisfies FormulaResult;
    }
    const boost = 2 * vInfKms; // ideal 180° turn — the ceiling, rarely reached
    const points: Vec2[] = [];
    for (let v = 0; v <= 30.001; v += 1) points.push({ x: v, y: 2 * v });
    return {
      values: { boost: { value: boost, units: 'km/s' } },
      status: { ok: true },
      assumptions: ['lab.assume.patched-conic', 'lab.assume.ideal-deflection'],
      figure: {
        kind: 'curve',
        provenance: { fidelity: 'computed', module: 'mechanics/orbits' },
        assumptions: ['lab.assume.ideal-deflection'],
        x: { labelKey: 'lab.axis.vinf', units: 'km/s' },
        y: { labelKey: 'lab.axis.speed', units: 'km/s' },
        series: [{ points }],
        marks: [{ at: { x: vInfKms, y: boost }, labelKey: 'lab.mark.you-are-here', kind: 'point' }],
      },
    } satisfies FormulaResult;
  },
};

/**
 * Escape verdict (M6 payoff) — margin = capacity + assist − required, all in the honest
 * from-LEO Δv frame (required wires from the Oberth rung, ~8.7 km/s). A strong chemical
 * upper stage (~8.5) lands right on the line: the very biggest launches (New Horizons)
 * just clear it alone, most fall a hair short. A gravity assist supplies the margin — and,
 * more to the point, the extra speed to actually TOUR the outer planets (Voyager) rather
 * than merely limp past escape. Fail-honest when neither rocket nor assist is enough.
 */
export const escapeVerdict: FormulaDef<{
  capacityKms: number;
  assistKms: number;
  requiredKms: number;
}> = {
  id: 'escape-verdict',
  titleKey: 'lab.f.escverd.title',
  domain: 'transfer',
  tier: 8,
  prereqs: ['heliocentric-escape-dv', 'gravity-assist'],
  latex: '\\text{margin} = v_{\\text{cap}} + v_{\\text{assist}} - v_{\\text{req}}',
  inputs: [
    {
      key: 'capacityKms',
      labelKey: 'lab.f.escverd.capacity',
      units: 'km/s',
      kind: 'number',
      default: 8.5, // a strong chemical upper stage's Δv from LEO
      min: 0,
      max: 50,
    },
    {
      key: 'assistKms',
      labelKey: 'lab.f.escverd.assist',
      units: 'km/s',
      kind: 'number',
      default: 0,
      min: 0,
      max: 60,
    },
    {
      key: 'requiredKms',
      labelKey: 'lab.f.escverd.required',
      units: 'km/s',
      kind: 'number',
      default: 8.7, // the Oberth-discounted Δv from LEO to solar escape
      min: 0,
      max: 100,
    },
  ],
  outputs: [{ key: 'margin', labelKey: 'lab.f.escverd.margin', units: 'km/s' }],
  compute: ({ capacityKms, assistKms, requiredKms }) => {
    if (
      !Number.isFinite(capacityKms) ||
      !Number.isFinite(assistKms) ||
      !Number.isFinite(requiredKms)
    ) {
      const values: Record<string, Quantity> = {};
      return {
        values,
        status: { ok: false, reasonKey: 'lab.f.escape.err-input' },
        assumptions: ['lab.assume.ideal-no-losses'],
      } satisfies FormulaResult;
    }
    const margin = capacityKms + assistKms - requiredKms;
    const base = {
      assumptions: ['lab.assume.ideal-no-losses', 'lab.assume.patched-conic'],
      figure: {
        kind: 'dv-waterfall' as const,
        provenance: { fidelity: 'computed' as const, module: 'mechanics/orbits' },
        assumptions: ['lab.assume.ideal-no-losses'],
        segments: [
          { labelKey: 'lab.f.escverd.capacity', dv: capacityKms, kind: 'gain' as const },
          { labelKey: 'lab.f.escverd.assist', dv: assistKms, kind: 'gain' as const },
          { labelKey: 'lab.f.escverd.required', dv: requiredKms, kind: 'cost' as const },
        ],
      },
    };
    if (margin < 0) {
      const values: Record<string, Quantity> = {};
      return {
        values,
        status: { ok: false, reasonKey: 'lab.f.escverd.err-insufficient' },
        ...base,
      } satisfies FormulaResult;
    }
    return {
      values: { margin: { value: margin, units: 'km/s' } },
      status: { ok: true },
      ...base,
    } satisfies FormulaResult;
  },
};

/** All registered formulas, keyed by id. Add a formula in exactly one place. */
export const REGISTRY: Registry = new Map<string, FormulaDef>([
  [tsiolkovsky.id, tsiolkovsky],
  [newtonSecondLaw.id, newtonSecondLaw],
  [weight.id, weight],
  [momentumFormula.id, momentumFormula],
  [twrFormula.id, twrFormula],
  [freeFallFormula.id, freeFallFormula],
  [projectileFormula.id, projectileFormula],
  [deltaVMargin.id, deltaVMargin],
  [launchSite.id, launchSite],
  [dvToOrbit.id, dvToOrbit],
  [reachOrbitVerdict.id, reachOrbitVerdict],
  [orbitalVelocity.id, orbitalVelocity],
  [visVivaFormula.id, visVivaFormula],
  [hohmannFormula.id, hohmannFormula],
  [descentBurn.id, descentBurn],
  [interplanetaryTransfer.id, interplanetaryTransfer],
  [launchWindow.id, launchWindow],
  [terminalVelocity.id, terminalVelocity],
  [softLandingCheck.id, softLandingCheck],
  [airbagsCheck.id, airbagsCheck],
  [retroDescent.id, retroDescent],
  [solarEscapeVelocity.id, solarEscapeVelocity],
  [heliocentricEscapeDv.id, heliocentricEscapeDv],
  [oberthDepartureDv.id, oberthDepartureDv],
  [gravityAssist.id, gravityAssist],
  [escapeVerdict.id, escapeVerdict],
]);

/** Default input record for a formula (drives a first compute / the invariant tests). */
export function defaultInputs(def: FormulaDef): Record<string, number | string> {
  return Object.fromEntries(def.inputs.map((f) => [f.key, f.default]));
}
