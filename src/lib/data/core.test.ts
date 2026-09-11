// @vitest-environment jsdom
// jsdom so `window` is defined — the loader only reports a bundle failure in a
// browser context (reportI18nBundleFailure early-returns when window is absent).
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { get, resetCoreCache } from './core';

// Drain the fire-and-forget `import('$lib/analytics').then(...)` microtask chain.
const flush = async () => {
  for (let i = 0; i < 5; i++) await Promise.resolve();
};

// Capture the fire-and-forget analytics call the loader makes on a surviving
// transient failure (core.ts dynamically imports '$lib/analytics').
const trackSpy = vi.fn();
vi.mock('$lib/analytics', () => ({ track: (...a: unknown[]) => trackSpy(...a) }));

// A fetch double that returns scripted responses per call, and records every
// requested URL so we can assert the loader never drops to the dead per-file path.
function makeFetch(steps: Array<() => Promise<Response> | Response>) {
  const urls: string[] = [];
  let i = 0;
  const fn = (async (input: RequestInfo | URL) => {
    urls.push(String(input));
    const step = steps[Math.min(i, steps.length - 1)];
    i++;
    return step();
  }) as typeof fetch;
  return { fn, urls, calls: () => i };
}

const json = (obj: unknown) => new Response(JSON.stringify(obj), { status: 200 });
const httpErr = (status: number) => new Response('err', { status });
const bundleUrl = (u: string) => /\/data\/i18n\/[^/]+\.json$/.test(u);
const perFileUrl = (u: string) => /\/data\/i18n\/[^/]+\/.+\.json$/.test(u);

describe('core get() — i18n bundle load (#517)', () => {
  beforeEach(() => {
    resetCoreCache();
    trackSpy.mockClear();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('retries a transient network failure and resolves from the bundle (no per-file fallback, no report)', async () => {
    vi.useFakeTimers();
    const { fn, urls } = makeFetch([
      () => Promise.reject(new TypeError('network')), // attempt 1 fails
      () => json({ 'planets/mars.json': { fact: 'Roter Planet' } }), // attempt 2 ok
    ]);
    const p = get<{ fact: string }>('i18n/de/planets/mars.json', fn);
    await vi.runAllTimersAsync();
    const out = await p;
    expect(out.fact).toBe('Roter Planet');
    // Only bundle URLs were hit — never the dead per-file path.
    expect(urls.every(bundleUrl)).toBe(true);
    expect(urls.some(perFileUrl)).toBe(false);
    expect(trackSpy).not.toHaveBeenCalled();
  });

  it('a transient failure that survives retries throws (caller en-US fallback) WITHOUT a per-file 404 burst, and reports once', async () => {
    vi.useFakeTimers();
    const { fn, urls } = makeFetch([() => httpErr(503)]); // 5xx every attempt
    const p = get('i18n/de/planets/mars.json', fn).catch((e) => e);
    await vi.runAllTimersAsync();
    const err = await p;
    await flush();
    expect(err).toBeInstanceOf(Error);
    // Retried up to the cap, then gave up — and NEVER fell through to per-file.
    expect(urls.length).toBe(3);
    expect(urls.every(bundleUrl)).toBe(true);
    expect(urls.some(perFileUrl)).toBe(false);
    // Reported exactly once for observability.
    expect(trackSpy).toHaveBeenCalledTimes(1);
    expect(trackSpy).toHaveBeenCalledWith('i18n-bundle-load-failed', { locale: 'de', status: 503 });
  });

  it('a 404 (bundle absent / unsupported locale) is NOT retried and DOES fall through to per-file (dev preserved)', async () => {
    const { fn, urls } = makeFetch([
      () => httpErr(404), // bundle 404 — not transient, no retry
      () => httpErr(404), // per-file also 404 → get() throws → caller en-US fallback
    ]);
    await expect(get('i18n/xx-TEST/planets/mars.json', fn)).rejects.toThrow();
    // Exactly one bundle attempt (no retry on 4xx) + one per-file fallthrough.
    expect(urls.filter(bundleUrl).length).toBe(1);
    expect(urls.some(perFileUrl)).toBe(true);
    // A genuine absence is expected, not a failure — nothing reported.
    expect(trackSpy).not.toHaveBeenCalled();
  });

  it('reports a surviving transient failure only once per locale', async () => {
    vi.useFakeTimers();
    const { fn } = makeFetch([() => httpErr(500)]);
    const p1 = get('i18n/fr/a.json', fn).catch(() => {});
    await vi.runAllTimersAsync();
    await p1;
    const p2 = get('i18n/fr/b.json', fn).catch(() => {});
    await vi.runAllTimersAsync();
    await p2;
    await flush();
    expect(trackSpy).toHaveBeenCalledTimes(1);
  });
});
