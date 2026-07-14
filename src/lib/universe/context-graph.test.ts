import { describe, it, expect } from 'vitest';
import {
  ContextGraph,
  rebaseDistance,
  AU_PER_PARSEC,
  SOLAR_SYSTEM_CONTEXT,
  NEIGHBORHOOD_CONTEXT,
  bodyContextId,
  makeBodyContext,
  type Context,
} from './context-graph';

const contexts = (): Context[] => [{ ...SOLAR_SYSTEM_CONTEXT }, { ...NEIGHBORHOOD_CONTEXT }];

describe('rebaseDistance', () => {
  it('converts AU-scene units to pc-scene units at the true physical distance', () => {
    // 206265 AU (scene units in solar-system) == 1 pc == 1 scene unit in neighborhood.
    expect(rebaseDistance(AU_PER_PARSEC, SOLAR_SYSTEM_CONTEXT, NEIGHBORHOOD_CONTEXT)).toBeCloseTo(
      1,
      9,
    );
  });

  it('round-trips through both frames (identity)', () => {
    const d = 6000;
    const there = rebaseDistance(d, SOLAR_SYSTEM_CONTEXT, NEIGHBORHOOD_CONTEXT);
    const back = rebaseDistance(there, NEIGHBORHOOD_CONTEXT, SOLAR_SYSTEM_CONTEXT);
    expect(back).toBeCloseTo(d, 6);
  });
});

describe('ContextGraph.evaluate', () => {
  it('stays inside the solar system below the outer boundary', () => {
    const g = new ContextGraph(contexts(), 'solar-system');
    expect(g.evaluate(3000)).toBeNull();
  });

  it('crosses out to the neighborhood past the outer boundary', () => {
    const g = new ContextGraph(contexts(), 'solar-system');
    const t = g.evaluate(6001);
    expect(t?.direction).toBe('out');
    expect(t?.to.id).toBe('neighborhood');
  });

  it('crosses back in to the solar system below the inner boundary', () => {
    const g = new ContextGraph(contexts(), 'neighborhood');
    const t = g.evaluate(0.01);
    expect(t?.direction).toBe('in');
    expect(t?.to.id).toBe('solar-system');
  });

  it('does not cross out of the outermost context (no parent)', () => {
    const g = new ContextGraph(contexts(), 'neighborhood');
    expect(g.evaluate(1e9)).toBeNull();
  });
});

describe('ContextGraph.cross', () => {
  it('makes the neighbour active and re-bases the camera distance', () => {
    const g = new ContextGraph(contexts(), 'solar-system');
    const t = g.evaluate(6000)!;
    // 6000 is exactly the boundary; force a cross to test re-basing.
    const forced = { direction: 'out' as const, to: NEIGHBORHOOD_CONTEXT };
    const rebased = g.cross(forced, 6000);
    expect(g.active.id).toBe('neighborhood');
    expect(rebased).toBeCloseTo(6000 / AU_PER_PARSEC, 9);
    void t;
  });

  it('landing point sits above the inner boundary (hysteresis — no instant re-cross)', () => {
    const g = new ContextGraph(contexts(), 'solar-system');
    const rebased = g.cross({ direction: 'out', to: NEIGHBORHOOD_CONTEXT }, 6000);
    // Just crossed out; evaluating at the landing distance must not immediately
    // send us back in.
    expect(rebased).toBeGreaterThan(NEIGHBORHOOD_CONTEXT.innerBoundaryScene);
    expect(g.evaluate(rebased)).toBeNull();
  });

  it('throws on an unknown active id', () => {
    expect(() => new ContextGraph(contexts(), 'nope')).toThrow();
  });
});

describe('ContextGraph.setActive', () => {
  it('forces the active context', () => {
    const g = new ContextGraph(contexts(), 'solar-system');
    g.setActive('neighborhood');
    expect(g.active.id).toBe('neighborhood');
  });

  it('throws on an unknown id', () => {
    const g = new ContextGraph(contexts(), 'solar-system');
    expect(() => g.setActive('nope')).toThrow();
  });
});

describe('BodyScene contexts (Slice 2)', () => {
  it('bodyContextId namespaces the host id', () => {
    expect(bodyContextId('proxima-centauri')).toBe('body-scene:proxima-centauri');
  });

  it('makeBodyContext builds a neighborhood child with a zoom-out boundary', () => {
    const ctx = makeBodyContext('trappist-1', 40);
    expect(ctx.id).toBe('body-scene:trappist-1');
    expect(ctx.parent).toBe('neighborhood');
    expect(ctx.child).toBeNull();
    expect(ctx.units).toBe('AU');
    expect(ctx.outerBoundaryScene).toBe(160);
  });

  it('register adds a BodyScene context, remove drops it', () => {
    const g = new ContextGraph(contexts(), 'neighborhood');
    const ctx = makeBodyContext('pollux');
    g.register(ctx);
    expect(g.get('body-scene:pollux')).toBe(ctx);
    g.remove('body-scene:pollux');
    expect(g.get('body-scene:pollux')).toBeUndefined();
  });

  it('remove refuses to drop the active context', () => {
    const g = new ContextGraph(contexts(), 'neighborhood');
    g.register(makeBodyContext('pollux'));
    g.setActive('body-scene:pollux');
    g.remove('body-scene:pollux');
    expect(g.get('body-scene:pollux')).toBeDefined();
  });
});
