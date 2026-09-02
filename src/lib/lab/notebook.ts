/**
 * The notebook recompute engine (S3b · RFC-037 §10 S3 · plan M4/B3).
 *
 * A notebook is an ordered list of formula cells. A cell may WIRE an input from
 * an EARLIER cell's declared output (index-based — the codec's model, S3c). This
 * module is the pure, framework-free core: given cells + the registry, it returns
 * one computed state per cell. It lives in `$lib/lab` (app-side orchestration),
 * NOT the kernel — it calls kernel `compute()` but adds no physics.
 *
 * It is also S3c's TRUSTED core: the share-URL codec decodes UNTRUSTED input into
 * `Cell[]` and feeds it here, so every hostile shape must degrade fail-honest, never
 * throw and never fake a value. Hardened after the S3a+S3b opus review:
 *   - wire `fromIndex` must be a real earlier integer index (B-guard);
 *   - a wired output must be DECLARED by the source formula's static `OutputSpec`
 *     (∪ `selectionOutputs`) — a typo'd/garbage output is `invalid-wire`, distinct
 *     from a genuinely-red upstream (M-2);
 *   - a wired value that is `undefined`/non-finite blocks (B-2) — no `NaN` readout;
 *   - `compute()` is wrapped: an out-of-domain input (e.g. an unknown body id, which
 *     `bodyGravityMs2` throws on) becomes `compute-error`, not a page crash (B-1).
 *
 * Wire discipline (plan B3, the honesty line made mechanical): a wire is honoured
 * ONLY when its source is an EARLIER `ok` cell that DECLARES the named output and
 * that output is a finite value. Otherwise the cell surfaces the reason and does
 * NOT fall back to the input default — a verdict computed from a default under a
 * red upstream would be a fake green.
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
 *   upstream-failed  — a wired source is not `ok`, or declared its output but yielded
 *                      no finite value (no compute attempted; never a default fallback)
 *   invalid-wire     — a wire names an output the source formula does NOT declare
 *                      (authoring typo / hostile decode); the upstream did NOT fail
 *   compute-error    — `compute()` threw (out-of-domain input, e.g. unknown body id)
 *   unknown-formula  — the formulaId is not in the registry (hostile/stale decode)
 */
export type CellComputed =
  | {
      status: 'ok' | 'fail';
      result: FormulaResult;
      /** inputs actually used (wired values substituted in). */
      resolvedInputs: Record<string, number | string>;
      /** input keys that a wire targeted (rendered read-only/derived). */
      wiredKeys: string[];
    }
  | { status: 'upstream-failed'; blockedInput: string; fromIndex: number; wiredKeys: string[] }
  | {
      status: 'invalid-wire';
      blockedInput: string;
      fromIndex: number;
      output: string;
      wiredKeys: string[];
    }
  | { status: 'compute-error'; formulaId: string; wiredKeys: string[] }
  | { status: 'unknown-formula'; formulaId: string };

type WireProblem =
  | { status: 'upstream-failed'; blockedInput: string; fromIndex: number }
  | { status: 'invalid-wire'; blockedInput: string; fromIndex: number; output: string };

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
    let problem: WireProblem | null = null;

    for (const w of cell.wires ?? []) {
      // Index-order: only an EARLIER cell (a real integer index) can feed this one.
      // Forward/self/cyclic/non-integer/negative wires are un-honoured (the input
      // keeps its own value, unwired) — this also stops a garbage decoded index
      // from dereferencing `out[NaN]`.
      if (!Number.isInteger(w.fromIndex) || w.fromIndex < 0 || w.fromIndex >= i) continue;
      wiredKeys.push(w.toInput);

      const src = out[w.fromIndex];
      if (src.status !== 'ok') {
        problem = { status: 'upstream-failed', blockedInput: w.toInput, fromIndex: w.fromIndex };
        break;
      }

      // Existence is checked against the source's DECLARED outputs (static contract),
      // not the runtime values map — a wire naming an undeclared output is an
      // invalid wire, NOT an upstream failure.
      const srcDef = registry.get(cells[w.fromIndex].formulaId);
      const outSpec =
        srcDef?.outputs.find((o) => o.key === w.output) ??
        srcDef?.selectionOutputs?.find((o) => o.key === w.output);
      if (!outSpec) {
        problem = {
          status: 'invalid-wire',
          blockedInput: w.toInput,
          fromIndex: w.fromIndex,
          output: w.output,
        };
        break;
      }

      // UNITS MATCH (the Card contract, spec.ts — S5 pre-review latent-gap fix):
      // declaration alone let a hostile .orrlab wire seconds into km/s and render
      // a silently-wrong green. Numeric wires must match the target
      // FieldSpec.units EXACTLY (no implicit conversion; same rule the goal
      // registry enforces statically in its B2 test). Skipped only when the
      // destination formula is unknown — `unknown-formula` surfaces later.
      const dstField = registry.get(cell.formulaId)?.inputs?.find((f) => f.key === w.toInput);
      if (dstField && dstField.units !== outSpec.units) {
        problem = {
          status: 'invalid-wire',
          blockedInput: w.toInput,
          fromIndex: w.fromIndex,
          output: w.output,
        };
        break;
      }

      const q = src.result.values[w.output];
      if (q === undefined || (typeof q.value === 'number' && !Number.isFinite(q.value))) {
        problem = { status: 'upstream-failed', blockedInput: w.toInput, fromIndex: w.fromIndex };
        break;
      }
      resolved[w.toInput] = q.value;
    }

    if (problem) {
      out.push({ ...problem, wiredKeys });
      continue;
    }

    const def = registry.get(cell.formulaId);
    if (!def) {
      out.push({ status: 'unknown-formula', formulaId: cell.formulaId });
      continue;
    }

    let result: FormulaResult;
    try {
      result = def.compute(resolved);
    } catch {
      // An out-of-domain input (e.g. an unknown body id — bodyGravityMs2 throws)
      // must degrade to an honest cell state, never crash the whole notebook.
      out.push({ status: 'compute-error', formulaId: cell.formulaId, wiredKeys });
      continue;
    }

    out.push({
      status: result.status.ok ? 'ok' : 'fail',
      result,
      resolvedInputs: resolved,
      wiredKeys,
    });
  }

  return out;
}
