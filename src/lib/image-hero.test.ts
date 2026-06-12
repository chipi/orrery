// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('$app/environment', () => ({ browser: true }));
vi.mock('$app/paths', () => ({ base: '' }));

import {
  pickHero,
  loadHeroOverrides,
  _resetHeroOverrideCache,
  type HeroOverrideFile,
} from './image-hero';

beforeEach(() => {
  _resetHeroOverrideCache();
  vi.restoreAllMocks();
});

describe('pickHero — default path', () => {
  it('returns the universal <surface>/<id>/01.jpg path when no override loaded', () => {
    expect(pickHero('missions', 'curiosity')).toBe('/images/missions/curiosity/01.jpg');
    expect(pickHero('fleet', 'falcon9-block5')).toBe(
      '/images/fleet-galleries/falcon9-block5/01.jpg',
    );
    expect(pickHero('moon-sites', 'apollo11')).toBe('/images/moon-sites/apollo11/01.jpg');
    expect(pickHero('mars-sites', 'jezero')).toBe('/images/mars-sites/jezero/01.jpg');
    expect(pickHero('earth-objects', 'iss')).toBe('/images/earth-objects/iss/01.jpg');
  });

  it('maps the fleet surface to fleet-galleries dir', () => {
    // The one path-convention divergence — fleet uses fleet-galleries/<id>/
    // not fleet/<id>/. Sanity-pin so a future rename catches the divergence.
    expect(pickHero('fleet', 'atv')).toBe('/images/fleet-galleries/atv/01.jpg');
  });
});

describe('loadHeroOverrides — fetch behaviour', () => {
  it('returns null when the file is missing (404)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(new Response(null, { status: 404 }))) as unknown as typeof fetch,
    );
    const r = await loadHeroOverrides('missions');
    expect(r).toBeNull();
  });

  it('returns null when the fetch throws (network failure / JSON parse)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new Error('network down'))) as unknown as typeof fetch,
    );
    const r = await loadHeroOverrides('missions');
    expect(r).toBeNull();
  });

  it('caches the result so a second call does not refetch', async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            version: '1.0',
            overrides: { dawn: { slot: '02.jpg', reason: 'render' } },
          }),
          { status: 200 },
        ),
      ),
    );
    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch);
    await loadHeroOverrides('missions');
    await loadHeroOverrides('missions');
    await loadHeroOverrides('missions');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('coalesces concurrent in-flight calls to a single fetch', async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve(
        new Response(JSON.stringify({ version: '1.0', overrides: {} }), { status: 200 }),
      ),
    );
    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch);
    const [a, b, c] = await Promise.all([
      loadHeroOverrides('fleet'),
      loadHeroOverrides('fleet'),
      loadHeroOverrides('fleet'),
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(a).toBe(b);
    expect(b).toBe(c);
  });
});

describe('pickHero — override resolution', () => {
  it('returns the override-blessed slot when the override is in cache', async () => {
    const file: HeroOverrideFile = {
      version: '1.0',
      overrides: {
        perseverance: {
          slot: '04.jpg',
          reason: '01.jpg is mis-sourced — Curiosity photo. 04.jpg is real Perseverance.',
        },
      },
    };
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve(new Response(JSON.stringify(file), { status: 200 })),
      ) as unknown as typeof fetch,
    );
    await loadHeroOverrides('missions');
    expect(pickHero('missions', 'perseverance')).toBe('/images/missions/perseverance/04.jpg');
  });

  it('still falls back to 01.jpg for ids NOT in the override file', async () => {
    const file: HeroOverrideFile = {
      version: '1.0',
      overrides: { dawn: { slot: '03.jpg' } },
    };
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve(new Response(JSON.stringify(file), { status: 200 })),
      ) as unknown as typeof fetch,
    );
    await loadHeroOverrides('missions');
    expect(pickHero('missions', 'dawn')).toBe('/images/missions/dawn/03.jpg');
    expect(pickHero('missions', 'curiosity')).toBe('/images/missions/curiosity/01.jpg');
  });

  it('per-surface overrides do not bleed across surfaces', async () => {
    const fetchMock = vi.fn((url: string) => {
      if (url.includes('missions-hero-overrides')) {
        return Promise.resolve(
          new Response(
            JSON.stringify({ version: '1.0', overrides: { dawn: { slot: '03.jpg' } } }),
            { status: 200 },
          ),
        );
      }
      return Promise.resolve(new Response(null, { status: 404 }));
    });
    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch);
    await loadHeroOverrides('missions');
    await loadHeroOverrides('fleet');
    // Mission override applied.
    expect(pickHero('missions', 'dawn')).toBe('/images/missions/dawn/03.jpg');
    // Fleet has no override file → default everywhere.
    expect(pickHero('fleet', 'dawn')).toBe('/images/fleet-galleries/dawn/01.jpg');
  });
});
