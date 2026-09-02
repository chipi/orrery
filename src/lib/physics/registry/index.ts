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
  orbitalPeriodS,
} from '../mechanics/orbits';
import { poweredDescentDvKms } from '../mechanics/descent';
import { MU_BODY_M3_S2, R_BODY_M } from '../descent/descent-physics-constants';
import { terminalVelocityMs, SURFACE_DENSITY_KGM3 } from '../mechanics/atmosphere';
import { bodyGravityMs2 } from '../mechanics/bodies';
import { locationModel, rotationVelocityKms } from '../util/location';
import { helioModel, synodicPeriodS, HELIO_ORBIT_AU } from '../util/heliocentric';
import { moonPhase } from '../ephemeris/moon-observer';
import { geocentricMoon } from '../ephemeris/moon';
import { geocentricPlanet, geocentricSun, type PlanetId } from '../ephemeris/planets';
import { skyPosition } from '../ephemeris';
import { julianDay } from '../ephemeris/time';
import { parseTle } from '../satellite/tle';
import { nextPassForTle } from '../satellite';
import stationTles from '../satellite/station-tles.json';
import { computePorkchopGrid, DV_FAILED } from '../transfer/lambert-grid';
import type { DestinationId } from '../transfer/lambert-grid.constants';
import { geoTransferDv } from '../transfer/lambert-geocentric';
import { EPOCH_JD, moonEclipticXYKm, R_LEO } from '../transfer/lambert-geocentric-grid.constants';
import { integrateAscent, circularSpeed } from '../ascent/ascent-physics';
import { buildGenericProfile } from '../ascent/launch-profile-registry';
import { poweredDescentThrottle } from '../systems/powered-descent';
import {
  simulateLiftingEntry,
  liftCorridor,
  solveEntryBankForRange,
} from '../systems/entry-steering';
import {
  MOON_ORBIT_RADIUS_KM,
  MU_SUN_KM3_S2,
  MU_EARTH_KM3_S2,
  AU_TO_KM,
  G0,
  R_EARTH_KM,
} from '../util/constants';

/** Earth's second zonal harmonic (oblateness) and its reference equatorial radius (km). */
const J2_EARTH = 0.00108263;
const R_EARTH_EQ_KM = 6378.137;
/** Node-precession target for a sun-synchronous orbit: 360° per tropical year (rad/s). */
const SOLAR_NODE_RATE_RAD_S = (2 * Math.PI) / (365.2422 * 86400);

/** Mean synodic month (new moon → new moon), days — the age scale for G8. */
const SYNODIC_MONTH_DAYS = 29.530588;
/** Sidereal day (one rotation vs the stars), minutes — the ground-track drift clock for G9. */
const SIDEREAL_DAY_MIN = 1436.068;

/** Planets on a tabulated heliocentric orbit — the interplanetary transfer set (M4). */
const HELIO_PLANET_IDS = [
  'mercury',
  'venus',
  'earth',
  'mars',
  'jupiter',
  'saturn',
  'uranus',
  'neptune',
] as const;

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
        // Label by ROLE (departure at r1, arrival at r2), not by position — so a lowering
        // transfer (r1 > r2) still names the burns correctly (review M2 MINOR-2). Perigee is
        // at +x (rp), apogee at −x (ra); the departure orbit sits at whichever r1 is.
        marks: [
          {
            at: { x: (r1Km <= r2Km ? rp : -ra) * scale, y: 0 },
            labelKey: 'lab.mark.burn-depart',
            kind: 'point',
          },
          {
            at: { x: (r1Km <= r2Km ? -ra : rp) * scale, y: 0 },
            labelKey: 'lab.mark.burn-arrive',
            kind: 'point',
          },
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
        // Role-based burn labels (departure = the planet you leave, arrival = the target),
        // correct for an inward transfer (e.g. Earth→Venus) too (review M2 MINOR-2).
        marks: [
          {
            at: { x: (d.orbitRadiusKm <= a.orbitRadiusKm ? rp : -ra) * scale, y: 0 },
            labelKey: 'lab.mark.burn-depart',
            kind: 'point',
          },
          {
            at: { x: (d.orbitRadiusKm <= a.orbitRadiusKm ? -ra : rp) * scale, y: 0 },
            labelKey: 'lab.mark.burn-arrive',
            kind: 'point',
          },
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
    // Relative semi-major axes from the periods (Kepler III: a ∝ T^(2/3)); the ratio is all the
    // geometry needs. The required lead angle is the classic Hohmann phasing: the target must be
    // ahead by 180° minus how far it travels during the transfer half-ellipse.
    const T1 = d.orbitalPeriodS;
    const T2 = a.orbitalPeriodS;
    const a1 = Math.cbrt(T1 * T1);
    const a2 = Math.cbrt(T2 * T2);
    const at = (a1 + a2) / 2;
    const departInner = a1 <= a2;
    const aOuter = Math.max(a1, a2);
    const aInner = Math.min(a1, a2);
    const transferS = 0.5 * (aInner === a1 ? T1 : T2) * Math.pow(at / aInner, 1.5);
    const transferDays = transferS / 86400;
    const requiredPhaseDeg = 180 - 360 * (transferS / T2);
    const outerDrawR = 120;
    const innerDrawR = 120 * (aInner / aOuter);
    return {
      values: { synodic: { value: synodicDays, units: 'day' } },
      status: { ok: true },
      assumptions: ['lab.assume.circular-orbits', 'lab.assume.coplanar'],
      figure: {
        kind: 'launch-window',
        provenance: { fidelity: 'computed', module: 'transfer/orbital' },
        assumptions: ['lab.assume.circular-orbits', 'lab.assume.coplanar'],
        innerDrawR,
        outerDrawR,
        departInner,
        requiredPhaseDeg,
        synodicDays,
        transferDays,
        departLabelKey: `lab.body.${depart}`,
        arriveLabelKey: `lab.body.${arrive}`,
      },
    } satisfies FormulaResult;
  },
};

/** Per-destination porkchop windows: a departure span (~1.5 synodic periods) and the
 *  time-of-flight band that brackets the real transfer, so the grid frames a full window. */
const PORKCHOP_WINDOWS: Record<
  string,
  { depSpanDays: number; tofMinDays: number; tofMaxDays: number }
> = {
  venus: { depSpanDays: 584, tofMinDays: 80, tofMaxDays: 300 },
  mars: { depSpanDays: 780, tofMinDays: 120, tofMaxDays: 400 },
  jupiter: { depSpanDays: 400, tofMinDays: 700, tofMaxDays: 1400 },
};
const PORKCHOP_DEST_IDS = ['venus', 'mars', 'jupiter'] as const;

/**
 * Porkchop plot (mission-design launch-window optimizer) — the chart every interplanetary
 * mission is planned from. It runs the kernel's REAL Lambert solver (`computePorkchopGrid`,
 * the same one that drives /explore) over a grid of departure dates × times-of-flight, solving
 * the two-body boundary-value problem for each cell and shading it by the total Δv (departure
 * C3 + arrival v∞). The valleys are the launch windows; the single lowest cell is the cheapest
 * date-and-duration to leave. This is why launches have a window: miss the valley and the Δv —
 * the fuel — climbs a wall. Surfaces a kernel capability the Lab had modelled only as a single
 * Hohmann transfer before.
 */
export const porkchop: FormulaDef<{ destination: string }> = {
  id: 'porkchop',
  titleKey: 'lab.f.porkchop.title',
  domain: 'transfer',
  tier: 8,
  prereqs: ['interplanetary-transfer', 'launch-window'],
  latex:
    '\\Delta v(t_{\\text{dep}}, t_{\\text{of}}) = \\lVert \\vec v_1 - \\vec v_\\oplus \\rVert + v_\\infty^{\\text{arr}}',
  inputs: [
    {
      key: 'destination',
      labelKey: 'lab.f.porkchop.destination',
      units: '',
      kind: 'enum',
      default: 'mars',
      enumValues: PORKCHOP_DEST_IDS.map((d) => ({ value: d, labelKey: `lab.body.${d}` })),
    },
  ],
  outputs: [
    { key: 'minDvKms', labelKey: 'lab.f.porkchop.mindv', units: 'km/s' },
    { key: 'bestDepartureDay', labelKey: 'lab.f.porkchop.bestdep', units: 'day' },
    { key: 'bestTofDay', labelKey: 'lab.f.porkchop.besttof', units: 'day' },
  ],
  compute: ({ destination }) => {
    const win = PORKCHOP_WINDOWS[destination] ?? PORKCHOP_WINDOWS.mars;
    const res = computePorkchopGrid(
      {
        id: 0,
        depRange: [0, win.depSpanDays],
        arrRange: [win.tofMinDays, win.tofMaxDays],
        steps: [48, 40],
        destinationId: destination as DestinationId,
      },
      () => {},
      () => false,
    );
    if (!res) {
      const values: Record<string, Quantity> = {};
      return {
        values,
        status: { ok: false, reasonKey: 'lab.f.interplanetary.err-planet' },
        assumptions: ['lab.assume.lambert-two-body'],
      } satisfies FormulaResult;
    }
    // Find the cheapest (feasible) cell — the best date + duration to leave.
    let min = Infinity;
    let mi = 0;
    let mj = 0;
    res.grid.forEach((row, j) =>
      row.forEach((dv, i) => {
        if (dv < min && dv < DV_FAILED - 0.01) {
          min = dv;
          mi = i;
          mj = j;
        }
      }),
    );
    if (!Number.isFinite(min)) {
      const values: Record<string, Quantity> = {};
      return {
        values,
        status: { ok: false, reasonKey: 'lab.f.porkchop.err-no-window' },
        assumptions: ['lab.assume.lambert-two-body'],
      } satisfies FormulaResult;
    }
    return {
      values: {
        minDvKms: { value: min, units: 'km/s' },
        bestDepartureDay: { value: res.depDays[mi], units: 'day' },
        bestTofDay: { value: res.arrDays[mj], units: 'day' },
      },
      status: { ok: true },
      assumptions: [
        'lab.assume.lambert-two-body',
        'lab.assume.coplanar',
        'lab.assume.patched-conic',
      ],
      figure: {
        kind: 'porkchop',
        provenance: { fidelity: 'computed', module: 'transfer/lambert-grid' },
        assumptions: ['lab.assume.lambert-two-body', 'lab.assume.coplanar'],
        depDays: res.depDays,
        tofDays: res.arrDays,
        grid: res.grid,
        units: 'km/s',
      },
    } satisfies FormulaResult;
  },
};

/**
 * Cislunar transfer (Earth→Moon, ECI frame) — how you actually get to the Moon, drawn in the
 * Earth-centred-inertial frame. The minimum-energy trans-lunar coast is a Hohmann half-ellipse
 * from a ~200 km LEO parking orbit (perigee) out to the Moon's distance (apogee): semi-major
 * a = (r_LEO + r_Moon)/2, time of flight t = π√(a³/µ⊕) ≈ 5 days. The TLI (trans-lunar injection)
 * and LOI (lunar-orbit insertion) Δv are the kernel's REAL geocentric-Lambert patched-conic
 * values (`geoTransferDv`). The Moon moves ~62° along its orbit during the coast, so you aim
 * where it WILL be — the lead the figure shows. Surfaces the geocentric-Lambert kernel the Lab
 * had never exposed.
 */
export const cislunarTransfer: FormulaDef<Record<string, never>> = {
  id: 'cislunar-transfer',
  titleKey: 'lab.f.cislunar.title',
  domain: 'transfer',
  tier: 5,
  prereqs: ['hohmann-transfer'],
  latex: 'a = \\tfrac12(r_{LEO}+r_{Moon}),\\quad t_{of} = \\pi\\sqrt{a^3/\\mu_\\oplus}',
  inputs: [],
  outputs: [
    { key: 'tliKms', labelKey: 'lab.f.cislunar.tli', units: 'km/s' },
    { key: 'loiKms', labelKey: 'lab.f.cislunar.loi', units: 'km/s' },
    { key: 'tofDays', labelKey: 'lab.f.cislunar.tof', units: 'day' },
  ],
  compute: () => {
    const rLeo = R_LEO; // the geo-Lambert module's LEO parking radius (6578 km) — same one geoTransferDv uses
    // Self-consistent Hohmann TOF + Moon distance: the arrival distance depends on the flight
    // time (elliptical lunar orbit), and the flight time depends on the distance. Iterate to
    // convergence against the SAME ephemeris geoTransferDv solves against, so the drawn ellipse's
    // apogee, the TOF, and the reported Δv are one transfer (review A1).
    let moonDist = MOON_ORBIT_RADIUS_KM;
    let tofDays = 0;
    for (let i = 0; i < 4; i += 1) {
      const a = (rLeo + moonDist) / 2;
      tofDays = (Math.PI * Math.sqrt((a * a * a) / MU_EARTH_KM3_S2)) / 86400;
      const r2 = moonEclipticXYKm(EPOCH_JD + tofDays);
      moonDist = Math.hypot(r2[0], r2[1]);
    }
    const gt = geoTransferDv(0, tofDays);
    if (!gt.feasible) {
      const values: Record<string, Quantity> = {};
      return {
        values,
        status: { ok: false, reasonKey: 'lab.f.porkchop.err-no-window' },
        assumptions: ['lab.assume.patched-conic'],
      } satisfies FormulaResult;
    }
    const SIDEREAL_MONTH_DAYS = 27.32166;
    const moonTravelDeg = (tofDays / SIDEREAL_MONTH_DAYS) * 360;
    return {
      values: {
        tliKms: { value: gt.tli, units: 'km/s' },
        loiKms: { value: gt.loi, units: 'km/s' },
        tofDays: { value: tofDays, units: 'day' },
      },
      status: { ok: true },
      assumptions: [
        'lab.assume.patched-conic-insertion',
        'lab.assume.hohmann-translunar',
        'lab.assume.coplanar',
      ],
      figure: {
        kind: 'cislunar-eci',
        provenance: { fidelity: 'computed', module: 'transfer/lambert-geocentric' },
        assumptions: ['lab.assume.patched-conic-insertion', 'lab.assume.hohmann-translunar'],
        earthRadiusKm: R_EARTH_KM,
        leoRadiusKm: rLeo,
        moonDistanceKm: moonDist,
        moonTravelDeg,
        tofDays,
        tliKms: gt.tli,
        loiKms: gt.loi,
      },
    } satisfies FormulaResult;
  },
};

/**
 * Ascent to orbit (reach-orbit) — the missing step between "launch a rocket" and going
 * anywhere: actually PUT SOMETHING IN ORBIT. Runs the kernel's real gravity-turn ASCENT
 * INTEGRATOR (`integrateAscent`, the same one /fly and /plan fly), which accounts for the
 * three Δv losses a closed-form Tsiolkovsky can't: GRAVITY (thrust wasted fighting weight
 * on the climb), DRAG (the atmosphere), and STEERING (the cosine loss of pitching over).
 * Those losses are the whole reason orbit costs ~9.4 km/s when orbital speed is only 7.8 —
 * the "Δv tax" the Lab could never show before. The engine (a generic 2-stage medium-lift
 * stack) is fixed; the user manipulates the PAYLOAD and the TARGET ALTITUDE, and a heavy
 * enough payload FAILS to reach orbit — fail-honest, with the partial trajectory still drawn.
 */
