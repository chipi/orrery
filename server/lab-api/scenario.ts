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
import { recomputeNotebook, type Cell } from '$lib/lab/notebook';
import {
  hydrateCells,
  MAX_SCENARIO_CELLS,
  SCENARIO_VERSION,
  SCENARIO_PRESETS,
  SCENARIO_PRESET_NAMES,
  type AskScenario,
} from '$lib/lab/ask-scenario';

export const COMPOSE_SCENARIO_TOOL = 'compose_scenario';
export const UPDATE_SCENARIO_TOOL = 'update_scenario';
export type { AskScenario };
export { MAX_SCENARIO_CELLS, SCENARIO_VERSION } from '$lib/lab/ask-scenario';

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
                target: {
                  type: 'string',
                  enum: SCENARIO_PRESET_NAMES,
                  description:
                    'Optional named target for a VAGUE intent ("to the Moon", "low orbit"). The ' +
                    'server fills the concrete inputs — use this instead of guessing a number.',
                },
                inputs: {
                  type: 'object',
                  description:
                    'Input key → value. Only keys the user pinned; omit the rest (the kernel ' +
                    'default or the target preset stands). Wired inputs are set by the wire, not here.',
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

/** The `update_scenario` tool — deterministic value refinement of the CURRENT ladder. */
export function updateScenarioTool() {
  return {
    type: 'function' as const,
    function: {
      name: UPDATE_SCENARIO_TOOL,
      description:
        'Change values in the CURRENT scenario (from a follow-up like "make it 200 kg"). The ' +
        'server applies each change to the named cell/input and recomputes; everything else is ' +
        'untouched. Use this for value tweaks — do NOT re-compose. You cannot set a WIRED input ' +
        '(it is computed from an earlier step); change the source instead. For a different formula ' +
        'set, use compose_scenario.',
      parameters: {
        type: 'object',
        additionalProperties: false,
        required: ['changes'],
        properties: {
          changes: {
            type: 'array',
            description: 'The value edits to apply to the current scenario.',
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['cell', 'input', 'value'],
              properties: {
                cell: { type: 'number', description: 'Index of the step to edit.' },
                input: { type: 'string', description: 'The input key on that step.' },
                value: { description: 'The new value (number or string).' },
              },
            },
          },
        },
      },
    },
  };
}

export interface ScenarioChange {
  cell: number;
  input: string;
  value: number | string;
}

/** Parse + guard raw update args into a change list. Throws (REJECT) on a malformed shape. */
export function parseUpdateArgs(args: unknown): ScenarioChange[] {
  const raw = (args as { changes?: unknown })?.changes;
  if (!Array.isArray(raw) || raw.length === 0) {
    throw new Error('update_scenario: `changes` must be a non-empty array');
  }
  return raw.map((c, i) => {
    const ch = c as { cell?: unknown; input?: unknown; value?: unknown };
    if (!Number.isInteger(ch.cell))
      throw new Error(`update_scenario: change ${i} needs an integer cell`);
    if (typeof ch.input !== 'string')
      throw new Error(`update_scenario: change ${i} needs a string input`);
    if (typeof ch.value !== 'number' && typeof ch.value !== 'string') {
      throw new Error(`update_scenario: change ${i} value must be a number or string`);
    }
    return { cell: ch.cell as number, input: ch.input, value: ch.value };
  });
}

/**
 * Apply value changes to the CURRENT scenario deterministically (slice #543): only the
 * named inputs move, everything else is byte-identical ("unrelated inputs untouched" is a
 * mechanical property, not a prompt hope — Fable-5). A change targeting a WIRED input is
 * REJECTED (that value is computed upstream; change the source instead), and an
 * out-of-range cell throws. Returns a new scenario (never mutates the input).
 */
export function applyScenarioUpdate(scenario: AskScenario, changes: ScenarioChange[]): AskScenario {
  const cells = scenario.cells.map((c) => ({ ...c, inputs: { ...c.inputs } }));
  for (const ch of changes) {
    if (ch.cell < 0 || ch.cell >= cells.length) {
      throw new Error(`update_scenario: no step ${ch.cell} in the scenario`);
    }
    const cell = cells[ch.cell];
    if ((cell.wires ?? []).some((w) => w.toInput === ch.input)) {
      throw new Error(
        `update_scenario: "${ch.input}" on step ${ch.cell} is computed from an earlier step — change the source instead`,
      );
    }
    cell.inputs[ch.input] = ch.value;
  }
  return { ...scenario, cells };
}

/** Parse + guard raw tool args into a scenario. Throws (REJECT) on a malformed shape. */
export function parseScenarioArgs(args: unknown): AskScenario {
  const rawCells = (args as { cells?: unknown })?.cells;
  if (!Array.isArray(rawCells)) throw new Error('compose_scenario: `cells` must be an array');
  if (rawCells.length === 0) throw new Error('compose_scenario: `cells` is empty');
  if (rawCells.length > MAX_SCENARIO_CELLS) {
    throw new Error(`compose_scenario: too many cells (max ${MAX_SCENARIO_CELLS})`);
  }
  const presetNotes: (string | null)[] = [];
  const cells: Cell[] = rawCells.map((c, i) => {
    const cell = c as {
      formulaId?: unknown;
      inputs?: unknown;
      wires?: unknown;
      target?: unknown;
    };
    if (typeof cell.formulaId !== 'string') {
      throw new Error(`compose_scenario: cell ${i} missing a string formulaId`);
    }
    const userInputs =
      cell.inputs && typeof cell.inputs === 'object' && !Array.isArray(cell.inputs)
        ? (cell.inputs as Record<string, number | string>)
        : {};
    // A named target (slice #542) fills concrete inputs UNDER what the user pinned
    // (the user's explicit number always wins); its assumption then rides the card.
    const preset = typeof cell.target === 'string' ? SCENARIO_PRESETS[cell.target] : undefined;
    presetNotes.push(preset ? preset.assumptionKey : null);
    const inputs = preset ? { ...preset.inputs, ...userInputs } : userInputs;
    const wires = Array.isArray(cell.wires)
      ? (cell.wires as { fromIndex: number; output: string; toInput: string }[])
      : undefined;
    return { formulaId: cell.formulaId, inputs, wires };
  });
  return { v: SCENARIO_VERSION, cells, presetNotes };
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
export function summariseScenario(
  scenario: AskScenario,
  registry: Registry,
): ScenarioStepSummary[] {
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
