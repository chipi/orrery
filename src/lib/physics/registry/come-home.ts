/** "Come home" formulas: deorbit burn, entry heating, entry corridor. */
import type { FormulaDef, FormulaResult, Vec2, Quantity } from '../spec';
import { circularVelocityKms, visVivaKms } from '../mechanics/orbits';
import { locationModel } from '../util/location';
import { G0 } from '../util/constants';
import { ORBIT_BODY_IDS } from './shared';

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
  inWordsKey: 'lab.f.deorbit.in-words',
  citationKey: 'mission-phases/deorbit-corridor',
  learnMore: { url: 'https://en.wikipedia.org/wiki/Atmospheric_entry', source: 'wikipedia' },
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
  inWordsKey: 'lab.f.entry.in-words',
  citationKey: 'mission-phases/entry-heating',
  learnMore: {
    url: 'https://en.wikipedia.org/wiki/Atmospheric_entry#Entry_heating',
    source: 'wikipedia',
  },
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
  bodyRadiusKm: number;
  surfaceGravityMs2: number;
}> = {
  id: 'entry-corridor',
  titleKey: 'lab.f.corridor.title',
  inWordsKey: 'lab.f.corridor.in-words',
  citationKey: 'mission-phases/deorbit-corridor',
  learnMore: { url: 'https://en.wikipedia.org/wiki/Atmospheric_entry', source: 'wikipedia' },
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
      // Wide enough for every goal preset (Galileo hits Jupiter at 47.4) —
      // the share-link codec clamps to [min,max], so a narrow range silently
      // corrupted restored Jupiter notebooks (advisor R2).
      max: 60,
      step: 0.1,
    },
    {
      key: 'flightPathAngleDeg',
      labelKey: 'lab.f.corridor.angle',
      units: 'deg',
      kind: 'number',
      default: 6,
      min: 0.5,
      max: 90, // Venera dives at 65°
      step: 0.1,
    },
    {
      key: 'gLimit',
      labelKey: 'lab.f.corridor.glimit',
      units: '',
      kind: 'number',
      default: 12, // a survivable crewed deceleration
      min: 3,
      max: 300, // robotic probes: Venera ~160 g, Galileo ~230 g
    },
    {
      key: 'scaleHeightKm',
      labelKey: 'lab.f.corridor.scale-height',
      units: 'km',
      kind: 'number',
      default: 7,
      min: 3,
      max: 30, // Jupiter ~27 km
    },
    // Body parameters (advisor R2 BLOCKER): the Keplerian side was Earth-only,
    // so the Jupiter corridor rendered ~9° against a "±1.5°" narrative. The
    // goal presets supply the real body; Earth stays the default.
    {
      key: 'bodyRadiusKm',
      labelKey: 'lab.f.corridor.body-radius',
      units: 'km',
      kind: 'number',
      default: 6371,
      min: 1000,
      max: 100000,
    },
    {
      key: 'surfaceGravityMs2', // gitleaks:allow (field name, not a secret)
      labelKey: 'lab.f.corridor.gravity',
      units: 'm/s2', // the closed Unit union's spelling (util/units.ts)
      kind: 'number',
      default: 9.81,
      min: 1,
      max: 30,
    },
  ],
  outputs: [
    { key: 'perigeeAltKm', labelKey: 'lab.f.corridor.perigee', units: 'km' },
    { key: 'peakDecelG', labelKey: 'lab.f.corridor.decel', units: '' },
    { key: 'corridorWidthDeg', labelKey: 'lab.f.corridor.width', units: 'deg' },
  ],
  compute: ({
    entryVelocityKms,
    flightPathAngleDeg,
    gLimit,
    scaleHeightKm,
    bodyRadiusKm,
    surfaceGravityMs2,
  }) => {
    if (
      !Number.isFinite(entryVelocityKms) ||
      !Number.isFinite(flightPathAngleDeg) ||
      !Number.isFinite(gLimit) ||
      !Number.isFinite(scaleHeightKm) ||
      !Number.isFinite(bodyRadiusKm) ||
      !Number.isFinite(surfaceGravityMs2) ||
      entryVelocityKms <= 0 ||
      flightPathAngleDeg <= 0 ||
      gLimit <= 0 ||
      scaleHeightKm <= 0 ||
      bodyRadiusKm <= 0 ||
      surfaceGravityMs2 <= 0
    ) {
      const values: Record<string, Quantity> = {};
      return {
        values,
        status: { ok: false, reasonKey: 'lab.f.escape.err-input' },
        assumptions: ['lab.assume.ballistic-entry'],
      } satisfies FormulaResult;
    }
    const ENTRY_ALT_KM = 122; // the conventional entry-interface altitude
    const CAPTURE_ALT_KM = 60; // below this the atmosphere is dense enough to capture
    // µ from the body's own surface gravity: µ = g·R² (g[m/s²]·R[km]² / 1000 → km³/s²).
    const mu = (surfaceGravityMs2 * bodyRadiusKm * bodyRadiusKm) / 1000;
    const rEI = bodyRadiusKm + ENTRY_ALT_KM;
    const v = entryVelocityKms;
    const H = scaleHeightKm * 1000;
    const vMs = entryVelocityKms * 1000;

    // Keplerian perigee of the entry trajectory at the chosen angle. rp = p/(1+e)
    // holds for EVERY conic — the old a(1−e) form silently excluded hyperbolic
    // arrivals (a Galileo-style Jupiter entry), which have a real skip-out too.
    const eps = (v * v) / 2 - mu / rEI;
    const gamma = (flightPathAngleDeg * Math.PI) / 180;
    const perigeeKmAt = (g: number): number => {
      const h = rEI * v * Math.cos(g);
      const e = Math.sqrt(Math.max(0, 1 + (2 * eps * h * h) / (mu * mu)));
      return (h * h) / mu / (1 + e);
    };
    const perigeeAltKm = perigeeKmAt(gamma) - bodyRadiusKm;
    // Peak deceleration reported in Earth g's (the crew/structure convention).
    const peakG = (vMs * vMs * Math.sin(gamma)) / (2 * Math.E * H) / G0;

    // SKIP boundary — the γ where the perigee equals the capture floor. Perigee
    // falls monotonically with steeper γ, so bisect (works for bound AND
    // hyperbolic entries alike; if even a grazing entry captures, boundary 0).
    const rc = bodyRadiusKm + CAPTURE_ALT_KM;
    let skipBoundaryDeg = 0;
    if (perigeeKmAt(0) > rc) {
      let lo = 0;
      let hi = Math.PI / 2;
      for (let i = 0; i < 60; i += 1) {
        const mid = (lo + hi) / 2;
        if (perigeeKmAt(mid) > rc) lo = mid;
        else hi = mid;
      }
      skipBoundaryDeg = ((lo + hi) / 2) * (180 / Math.PI);
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