export const ascentToOrbit: FormulaDef<{ payloadKg: number; targetOrbitAltKm: number }> = {
  id: 'ascent-to-orbit',
  titleKey: 'lab.f.ascent.title',
  domain: 'ascent',
  tier: 2,
  prereqs: ['tsiolkovsky', 'dv-to-orbit'],
  latex:
    '\\Delta v_{\\text{needed}} = v_{\\text{orbit}} + \\ell_{\\text{grav}} + \\ell_{\\text{drag}} + \\ell_{\\text{steer}}',
  inputs: [
    {
      key: 'payloadKg',
      labelKey: 'lab.f.ascent.payload',
      units: 'kg',
      kind: 'number',
      default: 6000,
      min: 1000,
      max: 20000,
      step: 500,
    },
    {
      key: 'targetOrbitAltKm',
      labelKey: 'lab.f.ascent.altitude',
      units: 'km',
      kind: 'number',
      default: 200,
      min: 150,
      max: 500,
      step: 10,
    },
  ],
  outputs: [
    { key: 'gravityLossKms', labelKey: 'lab.f.ascent.gravity', units: 'km/s' },
    { key: 'dragLossKms', labelKey: 'lab.f.ascent.drag', units: 'km/s' },
    { key: 'steeringLossKms', labelKey: 'lab.f.ascent.steering', units: 'km/s' },
    { key: 'finalSpeedKms', labelKey: 'lab.f.ascent.finalspeed', units: 'km/s' },
  ],
  compute: ({ payloadKg, targetOrbitAltKm }) => {
    if (
      !Number.isFinite(payloadKg) ||
      !Number.isFinite(targetOrbitAltKm) ||
      payloadKg <= 0 ||
      targetOrbitAltKm <= 0
    ) {
      const values: Record<string, Quantity> = {};
      return {
        values,
        status: { ok: false, reasonKey: 'lab.f.descent.err-input' },
        assumptions: ['lab.assume.planar-ascent'],
      } satisfies FormulaResult;
    }
    const targetOrbitAltM = targetOrbitAltKm * 1000;
    const profile = { ...buildGenericProfile('ascent-demo'), payloadKg, targetOrbitAltM };
    const s = integrateAscent(profile);
    const targetSpeedKms = circularSpeed(targetOrbitAltM) / 1000; // circularSpeed is m/s

    // Down-sample the trajectory (~535 states → ~110 points) for the figure.
    const step = Math.max(1, Math.round(s.states.length / 110));
    const points = s.states
      .filter((_, i) => i % step === 0 || i === s.states.length - 1)
      .map((st) => ({ x: st.downrangeKm, y: st.altKm, stage: st.stageIndex }));
    // Map each event to the trajectory position at its time.
    const evAt = (tt: number): { x: number; y: number } => {
      let best = s.states[0];
      for (const st of s.states) if (Math.abs(st.t - tt) < Math.abs(best.t - tt)) best = st;
      return { x: best.downrangeKm, y: best.altKm };
    };
    const events = s.events.map((e) => ({ type: e.type, ...evAt(e.t) }));

    const values: Record<string, Quantity> = {
      gravityLossKms: { value: s.losses.gravityKms, units: 'km/s' },
      dragLossKms: { value: s.losses.dragKms, units: 'km/s' },
      steeringLossKms: { value: s.losses.steeringKms, units: 'km/s' },
      finalSpeedKms: { value: s.finalSpeedKms, units: 'km/s' },
    };
    const figure = {
      kind: 'ascent-trajectory' as const,
      provenance: { fidelity: 'computed' as const, module: 'ascent/ascent-physics' },
      assumptions: ['lab.assume.planar-ascent', 'lab.assume.exponential-atmosphere'],
      points,
      events,
      losses: {
        gravityKms: s.losses.gravityKms,
        dragKms: s.losses.dragKms,
        steeringKms: s.losses.steeringKms,
      },
      idealDvKms: s.idealDvKms,
      orbitAltKm: targetOrbitAltKm,
      reachedOrbit: s.reachedOrbit,
      finalSpeedKms: s.finalSpeedKms,
      targetSpeedKms,
    };
    // Fail-honest when the stack can't make orbit — but still draw how far it got.
    if (!s.reachedOrbit) {
      return {
        values,
        status: { ok: false, reasonKey: 'lab.f.ascent.err-no-orbit' },
        assumptions: ['lab.assume.planar-ascent', 'lab.assume.exponential-atmosphere'],
        figure,
      } satisfies FormulaResult;
    }
    return {
      values,
      status: { ok: true },
      assumptions: ['lab.assume.planar-ascent', 'lab.assume.exponential-atmosphere'],
      figure,
    } satisfies FormulaResult;
  },
};

/**
 * Ascent guidance (SYSTEMS — how a machine flies the physics) — the flight computer's job, made
 * visible. A rocket cannot be flown to orbit by hand: the timing is per-second and the insertion
 * boundary conditions (r=rT, vr=0, vh=circular) are exact. So it flies in two regimes, and this
 * lesson runs the REAL integrator (with a low-TWR upper stage that triggers PEG) and plots the
 * COMMANDED pitch γ over the whole burn:
 *   · OPEN-loop below ~55 km — a pre-planned aero-safe pitch table drives the gravity turn.
 *   · CLOSED-loop above — the guidance computer takes over. For a low-TWR upper stage that is
 *     Powered Explicit Guidance (`systems/peg`): each major cycle it re-solves a two-point
 *     boundary problem for a linear-tangent steering law `sin γ = A + B·t`, and the solution
 *     LOFTS the arc — commanding pitch BELOW the horizon (γ < 0) to trade altitude for speed, a
 *     command a human would never fly blind. Lower the upper-stage thrust and watch it loft harder.
 */
