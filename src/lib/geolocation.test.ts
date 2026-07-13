import { describe, it, expect, vi, afterEach } from 'vitest';
import { getObserverLocation } from './geolocation';

describe('geolocation — observer fallback chain', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('uses a precise GPS fix when the browser grants it', async () => {
    vi.stubGlobal('navigator', {
      geolocation: {
        getCurrentPosition: (ok: (p: unknown) => void) =>
          ok({ coords: { latitude: 52.37, longitude: 4.9 } }),
      },
    });
    const loc = await getObserverLocation();
    expect(loc.source).toBe('gps');
    expect(loc.latDeg).toBeCloseTo(52.37, 2);
    expect(loc.lonDeg).toBeCloseTo(4.9, 2);
  });

  it('falls back (timezone/default) when geolocation is denied', async () => {
    vi.stubGlobal('navigator', {
      geolocation: {
        getCurrentPosition: (_ok: unknown, err: (e: unknown) => void) => err(new Error('denied')),
      },
    });
    const loc = await getObserverLocation();
    expect(['timezone', 'default']).toContain(loc.source);
    expect(Number.isFinite(loc.latDeg)).toBe(true);
    expect(Number.isFinite(loc.lonDeg)).toBe(true);
  });

  it('resolves to a usable location even with no geolocation API', async () => {
    vi.stubGlobal('navigator', {});
    const loc = await getObserverLocation();
    expect(['timezone', 'default']).toContain(loc.source);
  });
});
