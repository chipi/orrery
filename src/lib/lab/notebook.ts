/**
 * The notebook recompute engine (S3b · RFC-037 §10 S3 · plan M4/B3).
 *
 * A notebook is an ordered list of formula cells. A cell may WIRE an input from
 * an EARLIER cell's declared output (index-based — the codec's model, S3c). This
 * module is the pure, framework-free core: given cells + the registry, it returns
 * one computed state per cell. It lives in `$lib/lab` (app-side orchestration),
 * NOT the kernel — it calls kernel `compute()` but adds no physics.
 *
 * Wire discipline (plan B3, the honesty line made mechanical):
 *   - a wire is honoured ONLY when its source is an EARLIER cell (index < i) that
 *     computed `ok` AND declares the named output. Index-order, no topological
 *     sort (M4): a forward/self/cyclic wire is silently un-honoured.
 *   - if a wired source is `fail`/`upstream-failed`/absent, the cell is
 *     `upstream-failed` — it does NOT fall back to the input default. Computing a
 *     verdict from a default under a red upstream would be a fake green.
 */
import type { FormulaResult, Registry } from '$lib/physics/spec';

/** A wire: pull `output` of an earlier cell (by index) into `toInput`. */
export interface CellWire {
  fromIndex: number;
  output: string;
  toInput: string;
}

/** A notebook cell — a formula instance with its inputs + index-based wires. */
export interface Cell {
  formulaId: string;
  inputs: Record<string, number | string>;
  wires?: CellWire[];
}

/**
 * One cell's computed state.
 *   ok               — the formula computed feasibly
 *   fail             — the formula ran but is infeasible (fail-honest; keeps result)
 *   upstream-failed  — a wired input could not be resolved (no compute attempted)
 *   unknown-formula  — the formulaId is not in the registry (hostile/stale decode)
 */
export type CellComputed =
  | {
      status: 'ok' | 'fail';
      result: FormulaResult;
      /** inputs actually used (wired values substituted in). */
      resolvedInputs: Record<string, number | string>;
      /** input keys that were driven by a wire (rendered read-only/derived). */
      wiredKeys: string[];
    }
  | {
      status: 'upstream-failed';
      /** the input that could not be resolved, and the upstream cell that failed it. */
      blockedInput: string;
      fromIndex: number;
      wiredKeys: string[];
    }
  | { status: 'unknown-formula'; formulaId: string };

/**
 * Linear index-order recompute. O(n · wires) — trivially cheap for M1 (closed-form
 * formulas, ≤~95-pt curves); no memoisation until the porkchop (plan §3 S3b).
 */
export function recomputeNotebook(cells: Cell[], registry: Registry): CellComputed[] {
  const out: CellComputed[] = [];

  for (let i = 0; i < cells.length; i++) {
    const cell = cells[i];
    const resolved: Record<string, number | string> = { ...cell.inputs };
    const wiredKeys: string[] = [];
    let blocked: { input: string; fromIndex: number } | null = null;

    for (const w of cell.wires ?? []) {
      // Index-order: only an EARLIER cell can feed this one. Forward/self/cyclic
      // wires are un-honoured (the input keeps its own value, unwired).
      if (w.fromIndex < 0 || w.fromIndex >= i) continue;
      wiredKeys.push(w.toInput);
      const src = out[w.fromIndex];
      if (src.status !== 'ok') {
        blocked = { input: w.toInput, fromIndex: w.fromIndex };
        break;
      }
      const q = src.result.values[w.output];
      if (q === undefined) {
        blocked = { input: w.toInput, fromIndex: w.fromIndex };
        break;
      }
      resolved[w.toInput] = q.value;
    }

    if (blocked) {
      out.push({
        status: 'upstream-failed',
        blockedInput: blocked.input,
        fromIndex: blocked.fromIndex,
        wiredKeys,
      });
      continue;
    }

    const def = registry.get(cell.formulaId);
    if (!def) {
      out.push({ status: 'unknown-formula', formulaId: cell.formulaId });
      continue;
    }

    const result = def.compute(resolved);
    out.push({
      status: result.status.ok ? 'ok' : 'fail',
      result,
      resolvedInputs: resolved,
      wiredKeys,
    });
  }

  return out;
}
