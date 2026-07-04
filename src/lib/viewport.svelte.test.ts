// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';

/**
 * viewport.svelte.ts seeds at MODULE LOAD (so consumers reading it at
 * child-script init get a valid value). Each state variant therefore needs a
 * fresh import (vi.resetModules) with matchMedia stubbed first. The stub reads
 * `state[query]` at call time and records change-listeners so we can fire flips.
 */

const origMatchMedia = window.matchMedia;
let handlers: Array<() => void> = [];

function stubMatchMedia(state: Record<string, boolean>): void {
  handlers = [];
  window.matchMedia = vi.fn((query: string) => ({
    media: query,
    get matches() {
      return !!state[query];
    },
    addEventListener: (_e: string, h: () => void) => {
      handlers.push(h);
    },
    removeEventListener: (_e: string, h: () => void) => {
      handlers = handlers.filter((x) => x !== h);
    },
    addListener: vi.fn(),
    removeListener: vi.fn(),
    onchange: null,
    dispatchEvent: vi.fn(() => false),
  })) as unknown as typeof window.matchMedia;
}

async function loadFresh() {
  vi.resetModules();
  return import('./viewport.svelte');
}

afterEach(() => {
  window.matchMedia = origMatchMedia;
  const ds = document.documentElement.dataset;
  delete ds.touch;
  delete ds.orientation;
  delete ds.short;
  delete ds.form;
  delete ds.highContrast;
});

describe('viewport store — SSR safety', () => {
  it('keeps desktop defaults + reflects nothing when matchMedia is unavailable', async () => {
    // @ts-expect-error — simulate SSR / no matchMedia
    window.matchMedia = undefined;
    const { viewport, initViewport } = await loadFresh();
    expect(viewport.ready).toBe(false);
    expect(viewport.isTouch).toBe(false);
    expect(viewport.form).toBe('desktop');
    expect(document.documentElement.dataset.form).toBeUndefined();
    const stop = initViewport();
    expect(typeof stop).toBe('function');
    stop(); // must not throw
  });
});

describe('viewport store — seed at load', () => {
  it('desktop (fine pointer + hover): form=desktop, no data-touch', async () => {
    stubMatchMedia({});
    const { viewport } = await loadFresh();
    expect(viewport.ready).toBe(true);
    expect(viewport.isTouch).toBe(false);
    expect(viewport.form).toBe('desktop');
    const ds = document.documentElement.dataset;
    expect(ds.touch).toBeUndefined();
    expect(ds.orientation).toBe('portrait');
    expect(ds.form).toBe('desktop');
  });

  it('touch phone portrait: isTouch, form=phone', async () => {
    stubMatchMedia({ '(pointer: coarse)': true });
    const { viewport } = await loadFresh();
    expect(viewport.isTouch).toBe(true);
    expect(viewport.isCoarsePointer).toBe(true);
    expect(viewport.form).toBe('phone');
    const ds = document.documentElement.dataset;
    expect(ds.touch).toBe('');
    expect(ds.orientation).toBe('portrait');
    expect(ds.form).toBe('phone');
  });

  it('touch landscape short phone: isLandscape + isShort, form=phone', async () => {
    stubMatchMedia({
      '(hover: none)': true,
      '(orientation: landscape)': true,
      '(max-height: 560px)': true,
    });
    const { viewport } = await loadFresh();
    expect(viewport.isTouch).toBe(true);
    expect(viewport.isLandscape).toBe(true);
    expect(viewport.isShort).toBe(true);
    expect(viewport.form).toBe('phone');
    const ds = document.documentElement.dataset;
    expect(ds.orientation).toBe('landscape');
    expect(ds.short).toBe('');
  });

  it('tablet (touch + shorter side ≥600): form=tablet', async () => {
    stubMatchMedia({
      '(pointer: coarse)': true,
      '(min-width: 600px) and (min-height: 600px)': true,
    });
    const { viewport } = await loadFresh();
    expect(viewport.isTouch).toBe(true);
    expect(viewport.form).toBe('tablet');
    expect(document.documentElement.dataset.form).toBe('tablet');
  });
});

describe('viewport store — initViewport reactivity', () => {
  it('re-derives + re-stamps <html> when a query flips', async () => {
    const state: Record<string, boolean> = {};
    stubMatchMedia(state);
    const { viewport, initViewport } = await loadFresh();
    const stop = initViewport();
    expect(viewport.isTouch).toBe(false);
    expect(document.documentElement.dataset.touch).toBeUndefined();
    // Device becomes touch (e.g. a fold) — flip the query + fire change.
    state['(pointer: coarse)'] = true;
    handlers.forEach((h) => h());
    expect(viewport.isTouch).toBe(true);
    expect(document.documentElement.dataset.touch).toBe('');
    stop();
  });

  it('unsubscribe removes the change listeners', async () => {
    stubMatchMedia({});
    const { initViewport } = await loadFresh();
    const stop = initViewport();
    const before = handlers.length;
    expect(before).toBeGreaterThan(0);
    stop();
    expect(handlers.length).toBeLessThan(before);
  });
});

describe('viewport store — does not clobber data-high-contrast', () => {
  it('leaves data-high-contrast intact while stamping viewport attrs', async () => {
    document.documentElement.dataset.highContrast = 'true';
    stubMatchMedia({ '(pointer: coarse)': true });
    await loadFresh();
    expect(document.documentElement.dataset.highContrast).toBe('true');
    expect(document.documentElement.dataset.touch).toBe('');
  });
});
