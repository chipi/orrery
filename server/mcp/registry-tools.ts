/**
 * MCP tool derivation from the formula registry (S4 · #462 · RFC-037 §5/§6).
 *
 * One registry → MCP tools auto-derived: each `FormulaDef` yields exactly one
 * tool whose JSON Schema comes from `FieldSpec[]` and whose result returns the
 * kernel's `FormulaResult` — values, status, assumptions, `FigureSpec` —
 * VERBATIM (§4: "returned verbatim by the MCP server so an agent can render it
 * anywhere"). No compute is re-implemented here.
 *
 * Trust boundary (spec.ts:24 + 2026-09-01 plan review MAJOR-1): agent input is
 * REJECTED fail-honest when out of domain — never silently clamped. Clamping is
 * the share-link codec's posture (`src/lib/lab/codec.ts`), which exists so a
 * hostile URL degrades gracefully; an agent that sent isp=10000 must get an
 * error naming the bound, not a silently corrected answer.
 *
 * `FieldSpec.injected` fields (adapter-owned, e.g. fresh TLE) are excluded from
 * the schema; `serverCap` tightens `max` at this boundary only. Pure module —
 * no SDK, no transport — so derivation and validation are unit-testable alone.
 */
import type { FieldSpec, FormulaDef, FormulaResult, Registry } from '$lib/physics/spec';

/** JSON-Schema property for one input field (draft-07 subset the MCP SDK accepts). */
interface SchemaProperty {
  type: 'number' | 'string';
  description?: string;
  enum?: string[];
  minimum?: number;
  maximum?: number;
  default?: number | string;
}

export interface DerivedTool {
  /** Tool id = FormulaDef id (e.g. `interplanetary-transfer`, `porkchop`). */
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, SchemaProperty>;
    required: string[];
    additionalProperties: false;
  };
}

/** Localizer signature — `server/mcp/i18n.ts` provides it per locale. */
export type Localize = (key: string) => string;

/** The user-facing (agent-facing) cap for a numeric field at the MCP boundary. */
function boundaryMax(field: FieldSpec): number | undefined {
  if (typeof field.serverCap === 'number' && typeof field.max === 'number') {
    return Math.min(field.serverCap, field.max);
  }
  return field.serverCap ?? field.max;
}

function fieldToProperty(field: FieldSpec, t: Localize): SchemaProperty {
  const label = t(field.labelKey);
  const units = field.units ? ` [${field.units}]` : '';
  switch (field.kind) {
    case 'number': {
      const p: SchemaProperty = { type: 'number', description: `${label}${units}` };
      if (typeof field.min === 'number') p.minimum = field.min;
      const max = boundaryMax(field);
      if (typeof max === 'number') p.maximum = max;
      if (typeof field.default === 'number') p.default = field.default;
      return p;
    }
    case 'enum':
      return {
        type: 'string',
        description: label,
        enum: (field.enumValues ?? []).map((e) => e.value),
        default: field.default,
      };
    case 'body':
      return {
        type: 'string',
        description: label,
        enum: [...(field.bodyIds ?? [])],
        default: field.default,
      };
    case 'date':
      return {
        type: 'string',
        description: `${label} (ISO date, e.g. 2026-11-04)`,
        default: field.default,
      };
  }
}

/** Fields an MCP caller may set: everything except adapter-owned injected ones. */
function callerFields(def: FormulaDef): FieldSpec[] {
  return def.inputs.filter((f) => !f.injected);
}

export interface DeriveOptions {
  /** Restrict to these domains (S4 ships `['transfer']`; the gate lifts in S6). */
  domains?: FormulaDef['domain'][];
  t: Localize;
}

/** Derive the MCP tool list from the registry. Deterministic order (registry order). */
export function deriveTools(registry: Registry, opts: DeriveOptions): DerivedTool[] {
  const tools: DerivedTool[] = [];
  for (const def of registry.values()) {
    if (opts.domains && !opts.domains.includes(def.domain)) continue;
    const fields = callerFields(def);
    const properties: Record<string, SchemaProperty> = {};
    for (const f of fields) properties[f.key] = fieldToProperty(f, opts.t);
    const outputs = def.outputs.map((o) => `${o.key}${o.units ? ` [${o.units}]` : ''}`).join(', ');
    tools.push({
      name: def.id,
      description:
        `${opts.t(def.titleKey)} — outputs: ${outputs}. All results carry` +
        ` explicit assumptions and a 'computed'-fidelity figure where applicable.`,
      inputSchema: {
        type: 'object',
        properties,
        // Every field has a default — nothing is required; agents may send a subset.
        required: [],
        additionalProperties: false,
      },
    });
  }
  return tools;
}

// ─── Validate-REJECT (the untrusted MCP boundary) ───────────────────────────

