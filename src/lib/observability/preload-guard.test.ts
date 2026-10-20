// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  installPreloadReloadGuard,
  notePendingNavigation,
  _resetPreloadGuardForTests,
  SKEW_WINDOW_MS,
} from './preload-guard';

const reload = vi.fn();
const assign = vi.fn();
beforeEach(() => {
  reload.mockClear();
  assign.mockClear();
  sessionStorage.clear();
  notePendingNavigation(null);
  vi.stubGlobal('location', { ...window.location, href: 'https://o.test/credits', reload, assign });
});

function fire(): Event {
  const e = new Event('vite:preloadError', { cancelable: true });
  window.dispatchEvent(e);
  return e;
}

describe('preload reload guard', () => {
  _resetPreloadGuardForTests();
  installPreloadReloadGuard();
  installPreloadReloadGuard(); // idempotent: a second call must not double-handle

  it('first failure (JS chunk or CSS) is swallowed and reloads once', () => {
    const e = fire();
    expect(e.defaultPrevented).toBe(true);
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('a second failure inside the window surfaces (no reload loop)', () => {
    fire();
    reload.mockClear();
    const e = fire();
    expect(e.defaultPrevented).toBe(false);
    expect(reload).not.toHaveBeenCalled();
  });

  it('during a client navigation it loads the navigation target, not the page being left (#588)', () => {
    notePendingNavigation(new URL('https://o.test/plan'));
    expect(fire().defaultPrevented).toBe(true);
    expect(assign).toHaveBeenCalledWith('https://o.test/plan');
    expect(reload).not.toHaveBeenCalled();
  });

  it('once the navigation has landed it reloads the current page again', () => {
    notePendingNavigation(new URL('https://o.test/plan'));
    notePendingNavigation(null);
    fire();
    expect(reload).toHaveBeenCalledTimes(1);
    expect(assign).not.toHaveBeenCalled();
  });

  it('after the window it reloads again', () => {
    sessionStorage.setItem('orrery.skew-reload-at', String(Date.now() - SKEW_WINDOW_MS - 1));
    expect(fire().defaultPrevented).toBe(true);
    expect(reload).toHaveBeenCalledTimes(1);
  });
});
