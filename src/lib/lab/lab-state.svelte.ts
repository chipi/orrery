/**
 * The shared /lab card-state owner (S5 step 4 · #463 · pre-review E).
 *
 * "One model, three views" becomes structural here: Notebook and Canvas render
 * the SAME `$state` cell list — switching views can never lose an edit,
 * because there is exactly one owner and the views are projections. Before S5
 * the Notebook component owned this state privately (its own header said so),
 * which was fine for one view and a lie waiting to happen for two.
 *
 * Instance-per-page, NOT module-global: a module-level `$state` would leak
 * between SSR requests. `/lab/+page.svelte` calls `createLabState(goal)` once
 * and passes the instance down; the goal-change effect re-seeds through it.
 *
 * What lives here: the cells (with canvas positions riding on them), the
 * restored/custom-notebook flags, and the seed/restore/mutate actions every
 * view shares. What stays view-local: share/focus/load-error UI state, and
 * each view's own recompute derivation (linear for Notebook, graph for
 * Canvas).
 */
import { untrack } from 'svelte';
import type { Goal } from '$lib/physics/spec';
import { REGISTRY, defaultInputs } from '$lib/physics/registry';
import type { CellWire } from './notebook';
import type { CodecCell, DecodedOrrlabCell, OrrlabCell } from './codec';

/** The shared UI cell — recompute Cell + presentational extras. */
export interface LabCell {
  id: string;
  formulaId: string;
  inputs: Record<string, number | string>;
  wires: CellWire[];
  selection?: Record<string, number | string>;
  narrativeKey?: string;
  removable: boolean;
  note?: string; // free text from a loaded .orrlab file — survives load→save
  position?: { x: number; y: number }; // canvas layout (S5); undefined until placed
}

export interface LabState {
  readonly cells: LabCell[];
  readonly restored: boolean;
  readonly restoredTitle: string;
  /** Replace the whole list (view mutations go through the views' own helpers). */
  setCells(next: LabCell[]): void;
  /** Re-seed from a goal path (goal switch / initial load). Clears restore state. */
  seedFromGoal(goal: Goal): void;
  /** Adopt decoded cells (?nb= link or .orrlab file) as a custom notebook. */
  restore(cells: DecodedOrrlabCell[], title?: string): void;
  /** Codec projections. */
  toCodec(): CodecCell[];
  toOrrlab(): OrrlabCell[];
  /** Canvas positions as the codec's id-keyed map (only placed cards). */
  positions(): Record<string, { x: number; y: number }>;
}

// Ids: seed cells get deterministic `s{i}` (hydration-stable — SSR + client
// agree); cells created client-side get a uuid (restore/add run in-browser).
const uid = (): string => crypto.randomUUID();

function seed(goal: Goal): LabCell[] {
  return goal.path.map((step, i) => {
    const def = REGISTRY.get(step.formulaId)!;
    const inputKeys = new Set(def.inputs.map((f) => f.key));
    const preset = Object.fromEntries(
      Object.entries(step.presetInputs ?? {}).filter(([k]) => inputKeys.has(k)),
    );
    return {
      id: `s${i}`,
      formulaId: step.formulaId,
      inputs: { ...defaultInputs(def), ...preset },
      wires: (step.wiresFrom ?? []).map((w) => ({
        fromIndex: w.fromStep,
        output: w.output,
        toInput: w.toInput,
      })),
      narrativeKey: step.narrativeKey,
      removable: false,
    };
  });
}

export function createLabState(goal: Goal): LabState {
  let cells = $state<LabCell[]>(untrack(() => seed(goal)));
  let restored = $state(false);
  let restoredTitle = $state('');

  return {
    get cells() {
      return cells;
    },
    get restored() {
      return restored;
    },
    get restoredTitle() {
      return restoredTitle;
    },
    setCells(next: LabCell[]) {
      cells = next;
    },
    seedFromGoal(g: Goal) {
      cells = seed(g);
      restored = false;
      restoredTitle = '';
    },
    restore(decoded: DecodedOrrlabCell[], title = '') {
      cells = decoded.map((c) => ({
        id: uid(),
        formulaId: c.formulaId,
        inputs: c.inputs,
        wires: c.wires ?? [],
        selection: c.selection,
        removable: true,
        note: c.note,
        position: c.position,
      }));
      restored = true;
      restoredTitle = title;
    },
    toCodec() {
      return cells.map((c) => ({
        formulaId: c.formulaId,
        inputs: c.inputs,
        selection: c.selection,
        wires: c.wires,
      }));
    },
    toOrrlab() {
      return cells.map((c) => ({
        id: c.id,
        formulaId: c.formulaId,
        inputs: c.inputs,
        selection: c.selection,
        wires: c.wires,
        note: c.note,
      }));
    },
    positions() {
      const out: Record<string, { x: number; y: number }> = {};
      for (const c of cells) if (c.position) out[c.id] = { ...c.position };
      return out;
    },
  };
}
