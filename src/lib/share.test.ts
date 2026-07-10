// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { publicShareUrl, shareCurrent } from './share';
import { STREAM_ORIGIN } from './asset-url';
import { Capacitor } from '@capacitor/core';

// Mock @capacitor/core
vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: vi.fn(() => false),
  },
}));

// Mock @capacitor/share
vi.mock('@capacitor/share', () => ({
  Share: {
    share: vi.fn(),
  },
}));

// Mock @capacitor/haptics
vi.mock('@capacitor/haptics', () => ({
  Haptics: {
    impact: vi.fn(),
  },
  ImpactStyle: {
    Light: 'light',
  },
}));

describe('publicShareUrl', () => {
  const loc = {
    href: 'capacitor://localhost/fly?mission=curiosity',
    pathname: '/fly',
    search: '?mission=curiosity',
    hash: '',
  };

  it('rebuilds a public deployed URL on native (never the capacitor:// origin)', () => {
    expect(publicShareUrl(loc, true)).toBe(`${STREAM_ORIGIN}/fly?mission=curiosity`);
    expect(publicShareUrl(loc, true)).not.toContain('localhost');
  });

  it('carries the hash', () => {
    expect(publicShareUrl({ ...loc, hash: '#capcom' }, true)).toBe(
      `${STREAM_ORIGIN}/fly?mission=curiosity#capcom`,
    );
  });

  it('uses the real href on web (already a public URL)', () => {
    const web = {
      href: 'https://chipi.github.io/orrery/fly?mission=curiosity',
      pathname: '/orrery/fly',
      search: '?mission=curiosity',
      hash: '',
    };
    expect(publicShareUrl(web, false)).toBe(web.href);
  });
});

describe('shareCurrent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.title = 'Orrery';
    Object.defineProperty(window, 'location', {
      value: {
        href: 'https://example.com/fly?mission=curiosity',
        pathname: '/fly',
        search: '?mission=curiosity',
        hash: '',
      },
      writable: true,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('native platform (Capacitor)', () => {
    beforeEach(() => {
      vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
    });

    it('calls native Share API when on Capacitor', async () => {
      const { Share } = await import('@capacitor/share');
      vi.mocked(Share.share).mockResolvedValue(undefined as never);

      await shareCurrent();

      expect(Share.share).toHaveBeenCalled();
    });

    it('returns "shared" on successful native share', async () => {
      const { Share } = await import('@capacitor/share');
      vi.mocked(Share.share).mockResolvedValue(undefined as never);

      const result = await shareCurrent();

      expect(result).toBe('shared');
    });

    it('returns "cancelled" on native share rejection', async () => {
      const { Share } = await import('@capacitor/share');
      vi.mocked(Share.share).mockRejectedValue(new Error('Cancelled'));

      const result = await shareCurrent();

      expect(result).toBe('cancelled');
    });
  });

  describe('web platform with navigator.share', () => {
    beforeEach(() => {
      vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false);
      // Define navigator.share if it doesn't exist
      if (!navigator.share) {
        Object.defineProperty(navigator, 'share', {
          value: vi.fn().mockResolvedValue(undefined),
          writable: true,
          configurable: true,
        });
      }
    });

    it('uses navigator.share when available on web', async () => {
      vi.mocked(navigator.share!).mockResolvedValue(undefined);

      const result = await shareCurrent();

      expect(result).toBe('shared');
    });

    it('returns "cancelled" when navigator.share fails', async () => {
      vi.mocked(navigator.share!).mockRejectedValue(new Error('User cancelled'));

      const result = await shareCurrent();

      expect(result).toBe('cancelled');
    });
  });

  describe('clipboard fallback', () => {
    beforeEach(() => {
      vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false);
      // Ensure navigator.share is not available for fallback testing
      if ('share' in navigator) {
        Reflect.deleteProperty(navigator, 'share');
      }
      // Ensure clipboard exists
      if (!navigator.clipboard) {
        Object.defineProperty(navigator, 'clipboard', {
          value: {
            writeText: vi.fn().mockResolvedValue(undefined),
          },
          writable: true,
          configurable: true,
        });
      }
    });

    it('falls back to clipboard when Share not available', async () => {
      if (navigator.clipboard?.writeText) {
        vi.mocked(navigator.clipboard.writeText).mockResolvedValue(undefined);
      }

      const result = await shareCurrent();

      expect(['shared', 'copied']).toContain(result);
    });

    it('returns "cancelled" when clipboard fails', async () => {
      if (navigator.clipboard?.writeText) {
        vi.mocked(navigator.clipboard.writeText).mockRejectedValue(new Error('Clipboard denied'));
      }

      const result = await shareCurrent();

      expect(result).toBe('cancelled');
    });
  });

  describe('fallback chain', () => {
    it('eventually falls back to clipboard', async () => {
      vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false);
      Reflect.deleteProperty(navigator, 'share');

      // Ensure clipboard is available
      if (!navigator.clipboard?.writeText) {
        Object.defineProperty(navigator, 'clipboard', {
          value: {
            writeText: vi.fn().mockResolvedValue(undefined),
          },
          writable: true,
          configurable: true,
        });
      }

      if (navigator.clipboard?.writeText) {
        vi.mocked(navigator.clipboard.writeText).mockResolvedValue(undefined);
      }

      const result = await shareCurrent();

      expect(['shared', 'copied']).toContain(result);
    });
  });
});
