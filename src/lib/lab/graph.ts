/**
 * The Canvas graph recompute engine (S5 · #463 · pre-review decision A).
 *
 * Free-form wiring makes a notebook a DAG — but the hardened linear engine
 * (`notebook.ts`) is the TRUSTED core whose fail-honest discipline the whole
 * lab depends on, so this module does NOT generalize it. It topo-sorts the
 * graph and DELEGATES: under topological order every honoured wire is
 * backward, so `recomputeNotebook` applies verbatim — invalid-wire,
 * upstream-failed, units-match, finite-value and compute-error hardening all
 * come for free, with a zero-line diff to the core.
 *
 * What this module adds is exactly the part a linear order cannot express:
 *  - CYCLES. A hostile or stale `.orrlab` canvas can carry them (the Canvas UI
 *    refuses to create one, but decode is an untrusted inlet). Cycle members
 *    surface as `cycle`; nodes fed (transitively) by a cycle surface as
 *    `upstream-cycle` — never silently dropped, never computed from defaults
 *    under a broken graph (that would be a fake green).
 *  - ID-keyed wires. Nodes are id-addressed (the Canvas model); wires with an
 *    unknown `fromId` are un-honoured exactly like the linear engine treats an
 *    out-of-range index (the input keeps its own value).
 *
 * Determinism: topological order breaks ties by the nodes' ARRAY order, so the
 * same graph always recomputes and promotes identically.
 */
import type { Registry } from '$lib/physics/spec';
import { recomputeNotebook, type Cell, type CellComputed } from './notebook';

/** An id-keyed wire: pull `output` of node `fromId` into this node's `toInput`. */
export interface GraphWire {
  fromId: string;
  output: string;
  toInput: string;
}

/** A canvas node — a formula instance addressed by stable id. */
export interface GraphNode {
  id: string;
  formulaId: string;
  inputs: Record<string, number | string>;
  wires?: GraphWire[];
}

export type NodeComputed = CellComputed | { status: 'cycle' } | { status: 'upstream-cycle' };

export interface GraphResult {
  /** Per-node computed state, id-keyed. */
  states: Map<string, NodeComputed>;
  /** The deterministic topological order of the acyclic part (node ids). */
  order: string[];
}

/**
 * Kahn's algorithm over the wire edges, stable by array order. Returns the
 * topo order of the acyclic part; whatever remains is the cyclic residue.
 */
function topoSort(nodes: GraphNode[]): { order: number[]; residue: Set<number> } {
  const indexOf = new Map<string, number>();
  nodes.forEach((n, i) => {
    if (!indexOf.has(n.id)) indexOf.set(n.id, i); // duplicate id: first wins, rest unwired
  });

  const inDeg = new Array<number>(nodes.length).fill(0);
  const outEdges: number[][] = nodes.map(() => []);
  nodes.forEach((n, i) => {
    for (const w of n.wires ?? []) {
      const from = indexOf.get(w.fromId);
      if (from === undefined || from === i) continue; // unknown source / self: un-honoured
      outEdges[from].push(i);
      inDeg[i] += 1;
    }
  });

  const order: number[] = [];
  // Stable frontier: always pop the lowest-index ready node (array-order tiebreak).
  const ready: number[] = [];
  inDeg.forEach((d, i) => {
    if (d === 0) ready.push(i);
  });
  while (ready.length > 0) {
    ready.sort((a, b) => a - b);
    const i = ready.shift()!;
    order.push(i);
    for (const j of outEdges[i]) {
      inDeg[j] -= 1;
      if (inDeg[j] === 0) ready.push(j);
    }
  }

  const residue = new Set<number>();
  nodes.forEach((_, i) => {
    if (!order.includes(i)) residue.add(i);
  });
  return { order, residue };
}

/**
 * Split the cyclic residue into actual cycle MEMBERS vs nodes merely
 * downstream of a cycle. A residue node is a member iff it can reach itself
 * through residue edges (every residue node has ≥1 residue dependency, so the
 * non-members are pure downstream).
 */
