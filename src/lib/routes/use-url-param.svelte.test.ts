// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { flushSync } from 'svelte';

// ─── Mock $app/* modules ─────────────────────────────────────────
// The rune reads `page.url` ($app/state, rune-backed) + writes via `goto`.
// Real SvelteKit versions of these only resolve inside a running app; we
// substitute a hand-rolled page object with a live `url` getter and a vi.fn
// goto so the test can drive both sides without a navigation runtime.
//
// vi.hoisted is required because vi.mock factories are hoisted above
// the file's imports — referencing module-local consts inside the
// factory throws "There was an error when mocking a module."

const { mocks } = vi.hoisted(() => {
  let current: { url: URL } = { url: new URL('https://orrery.test/explore') };
  const page = {
    get url() {
      return current.url;
    },
  };
  const setPage = (url: URL) => {
    current = { url };
  };
  return {
    mocks: {
      page,
      setPage,
      goto: vi.fn(),
      browser: { current: true },
    },
  };
});

vi.mock('$app/environment', () => ({
  get browser() {
    return mocks.browser.current;
  },
}));
vi.mock('$app/state', () => ({ page: mocks.page }));
vi.mock('$app/navigation', () => ({ goto: mocks.goto }));

import { useUrlParam, buildNextUrl, urlValueMatches } from './use-url-param.svelte';

/**
 * Run a rune call inside a manual effect scope so the rune's `$effect`
 * blocks actually register. The returned `teardown` clears any pending
 * timers / subscriptions the rune scheduled. We're not asserting on
 * effect-driven side effects here (those depend on a live component
 * scope and are exercised through caller integration tests); the
 * helper just keeps the rune-initialised state alive long enough for
 * the test to read its initial value.
 */
function withRoot<T>(fn: () => T): { result: T; teardown: () => void } {
  let result!: T;
  const teardown = $effect.root(() => {
    result = fn();
  });
  flushSync();
  return { result, teardown };
}

beforeEach(() => {
  mocks.goto.mockClear();
  mocks.setPage(new URL('https://orrery.test/explore'));
  mocks.browser.current = true;
});

describe('useUrlParam — initial read', () => {
  it('parses the initial value from $page.url on mount', () => {
    mocks.setPage(new URL('https://orrery.test/missions?dest=mars'));
    const { result, teardown } = withRoot(() =>
      useUrlParam<string>(
        'dest',
        (s) => s ?? 'venus',
        (t) => (t === 'venus' ? null : t),
      ),
    );
    expect(result.value).toBe('mars');
    teardown();
  });

  it('parse(null) is honoured when the param is absent', () => {
    mocks.setPage(new URL('https://orrery.test/missions'));
    const { result, teardown } = withRoot(() =>
      useUrlParam<string>(
        'dest',
        (s) => s ?? 'mars-default',
        (t) => t,
      ),
    );
    expect(result.value).toBe('mars-default');
    teardown();
  });

  it('typed parsing — numeric param round-trip', () => {
    mocks.setPage(new URL('https://orrery.test/moon?yaw=42'));
    const { result, teardown } = withRoot(() =>
      useUrlParam<number>(
        'yaw',
        (s) => (s === null ? 0 : Number(s)),
        (n) => String(n),
      ),
    );
    expect(result.value).toBe(42);
    expect(typeof result.value).toBe('number');
    teardown();
  });

  it('writing to .value updates the in-memory state synchronously', () => {
    mocks.setPage(new URL('https://orrery.test/missions'));
    const { result, teardown } = withRoot(() =>
      useUrlParam<string>(
        'dest',
        (s) => s ?? 'mars',
        (t) => (t === 'mars' ? null : t),
      ),
    );
    expect(result.value).toBe('mars');
    result.value = 'venus';
    // The reactive URL write is exercised through caller integration
    // tests — what we assert here is that the local read reflects the
    // write before any debounce window opens.
    expect(result.value).toBe('venus');
    teardown();
  });
});

describe('useUrlParam — SSR / prerender', () => {
  it('parse(null) is honoured when browser=false (no URL read)', () => {
    mocks.browser.current = false;
    try {
      mocks.setPage(new URL('https://orrery.test/missions?dest=mars'));
      const { result, teardown } = withRoot(() =>
        useUrlParam<string>(
          'dest',
          (s) => s ?? 'fallback',
          (t) => t,
        ),
      );
      // Server / prerender path takes the parse(null) branch even when
      // the page store happens to have a real URL — protects prerendered
      // pages from baking in a runtime-user's query params.
      expect(result.value).toBe('fallback');
      teardown();
    } finally {
      mocks.browser.current = true;
    }
  });
});

describe('buildNextUrl', () => {
  it('sets the key when a serialized value is supplied', () => {
    const url = new URL('https://orrery.test/missions');
    expect(buildNextUrl(url, 'dest', 'venus')).toBe('/missions?dest=venus');
  });

  it('removes the key when serialized is null', () => {
    const url = new URL('https://orrery.test/missions?dest=venus');
    expect(buildNextUrl(url, 'dest', null)).toBe('/missions');
  });

  it('preserves unrelated search params', () => {
    const url = new URL('https://orrery.test/missions?status=active&crew=1');
    const next = buildNextUrl(url, 'dest', 'venus');
    expect(next).toContain('status=active');
    expect(next).toContain('crew=1');
    expect(next).toContain('dest=venus');
  });

  it('preserves the URL hash', () => {
    const url = new URL('https://orrery.test/science#orbits');
    expect(buildNextUrl(url, 'tab', 'kepler')).toBe('/science?tab=kepler#orbits');
  });

  it('updates an existing key in place rather than appending', () => {
    const url = new URL('https://orrery.test/missions?dest=mars');
    expect(buildNextUrl(url, 'dest', 'venus')).toBe('/missions?dest=venus');
  });

  it('URI-encodes non-ASCII serialized values', () => {
    const url = new URL('https://orrery.test/explore');
    expect(buildNextUrl(url, 'site', 'apollo 11')).toContain('site=apollo+11');
  });
});

describe('urlValueMatches', () => {
  it('returns true when serialized matches the present param', () => {
    const url = new URL('https://orrery.test/missions?dest=mars');
    expect(urlValueMatches(url, 'dest', 'mars')).toBe(true);
  });

  it('returns false when serialized differs from the present param', () => {
    const url = new URL('https://orrery.test/missions?dest=mars');
    expect(urlValueMatches(url, 'dest', 'venus')).toBe(false);
  });

  it('returns true when serialized is null and the param is absent', () => {
    const url = new URL('https://orrery.test/missions');
    expect(urlValueMatches(url, 'dest', null)).toBe(true);
  });

  it('distinguishes "param absent" from "param empty"', () => {
    const present = new URL('https://orrery.test/missions?dest=');
    const absent = new URL('https://orrery.test/missions');
    // ?dest= and no ?dest= are different per the URL spec — the rune's
    // short-circuit must respect this so a serialize(null) write
    // doesn't no-op against a `?dest=` URL.
    expect(urlValueMatches(present, 'dest', null)).toBe(false);
    expect(urlValueMatches(absent, 'dest', null)).toBe(true);
    expect(urlValueMatches(present, 'dest', '')).toBe(true);
  });
});
