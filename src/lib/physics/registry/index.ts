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
import { circularVelocityKms, visVivaKms, hohmannTransfer } from '../mechanics/orbits';
import { bodyGravityMs2 } from '../mechanics/bodies';
import {
  R_EARTH_KM,
  R_MOON_KM,
  MU_EARTH_KM3_S2,
  MU_MOON_KM3_S2,
  MOON_ORBIT_RADIUS_KM,
} from '../util/constants';

/** Primaries a learner can orbit (M2). Each maps to its radius + µ (D10 home). */
const ORBIT_BODIES = {
  earth: { rKm: R_EARTH_KM, muKm3s2: MU_EARTH_KM3_S2 },
  moon: { rKm: R_MOON_KM, muKm3s2: MU_MOON_KM3_S2 },
} as const;
const ORBIT_BODY_IDS = ['earth', 'moon'] as const;
const orbitBody = (id: string): { rKm: number; muKm3s2: number } =>
  ORBIT_BODIES[id as keyof typeof ORBIT_BODIES] ?? ORBIT_BODIES.earth;

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
    const b = orbitBody(body);
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
    const b = orbitBody(body);
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
    const b = orbitBody(body);
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
  [orbitalVelocity.id, orbitalVelocity],
  [visVivaFormula.id, visVivaFormula],
  [hohmannFormula.id, hohmannFormula],
]);

/** Default input record for a formula (drives a first compute / the invariant tests). */
export function defaultInputs(def: FormulaDef): Record<string, number | string> {
  return Object.fromEntries(def.inputs.map((f) => [f.key, f.default]));
}
