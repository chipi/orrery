import { describe, it, expect } from 'vitest';
import type { FormulaDef, Registry } from '$lib/physics/spec';
import { REGISTRY } from '$lib/physics/registry';
import {
  deriveTools,
  validateCall,
  callTool,
  UnknownToolError,
  InvalidArgumentsError,
  InjectedInputUnavailableError,
} from './registry-tools';
import { makeT } from './i18n';

const tEn = makeT('en-US');
const tJa = makeT('ja');

describe('S4 · tool derivation from the registry', () => {
  it('derives one tool per transfer-domain formula, ids = FormulaDef ids', () => {
    const tools = deriveTools(REGISTRY, { domains: ['transfer'], t: tEn });
    expect(tools.length).toBeGreaterThan(0);
    const ids = new Set(tools.map((t) => t.name));
    for (const def of REGISTRY.values()) {
      expect(ids.has(def.id)).toBe(def.domain === 'transfer');
    }
  });

  it('every derived schema is closed (additionalProperties: false) with defaults, no required', () => {
    for (const tool of deriveTools(REGISTRY, { t: tEn })) {
      expect(tool.inputSchema.additionalProperties).toBe(false);
      expect(tool.inputSchema.required).toEqual([]);
      for (const p of Object.values(tool.inputSchema.properties)) {
        expect(p.default).toBeDefined();
      }
    }
  });

  it('body/enum fields become closed string enums (no free-text body ids reach the kernel)', () => {
    for (const def of REGISTRY.values()) {
      const tool = deriveTools(REGISTRY, { domains: [def.domain], t: tEn }).find(
        (x) => x.name === def.id,
      )!;
      for (const f of def.inputs.filter((f) => !f.injected)) {
        if (f.kind === 'body' || f.kind === 'enum') {
          expect(tool.inputSchema.properties[f.key].enum?.length).toBeGreaterThan(0);
        }
      }
    }
  });

  it('injected fields never appear in a schema', () => {
    for (const tool of deriveTools(REGISTRY, { t: tEn })) {
      const def = REGISTRY.get(tool.name)!;
      for (const f of def.inputs) {
        if (f.injected) expect(tool.inputSchema.properties[f.key]).toBeUndefined();
      }
    }
  });

  it('descriptions localize — ja differs from en-US for at least one tool', () => {
    const en = deriveTools(REGISTRY, { domains: ['transfer'], t: tEn });
    const ja = deriveTools(REGISTRY, { domains: ['transfer'], t: tJa });
    expect(ja.some((tool, i) => tool.description !== en[i].description)).toBe(true);
  });
});

describe('S4 · validate-REJECT boundary (never clamp)', () => {
  const anyTransfer = [...REGISTRY.values()].find((d) => d.domain === 'transfer')!;

  it('missing fields take declared defaults', () => {
    const v = validateCall(anyTransfer, {});
    expect(v.ok).toBe(true);
    if (v.ok) {
      for (const f of anyTransfer.inputs.filter((f) => !f.injected)) {
        expect(v.inputs[f.key]).toBe(f.default);
      }
    }
  });

  it('an out-of-range number is REJECTED with the bound named — not clamped', () => {
    const numeric = [...REGISTRY.values()]
      .flatMap((d) =>
        d.inputs.filter((f) => f.kind === 'number' && f.max !== undefined).map((f) => ({ d, f })),
      )
      .at(0)!;
    const v = validateCall(numeric.d, { [numeric.f.key]: (numeric.f.max as number) * 1000 });
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.errors[0]).toContain(String(numeric.f.max));
  });

  it('an out-of-domain body id is REJECTED (kernel bodyGravityMs2 would throw)', () => {
    const bodied = [...REGISTRY.values()]
      .flatMap((d) => d.inputs.filter((f) => f.kind === 'body').map((f) => ({ d, f })))
      .at(0)!;
    const v = validateCall(bodied.d, { [bodied.f.key]: 'xyzzy' });
    expect(v.ok).toBe(false);
  });

  it('unknown keys are REJECTED and the error lists the valid inputs', () => {
    const v = validateCall(anyTransfer, { definitely_not_a_field: 1 });
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.errors[0]).toContain('unknown input');
  });

  it('non-finite numbers are REJECTED', () => {
    const numeric = anyTransfer.inputs.find((f) => f.kind === 'number');
    if (!numeric) return;
    for (const bad of [NaN, Infinity, 'twelve' as unknown as number]) {
      const v = validateCall(anyTransfer, { [numeric.key]: bad });
      expect(v.ok).toBe(false);
    }
  });
});

