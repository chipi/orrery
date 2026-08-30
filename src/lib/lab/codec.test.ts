import { describe, it, expect } from 'vitest';
import { encodeNotebook, decodeNotebook, NOTEBOOK_CODEC_VERSION, type CodecCell } from './codec';
import { recomputeNotebook } from './notebook';
import { REGISTRY, defaultInputs } from '$lib/physics/registry';
import { GOALS } from '$lib/physics/registry/goals';

/** Craft a raw `1.<b64url>` string from arbitrary JSON — to inject hostile payloads. */
function craft(json: string): string {
  const bytes = new TextEncoder().encode(json);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return `${NOTEBOOK_CODEC_VERSION}.${btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')}`;
}

function m1Cells(): CodecCell[] {
  const goal = GOALS.get('launch-a-rocket')!;
  return goal.path.map((step) => ({
    formulaId: step.formulaId,
    inputs: defaultInputs(REGISTRY.get(step.formulaId)!),
    wires: (step.wiresFrom ?? []).map((w) => ({
      fromIndex: w.fromStep,
      output: w.output,
      toInput: w.toInput,
    })),
  }));
}

describe('codec · round-trip', () => {
  it('decode(encode(m1)) preserves formulaId, inputs, and wires', () => {
    const cells = m1Cells();
    const back = decodeNotebook(encodeNotebook(cells), REGISTRY);
    expect(back).not.toBeNull();
    expect(back).toHaveLength(cells.length);
    for (let i = 0; i < cells.length; i++) {
      expect(back![i].formulaId).toBe(cells[i].formulaId);
      expect(back![i].inputs).toEqual(cells[i].inputs);
      expect(back![i].wires ?? []).toEqual(cells[i].wires ?? []);
    }
  });

  it('a round-tripped notebook still recomputes to the same wired verdict', () => {
    const cells = m1Cells();
    const back = decodeNotebook(encodeNotebook(cells), REGISTRY)!;
    const a = recomputeNotebook(cells, REGISTRY);
    const b = recomputeNotebook(back, REGISTRY);
    const av = a[5];
    const bv = b[5];
    if (av.status !== 'ok' && av.status !== 'fail') throw new Error();
    if (bv.status !== 'ok' && bv.status !== 'fail') throw new Error();
    expect(bv.resolvedInputs.capacityKms).toBe(av.resolvedInputs.capacityKms);
  });

  it('version prefix is present and current', () => {
    expect(encodeNotebook(m1Cells()).startsWith(`${NOTEBOOK_CODEC_VERSION}.`)).toBe(true);
  });
});

describe('codec · hostile / malformed input degrades fail-honest', () => {
  it('a future version is rejected (null, not a guess)', () => {
    expect(decodeNotebook('2.anything', REGISTRY)).toBeNull();
  });

  it('malformed base64 → null', () => {
    expect(decodeNotebook('1.@@@not base64@@@', REGISTRY)).toBeNull();
  });

  it('a non-array payload → null', () => {
    expect(decodeNotebook(craft('{}'), REGISTRY)).toBeNull();
    expect(decodeNotebook(craft('"a string"'), REGISTRY)).toBeNull();
    expect(decodeNotebook(craft('42'), REGISTRY)).toBeNull();
  });

  it('an out-of-domain body id is clamped to the field default, never passed through', () => {
    const bodyField = REGISTRY.get('weight')!.inputs.find((f) => f.kind === 'body')!;
    const hostile = craft(JSON.stringify([{ f: 'weight', i: { massKg: 1, body: 'xyzzy' } }]));
    const back = decodeNotebook(hostile, REGISTRY)!;
    expect(back[0].inputs.body).toBe(bodyField.default);
    expect(back[0].inputs.body).not.toBe('xyzzy');
  });

  it('a number wildly out of range is clamped to the FieldSpec max', () => {
    const ispField = REGISTRY.get('tsiolkovsky')!.inputs.find((f) => f.key === 'ispS')!;
    const hostile = craft(
      JSON.stringify([{ f: 'tsiolkovsky', i: { ispS: 1e9, m0Kg: 12, mfKg: 1 } }]),
    );
    const back = decodeNotebook(hostile, REGISTRY)!;
    if (typeof ispField.max === 'number') {
      expect(back[0].inputs.ispS).toBe(ispField.max);
    }
  });

  it('a null/NaN input decodes to the field default (no non-finite leaks)', () => {
    const ispField = REGISTRY.get('tsiolkovsky')!.inputs.find((f) => f.key === 'ispS')!;
    const hostile = craft(
      JSON.stringify([{ f: 'tsiolkovsky', i: { ispS: null, m0Kg: 12, mfKg: 1 } }]),
    );
    const back = decodeNotebook(hostile, REGISTRY)!;
    expect(back[0].inputs.ispS).toBe(ispField.default);
    expect(Number.isFinite(Number(back[0].inputs.ispS))).toBe(true);
  });

  it('a malformed wire (negative / non-integer / wrong-typed) is dropped', () => {
    const hostile = craft(
      JSON.stringify([
        { f: 'tsiolkovsky', i: {} },
        {
          f: 'delta-v-margin',
          i: { capacityKms: 12, requiredKms: 9.4 },
          w: [
            { from: -5, out: 'deltaV', to: 'capacityKms' },
            { from: 0.5, out: 'deltaV', to: 'capacityKms' },
            { from: 0, out: 42, to: 'capacityKms' },
          ],
        },
      ]),
    );
    const back = decodeNotebook(hostile, REGISTRY)!;
    expect(back[1].wires ?? []).toHaveLength(0);
  });

  it('an unknown formulaId is preserved so the engine surfaces unknown-formula', () => {
    const hostile = craft(JSON.stringify([{ f: 'haxxor', i: { foo: 1 } }]));
    const back = decodeNotebook(hostile, REGISTRY)!;
    expect(back[0].formulaId).toBe('haxxor');
    const [state] = recomputeNotebook(back, REGISTRY);
    expect(state.status).toBe('unknown-formula');
  });

  it('a fully hostile payload feeds the engine WITHOUT throwing (the whole point)', () => {
    const hostile = craft(
      JSON.stringify([
        { f: 'weight', i: { massKg: 1e99, body: 'not-a-body' } },
        { f: 'haxxor', i: {} },
        { f: 'delta-v-margin', i: {}, w: [{ from: 999, out: 'x', to: 'capacityKms' }] },
      ]),
    );
    const back = decodeNotebook(hostile, REGISTRY);
    expect(back).not.toBeNull();
    expect(() => recomputeNotebook(back!, REGISTRY)).not.toThrow();
  });
});
