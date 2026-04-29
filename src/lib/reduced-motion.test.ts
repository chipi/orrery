// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { prefersReducedMotion, onReducedMotionChange } from './reduced-motion';

/**
 * Vitest defaults to node — this file needs jsdom because the helpers
 * read `window.matchMedia`. The pragma above scopes the environment
 * change to this file only (no global vitest.config change required).
 *
 * `matchMedia` is undefined in jsdom by default. Each test stubs it
 * locally to control the return value + listener behaviour.
 */

describe('prefersReducedMotion (SSR-safe path)', () => {
  it('returns false when window.matchMedia is unavailable', () => {
    const original = globalThis.window?.matchMedia;
    // @ts-expect-error — deliberately remove for SSR-shape simulation
    if (globalThis.window) globalThis.window.matchMedia = undefined;
    expect(prefersReducedMotion()).toBe(false);
    if (globalThis.window && original) globalThis.window.matchMedia = original;
  });
});

describe('prefersReducedMotion (browser path)', () => {
  let originalMatchMedia: typeof window.matchMedia | undefined;

  beforeEach(() => {
    originalMatchMedia = window.matchMedia;
  });

  afterEach(() => {
    if (originalMatchMedia) window.matchMedia = originalMatchMedia;
  });

  it('returns true when matchMedia.matches is true', () => {
    window.matchMedia = vi.fn().mockReturnValue({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }) as unknown as typeof window.matchMedia;
    expect(prefersReducedMotion()).toBe(true);
  });

  it('returns false when matchMedia.matches is false', () => {
    window.matchMedia = vi.fn().mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }) as unknown as typeof window.matchMedia;
    expect(prefersReducedMotion()).toBe(false);
  });

  it('queries the canonical media-query string', () => {
    const spy = vi.fn().mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });
    window.matchMedia = spy as unknown as typeof window.matchMedia;
    prefersReducedMotion();
    expect(spy).toHaveBeenCalledWith('(prefers-reduced-motion: reduce)');
  });
});

describe('onReducedMotionChange', () => {
  let originalMatchMedia: typeof window.matchMedia | undefined;

  beforeEach(() => {
    originalMatchMedia = window.matchMedia;
  });

  afterEach(() => {
    if (originalMatchMedia) window.matchMedia = originalMatchMedia;
  });

  it('invokes the listener immediately with the current value', () => {
    window.matchMedia = vi.fn().mockReturnValue({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }) as unknown as typeof window.matchMedia;
    const listener = vi.fn();
    onReducedMotionChange(listener);
    expect(listener).toHaveBeenCalledWith(true);
  });

  it('invokes the listener again when the OS preference flips', () => {
    const handlers: Array<() => void> = [];
    const mq = {
      matches: false,
      addEventListener: vi.fn((_event: string, handler: () => void) => {
        handlers.push(handler);
      }),
      removeEventListener: vi.fn(),
    };
    window.matchMedia = vi.fn().mockReturnValue(mq) as unknown as typeof window.matchMedia;
    const listener = vi.fn();
    onReducedMotionChange(listener);
    expect(listener).toHaveBeenLastCalledWith(false);
    // OS toggle: simulate by flipping `matches` and firing the change event
    mq.matches = true;
    handlers.forEach((h) => h());
    expect(listener).toHaveBeenLastCalledWith(true);
  });

  it('returns an unsubscribe function that removes the listener', () => {
    const removeSpy = vi.fn();
    window.matchMedia = vi.fn().mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: removeSpy,
    }) as unknown as typeof window.matchMedia;
    const stop = onReducedMotionChange(() => {});
    stop();
    expect(removeSpy).toHaveBeenCalledOnce();
  });

  it('SSR-safe: returns a no-op unsubscribe when matchMedia is unavailable', () => {
    const original = window.matchMedia;
    // @ts-expect-error — deliberately remove
    window.matchMedia = undefined;
    const listener = vi.fn();
    const stop = onReducedMotionChange(listener);
    expect(listener).toHaveBeenCalledWith(false);
    expect(typeof stop).toBe('function');
    stop(); // shouldn't throw
    if (original) window.matchMedia = original;
  });
});
