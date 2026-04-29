import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  getMissionIndex,
  getMission,
  filterMissions,
  planets,
  getPlanets,
  rockets,
  earthObjects,
  moonSites,
  __resetCache,
} from './data';

/**
 * Mock global fetch to read from static/data/ on disk. Strips the optional
 * base path prefix (e.g. "/orrery") and the leading "/data/" so we land on
 * a real file path.
 */
const originalFetch = globalThis.fetch;

beforeAll(() => {
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = typeof input === 'string' ? input : input.toString();
    const stripped = url.replace(/^.*?\/data\//, '');
    const path = join('static/data', stripped);
    try {
      const content = readFileSync(path, 'utf8');
      return new Response(content, {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    } catch {
      return new Response('not found', { status: 404 });
    }
  }) as typeof fetch;
});

afterAll(() => {
  globalThis.fetch = originalFetch;
});

beforeEach(() => {
  __resetCache();
});

describe('getMissionIndex', () => {
  it('returns 28 missions', async () => {
    const missions = await getMissionIndex();
    expect(missions).toHaveLength(28);
  });

  it('every entry has the required language-neutral fields', async () => {
    const missions = await getMissionIndex();
    for (const m of missions) {
      expect(m.id).toBeTruthy();
      expect(m.agency).toBeTruthy();
      expect(['MARS', 'MOON']).toContain(m.dest);
      expect(['ACTIVE', 'FLOWN', 'PLANNED']).toContain(m.status);
      expect(['gov', 'private']).toContain(m.sector);
      expect(m.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });
});

describe('filterMissions', () => {
  it('MARS filter returns 14', async () => {
    const mars = await filterMissions({ dest: 'MARS' });
    expect(mars).toHaveLength(14);
    for (const m of mars) expect(m.dest).toBe('MARS');
  });

  it('MOON filter returns 14', async () => {
    const moon = await filterMissions({ dest: 'MOON' });
    expect(moon).toHaveLength(14);
    for (const m of moon) expect(m.dest).toBe('MOON');
  });

  it('ACTIVE status filter returns only active missions', async () => {
    const active = await filterMissions({ status: 'ACTIVE' });
    expect(active.length).toBeGreaterThan(0);
    for (const m of active) expect(m.status).toBe('ACTIVE');
  });

  it('combinable filters compose correctly (Mars + ACTIVE)', async () => {
    const all = await filterMissions({ dest: 'MARS', status: 'ACTIVE' });
    for (const m of all) {
      expect(m.dest).toBe('MARS');
      expect(m.status).toBe('ACTIVE');
    }
  });

  it('NASA agency filter returns only NASA missions', async () => {
    const nasa = await filterMissions({ agency: 'NASA' });
    expect(nasa.length).toBeGreaterThan(0);
    for (const m of nasa) expect(m.agency).toBe('NASA');
  });
});

describe('getMission', () => {
  it('merges base and locale overlay (Curiosity)', async () => {
    const m = await getMission('curiosity', 'mars');
    expect(m).not.toBeNull();
    expect(m!.id).toBe('curiosity');
    expect(m!.transit_days).toBe(254); // from base record
    expect(m!.name).toBe('Curiosity'); // from overlay
    expect(m!.events).toBeDefined();
    expect(Array.isArray(m!.events)).toBe(true);
    expect(m!.events!.length).toBeGreaterThanOrEqual(2);
  });

  it('handles dest case-insensitively', async () => {
    const lower = await getMission('curiosity', 'mars');
    const upper = await getMission('curiosity', 'MARS');
    expect(lower?.id).toBe(upper?.id);
  });

  it('falls back gracefully when overlay missing for a different locale', async () => {
    const m = await getMission('curiosity', 'mars', 'fr');
    expect(m).not.toBeNull();
    expect(m!.id).toBe('curiosity');
    // Base fields present even without French overlay
    expect(m!.transit_days).toBe(254);
    // Overlay-only fields absent
    expect(m!.name).toBeUndefined();
  });

  it('returns null for unknown mission', async () => {
    const m = await getMission('does-not-exist', 'mars');
    expect(m).toBeNull();
  });

  it('returns null for unknown destination', async () => {
    const m = await getMission('curiosity', 'venus');
    expect(m).toBeNull();
  });
});

describe('reference data', () => {
  it('planets() returns 8 planets and constants', async () => {
    const data = await planets();
    expect(data.planets).toHaveLength(8);
    expect(data.constants.mu_sun).toBeCloseTo(39.4784, 3);
  });

  it('rockets() returns 6 vehicles', async () => {
    const data = await rockets();
    expect(data).toHaveLength(6);
  });

  it('earthObjects() returns 13 objects', async () => {
    const data = await earthObjects();
    expect(data).toHaveLength(13);
  });

  it('moonSites() returns 16 sites', async () => {
    const data = await moonSites();
    expect(data).toHaveLength(16);
  });
});

describe('getPlanets', () => {
  it('returns 8 planets merged with en-US overlay', async () => {
    const list = await getPlanets();
    expect(list).toHaveLength(8);
    const earth = list.find((p) => p.id === 'earth');
    expect(earth).toBeDefined();
    expect(earth!.a).toBeCloseTo(1.0, 4); // base orbital data
    expect(earth!.type).toBe('Home · Reference orbit'); // overlay
    expect(earth!.fact).toContain('Every human');
    expect(earth!.bio).toContain('axial tilt');
  });

  it('Mars overlay marks the planet as missionable', async () => {
    const list = await getPlanets();
    const mars = list.find((p) => p.id === 'mars');
    expect(mars?.missionable).toBe(true);
  });

  it('non-mission planets do not carry the missionable flag', async () => {
    const list = await getPlanets();
    const venus = list.find((p) => p.id === 'venus');
    expect(venus?.missionable).toBeUndefined();
  });

  it('falls back to en-US when locale overlay missing', async () => {
    const list = await getPlanets('fr');
    expect(list).toHaveLength(8);
    expect(list[2].id).toBe('earth');
    expect(list[2].fact).toContain('Every human');
  });
});

describe('cache behaviour', () => {
  it('cache is hit on second call (no extra fetch)', async () => {
    let calls = 0;
    const fetchSpy = globalThis.fetch;
    globalThis.fetch = (async (...args: Parameters<typeof fetch>) => {
      calls++;
      return fetchSpy(...args);
    }) as typeof fetch;

    __resetCache();
    await getMissionIndex();
    const afterFirst = calls;
    await getMissionIndex();
    expect(calls).toBe(afterFirst);

    globalThis.fetch = fetchSpy;
  });
});
