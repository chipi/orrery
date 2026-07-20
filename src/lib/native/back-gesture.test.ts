// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: vi.fn(() => false),
  },
}));

vi.mock('@capacitor/app', () => ({
  App: {
    addListener: vi.fn().mockResolvedValue({ remove: vi.fn() }),
    exitApp: vi.fn(),
  },
}));

import { backAction, initBackButton } from './back-gesture';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';

// The Capacitor App.addListener type is a set of strict overloads; vi.mocked()
// preserves them, making mockImplementation's handler param infer as never.
// Cast once here to a loose signature for all per-test mockImplementation calls.
const addListenerMock = App.addListener as unknown as {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  mockImplementation: (fn: (...args: any[]) => any) => void;
};

describe('backAction', () => {
  it('pops history while the WebView can still go back', () => {
    expect(backAction(true)).toBe('back');
  });
  it('exits the app when there is no history left', () => {
    expect(backAction(false)).toBe('exit');
  });
});

describe('initBackButton — browser (non-native)', () => {
  beforeEach(() => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false);
    vi.clearAllMocks();
  });

  it('returns a no-op teardown function', () => {
    const dispose = initBackButton();
    expect(typeof dispose).toBe('function');
    expect(() => dispose()).not.toThrow();
  });

  it('does not call App.addListener on a non-native platform', () => {
    initBackButton();
    expect(App.addListener).not.toHaveBeenCalled();
  });
});

describe('initBackButton — native platform', () => {
  beforeEach(() => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
    vi.clearAllMocks();
    vi.mocked(App.addListener).mockResolvedValue({ remove: vi.fn() } as never);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('returns a teardown function', async () => {
    const dispose = initBackButton();
    expect(typeof dispose).toBe('function');
    // Let the promise chain resolve
    await new Promise((r) => setTimeout(r, 0));
    dispose();
  });

  it('calls App.addListener for the backButton event', async () => {
    initBackButton();
    await new Promise((r) => setTimeout(r, 0));
    expect(App.addListener).toHaveBeenCalledWith('backButton', expect.any(Function));
  });

  it('calls window.history.back() when canGoBack is true', async () => {
    // Object wrapper avoids TypeScript narrowing let-assigned closures to never.
    const capture: { handler: ((arg: { canGoBack: boolean }) => void) | null } = { handler: null };
    addListenerMock.mockImplementation(
      async (_event: string, handler: (arg: { canGoBack: boolean }) => void) => {
        capture.handler = handler;
        return { remove: vi.fn() };
      },
    );

    const backSpy = vi.spyOn(window.history, 'back').mockImplementation(() => {});
    initBackButton();
    await new Promise((r) => setTimeout(r, 0));

    if (capture.handler) capture.handler({ canGoBack: true });
    expect(backSpy).toHaveBeenCalledOnce();
    backSpy.mockRestore();
  });

  it('calls App.exitApp() when canGoBack is false', async () => {
    const capture: { handler: ((arg: { canGoBack: boolean }) => void) | null } = { handler: null };
    addListenerMock.mockImplementation(
      async (_event: string, handler: (arg: { canGoBack: boolean }) => void) => {
        capture.handler = handler;
        return { remove: vi.fn() };
      },
    );

    initBackButton();
    await new Promise((r) => setTimeout(r, 0));

    if (capture.handler) capture.handler({ canGoBack: false });
    expect(App.exitApp).toHaveBeenCalledOnce();
  });

  it('disposes silently when torn down before @capacitor/app resolves', () => {
    const dispose = initBackButton();
    // Call dispose before the dynamic import settles
    expect(() => dispose()).not.toThrow();
  });
});