export interface RejectedCall {
  ok: false;
  /** Human/agent-readable problems, one per offending field. */
  errors: string[];
}

export interface AcceptedCall {
  ok: true;
  inputs: Record<string, number | string>;
}

/**
 * Validate agent-supplied args against a formula's FieldSpec domain.
 * REJECTS on: unknown key, injected key, wrong type, non-finite number,
 * out-of-range number, out-of-domain enum/body value, malformed date.
 * Missing fields take their declared defaults (defaults are contract).
 */
export function validateCall(def: FormulaDef, raw: unknown): AcceptedCall | RejectedCall {
  const errors: string[] = [];
  const args =
    raw === undefined || raw === null
      ? {}
      : typeof raw === 'object' && !Array.isArray(raw)
        ? (raw as Record<string, unknown>)
        : undefined;
  if (args === undefined) return { ok: false, errors: ['arguments must be a JSON object'] };

  const fields = callerFields(def);
  const known = new Set(fields.map((f) => f.key));
  for (const key of Object.keys(args)) {
    if (!known.has(key)) {
      errors.push(`unknown input '${key}' — valid inputs: ${[...known].join(', ') || '(none)'}`);
    }
  }

  const inputs: Record<string, number | string> = {};
  for (const field of fields) {
    const v = args[field.key];
    if (v === undefined) {
      inputs[field.key] = field.default;
      continue;
    }
    switch (field.kind) {
      case 'number': {
        if (typeof v !== 'number' || !Number.isFinite(v)) {
          errors.push(`'${field.key}' must be a finite number`);
          break;
        }
        const max = boundaryMax(field);
        if (typeof field.min === 'number' && v < field.min) {
          errors.push(`'${field.key}' = ${v} is below the minimum ${field.min}`);
        } else if (typeof max === 'number' && v > max) {
          errors.push(`'${field.key}' = ${v} exceeds the maximum ${max}`);
        } else {
          inputs[field.key] = v;
        }
        break;
      }
      case 'enum': {
        const okValues = (field.enumValues ?? []).map((e) => e.value);
        if (typeof v !== 'string' || !okValues.includes(v)) {
          errors.push(`'${field.key}' must be one of: ${okValues.join(', ')}`);
        } else {
          inputs[field.key] = v;
        }
        break;
      }
      case 'body': {
        const okBodies = field.bodyIds ?? [];
        if (typeof v !== 'string' || !okBodies.includes(v)) {
          errors.push(`'${field.key}' must be one of: ${okBodies.join(', ')}`);
        } else {
          inputs[field.key] = v;
        }
        break;
      }
      case 'date': {
        if (typeof v !== 'string' || Number.isNaN(Date.parse(v))) {
          errors.push(`'${field.key}' must be an ISO date string`);
        } else {
          inputs[field.key] = v;
        }
        break;
      }
    }
  }

  return errors.length > 0 ? { ok: false, errors } : { ok: true, inputs };
}

// ─── Invocation ─────────────────────────────────────────────────────────────

export interface ToolCallResult {
  /** The kernel result, verbatim (values/status/assumptions/figure/epochAgeDays). */
  result: FormulaResult;
  /** Localized companions — keys stay in `result`; strings ride alongside. */
  localized: {
    title: string;
    status?: string;
    assumptions: string[];
  };
}

export class UnknownToolError extends Error {}
export class InvalidArgumentsError extends Error {
  constructor(public readonly errors: string[]) {
    super(errors.join('; '));
  }
}
/**
 * A formula declaring `injected` inputs (adapter-owned, e.g. fresh TLE) cannot
 * be served until an adapter supplies them — computing with `undefined` would
 * NaN-propagate into a silent fail-honest violation (S4 holistic MAJOR-2).
 * The MCP-TLE sub-slice (#464) builds the first adapter.
 */
export class InjectedInputUnavailableError extends Error {}

/**
 * Validate and run one tool call. Throws typed errors for the transport layer
 * to map onto MCP error responses; never clamps, never guesses.
 */
export function callTool(
  registry: Registry,
  name: string,
  rawArgs: unknown,
  t: Localize,
): ToolCallResult {
  const def = registry.get(name);
  if (!def) throw new UnknownToolError(`unknown tool '${name}'`);
  if (def.inputs.some((f) => f.injected)) {
    throw new InjectedInputUnavailableError(
      `tool '${name}' requires an adapter-owned input (e.g. fresh TLE) — not yet servable over MCP`,
    );
  }
  const validated = validateCall(def, rawArgs);
  if (!validated.ok) throw new InvalidArgumentsError(validated.errors);
  const result = def.compute(validated.inputs);
  return {
    result,
    localized: {
      title: t(def.titleKey),
      status: result.status.ok ? undefined : t(result.status.reasonKey),
      assumptions: result.assumptions.map(t),
    },
  };
}
