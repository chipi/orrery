/** "Leave the solar system" formulas: solar escape velocity, heliocentric escape Δv, Oberth departure, gravity assists. */
import type { FormulaDef, FormulaResult, Vec2, Quantity } from '../spec';
import { circularVelocityKms, escapeVelocityKms } from '../mechanics/orbits';
import { locationModel } from '../util/location';
import { MU_SUN_KM3_S2, AU_TO_KM } from '../util/constants';
import { ORBIT_BODY_IDS } from './shared';

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
  inWordsKey: 'lab.f.solesc.in-words',
  citationKey: 'orbits/escape-velocity',
  learnMore: {
    url: 'http://hyperphysics.phy-astr.gsu.edu/hbase/vesc.html',
    source: 'hyperphysics',
  },
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
  inWordsKey: 'lab.f.helesc.in-words',
  citationKey: 'propulsion/c3',
  learnMore: { url: 'https://en.wikipedia.org/wiki/Characteristic_energy', source: 'wikipedia' },
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
    inWordsKey: 'lab.f.oberth.in-words',
    citationKey: 'propulsion/oberth-effect',
    learnMore: { url: 'https://en.wikipedia.org/wiki/Oberth_effect', source: 'wikipedia' },
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
  inWordsKey: 'lab.f.grav.in-words',
  citationKey: 'transfers/gravity-assist',
  learnMore: { url: 'https://en.wikipedia.org/wiki/Gravity_assist', source: 'wikipedia' },
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
  inWordsKey: 'lab.f.escverd.in-words',
  citationKey: 'orbits/escape-velocity',
  learnMore: {
    url: 'http://hyperphysics.phy-astr.gsu.edu/hbase/vesc.html',
    source: 'hyperphysics',
  },
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
  inWordsKey: 'lab.f.assistchain.in-words',
  citationKey: 'transfers/gravity-assist',
  learnMore: { url: 'https://en.wikipedia.org/wiki/Gravity_assist', source: 'wikipedia' },
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