export const ascentGuidance: FormulaDef<{ upperThrustKN: number; targetOrbitAltKm: number }> = {
  id: 'ascent-guidance',
  titleKey: 'lab.f.guidance.title',
  domain: 'ascent',
  tier: 3,
  prereqs: ['ascent-to-orbit'],
  latex: '\\sin\\gamma(t) = A + B\\,t \\quad\\text{(PEG linear-tangent steering)}',
  inputs: [
    {
      key: 'upperThrustKN',
      labelKey: 'lab.f.guidance.thrust', // in kN (carried in the label; no 'kN' Unit)
      units: '',
      kind: 'number',
      default: 220,
      min: 150,
      max: 320,
      step: 5,
    },
    {
      key: 'targetOrbitAltKm',
      labelKey: 'lab.f.guidance.altitude',
      units: 'km',
      kind: 'number',
      default: 200,
      min: 150,
      max: 400,
      step: 10,
    },
  ],
  outputs: [
    { key: 'minPitchDeg', labelKey: 'lab.f.guidance.minpitch', units: 'deg' },
    { key: 'handoffTimeS', labelKey: 'lab.f.guidance.handoff', units: 's' },
    { key: 'burnTimeS', labelKey: 'lab.f.guidance.burntime', units: 's' },
  ],
  compute: ({ upperThrustKN, targetOrbitAltKm }) => {
    if (
      !Number.isFinite(upperThrustKN) ||
      !Number.isFinite(targetOrbitAltKm) ||
      upperThrustKN <= 0 ||
      targetOrbitAltKm <= 0
    ) {
      const values: Record<string, Quantity> = {};
      return {
        values,
        status: { ok: false, reasonKey: 'lab.f.descent.err-input' },
        assumptions: ['lab.assume.planar-ascent'],
      } satisfies FormulaResult;
    }
    const base = buildGenericProfile('peg-demo');
    const profile = {
      ...base,
      loftBoost: true, // triggers the PEG controller for the final low-TWR stage
      targetOrbitAltM: targetOrbitAltKm * 1000,
      stages: [base.stages[0], { ...base.stages[1], thrustVacKN: upperThrustKN }],
    };
    const s = integrateAscent(profile);
    const HANDOFF_ALT_KM = 55; // GUIDANCE.handoverAltM — the open→closed regime boundary
    const deg = (rad: number): number => (rad * 180) / Math.PI;
    const stepN = Math.max(1, Math.round(s.states.length / 140));
    const samples = s.states
      .filter((_, i) => i % stepN === 0 || i === s.states.length - 1)
      .map((st) => ({
        t: st.t,
        pitchDeg: deg(st.pitchRad),
        closedLoop: st.altKm > HANDOFF_ALT_KM,
      }));
    const closed = s.states.filter((st) => st.altKm > HANDOFF_ALT_KM);
    const minPitchDeg = closed.length ? Math.min(...closed.map((st) => deg(st.pitchRad))) : 90;
    const handoff = s.states.find((st) => st.altKm > HANDOFF_ALT_KM);
    const handoffTimeS = handoff ? handoff.t : s.totalDurationS;
    const nearest = (tt: number): (typeof s.states)[number] => {
      let best = s.states[0];
      for (const st of s.states) if (Math.abs(st.t - tt) < Math.abs(best.t - tt)) best = st;
      return best;
    };
    const events = s.events.map((e) => ({
      type: e.type,
      t: e.t,
      pitchDeg: deg(nearest(e.t).pitchRad),
    }));
    return {
      values: {
        minPitchDeg: { value: minPitchDeg, units: 'deg' },
        handoffTimeS: { value: handoffTimeS, units: 's' },
        burnTimeS: { value: s.totalDurationS, units: 's' },
      },
      status: { ok: true },
      assumptions: ['lab.assume.planar-ascent', 'lab.assume.peg-linear-tangent'],
      figure: {
        kind: 'guidance-timeline',
        provenance: { fidelity: 'computed', module: 'systems/peg' },
        assumptions: ['lab.assume.peg-linear-tangent'],
        samples,
        events,
        handoffTimeS,
        minPitchDeg,
        burnTimeS: s.totalDurationS,
        reachedOrbit: s.reachedOrbit,
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

// ─── "Come home" (M-return) — deorbit + re-entry heating, before the parachute ──

/**
 * Deorbit burn (M-return rung 1) — coming home starts by slowing down. A single retrograde
 * burn at your parking altitude lowers the FAR side of the orbit into the top of the
 * atmosphere; from there, drag does the rest. It's a Hohmann lowering: Δv = v_circ −
 * v_apoapsis of the transfer ellipse whose periapsis grazes the entry altitude. Surprisingly
 * cheap — ~80 m/s from low orbit. Reuses circular + vis-viva (any body with an atmosphere).
 */
export const deorbitBurn: FormulaDef<{
  body: string;
  parkingAltitudeKm: number;
  entryAltitudeKm: number;
}> = {
  id: 'deorbit-burn',
  titleKey: 'lab.f.deorbit.title',
  domain: 'descent',
  tier: 6,
  prereqs: ['orbital-velocity'],
  latex: '\\Delta v = v_{\\text{circ}} - v_{\\text{apo}}',
  inputs: [
    {
      key: 'body',
      labelKey: 'lab.f.deorbit.body',
      units: '',
      kind: 'body',
      default: 'earth',
      bodyIds: [...ORBIT_BODY_IDS],
    },
    {
      key: 'parkingAltitudeKm',
      labelKey: 'lab.f.deorbit.parking',
      units: 'km',
      kind: 'number',
      default: 400,
      min: 150,
      max: 2000,
    },
    {
      key: 'entryAltitudeKm',
      labelKey: 'lab.f.deorbit.entry',
      units: 'km',
      kind: 'number',
      default: 120,
      min: 80,
      max: 200,
    },
  ],
  outputs: [{ key: 'deorbitDvKms', labelKey: 'lab.f.deorbit.dv', units: 'km/s' }],
  compute: ({ body, parkingAltitudeKm, entryAltitudeKm }) => {
    const loc = locationModel(body);
    if (!loc) {
      const values: Record<string, Quantity> = {};
      return {
        values,
        status: { ok: false, reasonKey: 'lab.f.orbits.err-unknown-body' },
        assumptions: ['lab.assume.impulsive-burn'],
      } satisfies FormulaResult;
    }
    if (
      !Number.isFinite(parkingAltitudeKm) ||
      !Number.isFinite(entryAltitudeKm) ||
      parkingAltitudeKm <= entryAltitudeKm
    ) {
      const values: Record<string, Quantity> = {};
      return {
        values,
        status: { ok: false, reasonKey: 'lab.f.deorbit.err-altitude' },
        assumptions: ['lab.assume.impulsive-burn'],
      } satisfies FormulaResult;
    }
    const r1 = loc.rKm + parkingAltitudeKm;
    const rEntry = loc.rKm + entryAltitudeKm;
    const a = (r1 + rEntry) / 2;
    const vCirc = circularVelocityKms(r1, loc.muKm3s2);
    const vApo = visVivaKms(r1, a, loc.muKm3s2); // speed at r1 (apoapsis of the lowering ellipse)
    const dv = vCirc - vApo;
    return {
      values: { deorbitDvKms: { value: dv, units: 'km/s' } },
      status: { ok: true },
      assumptions: ['lab.assume.impulsive-burn', 'lab.assume.point-mass'],
      figure: {
        kind: 'dv-waterfall',
        provenance: { fidelity: 'computed', module: 'mechanics/orbits' },
        assumptions: ['lab.assume.impulsive-burn'],
        segments: [
          { labelKey: 'lab.f.deorbit.vcirc', dv: vCirc, kind: 'cost' },
          { labelKey: 'lab.f.deorbit.vapo', dv: vApo, kind: 'gain' },
        ],
      },
    } satisfies FormulaResult;
  },
};

/**
 * Entry heating (M-return rung 2) — the "seven minutes". You hit the atmosphere at nearly
 * orbital speed carrying ½v² of kinetic energy per kg — ~30 MJ/kg at 7.8 km/s, about seven
 * times the energy of the same mass of TNT — and ALL of it must become heat, dumped into the
 * air by the shield, not the capsule. The Allen-Eggers ballistic result gives the peak
 * deceleration, a_peak = v²·sinγ/(2·e·H), independent of the vehicle's mass: come in too
 * steep and both g-load and heating spike; too shallow and you skip back out. That band is
 * the re-entry corridor.
 */
export const entryHeating: FormulaDef<{
  entryVelocityKms: number;
  flightPathAngleDeg: number;
  scaleHeightKm: number;
}> = {
  id: 'entry-heating',
  titleKey: 'lab.f.entry.title',
  domain: 'descent',
  tier: 7,
  prereqs: ['deorbit-burn'],
  latex: 'a_{\\text{peak}} = \\dfrac{v^2\\sin\\gamma}{2eH},\\quad E = \\tfrac12 v^2',
  inputs: [
    {
      key: 'entryVelocityKms',
      labelKey: 'lab.f.entry.velocity',
      units: 'km/s',
      kind: 'number',
      default: 7.8,
      min: 1,
      max: 15,
    },
    {
      key: 'flightPathAngleDeg',
      labelKey: 'lab.f.entry.angle',
      units: 'deg',
      kind: 'number',
      default: 3,
      min: 0.5,
      max: 10,
      step: 0.5,
    },
    {
      key: 'scaleHeightKm',
      labelKey: 'lab.f.entry.scale-height',
      units: 'km',
      kind: 'number',
      default: 7,
      min: 3,
      max: 20,
    },
  ],
  outputs: [
    { key: 'energyPerKgMjkg', labelKey: 'lab.f.entry.energy', units: '' },
    { key: 'peakDecelG', labelKey: 'lab.f.entry.decel', units: '' },
  ],
  compute: ({ entryVelocityKms, flightPathAngleDeg, scaleHeightKm }) => {
    if (
      !Number.isFinite(entryVelocityKms) ||
      !Number.isFinite(flightPathAngleDeg) ||
      !Number.isFinite(scaleHeightKm) ||
      entryVelocityKms <= 0 ||
      flightPathAngleDeg <= 0 ||
      scaleHeightKm <= 0
    ) {
      const values: Record<string, Quantity> = {};
      return {
        values,
        status: { ok: false, reasonKey: 'lab.f.escape.err-input' },
        assumptions: ['lab.assume.ballistic-entry'],
      } satisfies FormulaResult;
    }
    const v = entryVelocityKms * 1000; // m/s
    const gamma = (flightPathAngleDeg * Math.PI) / 180;
    const H = scaleHeightKm * 1000; // m
    const energyMjkg = (0.5 * v * v) / 1e6;
    const peakG = (v * v * Math.sin(gamma)) / (2 * Math.E * H) / G0;
    const points: Vec2[] = [];
    for (let deg = 0.5; deg <= 10.001; deg += 0.5) {
      points.push({
        x: deg,
        y: (v * v * Math.sin((deg * Math.PI) / 180)) / (2 * Math.E * H) / G0,
      });
    }
    return {
      values: {
        energyPerKgMjkg: { value: energyMjkg, units: '' },
        peakDecelG: { value: peakG, units: '' },
      },
      status: { ok: true },
      assumptions: ['lab.assume.ballistic-entry', 'lab.assume.exponential-atmosphere'],
      figure: {
        kind: 'curve',
        provenance: { fidelity: 'computed', module: 'mechanics/atmosphere' },
        assumptions: ['lab.assume.ballistic-entry'],
        x: { labelKey: 'lab.axis.entry-angle', units: 'deg' },
        y: { labelKey: 'lab.axis.decel-g', units: '' },
        series: [{ points }],
        marks: [
          {
            at: { x: flightPathAngleDeg, y: peakG },
            labelKey: 'lab.mark.you-are-here',
            kind: 'point',
          },
        ],
      },
    } satisfies FormulaResult;
  },
};

/**
 * Entry corridor (M-return skip-out) — the re-entry knife-edge, and why you can't come back
 * from the Moon in a brick. Two rigorously-computed boundaries bracket the survivable band of
 * entry flight-path angle:
 *   · SKIP (overshoot): treat the trajectory above the atmosphere as Keplerian. Its perigee is
 *     rp = a(1−e) with a = −µ/(2ε), ε = v²/2 − µ/r, e from the angular momentum h = r·v·cosγ.
 *     Shallower entry → more h → higher perigee; once the perigee clears the capture floor the
 *     vehicle grazes and skips back out. The skip boundary is the γ where perigee = capture floor.
 *   · G-LIMIT (undershoot): the Allen-Eggers ballistic peak deceleration a_peak = v²sinγ/(2eH);
 *     steeper than the γ that hits the survivable g-limit is fatal.
 * The corridor is the gap between them. From LEO (~7.8 km/s) the perigee is below the surface at
 * any real angle, so you NEVER skip — the corridor is just the g-limit, and it's wide. From the
 * Moon (~11 km/s) the skip boundary is STEEPER than the g-limit boundary — the gap closes, a
 * ballistic capsule cannot both avoid skipping AND survive the g's, and only a LIFTING entry
 * (Apollo's offset c.g.) threads the ~2° corridor. Ballistic + lift-ignored is the honest bound;
 * the "you need lift" verdict falls straight out of it.
 */
export const entryCorridor: FormulaDef<{
  entryVelocityKms: number;
  flightPathAngleDeg: number;
  gLimit: number;
  scaleHeightKm: number;
}> = {
  id: 'entry-corridor',
  titleKey: 'lab.f.corridor.title',
  domain: 'descent',
  tier: 8,
  prereqs: ['entry-heating'],
  latex: 'r_p = a(1-e),\\quad a_{\\text{peak}} = \\dfrac{v^2\\sin\\gamma}{2eH}',
  inputs: [
    {
      key: 'entryVelocityKms',
      labelKey: 'lab.f.corridor.velocity',
      units: 'km/s',
      kind: 'number',
      default: 11, // a lunar return — where the corridor bites
      min: 6,
      max: 16,
      step: 0.1,
    },
    {
      key: 'flightPathAngleDeg',
      labelKey: 'lab.f.corridor.angle',
      units: 'deg',
      kind: 'number',
      default: 6,
      min: 0.5,
      max: 12,
      step: 0.1,
    },
    {
      key: 'gLimit',
      labelKey: 'lab.f.corridor.glimit',
      units: '',
      kind: 'number',
      default: 12, // a survivable crewed deceleration
      min: 3,
      max: 30,
    },
    {
      key: 'scaleHeightKm',
      labelKey: 'lab.f.corridor.scale-height',
      units: 'km',
      kind: 'number',
      default: 7,
      min: 3,
      max: 20,
    },
  ],
  outputs: [
    { key: 'perigeeAltKm', labelKey: 'lab.f.corridor.perigee', units: 'km' },
    { key: 'peakDecelG', labelKey: 'lab.f.corridor.decel', units: '' },
    { key: 'corridorWidthDeg', labelKey: 'lab.f.corridor.width', units: 'deg' },
  ],
  compute: ({ entryVelocityKms, flightPathAngleDeg, gLimit, scaleHeightKm }) => {
    if (
      !Number.isFinite(entryVelocityKms) ||
      !Number.isFinite(flightPathAngleDeg) ||
      !Number.isFinite(gLimit) ||
      !Number.isFinite(scaleHeightKm) ||
      entryVelocityKms <= 0 ||
      flightPathAngleDeg <= 0 ||
      gLimit <= 0 ||
      scaleHeightKm <= 0
    ) {
      const values: Record<string, Quantity> = {};
      return {
        values,
        status: { ok: false, reasonKey: 'lab.f.escape.err-input' },
        assumptions: ['lab.assume.ballistic-entry'],
      } satisfies FormulaResult;
    }
    const ENTRY_ALT_KM = 122; // the conventional Earth entry interface
    const CAPTURE_ALT_KM = 60; // below this the atmosphere is dense enough to capture
    const rEI = R_EARTH_KM + ENTRY_ALT_KM;
    const v = entryVelocityKms;
    const H = scaleHeightKm * 1000;
    const vMs = entryVelocityKms * 1000;

    // Keplerian perigee of the entry trajectory at the chosen angle.
    const eps = (v * v) / 2 - MU_EARTH_KM3_S2 / rEI;
    const a = -MU_EARTH_KM3_S2 / (2 * eps);
    const gamma = (flightPathAngleDeg * Math.PI) / 180;
    const hMom = rEI * v * Math.cos(gamma);
    const ecc = Math.sqrt(
      Math.max(0, 1 + (2 * eps * hMom * hMom) / (MU_EARTH_KM3_S2 * MU_EARTH_KM3_S2)),
    );
    const perigeeAltKm = a * (1 - ecc) - R_EARTH_KM;
    const peakG = (vMs * vMs * Math.sin(gamma)) / (2 * Math.E * H) / G0;

    // SKIP boundary — γ where the perigee equals the capture floor (bound orbits only; if the
    // perigee is below the surface at all angles, as from LEO, you can never skip → boundary 0).
    const rc = R_EARTH_KM + CAPTURE_ALT_KM;
    let skipBoundaryDeg = 0;
    if (eps < 0) {
      const eAtCapture = 1 - rc / a; // e that puts perigee at the capture floor
      const hSq = ((eAtCapture * eAtCapture - 1) * MU_EARTH_KM3_S2 * MU_EARTH_KM3_S2) / (2 * eps);
      if (hSq > 0) {
        const cg = Math.sqrt(hSq) / (rEI * v);
        if (cg <= 1) skipBoundaryDeg = (Math.acos(cg) * 180) / Math.PI;
      }
    }
    // G-LIMIT boundary — γ where the ballistic peak-g equals the limit.
    const sinSteep = (gLimit * 2 * Math.E * H * G0) / (vMs * vMs);
    const gLimitBoundaryDeg = sinSteep >= 1 ? 90 : (Math.asin(sinSteep) * 180) / Math.PI;

    const corridorWidthDeg = Math.max(0, gLimitBoundaryDeg - skipBoundaryDeg);

    return {
      values: {
        perigeeAltKm: { value: perigeeAltKm, units: 'km' },
        peakDecelG: { value: peakG, units: '' },
        corridorWidthDeg: { value: corridorWidthDeg, units: 'deg' },
      },
      status: { ok: true },
      assumptions: [
        'lab.assume.ballistic-entry',
        'lab.assume.exponential-atmosphere',
        'lab.assume.keplerian-above-atmosphere',
        'lab.assume.lift-ignored',
      ],
      figure: {
        kind: 'entry-corridor',
        provenance: { fidelity: 'computed', module: 'mechanics/atmosphere' },
        assumptions: ['lab.assume.keplerian-above-atmosphere', 'lab.assume.lift-ignored'],
        skipBoundaryDeg,
        gLimitBoundaryDeg,
        entryDeg: flightPathAngleDeg,
        peakGeeAtEntry: peakG,
        perigeeAltKm,
      },
    } satisfies FormulaResult;
  },
};

// ─── "Scale a rocket" — payload → mass → thrust → engines → stages → boosters ──

/**
 * Rocket sizing (Scale-a-rocket rung 1) — the rocket equation solved for MASS, not Δv.
 * For a stage of structural fraction ε (dry / (dry+propellant)) carrying a payload:
 *   m₀ = m_pl · R(1−ε)/(1−Rε),  R = e^{Δv/v_e}
 * The denominator is the story: as Δv rises, Rε → 1 and gross mass → ∞. That wall
 * (Δv = v_e·ln(1/ε), ~8 km/s for a good kerosene stage) is BELOW the ~9.4 to orbit —
 * which is why no single stage reaches orbit, and why every extra kg of payload
 * cascades into far more rocket.
 */
export const rocketSizing: FormulaDef<{
  payloadKg: number;
  deltaVKms: number;
  ispS: number;
  structuralFraction: number;
}> = {
  id: 'rocket-sizing',
  titleKey: 'lab.f.sizing.title',
  domain: 'ascent',
  tier: 5,
  prereqs: ['tsiolkovsky'],
  latex: 'm_0 = m_{pl}\\dfrac{R(1-\\varepsilon)}{1-R\\varepsilon},\\quad R=e^{\\Delta v/v_e}',
  inputs: [
    {
      key: 'payloadKg',
      labelKey: 'lab.f.sizing.payload',
      units: 'kg',
      kind: 'number',
      default: 5000,
      min: 100,
      max: 150000,
    },
    {
      key: 'deltaVKms',
      labelKey: 'lab.f.sizing.dv',
      units: 'km/s',
      kind: 'number',
      default: 7,
      min: 1,
      max: 12,
    },
    {
      key: 'ispS',
      labelKey: 'lab.f.sizing.isp',
      units: 's',
      kind: 'number',
      default: 350,
      min: 150,
      max: 470,
    },
    {
      key: 'structuralFraction',
      labelKey: 'lab.f.sizing.eps',
      units: '',
      kind: 'number',
      default: 0.08,
      min: 0.02,
      max: 0.25,
      step: 0.01,
    },
  ],
  outputs: [
    { key: 'grossMassKg', labelKey: 'lab.f.sizing.gross', units: 'kg' },
    { key: 'propellantMassKg', labelKey: 'lab.f.sizing.propellant', units: 'kg' },
  ],
  compute: ({ payloadKg, deltaVKms, ispS, structuralFraction: eps }) => {
    if (
      !Number.isFinite(payloadKg) ||
      !Number.isFinite(deltaVKms) ||
      !Number.isFinite(ispS) ||
      !Number.isFinite(eps) ||
      payloadKg <= 0 ||
      ispS <= 0 ||
      eps <= 0 ||
      eps >= 1
    ) {
      const values: Record<string, Quantity> = {};
      return {
        values,
        status: { ok: false, reasonKey: 'lab.f.rocket.err-input' },
        assumptions: ['lab.assume.single-stage'],
      } satisfies FormulaResult;
    }
    const ve = (ispS * G0) / 1000; // km/s
    const R = Math.exp(deltaVKms / ve);
    const denom = 1 - R * eps;
    if (denom <= 0) {
      // Rε ≥ 1 — the single-stage wall: no finite rocket delivers this Δv with this structure.
      const values: Record<string, Quantity> = {};
      return {
        values,
        status: { ok: false, reasonKey: 'lab.f.sizing.err-wall' },
        assumptions: ['lab.assume.single-stage'],
      } satisfies FormulaResult;
    }
    const m0 = (payloadKg * R * (1 - eps)) / denom;
    const propellant = (1 - eps) * (m0 - payloadKg);
    const ceiling = ve * Math.log(1 / eps);
    const points: Vec2[] = [];
    for (let dv = 0.5; dv <= ceiling * 0.985; dv += ceiling / 60) {
      const r = Math.exp(dv / ve);
      points.push({ x: dv, y: (payloadKg * r * (1 - eps)) / (1 - r * eps) });
    }
    return {
      values: {
        grossMassKg: { value: m0, units: 'kg' },
        propellantMassKg: { value: propellant, units: 'kg' },
      },
      status: { ok: true },
      assumptions: ['lab.assume.single-stage', 'lab.assume.ideal-no-losses'],
      figure: {
        kind: 'curve',
        provenance: { fidelity: 'computed', module: 'ascent/sizing' },
        assumptions: ['lab.assume.single-stage'],
        x: { labelKey: 'lab.axis.dv', units: 'km/s' },
        y: { labelKey: 'lab.axis.mass', units: 'kg' },
        series: [{ points }],
        marks: [{ at: { x: deltaVKms, y: m0 }, labelKey: 'lab.mark.you-are-here', kind: 'point' }],
      },
    } satisfies FormulaResult;
  },
};

/**
 * Liftoff thrust (Scale-a-rocket rung 2) — to leave the pad, thrust must beat weight:
 * F = TWR·m₀·g₀, with liftoff TWR ~1.2–1.5 (too low and you barely climb, wasting Δv to
 * gravity; too high and you over-stress the stack). Wires the gross mass from sizing.
 */
export const liftoffThrust: FormulaDef<{ grossMassKg: number; liftoffTwr: number }> = {
  id: 'liftoff-thrust',
  titleKey: 'lab.f.liftoff.title',
  domain: 'ascent',
  tier: 5,
  prereqs: ['rocket-sizing', 'twr'],
  latex: 'F = \\text{TWR}\\cdot m_0\\cdot g_0',
  inputs: [
    {
      key: 'grossMassKg',
      labelKey: 'lab.f.liftoff.gross',
      units: 'kg',
      kind: 'number',
      default: 50000,
      min: 100,
      max: 4000000,
    },
    {
      key: 'liftoffTwr',
      labelKey: 'lab.f.liftoff.twr',
      units: '',
      kind: 'number',
      default: 1.3,
      min: 1,
      max: 3,
      step: 0.05,
    },
  ],
  outputs: [{ key: 'thrustN', labelKey: 'lab.f.liftoff.thrust', units: 'N' }],
  compute: ({ grossMassKg, liftoffTwr }) => {
    if (
      !Number.isFinite(grossMassKg) ||
      !Number.isFinite(liftoffTwr) ||
      grossMassKg <= 0 ||
      liftoffTwr < 1
    ) {
      const values: Record<string, Quantity> = {};
      return {
        values,
        status: { ok: false, reasonKey: 'lab.f.rocket.err-input' },
        assumptions: ['lab.assume.earth-launch'],
      } satisfies FormulaResult;
    }
    const thrustN = liftoffTwr * grossMassKg * G0;
    const points: Vec2[] = [];
    for (let twr = 1; twr <= 3.001; twr += 0.1) points.push({ x: twr, y: twr * grossMassKg * G0 });
    return {
      values: { thrustN: { value: thrustN, units: 'N' } },
      status: { ok: true },
      assumptions: ['lab.assume.earth-launch', 'lab.assume.at-liftoff'],
      figure: {
        kind: 'curve',
        provenance: { fidelity: 'computed', module: 'ascent/sizing' },
        assumptions: ['lab.assume.at-liftoff'],
        x: { labelKey: 'lab.axis.twr', units: '' },
        y: { labelKey: 'lab.axis.thrust', units: 'N' },
        series: [{ points }],
        marks: [
          { at: { x: liftoffTwr, y: thrustN }, labelKey: 'lab.mark.you-are-here', kind: 'point' },
        ],
      },
    } satisfies FormulaResult;
  },
};

/**
 * Engine count (Scale-a-rocket rung 3) — that thrust has to come from somewhere:
 * N = ⌈F / F_engine⌉. This is the "why so many engines" answer: 9 Merlins on a Falcon 9,
 * 5 F-1s on a Saturn V, one big RD-180 on an Atlas V, thirty on the doomed N1. Wires the
 * required thrust from the rung above.
 */
export const engineCount: FormulaDef<{ thrustN: number; engineThrustN: number }> = {
  id: 'engine-count',
  titleKey: 'lab.f.engines.title',
  domain: 'ascent',
  tier: 6,
  prereqs: ['liftoff-thrust'],
  latex: 'N = \\lceil F / F_{\\text{engine}} \\rceil',
  inputs: [
    {
      key: 'thrustN',
      labelKey: 'lab.f.engines.thrust',
      units: 'N',
      kind: 'number',
      default: 650000,
      min: 1000,
      max: 90000000,
    },
    {
      key: 'engineThrustN',
      labelKey: 'lab.f.engines.per-engine',
      units: 'N',
      kind: 'number',
      default: 845000,
      min: 50000,
      max: 8000000,
    },
  ],
  outputs: [{ key: 'engineCount', labelKey: 'lab.f.engines.count', units: '' }],
  compute: ({ thrustN, engineThrustN }) => {
    if (
      !Number.isFinite(thrustN) ||
      !Number.isFinite(engineThrustN) ||
      thrustN < 0 ||
      engineThrustN <= 0
    ) {
      const values: Record<string, Quantity> = {};
      return {
        values,
        status: { ok: false, reasonKey: 'lab.f.rocket.err-input' },
        assumptions: ['lab.assume.equal-engines'],
      } satisfies FormulaResult;
    }
    const n = Math.ceil(thrustN / engineThrustN);
    const points: Vec2[] = [];
    for (let fe = 100000; fe <= 8000000.001; fe += 100000)
      points.push({ x: fe, y: Math.ceil(thrustN / fe) });
    return {
      values: { engineCount: { value: n, units: '' } },
      status: { ok: true },
      assumptions: ['lab.assume.equal-engines', 'lab.assume.sea-level-thrust'],
      figure: {
        kind: 'curve',
        provenance: { fidelity: 'computed', module: 'ascent/sizing' },
        assumptions: ['lab.assume.equal-engines'],
        x: { labelKey: 'lab.axis.per-engine', units: 'N' },
        y: { labelKey: 'lab.axis.engine-count', units: '' },
        series: [{ points }],
        marks: [
          { at: { x: engineThrustN, y: n }, labelKey: 'lab.mark.you-are-here', kind: 'point' },
        ],
      },
    } satisfies FormulaResult;
  },
};

/**
 * Staging (Scale-a-rocket rung 4) — why you can't reach orbit in one piece. A single
 * stage caps at Δv = v_e·ln(1/ε) (~8 km/s for a good stage) no matter how much fuel you
 * add — the structure you must carry sets the ceiling. Orbit needs ~9.4, so you stage:
 * drop the empty tank and the next stage starts fresh, its ceiling stacking on the first.
 * stages = ⌈Δv_required / ceiling⌉ (an ideal upper bound — real staging pays a little to
 * carry the upper stages).
 */
export const staging: FormulaDef<{ deltaVKms: number; ispS: number; structuralFraction: number }> =
  {
    id: 'staging',
    titleKey: 'lab.f.staging.title',
    domain: 'ascent',
    tier: 6,
    prereqs: ['rocket-sizing'],
    latex: 'N_{\\text{stages}} = \\lceil \\Delta v / (v_e\\ln(1/\\varepsilon)) \\rceil',
    inputs: [
      {
        key: 'deltaVKms',
        labelKey: 'lab.f.staging.dv',
        units: 'km/s',
        kind: 'number',
        default: 9.4,
        min: 1,
        max: 20,
      },
      {
        key: 'ispS',
        labelKey: 'lab.f.staging.isp',
        units: 's',
        kind: 'number',
        default: 350,
        min: 150,
        max: 470,
      },
      {
        key: 'structuralFraction',
        labelKey: 'lab.f.staging.eps',
        units: '',
        kind: 'number',
        default: 0.08,
        min: 0.02,
        max: 0.25,
        step: 0.01,
      },
    ],
    outputs: [
      { key: 'singleStageCeilingKms', labelKey: 'lab.f.staging.ceiling', units: 'km/s' },
      { key: 'stagesNeeded', labelKey: 'lab.f.staging.stages', units: '' },
    ],
    compute: ({ deltaVKms, ispS, structuralFraction: eps }) => {
      if (
        !Number.isFinite(deltaVKms) ||
        !Number.isFinite(ispS) ||
        !Number.isFinite(eps) ||
        deltaVKms <= 0 ||
        ispS <= 0 ||
        eps <= 0 ||
        eps >= 1
      ) {
        const values: Record<string, Quantity> = {};
        return {
          values,
          status: { ok: false, reasonKey: 'lab.f.rocket.err-input' },
          assumptions: ['lab.assume.ideal-staging'],
        } satisfies FormulaResult;
      }
      const ve = (ispS * G0) / 1000;
      const ceiling = ve * Math.log(1 / eps);
      const stages = Math.max(1, Math.ceil(deltaVKms / ceiling));
      const points: Vec2[] = [];
      for (let n = 1; n <= 4; n++) points.push({ x: n, y: n * ceiling });
      return {
        values: {
          singleStageCeilingKms: { value: ceiling, units: 'km/s' },
          stagesNeeded: { value: stages, units: '' },
        },
        status: { ok: true },
        assumptions: ['lab.assume.ideal-staging', 'lab.assume.equal-stages'],
        figure: {
          kind: 'curve',
          provenance: { fidelity: 'computed', module: 'ascent/sizing' },
          assumptions: ['lab.assume.ideal-staging'],
          x: { labelKey: 'lab.axis.stage-count', units: '' },
          y: { labelKey: 'lab.axis.dv', units: 'km/s' },
          series: [{ points }],
          marks: [
            { at: { x: stages, y: deltaVKms }, labelKey: 'lab.mark.you-are-here', kind: 'point' },
          ],
        },
      } satisfies FormulaResult;
    },
  };

/**
 * Booster count (Scale-a-rocket rung 5) — the other way to make thrust. When a heavy
 * payload leaves the core short of a liftoff TWR, you don't always add core engines — you
 * strap on parallel boosters (Ariane 5's two EAPs, Atlas V's 0–5 solids, Falcon Heavy's
 * two side cores, the Shuttle/SLS SRBs). boosters = ⌈(F_required − F_core)/F_booster⌉.
 * Wires the gross mass from sizing.
 */
export const boosterCount: FormulaDef<{
  grossMassKg: number;
  coreThrustN: number;
  boosterThrustN: number;
  liftoffTwr: number;
}> = {
  id: 'booster-count',
  titleKey: 'lab.f.boosters.title',
  domain: 'ascent',
  tier: 6,
  prereqs: ['liftoff-thrust'],
  latex: 'N_b = \\lceil (F_{\\text{req}} - F_{\\text{core}})/F_b \\rceil',
  inputs: [
    {
      key: 'grossMassKg',
      labelKey: 'lab.f.boosters.gross',
      units: 'kg',
      kind: 'number',
      default: 500000,
      min: 100,
      max: 4000000,
    },
    {
      key: 'coreThrustN',
      labelKey: 'lab.f.boosters.core',
      units: 'N',
      kind: 'number',
      default: 1000000,
      min: 0,
      max: 40000000,
    },
    {
      key: 'boosterThrustN',
      labelKey: 'lab.f.boosters.per-booster',
      units: 'N',
      kind: 'number',
      default: 4000000,
      min: 100000,
      max: 16000000,
    },
    {
      key: 'liftoffTwr',
      labelKey: 'lab.f.boosters.twr',
      units: '',
      kind: 'number',
      default: 1.3,
      min: 1,
      max: 3,
      step: 0.05,
    },
  ],
  outputs: [{ key: 'boostersNeeded', labelKey: 'lab.f.boosters.count', units: '' }],
  compute: ({ grossMassKg, coreThrustN, boosterThrustN, liftoffTwr }) => {
    if (
      !Number.isFinite(grossMassKg) ||
      !Number.isFinite(coreThrustN) ||
      !Number.isFinite(boosterThrustN) ||
      !Number.isFinite(liftoffTwr) ||
      grossMassKg <= 0 ||
      boosterThrustN <= 0 ||
      liftoffTwr < 1
    ) {
      const values: Record<string, Quantity> = {};
      return {
        values,
        status: { ok: false, reasonKey: 'lab.f.rocket.err-input' },
        assumptions: ['lab.assume.earth-launch'],
      } satisfies FormulaResult;
    }
    const requiredN = liftoffTwr * grossMassKg * G0;
    const shortfall = requiredN - coreThrustN;
    const boosters = shortfall <= 0 ? 0 : Math.ceil(shortfall / boosterThrustN);
    const points: Vec2[] = [];
    for (let m = 50000; m <= 3000000.001; m += 50000) {
      const s = liftoffTwr * m * G0 - coreThrustN;
      points.push({ x: m, y: s <= 0 ? 0 : Math.ceil(s / boosterThrustN) });
    }
    return {
      values: { boostersNeeded: { value: boosters, units: '' } },
      status: { ok: true },
      assumptions: ['lab.assume.earth-launch', 'lab.assume.at-liftoff'],
      figure: {
        kind: 'curve',
        provenance: { fidelity: 'computed', module: 'ascent/sizing' },
        assumptions: ['lab.assume.at-liftoff'],
        x: { labelKey: 'lab.axis.mass', units: 'kg' },
        y: { labelKey: 'lab.axis.booster-count', units: '' },
        series: [{ points }],
        marks: [
          { at: { x: grossMassKg, y: boosters }, labelKey: 'lab.mark.you-are-here', kind: 'point' },
        ],
      },
    } satisfies FormulaResult;
  },
};

/**
 * Cluster thrust (Scale-a-rocket finale) — run the whole chain on the biggest rocket ever
 * built. Total thrust is just N engines added up, F = N·F_engine, and whether it flies is
 * F vs the stack's weight: TWR = F/(m₀·g₀). Preset to Starship + Super Heavy — 33 Raptors,
 * ~76 MN, lifting a ~5,000-tonne stainless-steel stack at TWR ~1.5. The force diagram shows
 * the thrust beating the weight; the stainless-steel mass is rung-1's ε penalty made real.
 */
export const clusterThrust: FormulaDef<{
  engineCount: number;
  engineThrustN: number;
  grossMassKg: number;
}> = {
  id: 'cluster-thrust',
  titleKey: 'lab.f.cluster.title',
  domain: 'ascent',
  tier: 6,
  prereqs: ['engine-count'],
  latex: 'F = N\\,F_{\\text{engine}},\\quad \\text{TWR} = \\dfrac{F}{m_0\\,g_0}',
  inputs: [
    {
      key: 'engineCount',
      labelKey: 'lab.f.cluster.engines',
      units: '',
      kind: 'number',
      default: 33,
      min: 1,
      max: 40,
      step: 1,
    },
    {
      key: 'engineThrustN',
      labelKey: 'lab.f.cluster.per-engine',
      units: 'N',
      kind: 'number',
      default: 2300000,
      min: 50000,
      max: 8000000,
    },
    {
      key: 'grossMassKg',
      labelKey: 'lab.f.cluster.gross',
      units: 'kg',
      kind: 'number',
      default: 5000000,
      min: 1000,
      max: 6000000,
    },
  ],
  outputs: [
    { key: 'totalThrustN', labelKey: 'lab.f.cluster.total', units: 'N' },
    { key: 'liftoffTwr', labelKey: 'lab.f.cluster.twr', units: '' },
  ],
  compute: ({ engineCount, engineThrustN, grossMassKg }) => {
    if (
      !Number.isFinite(engineCount) ||
      !Number.isFinite(engineThrustN) ||
      !Number.isFinite(grossMassKg) ||
      engineCount < 1 ||
      engineThrustN <= 0 ||
      grossMassKg <= 0
    ) {
      const values: Record<string, Quantity> = {};
      return {
        values,
        status: { ok: false, reasonKey: 'lab.f.rocket.err-input' },
        assumptions: ['lab.assume.earth-launch'],
      } satisfies FormulaResult;
    }
    const total = engineCount * engineThrustN;
    const weight = grossMassKg * G0;
    const twr = total / weight;
    const base = {
      assumptions: [
        'lab.assume.earth-launch',
        'lab.assume.at-liftoff',
        'lab.assume.sea-level-thrust',
      ],
      figure: {
        kind: 'force-diagram' as const,
        provenance: { fidelity: 'computed' as const, module: 'ascent/sizing' },
        assumptions: ['lab.assume.at-liftoff'],
        bodyLabelKey: 'lab.body.rocket',
        vectors: [
          { labelKey: 'lab.vec.thrust', dir: { x: 0, y: 1 }, magN: total },
          { labelKey: 'lab.vec.weight', dir: { x: 0, y: -1 }, magN: weight },
        ],
      },
    };
    if (twr <= 1) {
      // Thrust doesn't beat weight — it can't leave the pad. Fail-honest.
      const values: Record<string, Quantity> = { totalThrustN: { value: total, units: 'N' } };
      return {
        values,
        status: { ok: false, reasonKey: 'lab.f.cluster.err-twr' },
        ...base,
      } satisfies FormulaResult;
    }
    return {
      values: {
        totalThrustN: { value: total, units: 'N' },
        liftoffTwr: { value: twr, units: '' },
      },
      status: { ok: true },
      ...base,
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
 * frame your speed can change by up to Δv = 2·v∞ — a full 180° reversal of your velocity
 * relative to the planet. The SIGN is geometry: pass behind the planet and it flings you
 * forward (a boost, what M6 uses to escape); pass in front and it slows you down — the same
 * slingshot run backwards (MESSENGER braked into Mercury, Parker keeps dropping at the Sun).
 * The magnitude here is the honest UPPER bound; real flybys turn less than 180°. A massive,
 * fast planet like Jupiter bends hardest, which is why the outer-system probes flew past it.
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
    return {
      values: { boost: { value: boost, units: 'km/s' } },
      status: { ok: true },
      assumptions: ['lab.assume.patched-conic', 'lab.assume.ideal-deflection'],
      figure: {
        kind: 'assist-turn',
        provenance: { fidelity: 'computed', module: 'mechanics/orbits' },
        assumptions: ['lab.assume.ideal-deflection'],
        vInfKms,
        turnDeg: 110, // a representative strong deflection (not the 180° ideal)
        boostKms: boost,
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

/**
 * Gravity-assist CHAIN (Family C synthesis) — the capstone move that makes a Grand Tour
 * possible. A single flyby can change heliocentric velocity by at most 2·v∞ (the M6
 * `gravity-assist` ceiling); a CHAIN of them stacks that gain flyby after flyby. This
 * emits an honest UPPER BOUND: cumulative Δv ≤ Σ 2·v∞, drawn as the staircase a mission
 * planner sketches. It is deliberately NOT a trajectory integration — real flybys vary in
 * v∞, never hit the 180° ideal, and the vectors do not add as scalars. Those four caveats
 * are the loud assumptions. The teaching payload: even this optimistic ceiling reveals a
 * chain delivers tens of km/s no chemical stage could — which is exactly why Voyager 2's
 * J→S→U→N tour, or Cassini's Venus-Venus-Earth-Jupiter run to Saturn, was flyable at all.
 */
export const assistChain: FormulaDef<{ flybys: number; vInfKms: number }> = {
  id: 'assist-chain',
  titleKey: 'lab.f.assistchain.title',
  domain: 'transfer',
  tier: 8,
  prereqs: ['gravity-assist'],
  latex: '\\Delta v_{\\max} \\le \\sum_{i=1}^{N} 2\\,v_{\\infty,i}',
  inputs: [
    {
      key: 'flybys',
      labelKey: 'lab.f.assistchain.flybys',
      units: '',
      kind: 'number',
      default: 4, // Voyager 2: Jupiter, Saturn, Uranus, Neptune
      min: 1,
      max: 8,
      step: 1,
    },
    {
      key: 'vInfKms',
      labelKey: 'lab.f.assistchain.vinf',
      units: 'km/s',
      kind: 'number',
      default: 10, // a representative outer-planet approach speed
      min: 0,
      max: 30,
    },
  ],
  outputs: [{ key: 'maxBoost', labelKey: 'lab.f.assistchain.total', units: 'km/s' }],
  compute: ({ flybys, vInfKms }) => {
    const n = Math.round(flybys);
    if (!Number.isFinite(vInfKms) || vInfKms < 0 || !Number.isFinite(flybys) || n < 1) {
      const values: Record<string, Quantity> = {};
      return {
        values,
        status: { ok: false, reasonKey: 'lab.f.escape.err-input' },
        assumptions: ['lab.assume.patched-conic'],
      } satisfies FormulaResult;
    }
    const perFlyby = 2 * vInfKms; // the ideal 180°-turn ceiling for one flyby
    const maxBoost = n * perFlyby; // cumulative UPPER BOUND — flybys do not add as scalars in reality
    const steps: { n: number; cumKms: number }[] = [];
    for (let i = 1; i <= n; i += 1) steps.push({ n: i, cumKms: i * perFlyby });
    return {
      values: { maxBoost: { value: maxBoost, units: 'km/s' } },
      status: { ok: true },
      assumptions: [
        'lab.assume.patched-conic',
        'lab.assume.ideal-deflection',
        'lab.assume.equal-vinf-chain',
        'lab.assume.upper-bound-sum',
      ],
      figure: {
        kind: 'assist-staircase',
        provenance: { fidelity: 'computed', module: 'mechanics/orbits' },
        assumptions: ['lab.assume.upper-bound-sum'],
        steps,
        perFlybyKms: perFlyby,
        totalKms: maxBoost,
      },
    } satisfies FormulaResult;
  },
};

// ─── Family B / G8 "Moon phases" — observe the sky ───────────────────────────

/**
 * Moon phase (Family B / G8) — the first "observe" goal. The GEOMETRY is first-principles:
 * the lit fraction is k = ½(1 + cos α), where α is the Sun–Moon–Earth phase angle (α = 0 is
 * full, 180° is new). The NUMBER is real: `moonPhase(date)` runs Orrery's geocentric ephemeris
 * for the chosen date, so the disc, the age since new moon, and the phase name match the actual
 * sky (hybrid precision, operator 2026-08-30). Introduces date inputs to the ladder.
 */
export const moonPhaseFormula: FormulaDef<{ dateIso: string }> = {
  id: 'moon-phase',
  titleKey: 'lab.f.moonphase.title',
  domain: 'ephemeris',
  tier: 2,
  prereqs: [],
  latex: 'k = \\tfrac12\\,(1 + \\cos\\alpha)',
  inputs: [
    {
      key: 'dateIso',
      labelKey: 'lab.f.moonphase.date',
      units: '',
      kind: 'date',
      default: '2026-08-30',
    },
  ],
  outputs: [
    { key: 'illuminatedPct', labelKey: 'lab.f.moonphase.illum', units: '' },
    { key: 'moonAgeDays', labelKey: 'lab.f.moonphase.age', units: 'day' },
  ],
  compute: ({ dateIso }) => {
    const d = new Date(String(dateIso));
    if (Number.isNaN(d.getTime())) {
      const values: Record<string, Quantity> = {};
      return {
        values,
        status: { ok: false, reasonKey: 'lab.f.moonphase.err-date' },
        assumptions: ['lab.assume.geocentric-moon'],
      } satisfies FormulaResult;
    }
    const ph = moonPhase(d);
    const ageDays = (ph.ageDeg / 360) * SYNODIC_MONTH_DAYS;
    return {
      values: {
        illuminatedPct: { value: ph.illuminatedFraction * 100, units: '' },
        moonAgeDays: { value: ageDays, units: 'day' },
      },
      status: { ok: true },
      assumptions: ['lab.assume.geocentric-moon', 'lab.assume.optical-only'],
      figure: {
        kind: 'moon-phase',
        provenance: { fidelity: 'computed', module: 'ephemeris/moon-observer' },
        assumptions: ['lab.assume.geocentric-moon'],
        illuminatedFraction: ph.illuminatedFraction,
        waxing: ph.waxing,
        phaseLabelKey: `lab.moon.phase.${ph.phaseName}`,
      },
    } satisfies FormulaResult;
  },
};

/** Mean Earth–Moon distance (AU) — the "100%" apparent-size reference for G8's supermoon. */
const MOON_MEAN_DISTANCE_AU = MOON_ORBIT_RADIUS_KM / AU_TO_KM;

/**
 * Moon distance & apparent size (G8 — the "supermoon" rung). The Moon's orbit is an ellipse, so
 * its distance swings ~356,500 km (perigee) to ~406,700 km (apogee) each month, and apparent
 * size goes as 1/distance. A full moon at perigee — a "supermoon" — looks ~14% wider and ~30%
 * brighter than one at apogee. Real geocentric distance for the date.
 */
export const moonDistance: FormulaDef<{ dateIso: string }> = {
  id: 'moon-distance',
  titleKey: 'lab.f.moondist.title',
  domain: 'ephemeris',
  tier: 2,
  prereqs: ['moon-phase'],
  latex: '\\text{size} \\propto 1/d',
  inputs: [
    {
      key: 'dateIso',
      labelKey: 'lab.f.moondist.date',
      units: '',
      kind: 'date',
      default: '2026-08-30',
    },
  ],
  outputs: [
    { key: 'distanceKm', labelKey: 'lab.f.moondist.distance', units: 'km' },
    { key: 'apparentSizePct', labelKey: 'lab.f.moondist.size', units: '' },
  ],
  compute: ({ dateIso }) => {
    const d = new Date(String(dateIso));
    if (Number.isNaN(d.getTime())) {
      const values: Record<string, Quantity> = {};
      return {
        values,
        status: { ok: false, reasonKey: 'lab.f.moonphase.err-date' },
        assumptions: ['lab.assume.geocentric-moon'],
      } satisfies FormulaResult;
    }
    const jd0 = julianDay(d);
    const distAu = geocentricMoon(jd0).distanceAu;
    const sizePct = (MOON_MEAN_DISTANCE_AU / distAu) * 100;
    const points: Vec2[] = [];
    for (let day = 0; day <= 60; day += 1) {
      points.push({ x: day, y: geocentricMoon(jd0 + day).distanceAu * AU_TO_KM });
    }
    return {
      values: {
        distanceKm: { value: distAu * AU_TO_KM, units: 'km' },
        apparentSizePct: { value: sizePct, units: '' },
      },
      status: { ok: true },
      assumptions: ['lab.assume.geocentric-moon', 'lab.assume.optical-only'],
      figure: {
        kind: 'curve',
        provenance: { fidelity: 'computed', module: 'ephemeris/moon' },
        assumptions: ['lab.assume.geocentric-moon'],
        x: { labelKey: 'lab.axis.days-ahead', units: 'day' },
        y: { labelKey: 'lab.axis.distance-km', units: 'km' },
        series: [{ points }],
        marks: [{ at: { x: 0, y: distAu * AU_TO_KM }, labelKey: 'lab.mark.today', kind: 'point' }],
      },
    } satisfies FormulaResult;
  },
};

/**
 * Eclipse seasons (G8 — why eclipses aren't monthly). An eclipse needs a syzygy (new moon for
 * solar, full for lunar) AND the Moon near a node — the two points where its 5.1°-tilted orbit
 * crosses the Sun's path. The Moon's ecliptic latitude β swings ±5.1° each month; only when a
 * syzygy lands inside the ~±1.5° eclipse limit can shadows line up. Since the Sun passes a node
 * only twice a year, eclipses cluster in two ~34-day "seasons" ~6 months apart, not every month.
 */
export const eclipseSeasons: FormulaDef<{ dateIso: string }> = {
  id: 'eclipse-seasons',
  titleKey: 'lab.f.eclipse.title',
  domain: 'ephemeris',
  tier: 3,
  prereqs: ['moon-phase'],
  latex: '|\\beta| < 1.5° \\Rightarrow \\text{eclipse possible}',
  inputs: [
    {
      key: 'dateIso',
      labelKey: 'lab.f.eclipse.date',
      units: '',
      kind: 'date',
      default: '2026-08-30',
    },
  ],
  outputs: [{ key: 'moonLatitudeDeg', labelKey: 'lab.f.eclipse.latitude', units: 'deg' }],
  compute: ({ dateIso }) => {
    const d = new Date(String(dateIso));
    if (Number.isNaN(d.getTime())) {
      const values: Record<string, Quantity> = {};
      return {
        values,
        status: { ok: false, reasonKey: 'lab.f.moonphase.err-date' },
        assumptions: ['lab.assume.geocentric-moon'],
      } satisfies FormulaResult;
    }
    const jd0 = julianDay(d);
    const betaAt = (j: number): number => {
      const m = geocentricMoon(j);
      return (Math.asin(Math.max(-1, Math.min(1, m.pos.z / m.distanceAu))) * 180) / Math.PI;
    };
    const beta = betaAt(jd0);
    const LIMIT = 1.5;
    const betaPts: Vec2[] = [];
    const hiPts: Vec2[] = [];
    const loPts: Vec2[] = [];
    for (let day = 0; day <= 70; day += 1) {
      betaPts.push({ x: day, y: betaAt(jd0 + day) });
      hiPts.push({ x: day, y: LIMIT });
      loPts.push({ x: day, y: -LIMIT });
    }
    return {
      values: { moonLatitudeDeg: { value: beta, units: 'deg' } },
      status: { ok: true },
      assumptions: ['lab.assume.geocentric-moon', 'lab.assume.eclipse-limit'],
      figure: {
        kind: 'curve',
        provenance: { fidelity: 'computed', module: 'ephemeris/moon' },
        assumptions: ['lab.assume.eclipse-limit'],
        x: { labelKey: 'lab.axis.days-ahead', units: 'day' },
        y: { labelKey: 'lab.axis.moon-latitude', units: 'deg' },
        series: [
          { labelKey: 'lab.series.moon-latitude', points: betaPts },
          { labelKey: 'lab.series.eclipse-limit', points: hiPts },
          { points: loPts },
        ],
        marks: [{ at: { x: 0, y: beta }, labelKey: 'lab.mark.today', kind: 'point' }],
      },
    } satisfies FormulaResult;
  },
};

/**
 * Moon altitude (G8 — the observer's payoff). Same as a planet: the Moon peaks as it crosses
 * the meridian at altitude 90° − |latitude − dec|, where dec is its declination that night. But
 * the Moon's declination swings ±(23.4° + 5.1°) ≈ ±28.5° over a month, so from mid-northern
 * latitudes a winter full moon rides high while a summer one skims low — the opposite of the Sun.
 */
export const moonAltitude: FormulaDef<{ dateIso: string; latitudeDeg: number }> = {
  id: 'moon-altitude',
  titleKey: 'lab.f.moonalt.title',
  domain: 'ephemeris',
  tier: 3,
  prereqs: ['moon-phase'],
  latex: 'h_{\\max} = 90° - |\\varphi - \\delta|',
  inputs: [
    {
      key: 'dateIso',
      labelKey: 'lab.f.moonalt.date',
      units: '',
      kind: 'date',
      default: '2026-08-30',
    },
    {
      key: 'latitudeDeg',
      labelKey: 'lab.f.moonalt.latitude',
      units: 'deg',
      kind: 'number',
      default: 40,
      min: -90,
      max: 90,
    },
  ],
  outputs: [{ key: 'culminationAltitudeDeg', labelKey: 'lab.f.moonalt.altitude', units: 'deg' }],
  compute: ({ dateIso, latitudeDeg }) => {
    const d = new Date(String(dateIso));
    if (Number.isNaN(d.getTime()) || !Number.isFinite(latitudeDeg)) {
      const values: Record<string, Quantity> = {};
      return {
        values,
        status: { ok: false, reasonKey: 'lab.f.moonphase.err-date' },
        assumptions: ['lab.assume.transit-altitude'],
      } satisfies FormulaResult;
    }
    const dec = skyPosition('moon', d, 0, 0).decDeg;
    const alt = 90 - Math.abs(latitudeDeg - dec);
    const points: Vec2[] = [];
    for (let lat = -90; lat <= 90.001; lat += 5)
      points.push({ x: lat, y: 90 - Math.abs(lat - dec) });
    return {
      values: { culminationAltitudeDeg: { value: alt, units: 'deg' } },
      status: { ok: true },
      assumptions: ['lab.assume.transit-altitude', 'lab.assume.point-observer'],
      figure: {
        kind: 'curve',
        provenance: { fidelity: 'computed', module: 'ephemeris/moon-observer' },
        assumptions: ['lab.assume.transit-altitude'],
        x: { labelKey: 'lab.axis.latitude', units: 'deg' },
        y: { labelKey: 'lab.axis.altitude', units: 'deg' },
        series: [{ points }],
        marks: [
          { at: { x: latitudeDeg, y: alt }, labelKey: 'lab.mark.you-are-here', kind: 'point' },
        ],
      },
    } satisfies FormulaResult;
  },
};

// ─── Family B / G10 "Choose an orbit" — regimes, geostationary, latency ───────

/** Bodies with a real "stationary" orbit worth teaching (fast rotators). */
const GEO_BODY_IDS = ['earth', 'mars'] as const;
/** Speed of light (km/s) — for signal-latency. */
const SPEED_OF_LIGHT_KMS = 299792.458;

/**
 * Orbit regime (G10 rung 1) — the altitude ⇄ speed ⇄ period trade every satellite designer
 * starts from. Circular speed v = √(µ/r) FALLS with altitude, and the period T = 2π√(r³/µ)
 * RISES: a 550 km Starlink laps the Earth in ~96 min, a 20 200 km GPS bird in ~12 h. Higher
 * means slower and longer — the reason low orbits give short passes and high orbits linger.
 */
export const orbitRegime: FormulaDef<{ body: string; altitudeKm: number }> = {
  id: 'orbit-regime',
  titleKey: 'lab.f.regime.title',
  domain: 'satellite',
  tier: 3,
  prereqs: ['orbital-velocity'],
  latex: 'v = \\sqrt{\\mu/r},\\quad T = 2\\pi\\sqrt{r^3/\\mu}',
  inputs: [
    {
      key: 'body',
      labelKey: 'lab.f.regime.body',
      units: '',
      kind: 'body',
      default: 'earth',
      bodyIds: [...ORBIT_BODY_IDS],
    },
    {
      key: 'altitudeKm',
      labelKey: 'lab.f.regime.altitude',
      units: 'km',
      kind: 'number',
      default: 550,
      min: 100,
      max: 50000,
    },
  ],
  outputs: [
    { key: 'speedKms', labelKey: 'lab.f.regime.speed', units: 'km/s' },
    { key: 'periodMin', labelKey: 'lab.f.regime.period', units: '' },
  ],
  compute: ({ body, altitudeKm }) => {
    const loc = locationModel(body);
    if (!loc) {
      const values: Record<string, Quantity> = {};
      return {
        values,
        status: { ok: false, reasonKey: 'lab.f.orbits.err-unknown-body' },
        assumptions: ['lab.assume.circular-orbits'],
      } satisfies FormulaResult;
    }
    if (!Number.isFinite(altitudeKm) || altitudeKm <= 0) {
      const values: Record<string, Quantity> = {};
      return {
        values,
        status: { ok: false, reasonKey: 'lab.f.descent.err-input' },
        assumptions: ['lab.assume.circular-orbits'],
      } satisfies FormulaResult;
    }
    const r = loc.rKm + altitudeKm;
    const v = circularVelocityKms(r, loc.muKm3s2);
    const periodMin = orbitalPeriodS(r, loc.muKm3s2) / 60;
    // Reference ring = the body's stationary orbit (period = sidereal day) — geostationary
    // for Earth, areostationary for Mars. Drawn faint so LEO/MEO read against it.
    const sidT = body === 'earth' ? SIDEREAL_DAY_MIN * 60 : Math.abs(loc.rotationHours) * 3600;
    const refAlt =
      sidT > 0 ? Math.cbrt((loc.muKm3s2 * sidT * sidT) / (4 * Math.PI * Math.PI)) - loc.rKm : 0;
    return {
      values: {
        speedKms: { value: v, units: 'km/s' },
        // minutes, but there's no 'min' Unit — carry '' (matching the output spec + the
        // ground-track wire partner), with "(min)" in the label (review G9 MINOR-1 fix).
        periodMin: { value: periodMin, units: '' },
      },
      status: { ok: true },
      assumptions: ['lab.assume.circular-orbits', 'lab.assume.point-mass'],
      figure: {
        kind: 'orbit',
        provenance: { fidelity: 'computed', module: 'mechanics/orbits' },
        assumptions: ['lab.assume.circular-orbits'],
        bodyRadiusKm: loc.rKm,
        altitudeKm,
        refAltitudeKm: refAlt > 0 ? refAlt : undefined,
        periodMin,
        speedKms: v,
        bodyLabelKey: `lab.body.${body}`,
      },
    } satisfies FormulaResult;
  },
};

/**
 * Geostationary altitude (G10 rung 2) — the one altitude where the period equals the planet's
 * SIDEREAL day, so the satellite hangs over a fixed spot: a = ∛(µT²/4π²), altitude = a − R. For
 * Earth (T = 23.93 h) that's ~35 786 km; Mars's areostationary orbit sits at ~17 000 km. It's
 * why every TV/weather satellite lives at one ring in the sky — point the dish once, done.
 */
export const geostationaryAltitude: FormulaDef<{ body: string }> = {
  id: 'geostationary-altitude',
  titleKey: 'lab.f.geo.title',
  domain: 'satellite',
  tier: 4,
  prereqs: ['orbit-regime'],
  latex: 'a = \\sqrt[3]{\\mu T^2 / 4\\pi^2}',
  inputs: [
    {
      key: 'body',
      labelKey: 'lab.f.geo.body',
      units: '',
      kind: 'body',
      default: 'earth',
      bodyIds: [...GEO_BODY_IDS],
    },
  ],
  outputs: [{ key: 'altitudeKm', labelKey: 'lab.f.geo.altitude', units: 'km' }],
  compute: ({ body }) => {
    const loc = locationModel(body);
    if (!loc || loc.rotationHours === 0) {
      const values: Record<string, Quantity> = {};
      return {
        values,
        status: { ok: false, reasonKey: 'lab.f.orbits.err-unknown-body' },
        assumptions: ['lab.assume.circular-orbits'],
      } satisfies FormulaResult;
    }
    // Sidereal day, seconds. Earth reads the canonical 23.9345 h (SIDEREAL_DAY_MIN, the same
    // day the ground-track formula uses) rather than the 2-dp 23.93 in the kinematics table, so
    // the two formulas agree to the km (review G10 MINOR-2).
    const T = body === 'earth' ? SIDEREAL_DAY_MIN * 60 : Math.abs(loc.rotationHours) * 3600;
    const a = Math.cbrt((loc.muKm3s2 * T * T) / (4 * Math.PI * Math.PI));
    const altitudeKm = a - loc.rKm;
    // curve: stationary altitude vs day length (faster spin → lower ring).
    const points: Vec2[] = [];
    for (let h = 6; h <= 48.001; h += 1) {
      const Th = h * 3600;
      points.push({
        x: h,
        y: Math.cbrt((loc.muKm3s2 * Th * Th) / (4 * Math.PI * Math.PI)) - loc.rKm,
      });
    }
    return {
      values: { altitudeKm: { value: altitudeKm, units: 'km' } },
      status: { ok: true },
      assumptions: ['lab.assume.circular-orbits', 'lab.assume.equatorial-orbit'],
      figure: {
        kind: 'curve',
        provenance: { fidelity: 'computed', module: 'mechanics/orbits' },
        assumptions: ['lab.assume.circular-orbits'],
        x: { labelKey: 'lab.axis.day-length', units: '' },
        y: { labelKey: 'lab.axis.altitude', units: 'km' },
        series: [{ points }],
        marks: [
          {
            at: { x: Math.abs(loc.rotationHours), y: altitudeKm },
            labelKey: 'lab.mark.you-are-here',
            kind: 'point',
          },
        ],
      },
    } satisfies FormulaResult;
  },
};

/**
 * Signal latency (G10 rung 3) — the price of altitude, in time. A radio signal to a satellite
 * and back covers twice the altitude at the speed of light: geostationary's ~35 786 km means a
 * ~0.24 s round trip (the lag on an old satellite phone call), while a 550 km Starlink shell is
 * under ~4 ms. Wire the geostationary altitude in and see why the megaconstellations went LOW.
 */
export const signalLatency: FormulaDef<{ altitudeKm: number }> = {
  id: 'signal-latency',
  titleKey: 'lab.f.latency.title',
  domain: 'satellite',
  tier: 4,
  prereqs: ['orbit-regime'],
  latex: '\\Delta t = 2h / c',
  inputs: [
    {
      key: 'altitudeKm',
      labelKey: 'lab.f.latency.altitude',
      units: 'km',
      kind: 'number',
      default: 35786,
      min: 100,
      max: 40000,
    },
  ],
  outputs: [{ key: 'roundTripMs', labelKey: 'lab.f.latency.rt', units: '' }],
  compute: ({ altitudeKm }) => {
    if (!Number.isFinite(altitudeKm) || altitudeKm <= 0) {
      const values: Record<string, Quantity> = {};
      return {
        values,
        status: { ok: false, reasonKey: 'lab.f.descent.err-input' },
        assumptions: ['lab.assume.straight-line-path'],
      } satisfies FormulaResult;
    }
    const rtMs = ((2 * altitudeKm) / SPEED_OF_LIGHT_KMS) * 1000;
    const points: Vec2[] = [];
    for (let alt = 200; alt <= 40000.001; alt += 1000) {
      points.push({ x: alt, y: ((2 * alt) / SPEED_OF_LIGHT_KMS) * 1000 });
    }
    return {
      values: { roundTripMs: { value: rtMs, units: '' } },
      status: { ok: true },
      assumptions: ['lab.assume.straight-line-path', 'lab.assume.vacuum-speed'],
      figure: {
        kind: 'curve',
        provenance: { fidelity: 'computed', module: 'satellite/latency' },
        assumptions: ['lab.assume.straight-line-path'],
        x: { labelKey: 'lab.axis.altitude', units: 'km' },
        y: { labelKey: 'lab.axis.latency-ms', units: '' },
        series: [{ points }],
        marks: [
          { at: { x: altitudeKm, y: rtMs }, labelKey: 'lab.mark.you-are-here', kind: 'point' },
        ],
      },
    } satisfies FormulaResult;
  },
};

/**
 * Sun-synchronous orbit (G10 — the J2 gem). Earth's equatorial bulge tugs an orbit's plane so
 * its ascending node drifts (Ω̇ = −(3/2)J2(R⊕/a)²n·cos i). Choose the inclination so that drift
 * exactly matches Earth's march around the Sun — 360° a year — and the orbit plane stays fixed
 * relative to the Sun, crossing every spot at the same LOCAL time forever. It works out to a
 * retrograde ~98° near-polar orbit, which is why nearly every imaging, weather and spy satellite
 * flies one. The nuisance that wrecks Kepler, turned into a tool.
 */
export const sunSynchronous: FormulaDef<{ altitudeKm: number }> = {
  id: 'sun-synchronous',
  titleKey: 'lab.f.sso.title',
  domain: 'satellite',
  tier: 5,
  prereqs: ['orbit-regime'],
  latex: '\\cos i = \\dfrac{-\\dot\\Omega_\\odot}{\\tfrac32 J_2 (R_\\oplus/a)^2\\,n}',
  inputs: [
    {
      key: 'altitudeKm',
      labelKey: 'lab.f.sso.altitude',
      units: 'km',
      kind: 'number',
      default: 700,
      min: 200,
      max: 2000,
    },
  ],
  outputs: [{ key: 'inclinationDeg', labelKey: 'lab.f.sso.inclination', units: 'deg' }],
  compute: ({ altitudeKm }) => {
    const inclAt = (alt: number): number | null => {
      const a = R_EARTH_EQ_KM + alt;
      const n = Math.sqrt(MU_EARTH_KM3_S2 / (a * a * a)); // rad/s
      const factor = 1.5 * J2_EARTH * (R_EARTH_EQ_KM / a) ** 2 * n;
      const cosI = -SOLAR_NODE_RATE_RAD_S / factor;
      return Math.abs(cosI) > 1 ? null : (Math.acos(cosI) * 180) / Math.PI;
    };
    const incl = Number.isFinite(altitudeKm) && altitudeKm > 0 ? inclAt(altitudeKm) : null;
    if (incl === null) {
      const values: Record<string, Quantity> = {};
      return {
        values,
        status: { ok: false, reasonKey: 'lab.f.sso.err-altitude' },
        assumptions: ['lab.assume.j2-secular'],
      } satisfies FormulaResult;
    }
    const points: Vec2[] = [];
    for (let alt = 200; alt <= 2000.001; alt += 50) {
      const i = inclAt(alt);
      if (i !== null) points.push({ x: alt, y: i });
    }
    return {
      values: { inclinationDeg: { value: incl, units: 'deg' } },
      status: { ok: true },
      assumptions: ['lab.assume.j2-secular', 'lab.assume.circular-orbits'],
      figure: {
        kind: 'curve',
        provenance: { fidelity: 'computed', module: 'satellite/j2' },
        assumptions: ['lab.assume.j2-secular'],
        x: { labelKey: 'lab.axis.altitude', units: 'km' },
        y: { labelKey: 'lab.axis.inclination', units: 'deg' },
        series: [{ points }],
        marks: [
          { at: { x: altitudeKm, y: incl }, labelKey: 'lab.mark.you-are-here', kind: 'point' },
        ],
      },
    } satisfies FormulaResult;
  },
};

/**
 * Frozen orbit / critical inclination (G10 — the OTHER J2 gem). The same bulge also swivels an
 * orbit's perigee (ω̇ ∝ 5cos²i − 1). At the "critical inclination" i = 63.4° that term vanishes,
 * so the perigee — and the apogee opposite it — stay put. That's the trick behind the Molniya
 * orbit: a steep, stretched ellipse whose apogee hovers for hours over the far north (Kepler's
 * 2nd law), where a geostationary satellite sits uselessly low. It's how the USSR — and Sirius
 * radio — served high latitudes a geostationary belt can't reach.
 */
export const frozenOrbit: FormulaDef<{ inclinationDeg: number }> = {
  id: 'frozen-orbit',
  titleKey: 'lab.f.frozen.title',
  domain: 'satellite',
  tier: 5,
  prereqs: ['orbit-regime'],
  latex: '\\dot\\omega \\propto 5\\cos^2 i - 1 = 0 \\Rightarrow i = 63.4°',
  inputs: [
    {
      key: 'inclinationDeg',
      labelKey: 'lab.f.frozen.inclination',
      units: 'deg',
      kind: 'number',
      default: 63.4,
      min: 0,
      max: 180,
    },
  ],
  outputs: [{ key: 'perigeeDriftDegPerDay', labelKey: 'lab.f.frozen.drift', units: 'deg' }],
  compute: ({ inclinationDeg }) => {
    if (!Number.isFinite(inclinationDeg)) {
      const values: Record<string, Quantity> = {};
      return {
        values,
        status: { ok: false, reasonKey: 'lab.f.descent.err-input' },
        assumptions: ['lab.assume.j2-secular'],
      } satisfies FormulaResult;
    }
    // A Molniya reference orbit (a≈26,600 km, e≈0.74): ω̇ = (3/4)·n·J2·(R⊕/p)²·(5cos²i−1).
    const a = 26600;
    const e = 0.74;
    const p = a * (1 - e * e);
    const n = Math.sqrt(MU_EARTH_KM3_S2 / (a * a * a));
    const driftAt = (iDeg: number): number => {
      const i = (iDeg * Math.PI) / 180;
      const rateRadS = 0.75 * n * J2_EARTH * (R_EARTH_EQ_KM / p) ** 2 * (5 * Math.cos(i) ** 2 - 1);
      return rateRadS * (180 / Math.PI) * 86400; // deg/day
    };
    const drift = driftAt(inclinationDeg);
    const points: Vec2[] = [];
    for (let iDeg = 0; iDeg <= 180.001; iDeg += 5) points.push({ x: iDeg, y: driftAt(iDeg) });
    return {
      values: { perigeeDriftDegPerDay: { value: drift, units: 'deg' } },
      status: { ok: true },
      assumptions: ['lab.assume.j2-secular', 'lab.assume.molniya-reference'],
      figure: {
        kind: 'curve',
        provenance: { fidelity: 'computed', module: 'satellite/j2' },
        assumptions: ['lab.assume.j2-secular'],
        x: { labelKey: 'lab.axis.inclination', units: 'deg' },
        y: { labelKey: 'lab.axis.perigee-drift', units: 'deg' },
        series: [{ points }],
        marks: [
          { at: { x: 63.4, y: 0 }, labelKey: 'lab.mark.critical-incl', kind: 'point' },
          { at: { x: inclinationDeg, y: drift }, labelKey: 'lab.mark.you-are-here', kind: 'point' },
        ],
      },
    } satisfies FormulaResult;
  },
};

/**
 * Constellation coverage (G10 — Starlink's thousands vs Clarke's three). A satellite at altitude
 * h sees the ground out to an Earth-central half-angle λ = arccos(R cos ε /(R+h)) − ε, for a min
 * usable elevation ε. Higher = a bigger footprint, so it takes FEWER satellites: three at
 * geostationary blanket the populated globe (Arthur C. Clarke's 1945 result), while a 550 km LEO
 * shell sees so little that global coverage needs thousands (Starlink, OneWeb). The equator-ring
 * count is a lower bound (≈ 180°/λ); full 3-D global coverage needs many such rings.
 */
export const constellationCoverage: FormulaDef<{ altitudeKm: number; minElevationDeg: number }> = {
  id: 'constellation-coverage',
  titleKey: 'lab.f.coverage.title',
  domain: 'satellite',
  tier: 4,
  prereqs: ['orbit-regime'],
  latex: '\\lambda = \\arccos\\!\\Big(\\tfrac{R\\cos\\varepsilon}{R+h}\\Big) - \\varepsilon',
  inputs: [
    {
      key: 'altitudeKm',
      labelKey: 'lab.f.coverage.altitude',
      units: 'km',
      kind: 'number',
      default: 550,
      min: 200,
      max: 40000,
    },
    {
      key: 'minElevationDeg',
      labelKey: 'lab.f.coverage.elevation',
      units: 'deg',
      kind: 'number',
      default: 25,
      min: 0,
      max: 60,
      step: 5,
    },
  ],
  outputs: [
    { key: 'coverageHalfAngleDeg', labelKey: 'lab.f.coverage.halfangle', units: 'deg' },
    { key: 'equatorRingSatellites', labelKey: 'lab.f.coverage.count', units: '' },
  ],
  compute: ({ altitudeKm, minElevationDeg }) => {
    if (
      !Number.isFinite(altitudeKm) ||
      !Number.isFinite(minElevationDeg) ||
      altitudeKm <= 0 ||
      minElevationDeg < 0 ||
      minElevationDeg >= 90
    ) {
      const values: Record<string, Quantity> = {};
      return {
        values,
        status: { ok: false, reasonKey: 'lab.f.descent.err-input' },
        assumptions: ['lab.assume.spherical-earth'],
      } satisfies FormulaResult;
    }
    const lambdaAt = (h: number): number => {
      const eps = (minElevationDeg * Math.PI) / 180;
      const inner = (R_EARTH_KM * Math.cos(eps)) / (R_EARTH_KM + h);
      return (Math.acos(Math.min(1, inner)) * 180) / Math.PI - minElevationDeg;
    };
    const lambda = lambdaAt(altitudeKm);
    const ring = Math.max(1, Math.ceil(180 / lambda));
    const points: Vec2[] = [];
    for (let h = 300; h <= 40000.001; h += 500) {
      points.push({ x: h, y: Math.max(1, Math.ceil(180 / lambdaAt(h))) });
    }
    return {
      values: {
        coverageHalfAngleDeg: { value: lambda, units: 'deg' },
        equatorRingSatellites: { value: ring, units: '' },
      },
      status: { ok: true },
      assumptions: ['lab.assume.spherical-earth', 'lab.assume.equatorial-ring'],
      figure: {
        kind: 'curve',
        provenance: { fidelity: 'computed', module: 'satellite/coverage' },
        assumptions: ['lab.assume.equatorial-ring'],
        x: { labelKey: 'lab.axis.altitude', units: 'km' },
        y: { labelKey: 'lab.axis.ring-count', units: '' },
        series: [{ points }],
        marks: [
          { at: { x: altitudeKm, y: ring }, labelKey: 'lab.mark.you-are-here', kind: 'point' },
        ],
      },
    } satisfies FormulaResult;
  },
};

/**
 * Launch azimuth (G10 — the bridge back to Family A). You can't reach just any orbit from just
 * any pad: the inclination can't be lower than your launch latitude, and the compass heading is
 * fixed by cos(azimuth) = cos i / cos φ. Launch due east (azimuth 90°) and you get an inclination
 * equal to your latitude — the cheapest orbit, which is why the ISS (51.6°) is served from
 * Baikonur's 46° and Cape's 28°. A sun-synchronous orbit is retrograde (i > 90°), so its azimuth
 * points SOUTH — which is exactly why SSO missions launch southward down the California coast.
 */
export const launchAzimuth: FormulaDef<{
  launchLatitudeDeg: number;
  targetInclinationDeg: number;
}> = {
  id: 'launch-azimuth',
  titleKey: 'lab.f.azimuth.title',
  domain: 'ascent',
  tier: 4,
  prereqs: ['launch-site'],
  latex: '\\cos A = \\cos i / \\cos\\varphi',
  inputs: [
    {
      key: 'launchLatitudeDeg',
      labelKey: 'lab.f.azimuth.latitude',
      units: 'deg',
      kind: 'number',
      default: 28.5,
      min: 0,
      max: 90,
    },
    {
      key: 'targetInclinationDeg',
      labelKey: 'lab.f.azimuth.inclination',
      units: 'deg',
      kind: 'number',
      default: 51.6,
      min: 0,
      max: 145,
    },
  ],
  outputs: [{ key: 'azimuthDeg', labelKey: 'lab.f.azimuth.azimuth', units: 'deg' }],
  compute: ({ launchLatitudeDeg, targetInclinationDeg }) => {
    if (!Number.isFinite(launchLatitudeDeg) || !Number.isFinite(targetInclinationDeg)) {
      const values: Record<string, Quantity> = {};
      return {
        values,
        status: { ok: false, reasonKey: 'lab.f.descent.err-input' },
        assumptions: ['lab.assume.non-rotating-launch'],
      } satisfies FormulaResult;
    }
    const phi = (launchLatitudeDeg * Math.PI) / 180;
    const cosA = Math.cos((targetInclinationDeg * Math.PI) / 180) / Math.cos(phi);
    if (Math.abs(cosA) > 1) {
      // inclination below the launch latitude — unreachable without a costly plane change.
      const values: Record<string, Quantity> = {};
      return {
        values,
        status: { ok: false, reasonKey: 'lab.f.azimuth.err-unreachable' },
        assumptions: ['lab.assume.non-rotating-launch'],
      } satisfies FormulaResult;
    }
    const azimuth = (Math.acos(cosA) * 180) / Math.PI;
    const points: Vec2[] = [];
    for (let iDeg = Math.ceil(launchLatitudeDeg); iDeg <= 145.001; iDeg += 2) {
      const c = Math.cos((iDeg * Math.PI) / 180) / Math.cos(phi);
      if (Math.abs(c) <= 1) points.push({ x: iDeg, y: (Math.acos(c) * 180) / Math.PI });
    }
    return {
      values: { azimuthDeg: { value: azimuth, units: 'deg' } },
      status: { ok: true },
      assumptions: ['lab.assume.non-rotating-launch', 'lab.assume.spherical-earth'],
      figure: {
        kind: 'curve',
        provenance: { fidelity: 'computed', module: 'ascent/azimuth' },
        assumptions: ['lab.assume.non-rotating-launch'],
        x: { labelKey: 'lab.axis.inclination', units: 'deg' },
        y: { labelKey: 'lab.axis.azimuth', units: 'deg' },
        series: [{ points }],
        marks: [
          {
            at: { x: targetInclinationDeg, y: azimuth },
            labelKey: 'lab.mark.you-are-here',
            kind: 'point',
          },
        ],
      },
    } satisfies FormulaResult;
  },
};

// ─── Family B / G9 "Catch the ISS" — track a satellite ───────────────────────

/**
 * Ground-track shift (G9 rung 1) — why the ISS never passes over the same place two orbits
 * running. In one orbital period the Earth turns beneath the orbit, so the ground track slides
 * west by Δλ = 360°·T/T⊕ — about 23° (≈2,500 km at the equator) for the ISS's ~92-min orbit. The
 * track itself is a sine: latitude swings between ±the inclination (±51.6° for the ISS), which is
 * why it reaches the latitudes it does and no further.
 */
export const groundTrackShift: FormulaDef<{ periodMin: number; inclinationDeg: number }> = {
  id: 'ground-track-shift',
  titleKey: 'lab.f.gtrack.title',
  domain: 'satellite',
  tier: 4,
  prereqs: ['orbit-regime'],
  latex: '\\Delta\\lambda = 360°\\,T / T_\\oplus',
  inputs: [
    {
      key: 'periodMin',
      labelKey: 'lab.f.gtrack.period',
      units: '',
      kind: 'number',
      default: 92,
      min: 60,
      max: 1500,
    },
    {
      key: 'inclinationDeg',
      labelKey: 'lab.f.gtrack.incl',
      units: 'deg',
      kind: 'number',
      default: 51.6,
      min: 0,
      max: 90,
    },
  ],
  outputs: [{ key: 'shiftDeg', labelKey: 'lab.f.gtrack.shift', units: 'deg' }],
  compute: ({ periodMin, inclinationDeg }) => {
    if (
      !Number.isFinite(periodMin) ||
      !Number.isFinite(inclinationDeg) ||
      periodMin <= 0 ||
      inclinationDeg < 0
    ) {
      const values: Record<string, Quantity> = {};
      return {
        values,
        status: { ok: false, reasonKey: 'lab.f.descent.err-input' },
        assumptions: ['lab.assume.spherical-earth'],
      } satisfies FormulaResult;
    }
    const shift = (360 * periodMin) / SIDEREAL_DAY_MIN;
    const incl = Math.min(90, inclinationDeg);
    // Three successive orbits, each a sine capped at ±inclination and shifted WEST by the drift —
    // so the same latitudes reappear further west each lap (review G9: draw the march, not just
    // the shape). Orbit 0 spans 0–360°; orbit k is offset left by k·shift.
    const orbit = (k: number): { points: Vec2[] } => {
      const points: Vec2[] = [];
      for (let deg = 0; deg <= 360.001; deg += 5) {
        points.push({ x: deg - k * shift, y: incl * Math.sin((deg * Math.PI) / 180) });
      }
      return { points };
    };
    return {
      values: { shiftDeg: { value: shift, units: 'deg' } },
      status: { ok: true },
      assumptions: ['lab.assume.spherical-earth', 'lab.assume.circular-orbits'],
      figure: {
        kind: 'ground-track',
        provenance: { fidelity: 'computed', module: 'satellite/ground-track' },
        assumptions: ['lab.assume.spherical-earth'],
        tracks: [orbit(0).points, orbit(1).points, orbit(2).points],
        inclinationDeg: incl,
        shiftDeg: shift,
      },
    } satisfies FormulaResult;
  },
};

/**
 * Visibility window (G9 rung 2) — when you can actually catch it. You see the ISS only when it
 * is still in sunlight while your own sky has gone dark. A satellite at altitude h stays sunlit
 * until the Sun drops θ = arccos(R/(R+h)) below the SUB-SATELLITE horizon (≈ yours when the pass
 * is near overhead) — about 20° for the ISS, a bit past the end of astronomical twilight. So the
 * ISS is a naked-eye object for a couple of hours after dusk and before dawn, gliding over while
 * the ground below is already night. (Refraction, penumbra, and low-pass geometry are ignored.)
 */
export const visibilityWindow: FormulaDef<{ altitudeKm: number }> = {
  id: 'visibility-window',
  titleKey: 'lab.f.viswin.title',
  domain: 'satellite',
  tier: 4,
  prereqs: ['orbit-regime'],
  latex: '\\theta = \\arccos\\!\\big(R/(R+h)\\big)',
  inputs: [
    {
      key: 'altitudeKm',
      labelKey: 'lab.f.viswin.altitude',
      units: 'km',
      kind: 'number',
      default: 420,
      min: 100,
      max: 40000,
    },
  ],
  outputs: [{ key: 'maxSunDepressionDeg', labelKey: 'lab.f.viswin.depression', units: 'deg' }],
  compute: ({ altitudeKm }) => {
    if (!Number.isFinite(altitudeKm) || altitudeKm <= 0) {
      const values: Record<string, Quantity> = {};
      return {
        values,
        status: { ok: false, reasonKey: 'lab.f.descent.err-input' },
        assumptions: ['lab.assume.spherical-earth'],
      } satisfies FormulaResult;
    }
    const theta = Math.acos(R_EARTH_KM / (R_EARTH_KM + altitudeKm)) * (180 / Math.PI);
    const points: Vec2[] = [];
    for (let alt = 100; alt <= 2000.001; alt += 50) {
      points.push({ x: alt, y: Math.acos(R_EARTH_KM / (R_EARTH_KM + alt)) * (180 / Math.PI) });
    }
    return {
      values: { maxSunDepressionDeg: { value: theta, units: 'deg' } },
      status: { ok: true },
      assumptions: [
        'lab.assume.spherical-earth',
        'lab.assume.point-observer',
        'lab.assume.satellite-overhead',
      ],
      figure: {
        kind: 'curve',
        provenance: { fidelity: 'computed', module: 'satellite/visibility' },
        assumptions: ['lab.assume.spherical-earth'],
        x: { labelKey: 'lab.axis.altitude', units: 'km' },
        y: { labelKey: 'lab.axis.depression', units: 'deg' },
        series: [{ points }],
        marks: [
          { at: { x: altitudeKm, y: theta }, labelKey: 'lab.mark.you-are-here', kind: 'point' },
        ],
      },
    } satisfies FormulaResult;
  },
};

/**
 * Next ISS pass (G9 finale) — the payoff the goal is named for: from YOUR latitude/longitude,
 * when does the station next fly over, how high, and from which direction? This one is NOT a
 * closed form — it propagates a real published two-line element set (Kepler + secular J2) and
 * scans for the next pass clearing 10°. Honest cost: the bundled element set has a FIXED epoch
 * (~2026-07-20), so accuracy is good only for a few days around it — for tonight's real pass, a
 * live tracker (or NASA's "Spot the Station") pulls a fresh TLE. Here it's the mechanism, live.
 */
export const issPass: FormulaDef<{ latitudeDeg: number; longitudeDeg: number; dateIso: string }> = {
  id: 'iss-pass',
  titleKey: 'lab.f.isspass.title',
  domain: 'satellite',
  tier: 5,
  prereqs: ['visibility-window'],
  latex: '\\text{propagate TLE} \\rightarrow \\text{next pass} > 10°',
  inputs: [
    {
      key: 'latitudeDeg',
      labelKey: 'lab.f.isspass.latitude',
      units: 'deg',
      kind: 'number',
      default: 40,
      min: -80,
      max: 80,
    },
    {
      key: 'longitudeDeg',
      labelKey: 'lab.f.isspass.longitude',
      units: 'deg',
      kind: 'number',
      default: -74,
      min: -180,
      max: 180,
    },
    {
      key: 'dateIso',
      labelKey: 'lab.f.isspass.date',
      units: '',
      kind: 'date',
      default: '2026-07-21',
    },
  ],
  outputs: [
    { key: 'minutesUntilPass', labelKey: 'lab.f.isspass.minutes', units: '' },
    { key: 'maxAltitudeDeg', labelKey: 'lab.f.isspass.maxalt', units: 'deg' },
    { key: 'startAzimuthDeg', labelKey: 'lab.f.isspass.azimuth', units: 'deg' },
  ],
  compute: ({ latitudeDeg, longitudeDeg, dateIso }) => {
    const from = new Date(String(dateIso));
    if (
      !Number.isFinite(latitudeDeg) ||
      !Number.isFinite(longitudeDeg) ||
      Number.isNaN(from.getTime())
    ) {
      const values: Record<string, Quantity> = {};
      return {
        values,
        status: { ok: false, reasonKey: 'lab.f.isspass.err-input' },
        assumptions: ['lab.assume.snapshot-tle'],
      } satisfies FormulaResult;
    }
    const iss = (stationTles as Record<string, { name: string; line1: string; line2: string }>).iss;
    const tle = parseTle(iss.line1, iss.line2, iss.name);
    const pass = nextPassForTle(tle, from, latitudeDeg, longitudeDeg, {
      hoursAhead: 48,
      minMaxAltDeg: 10,
    });
    if (!pass) {
      const values: Record<string, Quantity> = {};
      return {
        values,
        status: { ok: false, reasonKey: 'lab.f.isspass.err-none' },
        assumptions: ['lab.assume.snapshot-tle', 'lab.assume.kepler-j2'],
      } satisfies FormulaResult;
    }
    const minutes = (pass.start.getTime() - from.getTime()) / 60000;
    return {
      values: {
        minutesUntilPass: { value: minutes, units: '' },
        maxAltitudeDeg: { value: pass.maxAltitudeDeg, units: 'deg' },
        startAzimuthDeg: { value: pass.startAzimuthDeg, units: 'deg' },
      },
      status: { ok: true },
      assumptions: ['lab.assume.snapshot-tle', 'lab.assume.kepler-j2'],
    } satisfies FormulaResult;
  },
};

// ─── Family B / G7 "Observe the sky" — planet visibility ─────────────────────

/** Planets a naked-eye observer chases (skip the ice giants — telescope-only). */
const OBSERVE_PLANETS = ['mercury', 'venus', 'mars', 'jupiter', 'saturn'] as const;
/** Orbital eccentricities (J2000) — Mercury's 0.21 is why its elongations swing so widely. */
const PLANET_ECCENTRICITY: Record<string, number> = {
  mercury: 0.2056,
  venus: 0.0068,
  mars: 0.0934,
  jupiter: 0.0489,
  saturn: 0.0565,
};
/** Wrap a longitude difference to (−180, 180]. */
const norm180 = (deg: number): number => ((((deg + 180) % 360) + 360) % 360) - 180;

/**
 * Planet elongation (G7 rung 1) — where a planet is relative to the Sun, which is the whole
 * game in "when can I see it". Elongation ε = λ_planet − λ_Sun (their ecliptic-longitude gap):
 * near 0° the planet is lost in the glare (conjunction); east of the Sun (ε > 0) it sets after
 * it in the evening sky; west (ε < 0) it rises before it at dawn; near ±180° an outer planet is
 * opposite the Sun, up all night (opposition). Real geocentric ephemeris for the chosen date.
 */
export const planetElongation: FormulaDef<{ planet: string; dateIso: string }> = {
  id: 'planet-elongation',
  titleKey: 'lab.f.elong.title',
  domain: 'ephemeris',
  tier: 3,
  prereqs: [],
  latex: '\\varepsilon = \\lambda_{\\text{planet}} - \\lambda_\\odot',
  inputs: [
    {
      key: 'planet',
      labelKey: 'lab.f.elong.planet',
      units: '',
      kind: 'enum',
      default: 'venus',
      enumValues: OBSERVE_PLANETS.map((pl) => ({ value: pl, labelKey: `lab.body.${pl}` })),
    },
    {
      key: 'dateIso',
      labelKey: 'lab.f.elong.date',
      units: '',
      kind: 'date',
      default: '2026-08-30',
    },
  ],
  outputs: [{ key: 'elongationDeg', labelKey: 'lab.f.elong.elongation', units: 'deg' }],
  compute: ({ planet, dateIso }) => {
    const d = new Date(String(dateIso));
    if (!HELIO_ORBIT_AU[planet] || Number.isNaN(d.getTime())) {
      const values: Record<string, Quantity> = {};
      return {
        values,
        status: { ok: false, reasonKey: 'lab.f.moonphase.err-date' },
        assumptions: ['lab.assume.ecliptic-longitude'],
      } satisfies FormulaResult;
    }
    const id = planet as Exclude<PlanetId, 'earth'>;
    const jd = julianDay(d);
    const elongAt = (j: number): number => {
      const p = geocentricPlanet(id, j);
      const s = geocentricSun(j);
      const lamP = (Math.atan2(p.y, p.x) * 180) / Math.PI;
      const lamS = (Math.atan2(s.y, s.x) * 180) / Math.PI;
      return norm180(lamP - lamS);
    };
    const elong = elongAt(jd);
    const a = HELIO_ORBIT_AU[planet];
    return {
      values: { elongationDeg: { value: elong, units: 'deg' } },
      status: { ok: true },
      assumptions: ['lab.assume.ecliptic-longitude', 'lab.assume.point-mass'],
      figure: {
        kind: 'sky-chart',
        provenance: { fidelity: 'computed', module: 'ephemeris/planets' },
        assumptions: ['lab.assume.ecliptic-longitude'],
        elongationDeg: Math.abs(elong),
        eastern: elong >= 0, // planet east of the Sun → sets after it → evening star
        planetLabelKey: `lab.body.${planet}`,
        // inner planets (a < 1 AU) cap their elongation; use the SAME eccentric limit the
        // max-elongation rung teaches — arcsin(a(1+e)) at aphelion (Mercury ~27.8°, not the
        // circular 22.8°) — so the drawn wall never contradicts rung 2. Outer planets: no cap.
        maxElongationDeg:
          a < 1
            ? (Math.asin(Math.min(1, a * (1 + (PLANET_ECCENTRICITY[planet] ?? 0)))) * 180) / Math.PI
            : undefined,
      },
    } satisfies FormulaResult;
  },
};

/**
 * Maximum elongation (G7 rung 2) — why Mercury and Venus never stray far from the Sun. A planet
 * inside Earth's orbit (a < 1 AU) can only reach ε_max = arcsin(a/a⊕): Venus tops out at ~46°,
 * Mercury at only ~23°, so they are always a morning or evening object, never overhead at
 * midnight. A planet OUTSIDE Earth's orbit has no such limit — it can swing all the way to 180°,
 * opposition, and ride the sky all night. That one inequality sorts the naked-eye planets in two.
 */
export const maxElongation: FormulaDef<{ planet: string }> = {
  id: 'max-elongation',
  titleKey: 'lab.f.maxelong.title',
  domain: 'ephemeris',
  tier: 3,
  prereqs: ['planet-elongation'],
  latex: '\\varepsilon_{\\max} = \\arcsin\\!\\big(a(1+e)\\big)\\ \\ (a<1)',
  inputs: [
    {
      key: 'planet',
      labelKey: 'lab.f.maxelong.planet',
      units: '',
      kind: 'enum',
      default: 'venus',
      enumValues: OBSERVE_PLANETS.map((pl) => ({ value: pl, labelKey: `lab.body.${pl}` })),
    },
  ],
  outputs: [
    { key: 'greatestElongationDeg', labelKey: 'lab.f.maxelong.greatest', units: 'deg' },
    { key: 'leastElongationDeg', labelKey: 'lab.f.maxelong.least', units: 'deg' },
  ],
  compute: ({ planet }) => {
    const a = HELIO_ORBIT_AU[planet];
    if (!a) {
      const values: Record<string, Quantity> = {};
      return {
        values,
        status: { ok: false, reasonKey: 'lab.f.orbits.err-unknown-body' },
        assumptions: ['lab.assume.elliptical-orbit'],
      } satisfies FormulaResult;
    }
    const e = PLANET_ECCENTRICITY[planet] ?? 0;
    // An inner planet's greatest elongation happens at APHELION (a(1+e)), the least at
    // perihelion (a(1−e)) — Mercury's e=0.21 spreads it 18°→28°, not one arcsin(a). An
    // outer planet reaches opposition either way (180°).
    const asinDeg = (x: number): number => (Math.asin(Math.min(1, x)) * 180) / Math.PI;
    const greatest = a < 1 ? asinDeg(a * (1 + e)) : 180;
    const least = a < 1 ? asinDeg(a * (1 - e)) : 180;
    const points: Vec2[] = [];
    for (let r = 0.1; r <= 5.001; r += 0.1) points.push({ x: r, y: r < 1 ? asinDeg(r) : 180 });
    const marks =
      a < 1
        ? [
            {
              at: { x: a * (1 + e), y: greatest },
              labelKey: 'lab.mark.aphelion',
              kind: 'point' as const,
            },
            {
              at: { x: a * (1 - e), y: least },
              labelKey: 'lab.mark.perihelion',
              kind: 'point' as const,
            },
          ]
        : [{ at: { x: a, y: 180 }, labelKey: 'lab.mark.opposition', kind: 'point' as const }];
    return {
      values: {
        greatestElongationDeg: { value: greatest, units: 'deg' },
        leastElongationDeg: { value: least, units: 'deg' },
      },
      status: { ok: true },
      assumptions: ['lab.assume.elliptical-orbit', 'lab.assume.coplanar'],
      figure: {
        kind: 'curve',
        provenance: { fidelity: 'computed', module: 'ephemeris/planets' },
        assumptions: ['lab.assume.elliptical-orbit'],
        x: { labelKey: 'lab.axis.orbit-radius', units: 'AU' },
        y: { labelKey: 'lab.axis.max-elongation', units: 'deg' },
        series: [{ points }],
        marks,
      },
    } satisfies FormulaResult;
  },
};

/**
 * Retrograde motion (G7 rung 3) — the phenomenon that broke the geocentric model, falling
 * straight out of the geometry above. Track a planet's apparent longitude in our sky and most
 * of the time it drifts eastward (prograde, dλ/dt > 0). But for a few months around opposition
 * an outer planet appears to REVERSE, looping westward (dλ/dt < 0) — not because it slows, but
 * because faster Earth OVERTAKES it on the inside track. Inner planets do the same near inferior
 * conjunction. The rate crossing zero marks the "stationary" points that bracket the loop.
 */
export const retrogradeMotion: FormulaDef<{ planet: string; dateIso: string }> = {
  id: 'retrograde-motion',
  titleKey: 'lab.f.retro.title',
  domain: 'ephemeris',
  tier: 3,
  prereqs: ['planet-elongation'],
  latex: '\\dot\\lambda < 0 \\Rightarrow \\text{retrograde}',
  inputs: [
    {
      key: 'planet',
      labelKey: 'lab.f.retro.planet',
      units: '',
      kind: 'enum',
      default: 'mars',
      enumValues: OBSERVE_PLANETS.map((pl) => ({ value: pl, labelKey: `lab.body.${pl}` })),
    },
    {
      key: 'dateIso',
      labelKey: 'lab.f.retro.date',
      units: '',
      kind: 'date',
      default: '2026-08-30',
    },
  ],
  outputs: [{ key: 'apparentRateDegPerDay', labelKey: 'lab.f.retro.rate', units: 'deg' }],
  compute: ({ planet, dateIso }) => {
    const d = new Date(String(dateIso));
    if (!HELIO_ORBIT_AU[planet] || Number.isNaN(d.getTime())) {
      const values: Record<string, Quantity> = {};
      return {
        values,
        status: { ok: false, reasonKey: 'lab.f.moonphase.err-date' },
        assumptions: ['lab.assume.ecliptic-longitude'],
      } satisfies FormulaResult;
    }
    const id = planet as Exclude<PlanetId, 'earth'>;
    const jd0 = julianDay(d);
    // Apparent geocentric longitude rate (°/day) via a central difference; norm180 the step so a
    // 0°/360° wrap doesn't fake a huge rate.
    const rateAt = (j: number): number => {
      const before = geocentricPlanet(id, j - 1);
      const after = geocentricPlanet(id, j + 1);
      const lamB = (Math.atan2(before.y, before.x) * 180) / Math.PI;
      const lamA = (Math.atan2(after.y, after.x) * 180) / Math.PI;
      return norm180(lamA - lamB) / 2;
    };
    const rate = rateAt(jd0);
    const points: Vec2[] = [];
    for (let day = 0; day <= 780; day += 6) points.push({ x: day, y: rateAt(jd0 + day) });
    return {
      values: { apparentRateDegPerDay: { value: rate, units: 'deg' } },
      status: { ok: true },
      assumptions: ['lab.assume.ecliptic-longitude', 'lab.assume.point-mass'],
      figure: {
        kind: 'curve',
        provenance: { fidelity: 'computed', module: 'ephemeris/planets' },
        assumptions: ['lab.assume.ecliptic-longitude'],
        x: { labelKey: 'lab.axis.days-ahead', units: 'day' },
        y: { labelKey: 'lab.axis.apparent-rate', units: 'deg' },
        series: [{ points }],
        marks: [{ at: { x: 0, y: rate }, labelKey: 'lab.mark.today', kind: 'point' }],
      },
    } satisfies FormulaResult;
  },
};

/**
 * Sky altitude (G7 rung 4) — the practical payoff: from YOUR latitude, how high does a planet
 * climb? At its best (crossing the meridian) a body reaches altitude 90° − |latitude − dec|,
 * where dec is its declination that night. A planet whose declination matches your latitude
 * passes overhead; one far to the other side barely clears the horizon (or never rises, a
 * negative answer). It's why the same planet is a glorious high target from one hemisphere and
 * a low, murky one from the other.
 */
export const planetAltitude: FormulaDef<{ planet: string; dateIso: string; latitudeDeg: number }> =
  {
    id: 'planet-altitude',
    titleKey: 'lab.f.skyalt.title',
    domain: 'ephemeris',
    tier: 3,
    prereqs: ['planet-elongation'],
    latex: 'h_{\\max} = 90° - |\\varphi - \\delta|',
    inputs: [
      {
        key: 'planet',
        labelKey: 'lab.f.skyalt.planet',
        units: '',
        kind: 'enum',
        default: 'jupiter',
        enumValues: OBSERVE_PLANETS.map((pl) => ({ value: pl, labelKey: `lab.body.${pl}` })),
      },
      {
        key: 'dateIso',
        labelKey: 'lab.f.skyalt.date',
        units: '',
        kind: 'date',
        default: '2026-08-30',
      },
      {
        key: 'latitudeDeg',
        labelKey: 'lab.f.skyalt.latitude',
        units: 'deg',
        kind: 'number',
        default: 40,
        min: -90,
        max: 90,
      },
    ],
    outputs: [{ key: 'culminationAltitudeDeg', labelKey: 'lab.f.skyalt.altitude', units: 'deg' }],
    compute: ({ planet, dateIso, latitudeDeg }) => {
      const d = new Date(String(dateIso));
      if (!HELIO_ORBIT_AU[planet] || Number.isNaN(d.getTime()) || !Number.isFinite(latitudeDeg)) {
        const values: Record<string, Quantity> = {};
        return {
          values,
          status: { ok: false, reasonKey: 'lab.f.moonphase.err-date' },
          assumptions: ['lab.assume.transit-altitude'],
        } satisfies FormulaResult;
      }
      const dec = skyPosition(planet as Exclude<PlanetId, 'earth'>, d, 0, 0).decDeg;
      const alt = 90 - Math.abs(latitudeDeg - dec);
      const points: Vec2[] = [];
      for (let lat = -90; lat <= 90.001; lat += 5)
        points.push({ x: lat, y: 90 - Math.abs(lat - dec) });
      return {
        values: { culminationAltitudeDeg: { value: alt, units: 'deg' } },
        status: { ok: true },
        assumptions: ['lab.assume.transit-altitude', 'lab.assume.point-observer'],
        figure: {
          kind: 'curve',
          provenance: { fidelity: 'computed', module: 'ephemeris/planets' },
          assumptions: ['lab.assume.transit-altitude'],
          x: { labelKey: 'lab.axis.latitude', units: 'deg' },
          y: { labelKey: 'lab.axis.altitude', units: 'deg' },
          series: [{ points }],
          marks: [
            { at: { x: latitudeDeg, y: alt }, labelKey: 'lab.mark.you-are-here', kind: 'point' },
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
  [launchSite.id, launchSite],
  [dvToOrbit.id, dvToOrbit],
  [reachOrbitVerdict.id, reachOrbitVerdict],
  [rocketSizing.id, rocketSizing],
  [liftoffThrust.id, liftoffThrust],
  [engineCount.id, engineCount],
  [staging.id, staging],
  [boosterCount.id, boosterCount],
  [clusterThrust.id, clusterThrust],
  [orbitalVelocity.id, orbitalVelocity],
  [visVivaFormula.id, visVivaFormula],
  [hohmannFormula.id, hohmannFormula],
  [descentBurn.id, descentBurn],
  [interplanetaryTransfer.id, interplanetaryTransfer],
  [launchWindow.id, launchWindow],
  [porkchop.id, porkchop],
  [cislunarTransfer.id, cislunarTransfer],
  [ascentToOrbit.id, ascentToOrbit],
  [ascentGuidance.id, ascentGuidance],
  [poweredDescent.id, poweredDescent],
  [entrySteering.id, entrySteering],
  [entryRangeControl.id, entryRangeControl],
  [terminalVelocity.id, terminalVelocity],
  [softLandingCheck.id, softLandingCheck],
  [airbagsCheck.id, airbagsCheck],
  [retroDescent.id, retroDescent],
  [deorbitBurn.id, deorbitBurn],
  [entryHeating.id, entryHeating],
  [entryCorridor.id, entryCorridor],
  [microGSurface.id, microGSurface],
  [touchdownBounce.id, touchdownBounce],
  [solarEscapeVelocity.id, solarEscapeVelocity],
  [heliocentricEscapeDv.id, heliocentricEscapeDv],
  [oberthDepartureDv.id, oberthDepartureDv],
  [gravityAssist.id, gravityAssist],
  [escapeVerdict.id, escapeVerdict],
  [assistChain.id, assistChain],
  [moonPhaseFormula.id, moonPhaseFormula],
  [moonDistance.id, moonDistance],
  [eclipseSeasons.id, eclipseSeasons],
  [moonAltitude.id, moonAltitude],
  [orbitRegime.id, orbitRegime],
  [geostationaryAltitude.id, geostationaryAltitude],
  [signalLatency.id, signalLatency],
  [sunSynchronous.id, sunSynchronous],
  [frozenOrbit.id, frozenOrbit],
  [constellationCoverage.id, constellationCoverage],
  [launchAzimuth.id, launchAzimuth],
  [groundTrackShift.id, groundTrackShift],
  [visibilityWindow.id, visibilityWindow],
  [issPass.id, issPass],
  [planetElongation.id, planetElongation],
  [maxElongation.id, maxElongation],
  [retrogradeMotion.id, retrogradeMotion],
  [planetAltitude.id, planetAltitude],
]);

/** Default input record for a formula (drives a first compute / the invariant tests). */
export function defaultInputs(def: FormulaDef): Record<string, number | string> {
  return Object.fromEntries(def.inputs.map((f) => [f.key, f.default]));
}
