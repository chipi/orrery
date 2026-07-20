/**
 * @vitest-environment jsdom
 *
 * Unit tests for the Science Lens attribute-on-<html> state contract.
 * Verifies the SSR-safe getters/setters and MutationObserver-driven
 * subscription pattern. ADR pending — see task #94.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  isScienceLensOn,
  toggleScienceLens,
  onScienceLensChange,
  markScienceLensAvailable,
  onScienceLensAvailableChange,
} from './science-lens';

beforeEach(() => {
  // Reset the <html> attribute between tests so each starts clean.
  document.documentElement.removeAttribute('data-science-lens');
});

describe('science-lens', () => {
  it('starts off when the attribute is absent', () => {
    expect(isScienceLensOn()).toBe(false);
  });

  it('toggleScienceLens flips off → on → off and returns the new state', () => {
    expect(toggleScienceLens()).toBe(true);
    expect(isScienceLensOn()).toBe(true);
    expect(document.documentElement.getAttribute('data-science-lens')).toBe('on');

    expect(toggleScienceLens()).toBe(false);
    expect(isScienceLensOn()).toBe(false);
    expect(document.documentElement.getAttribute('data-science-lens')).toBe('off');
  });

  it('onScienceLensChange fires once with initial state, then on every flip', async () => {
    const calls: boolean[] = [];
    const stop = onScienceLensChange((on) => calls.push(on));
    expect(stop).toBeDefined();
    // Initial fire (synchronous).
    expect(calls).toEqual([false]);

    toggleScienceLens();
    // MutationObserver runs in a microtask — flush the queue.
    await Promise.resolve();
    expect(calls).toEqual([false, true]);

    toggleScienceLens();
    await Promise.resolve();
    expect(calls).toEqual([false, true, false]);

    stop?.();
    // After unsubscribe, no further callbacks.
    toggleScienceLens();
    await Promise.resolve();
    expect(calls).toEqual([false, true, false]);
  });
});

describe('markScienceLensAvailable', () => {
  const AVAIL_ATTR = 'data-science-lens-available';

  beforeEach(() => {
    document.documentElement.removeAttribute(AVAIL_ATTR);
  });

  it('sets data-science-lens-available on <html> when first mounted', () => {
    const cleanup = markScienceLensAvailable();
    expect(document.documentElement.hasAttribute(AVAIL_ATTR)).toBe(true);
    cleanup();
  });

  it('removes the attribute when the sole mount unmounts', () => {
    const cleanup = markScienceLensAvailable();
    cleanup();
    expect(document.documentElement.hasAttribute(AVAIL_ATTR)).toBe(false);
  });

  it('keeps attribute present while multiple mounts are active (ref-counted)', () => {
    const c1 = markScienceLensAvailable();
    const c2 = markScienceLensAvailable();
    c1(); // first unmount — attribute should stay (c2 still active)
    expect(document.documentElement.hasAttribute(AVAIL_ATTR)).toBe(true);
    c2(); // last unmount — attribute should be removed
    expect(document.documentElement.hasAttribute(AVAIL_ATTR)).toBe(false);
  });

  it('is idempotent — re-mounting after full cleanup re-adds the attribute', () => {
    const c1 = markScienceLensAvailable();
    c1();
    expect(document.documentElement.hasAttribute(AVAIL_ATTR)).toBe(false);
    const c2 = markScienceLensAvailable();
    expect(document.documentElement.hasAttribute(AVAIL_ATTR)).toBe(true);
    c2();
  });
});

describe('onScienceLensAvailableChange', () => {
  const AVAIL_ATTR = 'data-science-lens-available';

  beforeEach(() => {
    document.documentElement.removeAttribute(AVAIL_ATTR);
  });

  it('fires immediately with initial state (false when attribute absent)', () => {
    const calls: boolean[] = [];
    const stop = onScienceLensAvailableChange((v) => calls.push(v));
    expect(calls).toEqual([false]);
    stop?.();
  });

  it('fires immediately with true when attribute is already present', () => {
    document.documentElement.setAttribute(AVAIL_ATTR, '');
    const calls: boolean[] = [];
    const stop = onScienceLensAvailableChange((v) => calls.push(v));
    expect(calls).toEqual([true]);
    stop?.();
    document.documentElement.removeAttribute(AVAIL_ATTR);
  });

  it('fires on mount (false→true) and unmount (true→false) via MutationObserver', async () => {
    const calls: boolean[] = [];
    const stop = onScienceLensAvailableChange((v) => calls.push(v));
    expect(calls).toEqual([false]);

    const c = markScienceLensAvailable();
    await Promise.resolve();
    expect(calls).toEqual([false, true]);

    c();
    await Promise.resolve();
    expect(calls).toEqual([false, true, false]);

    stop?.();
  });

  it('stops firing after unsubscribe', async () => {
    const calls: boolean[] = [];
    const stop = onScienceLensAvailableChange((v) => calls.push(v));
    stop?.();

    const c = markScienceLensAvailable();
    await Promise.resolve();
    // No new call after stop
    expect(calls).toEqual([false]);
    c();
  });
});

describe('science-lens — SSR guards (no document)', () => {
  // Each test temporarily deletes globalThis.document so the helpers
  // hit the `typeof document === 'undefined'` short-circuit, mirroring
  // SvelteKit's static-prerender environment.
  let savedDoc: Document | undefined;

  beforeEach(() => {
    savedDoc = globalThis.document;
    // @ts-expect-error — deliberate hole for the SSR-path test
    delete globalThis.document;
  });

  afterEach(() => {
    globalThis.document = savedDoc as Document;
  });

  it('isScienceLensOn returns false when document is unavailable', () => {
    expect(isScienceLensOn()).toBe(false);
  });

  it('toggleScienceLens returns false when document is unavailable', () => {
    expect(toggleScienceLens()).toBe(false);
  });

  it('onScienceLensChange returns undefined when document is unavailable', () => {
    expect(onScienceLensChange(() => {})).toBeUndefined();
  });

  it('onScienceLensAvailableChange returns undefined when document is unavailable', () => {
    expect(onScienceLensAvailableChange(() => {})).toBeUndefined();
  });
});
