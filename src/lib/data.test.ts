import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  getMissionIndex,
  getMission,
  getMissionsForLibrary,
  filterMissions,
  planets,
  getPlanets,
  getRockets,
  getSun,
  getScenario,
  getEarthObjects,
  getMoonSites,
  getPorkchopGrid,
  getPlanetGallery,
  getSunGallery,
  getEarthObjectGallery,
  getMoonSiteGallery,
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
  it('returns 32 missions', async () => {
    const missions = await getMissionIndex();
    expect(missions).toHaveLength(32);
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
  it('MARS filter returns 16', async () => {
    const mars = await filterMissions({ dest: 'MARS' });
    expect(mars).toHaveLength(16);
    for (const m of mars) expect(m.dest).toBe('MARS');
  });

  it('MOON filter returns 16', async () => {
    const moon = await filterMissions({ dest: 'MOON' });
    expect(moon).toHaveLength(16);
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

  it('rockets() returns 13 vehicles', async () => {
    const data = await rockets();
    expect(data).toHaveLength(13);
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

describe('getRockets', () => {
  it('returns 13 rockets merged with en-US overlay (name + description)', async () => {
    const list = await getRockets();
    expect(list).toHaveLength(13);
    const falcon = list.find((r) => r.id === 'falcon-heavy');
    expect(falcon).toBeDefined();
    // Base data
    expect(falcon!.delta_v_capability_km_s).toBeCloseTo(9.4, 2);
    expect(falcon!.agency).toBe('SpaceX');
    // Overlay-merged fields
    expect(falcon!.name).toBe('Falcon Heavy');
    expect(falcon!.description).toContain('Three-core');
  });

  it('falls back to en-US when locale overlay missing', async () => {
    const list = await getRockets('fr');
    expect(list).toHaveLength(13);
    const starship = list.find((r) => r.id === 'starship');
    expect(starship?.name).toBe('Starship');
  });
});

describe('getSun', () => {
  it('returns Sun astrophysical figures + en-US overlay', async () => {
    const sun = await getSun();
    expect(sun.spectral_class).toBe('G2V');
    expect(sun.mass_fraction_pct).toBeCloseTo(99.86, 2);
    expect(sun.surface_temp_k).toBe(5778);
    expect(sun.name).toBe('The Sun');
    expect(sun.fact).toContain('99.86');
    expect(sun.bio).toContain('main-sequence');
  });

  it('falls back to en-US for missing locale', async () => {
    const sun = await getSun('fr');
    expect(sun.name).toBe('The Sun');
    expect(sun.spectral_class).toBe('G2V');
  });
});

describe('getMissionsForLibrary', () => {
  it('returns all 32 missions merged with their en-US overlays', async () => {
    const list = await getMissionsForLibrary();
    expect(list).toHaveLength(32);
    // Every mission should have its base fields…
    for (const m of list) {
      expect(m.id).toBeTruthy();
      expect(['MARS', 'MOON']).toContain(m.dest);
      expect(m.year).toBeGreaterThan(1900);
    }
    // …and a sample has the overlay fields merged in.
    const curiosity = list.find((m) => m.id === 'curiosity');
    expect(curiosity).toBeDefined();
    expect(curiosity!.name).toBe('Curiosity');
    expect(curiosity!.first).toContain('nuclear-powered');
  });

  it('falls back to en-US for missing locale', async () => {
    const list = await getMissionsForLibrary('fr');
    expect(list).toHaveLength(32);
  });

  it('count matches what filterMissions reports', async () => {
    const lib = await getMissionsForLibrary();
    const all = await filterMissions();
    expect(lib).toHaveLength(all.length);
  });
});

describe('getEarthObjects', () => {
  it('returns 13 objects merged with their en-US overlay', async () => {
    const list = await getEarthObjects();
    expect(list).toHaveLength(13);
    const iss = list.find((o) => o.id === 'iss');
    expect(iss).toBeDefined();
    expect(iss!.altitude_km).toBe(408);
    expect(iss!.regime).toBe('LEO');
    // Overlay-merged fields
    expect(iss!.name).toBe('International Space Station');
    expect(iss!.short).toBe('ISS');
    expect(iss!.scale_fact).toContain('408 km');
  });

  it('falls back to en-US when locale overlay missing', async () => {
    const list = await getEarthObjects('fr');
    expect(list).toHaveLength(13);
    const iss = list.find((o) => o.id === 'iss');
    expect(iss?.short).toBe('ISS');
  });

  it('count parity with the base earthObjects() reference', async () => {
    const merged = await getEarthObjects();
    const base = await earthObjects();
    expect(merged).toHaveLength(base.length);
  });
});

describe('getMoonSites', () => {
  it('returns 16 sites merged with their en-US overlay', async () => {
    const list = await getMoonSites();
    expect(list).toHaveLength(16);
    const apollo11 = list.find((s) => s.id === 'apollo11');
    expect(apollo11).toBeDefined();
    expect(apollo11!.year).toBe(1969);
    expect(apollo11!.lat).toBeCloseTo(0.67, 2);
    // Overlay-merged fields
    expect(apollo11!.name).toBe('Apollo 11');
    expect(apollo11!.crew).toEqual(['Neil Armstrong', 'Buzz Aldrin']);
    expect(apollo11!.left).toContain('flag');
  });

  it('every nation matches the IA-defined enum', async () => {
    const list = await getMoonSites();
    const allowed = new Set(['USA', 'USSR', 'Russia', 'China', 'India', 'Japan']);
    for (const s of list) {
      expect(allowed.has(s.nation)).toBe(true);
    }
  });

  it('falls back to en-US when locale overlay missing', async () => {
    const list = await getMoonSites('fr');
    expect(list).toHaveLength(16);
  });
});

describe('getScenario', () => {
  it('returns the ORRERY DEMO scenario merged with its en-US overlay', async () => {
    const s = await getScenario('orrery-1');
    expect(s).not.toBeNull();
    expect(s!.id).toBe('orrery-1');
    expect(s!.name).toBe('ORRERY DEMO');
    expect(s!.vehicle).toBe('Falcon Heavy');
    expect(s!.dep_day).toBe(333);
    expect(s!.flyby_day).toBe(592);
    expect(s!.arr_day).toBe(842);
    expect(s!.dv_total_km_s).toBeCloseTo(3.86, 2);
    expect(s!.events.length).toBeGreaterThanOrEqual(11);
    // Verifies the overlay fix from the audit — at least one
    // warning-typed event in the default scenario so the CAPCOM
    // anomaly monitor reaches CAUTION as the user scrubs forward.
    expect(s!.events.some((e) => e.type === 'warning')).toBe(true);
  });

  it('returns null for an unknown scenario id', async () => {
    const s = await getScenario('does-not-exist');
    expect(s).toBeNull();
  });

  it('falls back to en-US for missing locale', async () => {
    const s = await getScenario('orrery-1', 'fr');
    expect(s).not.toBeNull();
    expect(s!.name).toBe('ORRERY DEMO');
  });
});

describe('getPorkchopGrid (v0.1.6 / ADR-026)', () => {
  it.each(['mercury', 'venus', 'mars', 'jupiter', 'saturn'] as const)(
    'returns a valid grid for %s',
    async (id) => {
      const g = await getPorkchopGrid(id);
      expect(g).not.toBeNull();
      if (!g) return;
      expect(g.destination).toBe(id);
      expect(g.steps).toEqual([112, 100]);
      expect(g.grid).toHaveLength(100); // 100 rows (TOF axis)
      expect(g.grid[0]).toHaveLength(112); // 112 cols (dep axis)
      // Ranges declared per ADR-026 §Destination scope
      expect(g.dep_range_days).toEqual([0, 1460]);
      expect(g.tof_range_days[1]).toBeGreaterThan(g.tof_range_days[0]);
    },
  );

  it('inner planets offer LANDING + FLYBY; gas giants only FLYBY', async () => {
    for (const id of ['mercury', 'venus', 'mars'] as const) {
      const g = await getPorkchopGrid(id);
      expect(g?.mission_types.sort()).toEqual(['FLYBY', 'LANDING']);
    }
    for (const id of ['jupiter', 'saturn'] as const) {
      const g = await getPorkchopGrid(id);
      expect(g?.mission_types).toEqual(['FLYBY']);
    }
  });

  it('Jupiter and Saturn render in years; inner planets in days', async () => {
    for (const id of ['mercury', 'venus', 'mars'] as const) {
      const g = await getPorkchopGrid(id);
      expect(g?.tof_axis_unit).toBe('days');
    }
    for (const id of ['jupiter', 'saturn'] as const) {
      const g = await getPorkchopGrid(id);
      expect(g?.tof_axis_unit).toBe('years');
    }
  });

  it('LANDING dv_orbit_insertion is positive for inner planets', async () => {
    for (const id of ['mercury', 'venus', 'mars'] as const) {
      const g = await getPorkchopGrid(id);
      expect(g?.dv_orbit_insertion.LANDING).toBeGreaterThan(0);
    }
  });
});

describe('panel gallery loaders (v0.1.10)', () => {
  it('getPlanetGallery returns count-many URLs for Mars', async () => {
    const urls = await getPlanetGallery('mars');
    expect(urls.length).toBeGreaterThan(0);
    expect(urls[0]).toMatch(/\/images\/planets\/mars\/01\.jpg$/);
    // Filenames are zero-padded to two digits.
    if (urls.length >= 2) expect(urls[1]).toMatch(/02\.jpg$/);
  });

  it('getPlanetGallery returns [] for an unknown id', async () => {
    const urls = await getPlanetGallery('not-a-planet');
    expect(urls).toEqual([]);
  });

  it('getSunGallery returns count-many URLs', async () => {
    const urls = await getSunGallery();
    expect(urls.length).toBeGreaterThan(0);
    expect(urls[0]).toMatch(/\/images\/sun\/01\.jpg$/);
  });

  it('getEarthObjectGallery returns URLs for a populated entity (iss)', async () => {
    const urls = await getEarthObjectGallery('iss');
    expect(urls.length).toBeGreaterThan(0);
    expect(urls[0]).toMatch(/\/images\/earth-objects\/iss\/01\.jpg$/);
  });

  it('getEarthObjectGallery returns [] for an empty manifest entry (tiangong)', async () => {
    // tiangong stayed at count=0 — Wikimedia fallback didn't resolve.
    // The honesty rule: empty array → UI hides the GALLERY tab.
    const urls = await getEarthObjectGallery('tiangong');
    expect(urls).toEqual([]);
  });

  it('getMoonSiteGallery returns URLs for Apollo 11 (copied from missions)', async () => {
    const urls = await getMoonSiteGallery('apollo11');
    expect(urls.length).toBeGreaterThan(0);
    expect(urls[0]).toMatch(/\/images\/moon-sites\/apollo11\/01\.jpg$/);
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
