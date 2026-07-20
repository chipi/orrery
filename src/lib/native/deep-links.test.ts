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
  },
}));

vi.mock('$app/navigation', () => ({ goto: vi.fn() }));
vi.mock('$app/paths', () => ({ base: '' }));

import { deepLinkTarget, initDeepLinks } from './deep-links';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { goto } from '$app/navigation';

// The Capacitor App.addListener type is a set of strict overloads; vi.mocked()
// preserves them, making mockImplementation's handler param infer as never.
// Cast once here to a loose signature for all per-test mockImplementation calls.
const addListenerMock = App.addListener as unknown as {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  mockImplementation: (fn: (...args: any[]) => any) => void;
};

describe('deepLinkTarget', () => {
  it('maps scheme host → first path segment, carrying query', () => {
    expect(deepLinkTarget('orrery://fly?mission=curiosity')).toBe('/fly?mission=curiosity');
    expect(deepLinkTarget('orrery://missions?dest=MARS')).toBe('/missions?dest=MARS');
  });
  it('handles a bare host with no query', () => {
    expect(deepLinkTarget('orrery://explore')).toBe('/explore');
  });
  it('carries a deeper path (host + pathname)', () => {
    expect(deepLinkTarget('orrery://science/transfers/hohmann')).toBe('/science/transfers/hohmann');
  });
  it('carries a hash', () => {
    expect(deepLinkTarget('orrery://fly#capcom')).toBe('/fly#capcom');
  });
  it('preserves `//` inside query/hash values (the collapse-path-only fix)', () => {
    expect(deepLinkTarget('orrery://fly?ref=https://example.com')).toBe(
      '/fly?ref=https://example.com',
    );
  });
  it('collapses duplicate slashes in the path only', () => {
    // A stray double slash in the path is normalised…
    expect(deepLinkTarget('orrery://fly//sub')).toBe('/fly/sub');
  });
  it('returns null on a malformed URL', () => {
    expect(deepLinkTarget('not a url')).toBeNull();
    expect(deepLinkTarget('')).toBeNull();
  });
});

describe('initDeepLinks — browser (non-native)', () => {
  beforeEach(() => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false);
    vi.clearAllMocks();
  });

  it('returns a no-op teardown on browser', () => {
    const dispose = initDeepLinks();
    expect(typeof dispose).toBe('function');
    expect(() => dispose()).not.toThrow();
  });

  it('does not call App.addListener on browser', () => {
    initDeepLinks();
    expect(App.addListener).not.toHaveBeenCalled();
  });
});

describe('initDeepLinks — native platform', () => {
  beforeEach(() => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
    vi.clearAllMocks();
    vi.mocked(App.addListener).mockResolvedValue({ remove: vi.fn() } as never);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('returns a teardown function', async () => {
    const dispose = initDeepLinks();
    await new Promise((r) => setTimeout(r, 0));
    expect(typeof dispose).toBe('function');
    dispose();
  });

  it('registers an appUrlOpen listener on native', async () => {
    initDeepLinks();
    await new Promise((r) => setTimeout(r, 0));
    expect(App.addListener).toHaveBeenCalledWith('appUrlOpen', expect.any(Function));
  });

  it('calls goto() with the parsed route for orrery:// deep links', async () => {
    // Object wrapper avoids TypeScript narrowing let-assigned closures to never.
    const capture: { handler: ((arg: { url: string }) => void) | null } = { handler: null };
    addListenerMock.mockImplementation(
      async (_event: string, handler: (arg: { url: string }) => void) => {
        capture.handler = handler;
        return { remove: vi.fn() };
      },
    );

    initDeepLinks();
    await new Promise((r) => setTimeout(r, 0));

    if (capture.handler) capture.handler({ url: 'orrery://fly?mission=curiosity' });
    expect(goto).toHaveBeenCalledWith('/fly?mission=curiosity');
  });

  it('ignores non-orrery:// URLs', async () => {
    const capture: { handler: ((arg: { url: string }) => void) | null } = { handler: null };
    addListenerMock.mockImplementation(
      async (_event: string, handler: (arg: { url: string }) => void) => {
        capture.handler = handler;
        return { remove: vi.fn() };
      },
    );

    initDeepLinks();
    await new Promise((r) => setTimeout(r, 0));

    if (capture.handler) capture.handler({ url: 'https://chipi.github.io/orrery/fly' });
    expect(goto).not.toHaveBeenCalled();
  });

  it('ignores malformed orrery:// URLs (deepLinkTarget returns null)', async () => {
    const capture: { handler: ((arg: { url: string }) => void) | null } = { handler: null };
    addListenerMock.mockImplementation(
      async (_event: string, handler: (arg: { url: string }) => void) => {
        capture.handler = handler;
        return { remove: vi.fn() };
      },
    );

    initDeepLinks();
    await new Promise((r) => setTimeout(r, 0));

    if (capture.handler) capture.handler({ url: 'orrery://not a valid url' });
    expect(goto).not.toHaveBeenCalled();
  });

  it('disposed before @capacitor/app loads — does not register listener', async () => {
    addListenerMock.mockImplementation(
      () => new Promise((r) => setTimeout(() => r({ remove: vi.fn() }), 100)),
    );
    const dispose = initDeepLinks();
    dispose();
    await new Promise((r) => setTimeout(r, 150));
    expect(App.addListener).not.toHaveBeenCalled();
  });
});
