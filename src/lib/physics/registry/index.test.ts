import { describe, it, expect } from 'vitest';
import { REGISTRY, defaultInputs, tsiolkovsky, twrFormula, deltaVMargin } from './index';
import { bodyGravityMs2 } from '../mechanics/bodies';

/**
 * Contract-invariant tests (S2a). These run over EVERY registered formula, so the
 * frozen guarantees (declared outputs, assumptions ⊆, key disjointness) hold as
 * S2b + goals add formulas — they don't have to be re-asserted per formula.
 */
describe('formula registry · frozen contract invariants', () => {
  it('every registry key equals its FormulaDef.id', () => {
    for (const [id, def] of REGISTRY) expect(def.id).toBe(id);
  });

  it('compute() output keys are declared (⊆ outputs always; ≡ when ok) — B1/N3', () => {
    for (const def of REGISTRY.values()) {
      const declared = new Set(def.outputs.map((o) => o.key));
      const res = def.compute(defaultInputs(def));
      const produced = Object.keys(res.values);
      for (const k of produced)
        expect(declared, `${def.id}: undeclared output "${k}"`).toContain(k);
      if (res.status.ok) {
        expect(new Set(produced), `${def.id}: ok result must produce all outputs`).toEqual(
          declared,
        );
      }
    }
  });

  it('output ∪ selectionOutput keys are disjoint + unique — N1', () => {
    for (const def of REGISTRY.values()) {
      const keys = [...def.outputs, ...(def.selectionOutputs ?? [])].map((o) => o.key);
      expect(new Set(keys).size, `${def.id}: duplicate output/selection key`).toBe(keys.length);
    }
  });

  it("a figure's assumptions ⊆ the result's assumptions — M3", () => {
    for (const def of REGISTRY.values()) {
      const res = def.compute(defaultInputs(def));
      if (!res.figure) continue;
      const parent = new Set(res.assumptions);
      for (const a of res.figure.assumptions)
        expect(parent, `${def.id}: figure assumption "${a}" not in result`).toContain(a);
    }
  });

  it('kernel figures declare fidelity "computed"', () => {
    for (const def of REGISTRY.values()) {
      const res = def.compute(defaultInputs(def));
      if (res.figure) expect(res.figure.provenance.fidelity).toBe('computed');
    }
  });
});

describe('Tsiolkovsky', () => {
  it('350 s, mass ratio 12 → ~8.6 km/s (RFC-033 north-star number)', () => {
    const r = tsiolkovsky.compute({ ispS: 350, m0Kg: 12, mfKg: 1 });
    expect(r.status.ok).toBe(true);
    expect(r.values.deltaV.value).toBeCloseTo(8.53, 1); // 350·9.80665·ln(12)/1000
    expect(r.values.deltaV.units).toBe('km/s');
    expect(r.figure?.kind).toBe('curve');
  });

  it('fails honest on a non-physical mass ratio (m0 ≤ mf)', () => {
    const r = tsiolkovsky.compute({ ispS: 350, m0Kg: 1, mfKg: 1 });
    expect(r.status.ok).toBe(false);
    if (!r.status.ok) expect(r.status.reasonKey).toContain('mass-ratio');
  });
});

// MAJOR-1 (S2 holistic): the invariant runner only executes defaultInputs, so the
// non-default status branches ship untested. Exercise them explicitly.
describe('fail-honest branches (both status paths)', () => {
  it('TWR < 1 → ok:false but KEEPS the value + force-diagram (the lesson, MINOR-6)', () => {
    const r = twrFormula.compute({ thrustN: 5e6, massKg: 1e6, body: 'earth' }); // ≈0.51
    expect(r.status.ok).toBe(false);
    if (!r.status.ok) expect(r.status.reasonKey).toContain('wont-lift');
    expect(r.values.twr.value).toBeLessThan(1);
    expect(r.figure?.kind).toBe('force-diagram');
  });

  it('delta-v-margin OK branch: capacity > required → ok, positive margin, figure', () => {
    const r = deltaVMargin.compute({ capacityKms: 12, requiredKms: 9.4 });
    expect(r.status.ok).toBe(true);
    expect(r.values.margin.value).toBeCloseTo(2.6, 5);
    expect(r.values.margin.units).toBe('km/s');
    expect(r.figure?.kind).toBe('dv-waterfall');
  });

  it('delta-v-margin FAIL branch: capacity < required → ok:false, keeps figure', () => {
    const r = deltaVMargin.compute({ capacityKms: 5, requiredKms: 9.4 });
    expect(r.status.ok).toBe(false);
    if (!r.status.ok) expect(r.status.reasonKey).toContain('insufficient');
    expect(r.figure?.kind).toBe('dv-waterfall'); // the deficit IS the lesson
  });
});

// MAJOR-3 (S2 holistic): body-kind FieldSpec.bodyIds are validated by nothing, and
// bodyGravityMs2 THROWS on an unknown id. Prove every declared bodyId resolves — a
// typo'd id in a bodyIds list would crash at user-pick time otherwise.
describe('body-kind inputs resolve (no throw at pick time)', () => {
  it('every registered body-kind field lists only resolvable bodyIds', () => {
    for (const def of REGISTRY.values()) {
      for (const field of def.inputs) {
        if (field.kind !== 'body') continue;
        for (const id of field.bodyIds ?? []) {
          expect(
            () => bodyGravityMs2(id),
            `${def.id}.${field.key}: bad body "${id}"`,
          ).not.toThrow();
          expect(bodyGravityMs2(id)).toBeGreaterThan(0);
        }
      }
    }
  });
});
