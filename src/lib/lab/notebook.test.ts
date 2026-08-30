import { describe, it, expect } from 'vitest';
import { recomputeNotebook, type Cell } from './notebook';
import { REGISTRY, defaultInputs } from '$lib/physics/registry';
import { GOALS } from '$lib/physics/registry/goals';

/**
 * S3b recompute-engine invariants. The M1 "launch a rocket" goal is the shipping
 * scenario, so it doubles as the golden fixture: build its cells from the goal
 * path (wiresFrom.fromStep → fromIndex) and assert the wire actually flows.
 */
function cellsFromGoal(goalId: string): Cell[] {
  const goal = GOALS.get(goalId)!;
  return goal.path.map((step) => {
    const def = REGISTRY.get(step.formulaId)!;
    return {
      formulaId: step.formulaId,
      inputs: defaultInputs(def),
      wires: (step.wiresFrom ?? []).map((w) => ({
        fromIndex: w.fromStep,
        output: w.output,
        toInput: w.toInput,
      })),
    };
  });
}

describe('recomputeNotebook · the M1 launch-a-rocket ladder', () => {
  it('computes every rung and WIRES Δv → the verdict capacity', () => {
    const cells = cellsFromGoal('launch-a-rocket');
    const states = recomputeNotebook(cells, REGISTRY);

    // 6 rungs: newton, weight, momentum, twr, tsiolkovsky, delta-v-margin
    expect(states).toHaveLength(6);

    // The Tsiolkovsky rung (index 4) produced Δv.
    const tsio = states[4];
    expect(tsio.status).toBe('ok');
    if (tsio.status !== 'ok') throw new Error('tsiolkovsky not ok');
    const deltaV = tsio.result.values.deltaV.value;
    expect(deltaV).toBeCloseTo(8.53, 1);

    // The verdict rung (index 5) consumed it via the wire — capacityKms is a
    // wired key and equals the upstream Δv (NOT the input default).
    const verdict = states[5];
    if (verdict.status === 'upstream-failed' || verdict.status === 'unknown-formula')
      throw new Error('verdict should compute');
    expect(verdict.wiredKeys).toContain('capacityKms');
    expect(verdict.resolvedInputs.capacityKms).toBeCloseTo(deltaV, 6);
  });
});

describe('recomputeNotebook · wire discipline (B3)', () => {
  const registry = REGISTRY;

  it('upstream-failed: a failing source blocks the downstream cell (no default fallback)', () => {
    // Tsiolkovsky fails on m0 ≤ mf; the wired verdict must NOT compute from its default.
    const cells: Cell[] = [
      { formulaId: 'tsiolkovsky', inputs: { ispS: 350, m0Kg: 1, mfKg: 1 } },
      {
        formulaId: 'delta-v-margin',
        inputs: { capacityKms: 12, requiredKms: 9.4 },
        wires: [{ fromIndex: 0, output: 'deltaV', toInput: 'capacityKms' }],
      },
    ];
    const [src, verdict] = recomputeNotebook(cells, registry);
    expect(src.status).toBe('fail');
    expect(verdict.status).toBe('upstream-failed');
    if (verdict.status !== 'upstream-failed') throw new Error();
    expect(verdict.blockedInput).toBe('capacityKms');
    expect(verdict.fromIndex).toBe(0);
  });

  it('a forward/self wire is un-honoured — the input keeps its own value', () => {
    const cells: Cell[] = [
      {
        formulaId: 'delta-v-margin',
        inputs: { capacityKms: 12, requiredKms: 9.4 },
        // fromIndex 1 is NOT earlier than 0 → ignored; capacity stays 12.
        wires: [{ fromIndex: 1, output: 'deltaV', toInput: 'capacityKms' }],
      },
      { formulaId: 'tsiolkovsky', inputs: defaultInputs(REGISTRY.get('tsiolkovsky')!) },
    ];
    const [verdict] = recomputeNotebook(cells, registry);
    expect(verdict.status).toBe('ok');
    if (verdict.status !== 'ok') throw new Error();
    expect(verdict.resolvedInputs.capacityKms).toBe(12);
    expect(verdict.wiredKeys).not.toContain('capacityKms'); // forward wire not counted
  });

  it('a wired source that is fail-honest (value present but !ok) still blocks', () => {
    // TWR < 1 keeps its value but is !ok; a downstream wire off it must block.
    const cells: Cell[] = [
      { formulaId: 'twr', inputs: { thrustN: 5e6, massKg: 1e6, body: 'earth' } }, // ≈0.51, !ok
      {
        formulaId: 'delta-v-margin',
        inputs: { capacityKms: 12, requiredKms: 9.4 },
        wires: [{ fromIndex: 0, output: 'twr', toInput: 'capacityKms' }],
      },
    ];
    const [twr, verdict] = recomputeNotebook(cells, registry);
    expect(twr.status).toBe('fail');
    expect(verdict.status).toBe('upstream-failed');
  });

  it('an unknown formulaId is surfaced, not thrown', () => {
    const cells: Cell[] = [{ formulaId: 'not-a-real-formula', inputs: {} }];
    const [state] = recomputeNotebook(cells, registry);
    expect(state.status).toBe('unknown-formula');
    if (state.status !== 'unknown-formula') throw new Error();
    expect(state.formulaId).toBe('not-a-real-formula');
  });
});
