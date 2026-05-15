/**
 * @vitest-environment jsdom
 *
 * Unit tests for the Science Lens attribute-on-<html> state contract.
 * Verifies the SSR-safe getters/setters and MutationObserver-driven
 * subscription pattern. ADR pending — see task #94.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { isScienceLensOn, toggleScienceLens, onScienceLensChange } from './science-lens';

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
});
