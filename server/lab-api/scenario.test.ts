/**
 * Conversational-scenario contract (slice #541). The kernel propagates wired values
 * down the ladder — the model never relays a computed number — and the model-visible
 * summary strips figures (token budget). These are the invariants the epic hangs on.
 */
import { describe, it, expect } from 'vitest';
import { REGISTRY } from '$lib/physics/registry';
import {
  parseScenarioArgs,
  summariseScenario,
  applyScenarioUpdate,
  parseUpdateArgs,
  MAX_SCENARIO_CELLS,
  SCENARIO_VERSION,
} from './scenario';

describe('parseScenarioArgs · guards (REJECT posture)', () => {
  it('rejects a non-array, empty, or over-long cells list', () => {
    expect(() => parseScenarioArgs({})).toThrow();
    expect(() => parseScenarioArgs({ cells: [] })).toThrow();
    expect(() =>
      parseScenarioArgs({
        cells: Array.from({ length: MAX_SCENARIO_CELLS + 1 }, () => ({
          formulaId: 'weight',
          inputs: {},
        })),
      }),
    ).toThrow(/max/);
  });

  it('rejects a cell missing a string formulaId', () => {
    expect(() => parseScenarioArgs({ cells: [{ inputs: {} }] })).toThrow(/formulaId/);
  });

  it('parses a valid ladder into a versioned scenario, defaulting inputs/wires', () => {
    const s = parseScenarioArgs({ cells: [{ formulaId: 'weight', inputs: { massKg: 100 } }] });
    expect(s.v).toBe(SCENARIO_VERSION);
    expect(s.cells).toHaveLength(1);
    expect(s.cells[0]).toEqual({ formulaId: 'weight', inputs: { massKg: 100 }, wires: undefined });
  });
});

describe('parseScenarioArgs · named-target presets (#542)', () => {
  it('a target fills concrete inputs + records the assumption; a pinned input still wins', () => {
    const s = parseScenarioArgs({
      cells: [
        { formulaId: 'weight', target: 'moon', inputs: {} },
        { formulaId: 'weight', target: 'mars', inputs: { body: 'earth' } },
      ],
    });
    expect(s.cells[0].inputs.body).toBe('moon'); // preset filled the concrete input
    expect(s.presetNotes?.[0]).toBe('lab.assume.target-moon');
    expect(s.cells[1].inputs.body).toBe('earth'); // the user's pinned body wins over the preset
    expect(s.presetNotes?.[1]).toBe('lab.assume.target-mars');
  });

  it('records no note when no target is named', () => {
    const s = parseScenarioArgs({ cells: [{ formulaId: 'weight', inputs: { massKg: 1 } }] });
    expect(s.presetNotes?.[0]).toBeNull();
  });
});

describe('summariseScenario · the kernel owns the numbers', () => {
  it('propagates a wired output down the ladder (the LLM never relays it)', () => {
    // thrust-from-flow.thrustN (250 kg/s · 3000 m/s = 750 kN) wired into twr.thrustN,
    // whose OWN default is 1.5e7 — so a propagated 750000 proves the wire, not the default.
    const scenario = parseScenarioArgs({
      cells: [
        { formulaId: 'thrust-from-flow', inputs: { massFlowKgS: 250, exhaustVelMs: 3000 } },
        {
          formulaId: 'twr',
          inputs: { massKg: 50000, body: 'earth' },
          wires: [{ fromIndex: 0, output: 'thrustN', toInput: 'thrustN' }],
        },
      ],
    });
    const steps = summariseScenario(scenario, REGISTRY);
    expect(steps[0].status).toBe('ok');
    expect(steps[0].values?.thrustN.value).toBeCloseTo(750000);
    // The wire overrode twr's default thrustN with step 0's computed value.
    expect(steps[1].status).toBe('ok');
    expect(steps[1].resolvedInputs?.thrustN).toBeCloseTo(750000);
  });

  it('strips the figure from the model-visible summary (token budget)', () => {
    // tsiolkovsky produces a figure; the summary must carry values but no figure.
    const scenario = parseScenarioArgs({
      cells: [{ formulaId: 'tsiolkovsky', inputs: { ispS: 350, m0Kg: 12, mfKg: 4 } }],
    });
    const steps = summariseScenario(scenario, REGISTRY);
    expect(steps[0].values?.deltaV).toBeDefined();
    expect(steps[0]).not.toHaveProperty('figure');
    expect(JSON.stringify(steps[0])).not.toContain('figure');
  });

  it('reports a blocked step honestly instead of faking a number', () => {
    // A wire naming an output the source does not declare → invalid-wire, no compute.
    const scenario = parseScenarioArgs({
      cells: [
        { formulaId: 'weight', inputs: { massKg: 100 } },
        {
          formulaId: 'twr',
          inputs: { massKg: 100, body: 'earth' },
          wires: [{ fromIndex: 0, output: 'notAnOutput', toInput: 'thrustN' }],
        },
      ],
    });
    const steps = summariseScenario(scenario, REGISTRY);
    expect(steps[1].status).toBe('invalid-wire');
    expect(steps[1].reason).toMatch(/notAnOutput/);
    expect(steps[1].values).toBeUndefined();
  });
});

describe('applyScenarioUpdate · deterministic value refinement (#543)', () => {
  const base = () =>
    parseScenarioArgs({
      cells: [
        { formulaId: 'thrust-from-flow', inputs: { massFlowKgS: 250, exhaustVelMs: 3000 } },
        {
          formulaId: 'twr',
          inputs: { massKg: 50000, body: 'earth' },
          wires: [{ fromIndex: 0, output: 'thrustN', toInput: 'thrustN' }],
        },
      ],
    });

  it('changes only the named input; everything else stays put (no mutation of input)', () => {
    const before = base();
    const next = applyScenarioUpdate(before, [{ cell: 1, input: 'massKg', value: 90000 }]);
    expect(next.cells[1].inputs.massKg).toBe(90000);
    expect(next.cells[0].inputs).toEqual(before.cells[0].inputs); // untouched
    expect(before.cells[1].inputs.massKg).toBe(50000); // original not mutated
  });

  it('REJECTS setting a wired input (computed upstream)', () => {
    expect(() => applyScenarioUpdate(base(), [{ cell: 1, input: 'thrustN', value: 1 }])).toThrow(
      /computed/,
    );
  });

  it('REJECTS an out-of-range cell', () => {
    expect(() => applyScenarioUpdate(base(), [{ cell: 9, input: 'massKg', value: 1 }])).toThrow();
  });
});

describe('parseUpdateArgs · guards', () => {
  it('rejects empty or malformed change lists', () => {
    expect(() => parseUpdateArgs({})).toThrow();
    expect(() => parseUpdateArgs({ changes: [] })).toThrow();
    expect(() => parseUpdateArgs({ changes: [{ cell: 0, input: 5, value: 1 }] })).toThrow(/input/);
  });
});
