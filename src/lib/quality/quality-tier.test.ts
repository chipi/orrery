import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  readUserChoice,
  writeUserChoice,
  configFor,
  ALL_TIERS,
  resolveQualitySync,
  resolveQualitySource,
  detectAutoTier,
  resolveQuality,
  kickOffBackgroundDetect,
  __resetAutoTierCacheForTests,
} from './quality-tier';

// detect-gpu is dynamically imported inside detectAutoTier. A hoisted
// mutable lets each test steer the mocked GPU result (or make it throw);
// __resetAutoTierCacheForTests() clears the module-level memo between
// tests so we can exercise each mapping without reloading the module
// (which would leak dynamic-import rejections on slower CI runners).
const gpu = vi.hoisted(() => ({
  result: { tier: 3, isMobile: false } as { tier: number; isMobile?: boolean },
  throws: false,
}));
vi.mock('detect-gpu', () => ({
  getGPUTier: async () => {
    if (gpu.throws) throw new Error('no webgl');
    return gpu.result;
  },
}));

function fakeLocalStorage(): Storage {
  const m = new Map<string, string>();
  return {
    get length() {
      return m.size;
    },
    clear: () => m.clear(),
    getItem: (k: string) => (m.has(k) ? (m.get(k) as string) : null),
    key: (i: number) => Array.from(m.keys())[i] ?? null,
    removeItem: (k: string) => m.delete(k),
    setItem: (k: string, v: string) => void m.set(k, String(v)),
  };
}

beforeEach(() => {
  gpu.result = { tier: 3, isMobile: false };
  gpu.throws = false;
  __resetAutoTierCacheForTests();
  vi.stubGlobal('localStorage', fakeLocalStorage());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('readUserChoice / writeUserChoice', () => {
  it("defaults to 'auto' when nothing stored", () => {
    expect(readUserChoice()).toBe('auto');
  });

  it('round-trips a valid tier through localStorage', () => {
    writeUserChoice('high');
    expect(readUserChoice()).toBe('high');
  });

  it("writing 'auto' clears the stored choice", () => {
    writeUserChoice('cinematic');
    writeUserChoice('auto');
    expect(readUserChoice()).toBe('auto');
    expect(localStorage.getItem('orrery.qualityTier')).toBeNull();
  });

  it("falls back to 'auto' for a garbage stored value", () => {
    localStorage.setItem('orrery.qualityTier', 'ultra-mega');
    expect(readUserChoice()).toBe('auto');
  });

  it('is a no-op without localStorage', () => {
    vi.stubGlobal('localStorage', undefined);
    expect(() => writeUserChoice('high')).not.toThrow();
    expect(readUserChoice()).toBe('auto');
  });
});

describe('configFor / ALL_TIERS', () => {
  it('exposes the five tiers in order', () => {
    expect(ALL_TIERS).toEqual(['minimal', 'low', 'medium', 'high', 'cinematic']);
  });

  it('returns the matching config for each tier', () => {
    for (const t of ALL_TIERS) {
      expect(configFor(t).tier).toBe(t);
    }
  });

  it('degrades post/bloom on the low tiers and enables the full stack on cinematic', () => {
    expect(configFor('minimal').postEnabled).toBe(false);
    expect(configFor('low').postEnabled).toBe(false);
    expect(configFor('medium').postEnabled).toBe(true);
    expect(configFor('cinematic').dofEnabled).toBe(true);
    expect(configFor('cinematic').lensFlareEnabled).toBe(true);
  });
});

describe('resolveQualitySync', () => {
  it('honours a valid ?quality= URL override above everything', () => {
    localStorage.setItem('orrery.qualityTier', 'low');
    const url = new URL('https://x/fly?quality=cinematic');
    expect(resolveQualitySync(url).tier).toBe('cinematic');
  });

  it('ignores an invalid URL override', () => {
    const url = new URL('https://x/fly?quality=bogus');
    expect(resolveQualitySync(url).tier).toBe('medium'); // falls through to fallback
  });

  it('uses the saved user choice when no URL override', () => {
    localStorage.setItem('orrery.qualityTier', 'high');
    expect(resolveQualitySync().tier).toBe('high');
  });

  it('uses a previously cached detected tier over the fallback', () => {
    localStorage.setItem('orrery.qualityDetected', 'low');
    expect(resolveQualitySync().tier).toBe('low');
  });

  it('falls back to medium for a first-time visitor', () => {
    expect(resolveQualitySync().tier).toBe('medium');
  });
});

describe('resolveQualitySource', () => {
  it("reports 'url' for a valid override", () => {
    expect(resolveQualitySource(new URL('https://x/?quality=high'))).toBe('url');
  });

  it("reports 'user-choice' for a saved tier", () => {
    localStorage.setItem('orrery.qualityTier', 'low');
    expect(resolveQualitySource()).toBe('user-choice');
  });

  it("reports 'detect-gpu' when a detected tier is cached", () => {
    localStorage.setItem('orrery.qualityDetected', 'high');
    expect(resolveQualitySource()).toBe('detect-gpu');
  });

  it("reports 'fallback' when nothing else applies", () => {
    expect(resolveQualitySource()).toBe('fallback');
  });
});

describe('detectAutoTier (detect-gpu mapping)', () => {
  it.each([
    [{ tier: 0, isMobile: false }, 'minimal'],
    [{ tier: 1, isMobile: false }, 'low'],
    [{ tier: 2, isMobile: false }, 'medium'],
    [{ tier: 3, isMobile: false }, 'high'],
    [{ tier: 1, isMobile: true }, 'minimal'],
    [{ tier: 2, isMobile: true }, 'low'],
    [{ tier: 3, isMobile: true }, 'high'],
  ] as const)('maps detect-gpu %o → %s', async (result, expected) => {
    gpu.result = { ...result };
    expect(await detectAutoTier()).toBe(expected);
  });

  it('caches the result across calls', async () => {
    gpu.result = { tier: 0, isMobile: false };
    const first = await detectAutoTier();
    gpu.result = { tier: 3, isMobile: false }; // changed, but cache should win
    expect(await detectAutoTier()).toBe(first);
  });

  it('falls back to medium when detect-gpu throws', async () => {
    gpu.throws = true;
    expect(await detectAutoTier()).toBe('medium');
  });

  it('treats a missing isMobile as non-mobile', async () => {
    gpu.result = { tier: 1 };
    expect(await detectAutoTier()).toBe('low');
  });
});

describe('resolveQuality (async)', () => {
  it('honours the URL override', async () => {
    expect((await resolveQuality(new URL('https://x/?quality=low'))).tier).toBe('low');
  });

  it('honours the saved user choice', async () => {
    localStorage.setItem('orrery.qualityTier', 'high');
    expect((await resolveQuality()).tier).toBe('high');
  });

  it('detects via detect-gpu when set to auto', async () => {
    gpu.result = { tier: 2, isMobile: false };
    expect((await resolveQuality()).tier).toBe('medium');
  });
});

describe('kickOffBackgroundDetect', () => {
  it('persists the detected tier for the next session', async () => {
    gpu.result = { tier: 3, isMobile: false };
    await kickOffBackgroundDetect();
    expect(localStorage.getItem('orrery.qualityDetected')).toBe('high');
  });

  it('does not throw without localStorage', async () => {
    vi.stubGlobal('localStorage', undefined);
    await expect(kickOffBackgroundDetect()).resolves.toBeUndefined();
  });
});
