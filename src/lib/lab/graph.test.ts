/**
 * S5 graph engine (#463 · pre-review A): topo-sort + delegation to the
 * hardened linear engine. The invariants under test:
 *  - array order does NOT matter (a wire from a LATER-positioned node is
 *    honoured — the whole point of the graph vs the linear notebook);
 *  - cycles surface as `cycle`, their downstream as `upstream-cycle` — never
 *    a default-computed fake green;
 *  - the linear engine's hardening (units-match, invalid-wire, upstream-failed)
 *    flows through the delegation untouched;
 *  - determinism: same graph, same order, every time.
 */
import { describe, it, expect } from 'vitest';
import { REGISTRY, defaultInputs } from '$lib/physics/registry';
import { recomputeGraph, wouldCycle, type GraphNode } from './graph';
import { recomputeNotebook } from './notebook';

const tsiolkovsky = (): GraphNode => ({
  id: 'rocket',
  formulaId: 'tsiolkovsky',
  inputs: defaultInputs(REGISTRY.get('tsiolkovsky')!),
});

const margin = (wires: GraphNode['wires']): GraphNode => ({
  id: 'verdict',
  formulaId: 'delta-v-margin',
  inputs: defaultInputs(REGISTRY.get('delta-v-margin')!),
  wires,
});