describe('S4 · callTool returns the kernel result verbatim + localized companions', () => {
  it('a defaults-only call on every transfer tool computes without throwing', () => {
    for (const def of [...REGISTRY.values()].filter((d) => d.domain === 'transfer')) {
      const { result, localized } = callTool(REGISTRY, def.id, {}, tEn);
      expect(result.assumptions).toBeInstanceOf(Array);
      expect(result.status.ok === true || typeof result.status === 'object').toBe(true);
      if (result.status.ok) {
        for (const key of Object.keys(result.values)) {
          expect(
            def.outputs.some((o) => o.key === key) ||
              def.selectionOutputs?.some((o) => o.key === key),
          ).toBe(true);
        }
      }
      expect(localized.title).not.toBe(def.titleKey); // key resolved, not echoed
      expect(localized.assumptions).toHaveLength(result.assumptions.length);
    }
  });

  it('kernel-emitted figures are fidelity computed — passed through untouched', () => {
    for (const def of [...REGISTRY.values()].filter((d) => d.domain === 'transfer')) {
      const { result } = callTool(REGISTRY, def.id, {}, tEn);
      if (result.figure) expect(result.figure.provenance.fidelity).toBe('computed');
    }
  });

  it('unknown tool → UnknownToolError; bad args → InvalidArgumentsError with per-field errors', () => {
    expect(() => callTool(REGISTRY, 'no-such-tool', {}, tEn)).toThrow(UnknownToolError);
    const anyTransfer = [...REGISTRY.values()].find((d) => d.domain === 'transfer')!;
    expect(() => callTool(REGISTRY, anyTransfer.id, { nope: 1 }, tEn)).toThrow(
      InvalidArgumentsError,
    );
  });
});

// ─── Synthetic-fixture coverage for spec branches no live formula exercises ──
// (S4 holistic MAJOR-2: the live-registry injected/serverCap tests were
// vacuously green — zero registry defs set either field today.)

const FIXTURE: FormulaDef = {
  id: 'fixture-injected',
  titleKey: 'lab.f.synodic.title', // any real key — resolution is not under test
  domain: 'satellite',
  tier: 1,
  prereqs: [],
  inputs: [
    {
      key: 'steps',
      labelKey: 'lab.f.synodic.title',
      units: '',
      kind: 'number',
      default: 10,
      min: 1,
      max: 10_000,
      serverCap: 100,
    },
    {
      key: 'tle',
      labelKey: 'lab.f.synodic.title',
      units: '',
      kind: 'number',
      default: 0,
      injected: true,
    },
  ],
  outputs: [{ key: 'out', labelKey: 'lab.f.synodic.title', units: '' }],
  compute: () => ({ values: {}, status: { ok: true }, assumptions: [] }),
};
const FIXTURE_REGISTRY: Registry = new Map([[FIXTURE.id, FIXTURE]]);

describe('S4 · fixture: injected + serverCap branches', () => {
  it('serverCap tightens the schema maximum below FieldSpec.max', () => {
    const [tool] = deriveTools(FIXTURE_REGISTRY, { t: tEn });
    expect(tool.inputSchema.properties.steps.maximum).toBe(100); // min(serverCap 100, max 10000)
    expect(tool.inputSchema.properties.tle).toBeUndefined(); // injected excluded
  });

  it('a value over serverCap is REJECTED naming the cap, even though FieldSpec.max allows it', () => {
    const v = validateCall(FIXTURE, { steps: 5000 });
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.errors[0]).toContain('100');
  });

  it('an injected key sent by the agent is rejected as unknown (not a caller field)', () => {
    const v = validateCall(FIXTURE, { tle: 42 });
    expect(v.ok).toBe(false);
  });

  it('a def with injected inputs refuses to compute over MCP (no undefined → NaN)', () => {
    expect(() => callTool(FIXTURE_REGISTRY, 'fixture-injected', {}, tEn)).toThrow(
      InjectedInputUnavailableError,
    );
  });
});