function cycleMembers(nodes: GraphNode[], residue: Set<number>): Set<number> {
  const indexOf = new Map<string, number>();
  nodes.forEach((n, i) => {
    if (!indexOf.has(n.id)) indexOf.set(n.id, i);
  });
  const out: Map<number, number[]> = new Map();
  for (const i of residue) {
    for (const w of nodes[i].wires ?? []) {
      const from = indexOf.get(w.fromId);
      if (from !== undefined && residue.has(from)) {
        const list = out.get(from) ?? [];
        list.push(i);
        out.set(from, list);
      }
    }
  }
  const members = new Set<number>();
  for (const start of residue) {
    // BFS from `start` through residue edges; reaching `start` again = on a cycle.
    const seen = new Set<number>();
    const queue = [...(out.get(start) ?? [])];
    while (queue.length > 0) {
      const i = queue.shift()!;
      if (i === start) {
        members.add(start);
        break;
      }
      if (seen.has(i)) continue;
      seen.add(i);
      queue.push(...(out.get(i) ?? []));
    }
  }
  return members;
}

/** Recompute a canvas graph. Pure; O(V+E) topo + the linear engine's cost. */
export function recomputeGraph(nodes: GraphNode[], registry: Registry): GraphResult {
  const { order, residue } = topoSort(nodes);
  const members = residue.size > 0 ? cycleMembers(nodes, residue) : new Set<number>();

  // Build the linear cells in topo order, remapping id wires → topo indices.
  const topoPos = new Map<number, number>(); // node index → position in `order`
  order.forEach((nodeIdx, pos) => topoPos.set(nodeIdx, pos));
  const indexOf = new Map<string, number>();
  nodes.forEach((n, i) => {
    if (!indexOf.has(n.id)) indexOf.set(n.id, i);
  });

  const cells: Cell[] = order.map((nodeIdx) => {
    const n = nodes[nodeIdx];
    const wires = (n.wires ?? [])
      .map((w) => {
        const from = indexOf.get(w.fromId);
        const fromPos = from === undefined ? undefined : topoPos.get(from);
        if (fromPos === undefined) return null; // unknown or cyclic source: un-honoured
        return { fromIndex: fromPos, output: w.output, toInput: w.toInput };
      })
      .filter((w): w is NonNullable<typeof w> => w !== null);
    return { formulaId: n.formulaId, inputs: n.inputs, wires };
  });

  const computed = recomputeNotebook(cells, registry);

  const states = new Map<string, NodeComputed>();
  nodes.forEach((n, i) => {
    if (states.has(n.id)) return; // duplicate id: first occurrence owns the state
    if (residue.has(i)) {
      states.set(n.id, members.has(i) ? { status: 'cycle' } : { status: 'upstream-cycle' });
    } else {
      states.set(n.id, computed[topoPos.get(i)!]);
    }
  });

  return { states, order: order.map((i) => nodes[i].id) };
}

/**
 * Would adding `fromId → toId` close a cycle? The Canvas UI's predictive
 * wire-creation check (refuse + toast) — the engine-level handling above stays
 * mandatory regardless (untrusted decode).
 */
export function wouldCycle(nodes: GraphNode[], fromId: string, toId: string): boolean {
  if (fromId === toId) return true;
  // Cycle iff `fromId` is reachable FROM `toId` along existing wires.
  const seen = new Set<string>();
  const queue = [toId];
  while (queue.length > 0) {
    const id = queue.shift()!;
    if (id === fromId) return true;
    if (seen.has(id)) continue;
    seen.add(id);
    // Follow data flow forward: push every node that consumes `id`'s outputs.
    for (const n of nodes) {
      if ((n.wires ?? []).some((w) => w.fromId === id)) queue.push(n.id);
    }
  }
  return false;
}
