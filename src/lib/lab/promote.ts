/**
 * Promote a Canvas subgraph into a linear Notebook (S5 · #463 · pre-review D).
 *
 * Every acyclic subgraph IS expressible: the linear engine allows fan-in
 * (multiple wires per cell) and fan-out (many consumers of one source) — its
 * only constraint is source-before-consumer, which topological order satisfies
 * by construction. So the refusal set is deliberately narrow:
 *   1. a cycle in the closure  → `lab.promote.reason-cycle` (reachable only
 *      via hostile/stale docs; the UI blocks creation);
 *   2. closure > MAX_CELLS     → `lab.promote.reason-too-big`.
 *
 * In-edges from UNSELECTED nodes do not refuse and are never snapshotted into
 * frozen defaults (a live-looking notebook computed from a dead value would be
 * a quiet lie) — the upstream closure is AUTO-INCLUDED and reported, so the
 * confirm UI can say "promotes N cards (M upstream dependencies included)".
 *
 * Determinism: same graph + same selection → same order, always (the graph
 * engine's stable tiebreak).
 */
import { MAX_CELLS } from './codec';
import { graphOrder, type GraphNode } from './graph';
import type { CellWire } from './notebook';

export interface PromotedCell {
  /** The source node's id (the UI regenerates fresh ids on seed). */
  sourceId: string;
  formulaId: string;
  inputs: Record<string, number | string>;
  wires: CellWire[];
}

export type PromoteResult =
  | {
      ok: true;
      /** Topologically ordered, index-wired — seedable as a custom Notebook. */
      cells: PromotedCell[];
      /** Ids the user selected. */
      selected: string[];
      /** Ids auto-included as upstream dependencies (the confirm-UI line). */
      includedUpstream: string[];
    }
  | { ok: false; reasonKey: 'lab.promote.reason-cycle' | 'lab.promote.reason-too-big' };

/** Upstream closure of the selection: everything a selected node (transitively) consumes. */
function upstreamClosure(nodes: GraphNode[], selectedIds: ReadonlySet<string>): Set<string> {
  const byId = new Map(nodes.map((n) => [n.id, n] as const));
  const closure = new Set<string>();
  const queue = [...selectedIds].filter((id) => byId.has(id));
  while (queue.length > 0) {
    const id = queue.shift()!;
    if (closure.has(id)) continue;
    closure.add(id);
    for (const w of byId.get(id)?.wires ?? []) {
      if (byId.has(w.fromId)) queue.push(w.fromId);
    }
  }
  return closure;
}

export function promoteSubgraph(
  nodes: GraphNode[],
  selectedIds: ReadonlySet<string>,
): PromoteResult {
  const closure = upstreamClosure(nodes, selectedIds);
  if (closure.size === 0) return { ok: false, reasonKey: 'lab.promote.reason-too-big' };
  if (closure.size > MAX_CELLS) return { ok: false, reasonKey: 'lab.promote.reason-too-big' };

  // Order + cycle detection on the closure subset, via the graph engine's own
  // sort (same stable tiebreak — promote order ≡ recompute order, provably).
  const subset = nodes.filter((n) => closure.has(n.id));
  const { order, cyclic } = graphOrder(subset);
  if (cyclic.length > 0) return { ok: false, reasonKey: 'lab.promote.reason-cycle' };

  const posOf = new Map(order.map((id, pos) => [id, pos] as const));
  const byId = new Map(subset.map((n) => [n.id, n] as const));
  const cells: PromotedCell[] = order.map((id) => {
    const n = byId.get(id)!;
    const wires: CellWire[] = (n.wires ?? [])
      .map((w) => {
        const fromPos = posOf.get(w.fromId);
        if (fromPos === undefined) return null; // outside the graph entirely
        return { fromIndex: fromPos, output: w.output, toInput: w.toInput };
      })
      .filter((w): w is CellWire => w !== null);
    return { sourceId: n.id, formulaId: n.formulaId, inputs: { ...n.inputs }, wires };
  });

  return {
    ok: true,
    cells,
    selected: [...selectedIds].filter((id) => closure.has(id)),
    includedUpstream: [...closure].filter((id) => !selectedIds.has(id)),
  };
}
