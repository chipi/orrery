/**
 * The formula registry (S2a · RFC-037 §5). The single source the palette, the
 * Lab views, the MCP tool generator, and the coverage CI all derive from. Pure:
 * each `FormulaDef` wraps a kernel function and emits a `FigureSpec` — the app
 * and the standalone MCP process import this unchanged.
 *
 * S2a seeds it with ONE proof formula (Tsiolkovsky) that exercises the whole
 * contract chain end to end. The M1 mechanics rungs (F=ma, weight, momentum, TWR)
 * are added in S2b; every later formula is pulled demand-driven by a goal.
 */
import type { FormulaDef, FormulaResult, Registry, Vec2, Quantity } from '../spec';
import { tsiolkovskyDv } from '../ascent/ascent-physics';

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

/** All registered formulas, keyed by id. Add a formula in exactly one place. */
export const REGISTRY: Registry = new Map([[tsiolkovsky.id, tsiolkovsky]]);

/** Default input record for a formula (drives a first compute / the invariant tests). */
export function defaultInputs(def: FormulaDef): Record<string, number | string> {
  return Object.fromEntries(def.inputs.map((f) => [f.key, f.default]));
}
