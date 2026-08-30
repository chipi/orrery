import { describe, it, expect } from 'vitest';
import { REGISTRY } from './index';
import { GOALS, NOT_A_GOAL_FORMULA } from './goals';

/**
 * S2c coverage CI + wire integrity (Fable-5 rounds: bidirectional coverage,
 * B1/B2 wire validation, N1 output namespace). These gate the whole flagship's
 * "every built capability has a goal" + "no silently-wrong wire" guarantees.
 */
describe('goal registry · coverage + wire integrity', () => {
  it('bidirectional coverage: every registered formula is reachable from ≥1 goal (or allowlisted)', () => {
    const used = new Set<string>();
    for (const g of GOALS.values()) for (const step of g.path) used.add(step.formulaId);
    for (const id of REGISTRY.keys()) {
      expect(used.has(id) || NOT_A_GOAL_FORMULA.has(id), `formula "${id}" has no goal`).toBe(true);
    }
  });

  it('every goal step references a real registered formula', () => {
    for (const g of GOALS.values())
      for (const step of g.path)
        expect(REGISTRY.has(step.formulaId), `${g.id}: unknown formula ${step.formulaId}`).toBe(
          true,
        );
  });

  it('every wiresFrom is a valid upstream output with matching units (B1/B2)', () => {
    for (const g of GOALS.values()) {
      g.path.forEach((step, i) => {
        for (const w of step.wiresFrom ?? []) {
          // fromStep must be an earlier step (no forward/self wires)
          expect(w.fromStep, `${g.id}[${i}]: fromStep out of range`).toBeGreaterThanOrEqual(0);
          expect(w.fromStep, `${g.id}[${i}]: fromStep must precede this step`).toBeLessThan(i);
          const srcDef = REGISTRY.get(g.path[w.fromStep].formulaId);
          expect(srcDef, `${g.id}[${i}]: upstream formula missing`).toBeDefined();
          const out = [...srcDef!.outputs, ...(srcDef!.selectionOutputs ?? [])].find(
            (o) => o.key === w.output,
          );
          expect(
            out,
            `${g.id}[${i}]: output "${w.output}" not declared by ${srcDef!.id}`,
          ).toBeDefined();
          const dstDef = REGISTRY.get(step.formulaId)!;
          const inp = dstDef.inputs.find((f) => f.key === w.toInput);
          expect(inp, `${g.id}[${i}]: input "${w.toInput}" not on ${dstDef.id}`).toBeDefined();
          // B2 — no implicit conversion: units must be equal
          expect(out!.units, `${g.id}[${i}]: unit mismatch ${out!.units} → ${inp!.units}`).toBe(
            inp!.units,
          );
        }
      });
    }
  });

  it('goal prereqs reference real goals', () => {
    for (const g of GOALS.values())
      for (const p of g.prereqs)
        expect(GOALS.has(p), `${g.id}: unknown prereq goal ${p}`).toBe(true);
  });

  it('the M1 launch goal wires BOTH Tsiolkovsky Δv AND the launch-site boost into the verdict', () => {
    const g = GOALS.get('launch-a-rocket')!;
    const verdict = g.path.find((s) => s.formulaId === 'reach-orbit-verdict')!;
    expect(verdict.wiresFrom).toHaveLength(2);
    expect(verdict.wiresFrom).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ output: 'deltaV', toInput: 'capacityKms' }),
        expect.objectContaining({ output: 'boost', toInput: 'boostKms' }),
      ]),
    );
  });
});
