/**
 * Conversational-scenario contract (epic #539 · slice #541 · Fable-5 frozen design).
 *
 * The ask box composes a formula LADDER using the notebook's own `Cell[]` shape
 * (with index wires) — so `recomputeNotebook` (the kernel) propagates the learner's
 * numbers DOWN the ladder and the LLM never relays a computed value (the fabrication
 * vector this whole design exists to prevent, Fable-5 R1). This module is the thin
 * server contract: the `compose_scenario` tool the model fills, the scenario envelope
 * the client carries, and the figure-stripped summary the MODEL sees (state + full
 * render live on the client; the model only gets a compact recompute — R4 token budget).
 */
import type { Registry } from '$lib/physics/spec';
import { defaultInputs } from '$lib/physics/registry';
import { recomputeNotebook, type Cell } from '$lib/lab/notebook';

export const SCENARIO_VERSION = 1 as const;
/** Fable-5: bound the ladder so an open tool can't bloat state / the token budget. */
export const MAX_SCENARIO_CELLS = 12;
export const COMPOSE_SCENARIO_TOOL = 'compose_scenario';

/** The scenario the LLM composes + the client carries across turns (state lives client-side). */
export interface AskScenario {
  v: typeof SCENARIO_VERSION;
  cells: Cell[];
}

/** The `compose_scenario` function-tool definition handed to the LLM (OpenAI shape). */
export function composeScenarioTool() {
  return {
    type: 'function' as const,
    function: {
      name: COMPOSE_SCENARIO_TOOL,
      description:
        'Compose an ordered ladder of physics formulas for a scenario the user describes ' +
        '(e.g. "launch a 100 kg payload to sub-orbit"). Seed each formula\'s inputs ONLY with ' +
        'values the user stated or a known preset — NEVER invent a number. To carry a computed ' +
        'value from an earlier step into a later one, add a wire {fromIndex, output, toInput} — ' +
        'the kernel substitutes it; do NOT copy a computed number into inputs yourself. Use this ' +
        'whenever the user wants to work a scenario, not a one-off fact. The kernel recomputes and ' +
        'returns each step; narrate from that.',
      parameters: {
        type: 'object',
        additionalProperties: false,
        required: ['cells'],
        properties: {
          cells: {
            type: 'array',
            description: `Ordered formula steps (max ${MAX_SCENARIO_CELLS}).`,
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['formulaId', 'inputs'],
              properties: {
                formulaId: { type: 'string', description: 'A kernel formula id.' },
                inputs: {
                  type: 'object',
                  description:
                    'Input key → value. Only keys the user pinned or a preset sets; omit the rest ' +
                    '(the kernel default stands). Wired inputs are set by the wire, not here.',
                },
                wires: {
                  type: 'array',
                  description: "Carry an EARLIER step's output into this step's input.",
                  items: {
                    type: 'object',
                    additionalProperties: false,
                    required: ['fromIndex', 'output', 'toInput'],
                    properties: {
                      fromIndex: { type: 'number', description: 'Index of the earlier step.' },
                      output: { type: 'string', description: "That step's output key." },
                      toInput: { type: 'string', description: "This step's input key to fill." },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  };
}

/** Parse + guard raw tool args into a scenario. Throws (REJECT) on a malformed shape. */
export function parseScenarioArgs(args: unknown): AskScenario {
  const rawCells = (args as { cells?: unknown })?.cells;
  if (!Array.isArray(rawCells)) throw new Error('compose_scenario: `cells` must be an array');
  if (rawCells.length === 0) throw new Error('compose_scenario: `cells` is empty');
  if (rawCells.length > MAX_SCENARIO_CELLS) {
    throw new Error(`compose_scenario: too many cells (max ${MAX_SCENARIO_CELLS})`);
  }
  const cells: Cell[] = rawCells.map((c, i) => {
    const cell = c as { formulaId?: unknown; inputs?: unknown; wires?: unknown };
    if (typeof cell.formulaId !== 'string') {
      throw new Error(`compose_scenario: cell ${i} missing a string formulaId`);
    }
    const inputs =
      cell.inputs && typeof cell.inputs === 'object' && !Array.isArray(cell.inputs)
        ? (cell.inputs as Record<string, number | string>)
        : {};
    const wires = Array.isArray(cell.wires)
      ? (cell.wires as { fromIndex: number; output: string; toInput: string }[])
      : undefined;
    return { formulaId: cell.formulaId, inputs, wires };
  });
  return { v: SCENARIO_VERSION, cells };
}

/**
 * Merge each cell's user-stated inputs OVER the formula defaults, so an unspecified
 * input keeps the kernel default ("the default stands") instead of computing on
 * `undefined`. The model seeds only what the user pinned; this completes the rest.
 * Exported so the client hydrates identically before it recomputes for rendering.
 */
export function hydrateCells(cells: Cell[], registry: Registry): Cell[] {
  return cells.map((c) => {
    const def = registry.get(c.formulaId);
    return def ? { ...c, inputs: { ...defaultInputs(def), ...c.inputs } } : c;
  });
}

/** One step as the MODEL sees it — figure stripped, numbers the kernel actually produced. */
export interface ScenarioStepSummary {
  formulaId: string;
  status: string;
  values?: Record<string, { value: number; units: string }>;
  assumptions?: string[];
  resolvedInputs?: Record<string, number | string>;
  reason?: string;
}

/**
 * Recompute the ladder and shape a COMPACT, figure-stripped summary for the model to
 * narrate from. The client recomputes the same `cells` locally for full rendering — the
 * heavy figures never ride the model's context (Fable-5 R4). The kernel owns every number.
 */
export function summariseScenario(scenario: AskScenario, registry: Registry): ScenarioStepSummary[] {
  const computed = recomputeNotebook(hydrateCells(scenario.cells, registry), registry);
  return computed.map((c, i) => {
    const formulaId = scenario.cells[i]?.formulaId ?? '?';
    if (c.status === 'ok' || c.status === 'fail') {
      return {
        formulaId,
        status: c.status,
        values: c.result.values,
        assumptions: c.result.assumptions,
        resolvedInputs: c.resolvedInputs,
        reason: c.result.status.ok ? undefined : c.result.status.reasonKey,
      };
    }
    return { formulaId, status: c.status, reason: describeProblem(c) };
  });
}

function describeProblem(c: { status: string } & Record<string, unknown>): string {
  switch (c.status) {
    case 'upstream-failed':
      return `input "${String(c.blockedInput)}" is fed by step ${String(c.fromIndex)}, which did not compute`;
    case 'invalid-wire':
      return `wire from step ${String(c.fromIndex)} names output "${String(c.output)}", which that formula does not produce`;
    case 'compute-error':
      return `formula "${String(c.formulaId)}" could not compute the given inputs`;
    case 'unknown-formula':
      return `no formula "${String(c.formulaId)}" in the kernel`;
    default:
      return c.status;
  }
}
