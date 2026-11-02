/** "Scale a rocket" formulas: payload to mass, liftoff thrust, engine count, staging, boosters, cluster thrust. */
import type { FormulaDef, FormulaResult, Vec2, Quantity } from '../spec';
import { G0 } from '../util/constants';

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
  inWordsKey: 'lab.f.sizing.in-words',
  citationKey: 'propulsion/rocket-stages',
  learnMore: { url: 'https://en.wikipedia.org/wiki/Multistage_rocket', source: 'wikipedia' },
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
      // FB3 canonical case: size the rocket around the same 100 kg craft the
      // weight/ascent cards carry.
      default: 100,
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
  inWordsKey: 'lab.f.liftoff.in-words',
  citationKey: 'propulsion/thrust-and-twr',
  learnMore: {
    url: 'https://www.grc.nasa.gov/www/k-12/rocket/rktthsum.html',
    source: 'nasa-glenn',
  },
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
  inWordsKey: 'lab.f.engines.in-words',
  citationKey: 'propulsion/engine-clustering',
  learnMore: { url: 'https://en.wikipedia.org/wiki/Rocket_engine', source: 'wikipedia' },
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
    inWordsKey: 'lab.f.staging.in-words',
    citationKey: 'propulsion/rocket-stages',
    learnMore: {
      url: 'https://www.grc.nasa.gov/www/k-12/rocket/rktstage.html',
      source: 'nasa-glenn',
    },
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
  inWordsKey: 'lab.f.boosters.in-words',
  citationKey: 'propulsion/engine-clustering',
  learnMore: { url: 'https://en.wikipedia.org/wiki/Booster_(rocketry)', source: 'wikipedia' },
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
  inWordsKey: 'lab.f.cluster.in-words',
  citationKey: 'propulsion/engine-clustering',
  learnMore: { url: 'https://en.wikipedia.org/wiki/Rocket_engine', source: 'wikipedia' },
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
