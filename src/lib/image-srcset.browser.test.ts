/**
 * Browser-side coverage for image-srcset.ts (loadLadder cache + inflight).
 *
 * A separate file is needed because vi.mock('$app/environment') applies at
 * module scope and would conflict with the SSR-path test in image-srcset.test.ts
 * (which relies on browser=false to verify the short-circuit). This file runs
 * the same module with browser=true to cover lines 52-59.
 */

// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('$app/environment', () => ({ browser: true }));
vi.mock('$app/paths', () => ({ base: '' }));

import { loadLadder, ladderSources, srcsetFor } from './image-srcset';

// Reset the module-level cache between tests so each test starts clean.
// The module exposes no reset helper, but re-importing is blocked by module
// caching. Instead we stub fetch to return the manifest we want and rely on
// the module's own cache for the inflight-dedup test.
//
// NOTE: after loadLadder() resolves, the cache is set. Tests that need a
// clean cache must call vi.resetModules() + re-import, which is awkward —
// so we structure the tests to work WITH the post-load cache state, testing
// both the cold (null) and warm (populated) code paths in sequence.

describe('loadLadder (browser path)', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('fetches /data/image-ladder.json and returns the manifest on success', async () => {
    const manifest = { '/images/missions/perseverance/01': [1280, 2048] };
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(manifest),
    } as Response);

    const result = await loadLadder();
    expect(result).toEqual(manifest);
    const fetchUrl = vi.mocked(fetch).mock.calls[0][0] as string;
    expect(fetchUrl).toContain('image-ladder.json');
  });

  it('returns {} and caches it when the fetch response is not ok', async () => {
    // Reset by re-mocking to trigger a new inflight (the previous test set
    // a warm cache — we need to isolate via module reset or accept the warm
    // state). This test uses vi.resetModules to get a cold module instance.
    vi.resetModules();
    // Re-import after reset so we get a clean cache.
    const { loadLadder: freshLoad } = await import('./image-srcset');
    vi.mocked(fetch).mockResolvedValue({ ok: false } as Response);
    const result = await freshLoad();
    expect(result).toEqual({});
  });

  it('deduplicates concurrent calls — only one fetch issued', async () => {
    // Fresh module instance for clean cache.
    vi.resetModules();
    const { loadLadder: freshLoad } = await import('./image-srcset');
    const manifest = { '/images/test/01': [640] };
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(manifest),
    } as Response);

    // Fire two concurrent calls.
    const [r1, r2] = await Promise.all([freshLoad(), freshLoad()]);
    // Both should resolve to the same manifest.
    expect(r1).toEqual(manifest);
    expect(r2).toEqual(manifest);
    // Only one actual fetch was made.
    expect(vi.mocked(fetch).mock.calls).toHaveLength(1);
  });

  it('returns the cached manifest on subsequent calls without re-fetching', async () => {
    vi.resetModules();
    const { loadLadder: freshLoad } = await import('./image-srcset');
    const manifest = { '/images/test/02': [1024] };
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(manifest),
    } as Response);

    await freshLoad(); // primes the cache
    const fetchCallsAfterFirst = vi.mocked(fetch).mock.calls.length;

    await freshLoad(); // should return from cache
    expect(vi.mocked(fetch).mock.calls.length).toBe(fetchCallsAfterFirst); // no new fetch
  });
});

describe('ladderSources (post-load, warm cache)', () => {
  it('returns srcset pair when cache is populated and image has a ladder', async () => {
    vi.resetModules();
    const { loadLadder: freshLoad, ladderSources: freshLadderSources } =
      await import('./image-srcset');
    vi.stubGlobal('fetch', vi.fn());
    const manifest = { '/images/missions/curiosity/01': [1280, 2048] };
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(manifest),
    } as Response);

    await freshLoad();
    const r = freshLadderSources('/images/missions/curiosity/01.jpg');
    expect(r).not.toBeNull();
    expect(r?.src).toBe('/images/missions/curiosity/01.webp');
    expect(r?.srcset).toContain('1280w');
    vi.unstubAllGlobals();
  });
});

// Verify srcsetFor is still importable and works correctly in the browser module
// (sanity check — the function itself has no browser dependency).
describe('srcsetFor (re-verified in browser module instance)', () => {
  it('returns null for non-image URL', () => {
    expect(srcsetFor('/data/foo.json', {})).toBeNull();
  });

  it('returns null when image has no ladder entry', () => {
    expect(srcsetFor('/images/hotspots/moon/tier2.jpg', {})).toBeNull();
  });
});
