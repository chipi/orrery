/**
 * Conversational-scenario contract (epic #539 · Fable-5 frozen design) — the SHARED
 * half both the lab-api server and the SPA import. The ask box composes a formula
 * LADDER using the notebook's own `Cell[]` shape (with index wires); `recomputeNotebook`
 * (the kernel) propagates the learner's numbers DOWN the wires, so the LLM never relays
 * a computed value. The server-only bits (the tool schema, arg-parsing, the model-facing
 * summary) live in `server/lab-api/scenario.ts` and import this module.
 */
import type { Registry } from '$lib/physics/spec';
import { defaultInputs } from '$lib/physics/registry';
import type { Cell } from './notebook';

export const SCENARIO_VERSION = 1 as const;
/** Fable-5: bound the ladder so an open tool can't bloat state / the token budget. */
export const MAX_SCENARIO_CELLS = 12;

/** The scenario the LLM composes + the client carries across turns (state lives client-side). */
export interface AskScenario {
  v: typeof SCENARIO_VERSION;
  cells: Cell[];
  /** Per-cell preset assumption key (slice #542) when the model named a `target`; the
   *  disclosure that a vague intent ("to the Moon") became a concrete input. */
  presetNotes?: (string | null)[];
}

/**
 * Named-intent presets (slice #542 · Fable-5): a DETERMINISTIC server-side table so a
 * vague intent ("to the Moon", "low orbit") becomes a concrete kernel input — the numbers
 * live here, auditable, never invented per-request in the prompt. Each carries the i18n
 * assumption key that then rides the card. Keys map to REAL shared inputs (`body`,
 * `altitudeKm`); a preset key a given formula lacks is simply ignored on that cell.
 */
export interface ScenarioPreset {
  inputs: Record<string, number | string>;
  assumptionKey: string;
}
export const SCENARIO_PRESETS: Record<string, ScenarioPreset> = {
  'sub-orbital': { inputs: { altitudeKm: 100 }, assumptionKey: 'lab.assume.target-suborbital' },
  'low-earth-orbit': { inputs: { altitudeKm: 200 }, assumptionKey: 'lab.assume.target-leo' },
  geostationary: { inputs: { altitudeKm: 35786 }, assumptionKey: 'lab.assume.target-geo' },
  moon: { inputs: { body: 'moon' }, assumptionKey: 'lab.assume.target-moon' },
  tli: { inputs: { body: 'moon', altitudeKm: 200 }, assumptionKey: 'lab.assume.target-tli' },
  mars: { inputs: { body: 'mars' }, assumptionKey: 'lab.assume.target-mars' },
  venus: { inputs: { body: 'venus' }, assumptionKey: 'lab.assume.target-venus' },
};
export const SCENARIO_PRESET_NAMES = Object.keys(SCENARIO_PRESETS);

/**
 * Merge each cell's user-stated inputs OVER the formula defaults, so an unspecified
 * input keeps the kernel default ("the default stands") instead of computing on
 * `undefined`. The model seeds only what the user pinned; this completes the rest.
 * Server and client BOTH hydrate through here so their recomputes agree exactly.
 */
export function hydrateCells(cells: Cell[], registry: Registry): Cell[] {
  return cells.map((c) => {
    const def = registry.get(c.formulaId);
    return def ? { ...c, inputs: { ...defaultInputs(def), ...c.inputs } } : c;
  });
}
