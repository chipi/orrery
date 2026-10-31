import { describe, it, expect, afterEach, vi } from 'vitest';
import { installFlyTestHooks } from './fly-test-hooks';

type HookWindow = {
  __flyArcHash?: () => string | null;
  __fly2DArcHash?: () => string | null;
  __flyMissionId?: () => string | null;
};

afterEach(() => vi.unstubAllGlobals());

describe('installFlyTestHooks', () => {
  it('is a no-op without a window', () => {
    vi.stubGlobal('window', undefined);
    expect(() => installFlyTestHooks({} as never)()).not.toThrow();
  });

  it('reads the page state at call time; null until a mission is applied and arcs are built', () => {
    const w: HookWindow = {};
    vi.stubGlobal('window', w);
    let id: string | null = null;
    let len = 0;
    let hash = 'h1';
    const cleanup = installFlyTestHooks({
      lastAppliedMissionId: () => id,
      outPtsLength: () => len,
      outVertexHash: () => hash,
    });

    expect(w.__flyArcHash?.()).toBeNull();
    id = 'curiosity';
    expect(w.__flyArcHash?.()).toBeNull();
    len = 10;
    expect(w.__fly2DArcHash?.()).toBeNull();
    len = 11;
    expect(w.__flyArcHash?.()).toBe('h1');
    hash = 'h2';
    expect(w.__fly2DArcHash?.()).toBe('h2');
    expect(w.__flyMissionId?.()).toBe('curiosity');

    cleanup();
    expect(w.__flyArcHash).toBeUndefined();
    expect(w.__fly2DArcHash).toBeUndefined();
    expect(w.__flyMissionId).toBeUndefined();
  });

  it('reports a null mission id before any apply', () => {
    const w: HookWindow = {};
    vi.stubGlobal('window', w);
    installFlyTestHooks({
      lastAppliedMissionId: () => null,
      outPtsLength: () => 201,
      outVertexHash: () => 'x',
    });
    expect(w.__flyMissionId?.()).toBeNull();
    expect(w.__flyArcHash?.()).toBeNull();
  });
});
