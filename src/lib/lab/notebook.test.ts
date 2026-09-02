import { describe, it, expect } from 'vitest';
import { recomputeNotebook, type Cell } from './notebook';
import { REGISTRY, defaultInputs } from '$lib/physics/registry';
import { GOALS } from '$lib/physics/registry/goals';
import type { FormulaDef, Registry } from '$lib/physics/spec';

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

    // 8 rungs: newton, weight, momentum, twr, tsiolkovsky, launch-site, dv-to-orbit, verdict
    expect(states).toHaveLength(8);

    // The Tsiolkovsky rung (index 4) produced Δv.
    const tsio = states[4];
    expect(tsio.status).toBe('ok');
    if (tsio.status !== 'ok') throw new Error('tsiolkovsky not ok');
    const deltaV = tsio.result.values.deltaV.value;
    expect(deltaV).toBeCloseTo(8.53, 1);

    // The verdict rung (index 7) wires capacityKms from Tsiolkovsky, boostKms from the
    // launch-site rung (5), AND requiredKms from the derived dv-to-orbit rung (6).
    const verdict = states[7];
    if (verdict.status !== 'ok' && verdict.status !== 'fail')
      throw new Error('verdict should compute');
    expect(verdict.wiredKeys).toContain('capacityKms');
    expect(verdict.wiredKeys).toContain('boostKms');
    expect(verdict.wiredKeys).toContain('requiredKms');
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

// ─── Hardening after the S3a+S3b opus review — the untrusted-decode surface ──────
// The engine is S3c's trusted core; every hostile shape must degrade fail-honest,
// never throw and never fake a value.
describe('recomputeNotebook · hardening (opus review B-1/B-2/M-2)', () => {
  it('compute-error: an out-of-domain body id is caught, not thrown (B-1)', () => {
    // bodyGravityMs2 throws on an unknown body; the whole notebook must not crash.
    const cells: Cell[] = [{ formulaId: 'weight', inputs: { massKg: 1, body: 'xyzzy' } }];
    let states: ReturnType<typeof recomputeNotebook>;
    expect(() => (states = recomputeNotebook(cells, REGISTRY))).not.toThrow();
    expect(states![0].status).toBe('compute-error');
  });

  it('invalid-wire: a wire naming an undeclared output is distinct from upstream-failed (M-2)', () => {
    const cells: Cell[] = [
      { formulaId: 'tsiolkovsky', inputs: defaultInputs(REGISTRY.get('tsiolkovsky')!) },
      {
        formulaId: 'delta-v-margin',
        inputs: { capacityKms: 12, requiredKms: 9.4 },
        wires: [{ fromIndex: 0, output: 'no-such-output', toInput: 'capacityKms' }],
      },
    ];
    const [src, verdict] = recomputeNotebook(cells, REGISTRY);
    expect(src.status).toBe('ok'); // the upstream did NOT fail — the wire is just wrong
    expect(verdict.status).toBe('invalid-wire');
    if (verdict.status !== 'invalid-wire') throw new Error();
    expect(verdict.output).toBe('no-such-output');
  });

  it('a non-integer / negative fromIndex is un-honoured, not a deref crash', () => {
    const cells: Cell[] = [
      { formulaId: 'tsiolkovsky', inputs: defaultInputs(REGISTRY.get('tsiolkovsky')!) },
      {
        formulaId: 'delta-v-margin',
        inputs: { capacityKms: 12, requiredKms: 9.4 },
        wires: [{ fromIndex: 0.5, output: 'deltaV', toInput: 'capacityKms' }],
      },
    ];
    let states: ReturnType<typeof recomputeNotebook>;
    expect(() => (states = recomputeNotebook(cells, REGISTRY))).not.toThrow();
    const s = states![1];
    expect(s.status).toBe('ok'); // wire ignored → capacity stays 12
    if (s.status !== 'ok') throw new Error();
    expect(s.resolvedInputs.capacityKms).toBe(12);
  });

  it('a self-wire (fromIndex === i) is un-honoured', () => {
    const cells: Cell[] = [
      {
        formulaId: 'tsiolkovsky',
        inputs: defaultInputs(REGISTRY.get('tsiolkovsky')!),
        wires: [{ fromIndex: 0, output: 'deltaV', toInput: 'ispS' }],
      },
    ];
    const [state] = recomputeNotebook(cells, REGISTRY);
    expect(state.status).toBe('ok');
    if (state.status !== 'ok') throw new Error();
    expect(state.wiredKeys).not.toContain('ispS');
  });

  it('a non-finite ok value does NOT flow through a wire — it blocks (B-2)', () => {
    // No shipping formula emits a non-finite ok value; prove the guard with a mock.
    const q = (value: number) => ({ value, units: 'km/s' });
    const mock: Registry = new Map<string, FormulaDef>([
      [
        'inf-src',
        {
          outputs: [{ key: 'out', labelKey: 'k', units: 'km/s' }],
          compute: () => ({ values: { out: q(Infinity) }, status: { ok: true }, assumptions: [] }),
        } as unknown as FormulaDef,
      ],
      [
        'sink',
        {
          outputs: [{ key: 'y', labelKey: 'k', units: 'km/s' }],
          compute: (i: Record<string, number | string>) => ({
            values: { y: q(Number(i.x)) },
            status: { ok: true },
            assumptions: [],
          }),
        } as unknown as FormulaDef,
      ],
    ]);
    const cells: Cell[] = [
      { formulaId: 'inf-src', inputs: {} },
      {
        formulaId: 'sink',
        inputs: { x: 5 },
        wires: [{ fromIndex: 0, output: 'out', toInput: 'x' }],
      },
    ];
    const [src, sink] = recomputeNotebook(cells, mock);
    expect(src.status).toBe('ok');
    expect(sink.status).toBe('upstream-failed'); // Infinity never becomes a readout
  });

  it('a units-mismatched wire is invalid-wire — seconds never flow into kilograms (S5 gap fix)', () => {
    // Card contract (spec.ts): a wire is valid ONLY when the output's units equal the
    // target FieldSpec.units. Before S5 the engine checked declaration but not units,
    // so a hostile .orrlab could wire any number into any input and render a
    // silently-wrong green. tsiolkovsky.deltaV is [km/s]; momentum.massKg is [kg].
    const cells: Cell[] = [
      { formulaId: 'tsiolkovsky', inputs: defaultInputs(REGISTRY.get('tsiolkovsky')!) },
      {
        formulaId: 'momentum',
        inputs: defaultInputs(REGISTRY.get('momentum')!),
        wires: [{ fromIndex: 0, output: 'deltaV', toInput: 'massKg' }],
      },
    ];
    const [, sink] = recomputeNotebook(cells, REGISTRY);
    expect(sink.status).toBe('invalid-wire');
    if (sink.status !== 'invalid-wire') throw new Error();
    expect(sink.blockedInput).toBe('massKg');
  });
});
