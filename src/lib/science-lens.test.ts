/**
 * @vitest-environment jsdom
 *
 * Unit tests for the Science Lens attribute-on-<html> state contract.
 * Verifies the SSR-safe getters/setters and MutationObserver-driven
 * subscription pattern. ADR pending — see task #94.
 */
import { describe, it, expect, beforeEach } from 'vitest';
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