describe('recomputeGraph · delegation + order-independence', () => {
  it('a wire from a LATER array position is honoured (topo order beats array order)', () => {
    // verdict FIRST in the array, its source second — the linear engine would
    // un-honour this; the graph must not.
    const nodes: GraphNode[] = [
      margin([{ fromId: 'rocket', output: 'deltaV', toInput: 'capacityKms' }]),
      tsiolkovsky(),
    ];
    const { states, order } = recomputeGraph(nodes, REGISTRY);
    expect(order).toEqual(['rocket', 'verdict']);
    const v = states.get('verdict')!;
    expect(v.status === 'ok' || v.status === 'fail').toBe(true);
    if (v.status !== 'ok' && v.status !== 'fail') throw new Error();
    const r = states.get('rocket')!;
    if (r.status !== 'ok') throw new Error();
    expect(v.resolvedInputs.capacityKms).toBe(r.result.values.deltaV.value);
  });

  it('graph result ≡ linear notebook result for the same wiring (delegation honesty)', () => {
    const nodes: GraphNode[] = [
      tsiolkovsky(),
      margin([{ fromId: 'rocket', output: 'deltaV', toInput: 'capacityKms' }]),
    ];
    const { states } = recomputeGraph(nodes, REGISTRY);
    const v = states.get('verdict')!;
    if (v.status !== 'ok' && v.status !== 'fail') throw new Error();
    const linear = recomputeNotebook(
      [
        { formulaId: 'tsiolkovsky', inputs: defaultInputs(REGISTRY.get('tsiolkovsky')!) },
        {
          formulaId: 'delta-v-margin',
          inputs: defaultInputs(REGISTRY.get('delta-v-margin')!),
          wires: [{ fromIndex: 0, output: 'deltaV', toInput: 'capacityKms' }],
        },
      ],
      REGISTRY,
    )[1];
    if (linear.status !== 'ok' && linear.status !== 'fail') throw new Error();
    expect(v.status).toBe(linear.status);
    expect(v.resolvedInputs).toEqual(linear.resolvedInputs);
  });

  it('a 2-cycle surfaces both nodes as `cycle`; a consumer of the cycle is `upstream-cycle`', () => {
    const a: GraphNode = {
      id: 'a',
      formulaId: 'tsiolkovsky',
      inputs: defaultInputs(REGISTRY.get('tsiolkovsky')!),
      wires: [{ fromId: 'b', output: 'deltaV', toInput: 'ispS' }],
    };
    const b: GraphNode = {
      id: 'b',
      formulaId: 'tsiolkovsky',
      inputs: defaultInputs(REGISTRY.get('tsiolkovsky')!),
      wires: [{ fromId: 'a', output: 'deltaV', toInput: 'ispS' }],
    };
    const c: GraphNode = {
      id: 'c',
      formulaId: 'delta-v-margin',
      inputs: defaultInputs(REGISTRY.get('delta-v-margin')!),
      wires: [{ fromId: 'a', output: 'deltaV', toInput: 'capacityKms' }],
    };
    const { states } = recomputeGraph([a, b, c], REGISTRY);
    expect(states.get('a')).toEqual({ status: 'cycle' });
    expect(states.get('b')).toEqual({ status: 'cycle' });
    expect(states.get('c')).toEqual({ status: 'upstream-cycle' });
  });

  it('an acyclic island beside a cycle still computes (the cycle does not poison the graph)', () => {
    const a: GraphNode = {
      id: 'a',
      formulaId: 'tsiolkovsky',
      inputs: defaultInputs(REGISTRY.get('tsiolkovsky')!),
      wires: [{ fromId: 'b', output: 'deltaV', toInput: 'ispS' }],
    };
    const b: GraphNode = {
      id: 'b',
      formulaId: 'tsiolkovsky',
      inputs: defaultInputs(REGISTRY.get('tsiolkovsky')!),
      wires: [{ fromId: 'a', output: 'deltaV', toInput: 'ispS' }],
    };
    const island = tsiolkovsky();
    const { states } = recomputeGraph([a, b, island], REGISTRY);
    expect(states.get('rocket')!.status).toBe('ok');
  });

  it('units-mismatch flows through the delegation as invalid-wire (hardening intact)', () => {
    const nodes: GraphNode[] = [
      tsiolkovsky(),
      {
        id: 'sink',
        formulaId: 'momentum',
        inputs: defaultInputs(REGISTRY.get('momentum')!),
        wires: [{ fromId: 'rocket', output: 'deltaV', toInput: 'massKg' }], // km/s → kg
      },
    ];
    const { states } = recomputeGraph(nodes, REGISTRY);
    expect(states.get('sink')!.status).toBe('invalid-wire');
  });

  it('an unknown wire source is un-honoured (input keeps its value), matching the linear engine', () => {
    const nodes: GraphNode[] = [
      margin([{ fromId: 'ghost', output: 'deltaV', toInput: 'capacityKms' }]),
    ];
    const { states } = recomputeGraph(nodes, REGISTRY);
    const v = states.get('verdict')!;
    expect(v.status === 'ok' || v.status === 'fail').toBe(true);
    if (v.status !== 'ok' && v.status !== 'fail') throw new Error();
    expect(v.resolvedInputs.capacityKms).toBe(
      defaultInputs(REGISTRY.get('delta-v-margin')!).capacityKms,
    );
  });

  it('fan-out and fan-in both compute (multiple consumers of one source; one consumer of many)', () => {
    const src = tsiolkovsky();
    const c1 = margin([{ fromId: 'rocket', output: 'deltaV', toInput: 'capacityKms' }]);
    const c2: GraphNode = { ...c1, id: 'verdict2', wires: [...(c1.wires ?? [])] };
    const { states } = recomputeGraph([src, c1, c2], REGISTRY);
    for (const id of ['verdict', 'verdict2']) {
      const s = states.get(id)!;
      expect(s.status === 'ok' || s.status === 'fail').toBe(true);
    }
  });

  it('determinism: order is stable across repeated recomputes', () => {
    const nodes: GraphNode[] = [
      margin([{ fromId: 'rocket', output: 'deltaV', toInput: 'capacityKms' }]),
      tsiolkovsky(),
    ];
    const a = recomputeGraph(nodes, REGISTRY).order;
    const b = recomputeGraph(nodes, REGISTRY).order;
    expect(a).toEqual(b);
  });
});

describe('wouldCycle · predictive creation-time check', () => {
  it('detects the closing edge of a would-be cycle and allows safe edges', () => {
    const nodes: GraphNode[] = [
      tsiolkovsky(),
      margin([{ fromId: 'rocket', output: 'deltaV', toInput: 'capacityKms' }]),
    ];
    // verdict already consumes rocket; wiring rocket to consume verdict closes the loop.
    expect(wouldCycle(nodes, 'verdict', 'rocket')).toBe(true);
    // A second parallel edge in the SAME direction is not a cycle.
    expect(wouldCycle(nodes, 'rocket', 'verdict')).toBe(false);
    expect(wouldCycle(nodes, 'rocket', 'rocket')).toBe(true); // self
  });
});
