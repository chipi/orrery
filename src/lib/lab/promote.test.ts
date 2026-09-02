/**
 * S5 promote (#463 · pre-review D). The load-bearing invariant: promoting a
 * subgraph and running it through the LINEAR engine produces identical values
 * to recomputing the same subgraph in place — promote is a re-ordering, never
 * a re-computation. Plus the narrow refusal set and the auto-included closure.
 */
import { describe, it, expect } from 'vitest';
import { REGISTRY, defaultInputs } from '$lib/physics/registry';
import { recomputeGraph, type GraphNode } from './graph';
import { promoteSubgraph } from './promote';
import { recomputeNotebook } from './notebook';

function m1Graph(): GraphNode[] {
  // rocket → verdict, plus an unrelated island the selection will exclude.
  return [
    {
      id: 'verdict',
      formulaId: 'delta-v-margin',
      inputs: defaultInputs(REGISTRY.get('delta-v-margin')!),
      wires: [{ fromId: 'rocket', output: 'deltaV', toInput: 'capacityKms' }],
    },
    { id: 'rocket', formulaId: 'tsiolkovsky', inputs: defaultInputs(REGISTRY.get('tsiolkovsky')!) },
    { id: 'island', formulaId: 'momentum', inputs: defaultInputs(REGISTRY.get('momentum')!) },
  ];
}

describe('promoteSubgraph', () => {
  it('auto-includes the upstream closure and reports it (never freezes a wired value)', () => {
    const res = promoteSubgraph(m1Graph(), new Set(['verdict']));
    expect(res.ok).toBe(true);
    if (!res.ok) throw new Error();
    expect(res.cells.map((c) => c.sourceId)).toEqual(['rocket', 'verdict']); // topo order
    expect(res.includedUpstream).toEqual(['rocket']);
    expect(res.selected).toEqual(['verdict']);
    // the island is not in the closure — excluded.
    expect(res.cells.some((c) => c.sourceId === 'island')).toBe(false);
  });

  it('ROUND-TRIP HONESTY: promoted cells through the linear engine ≡ the graph in place', () => {
    const nodes = m1Graph();
    const graphStates = recomputeGraph(nodes, REGISTRY).states;
    const res = promoteSubgraph(nodes, new Set(['verdict']));
    if (!res.ok) throw new Error();
    const linear = recomputeNotebook(
      res.cells.map((c) => ({ formulaId: c.formulaId, inputs: c.inputs, wires: c.wires })),
      REGISTRY,
    );
    // Compare each promoted cell's state to its graph counterpart.
    res.cells.forEach((c, i) => {
      const g = graphStates.get(c.sourceId)!;
      const l = linear[i];
      expect(l.status).toBe(g.status);
      if (l.status === 'ok' && g.status === 'ok') {
        expect(l.resolvedInputs).toEqual(g.resolvedInputs);
        expect(l.result.values).toEqual(g.result.values);
      }
    });
  });

  it('refuses a cycle in the closure with lab.promote.reason-cycle', () => {
    const nodes: GraphNode[] = [
      {
        id: 'a',
        formulaId: 'tsiolkovsky',
        inputs: defaultInputs(REGISTRY.get('tsiolkovsky')!),
        wires: [{ fromId: 'b', output: 'deltaV', toInput: 'ispS' }],
      },
      {
        id: 'b',
        formulaId: 'tsiolkovsky',
        inputs: defaultInputs(REGISTRY.get('tsiolkovsky')!),
        wires: [{ fromId: 'a', output: 'deltaV', toInput: 'ispS' }],
      },
    ];
    const res = promoteSubgraph(nodes, new Set(['a']));
    expect(res).toEqual({ ok: false, reasonKey: 'lab.promote.reason-cycle' });
  });

  it('refuses an empty selection and an over-cap closure with reason-too-big', () => {
    expect(promoteSubgraph(m1Graph(), new Set())).toEqual({
      ok: false,
      reasonKey: 'lab.promote.reason-too-big',
    });
    const many: GraphNode[] = Array.from({ length: 201 }, (_, i) => ({
      id: `n${i}`,
      formulaId: 'tsiolkovsky',
      inputs: defaultInputs(REGISTRY.get('tsiolkovsky')!),
      wires: i > 0 ? [{ fromId: `n${i - 1}`, output: 'deltaV', toInput: 'ispS' }] : [],
    }));
    const res = promoteSubgraph(many, new Set([`n${200}`]));
    expect(res).toEqual({ ok: false, reasonKey: 'lab.promote.reason-too-big' });
  });

  it('fan-out promotes: two consumers of one source, source emitted once, both wired to it', () => {
    const nodes: GraphNode[] = [
      { id: 'src', formulaId: 'tsiolkovsky', inputs: defaultInputs(REGISTRY.get('tsiolkovsky')!) },
      {
        id: 'v1',
        formulaId: 'delta-v-margin',
        inputs: defaultInputs(REGISTRY.get('delta-v-margin')!),
        wires: [{ fromId: 'src', output: 'deltaV', toInput: 'capacityKms' }],
      },
      {
        id: 'v2',
        formulaId: 'delta-v-margin',
        inputs: defaultInputs(REGISTRY.get('delta-v-margin')!),
        wires: [{ fromId: 'src', output: 'deltaV', toInput: 'capacityKms' }],
      },
    ];
    const res = promoteSubgraph(nodes, new Set(['v1', 'v2']));
    if (!res.ok) throw new Error();
    expect(res.cells.map((c) => c.sourceId)).toEqual(['src', 'v1', 'v2']);
    expect(res.cells[1].wires[0].fromIndex).toBe(0);
    expect(res.cells[2].wires[0].fromIndex).toBe(0);
    expect(res.includedUpstream).toEqual(['src']);
  });
});
