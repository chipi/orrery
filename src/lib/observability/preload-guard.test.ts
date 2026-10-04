// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  installPreloadReloadGuard,
  _resetPreloadGuardForTests,
  SKEW_WINDOW_MS,
} from './preload-guard';

const reload = vi.fn();
beforeEach(() => {
  reload.mockClear();
  sessionStorage.clear();
  vi.stubGlobal('location', { ...window.location, reload });
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

  it('after the window it reloads again', () => {
    sessionStorage.setItem('orrery.skew-reload-at', String(Date.now() - SKEW_WINDOW_MS - 1));
    expect(fire().defaultPrevented).toBe(true);
    expect(reload).toHaveBeenCalledTimes(1);
  });
});
