/** Ascent formulas: ascent to orbit, ascent guidance, Δv to orbit. */
import type { FormulaDef, FormulaResult, Quantity } from '../spec';
import { circularVelocityKms } from '../mechanics/orbits';
import { locationModel } from '../util/location';
import { integrateAscent, circularSpeed } from '../ascent/ascent-physics';
import { buildGenericProfile } from '../ascent/launch-profile-registry';
import { ORBIT_BODY_IDS } from './shared';

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
  inWordsKey: 'lab.f.ascent.in-words',
  citationKey: 'mission-phases/gravity-turn',
  learnMore: { url: 'https://en.wikipedia.org/wiki/Gravity_turn', source: 'wikipedia' },
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
      // The canonical threaded case (FB3): the SAME 100 kg craft runs through
      // every goal — smallsat-class, real (Electron flies lighter).
      default: 100,
      min: 100,
      max: 20000,
      step: 100,
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
  inWordsKey: 'lab.f.guidance.in-words',
  citationKey: 'mission-phases/ascent-guidance',
  learnMore: {
    url: 'https://en.wikipedia.org/wiki/Guidance,_navigation,_and_control',
    source: 'wikipedia',
  },
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
  inWordsKey: 'lab.f.dvorbit.in-words',
  citationKey: 'propulsion/dv-budget',
  learnMore: { url: 'https://en.wikipedia.org/wiki/Delta-v_budget', source: 'wikipedia' },
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
