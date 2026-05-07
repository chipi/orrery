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
  getIssModules,
  getIssModule,
  getIssModuleGallery,
  getScienceSection,
  getScienceTab,
  getScienceTabIntro,
  rockets,
  earthObjects,
  moonSites,
  SCIENCE_TABS,
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
  it('returns 36 missions', async () => {
    const missions = await getMissionIndex();
    expect(missions).toHaveLength(36);
  });

  it('every entry has the required language-neutral fields', async () => {
    const missions = await getMissionIndex();
    for (const m of missions) {
      expect(m.id).toBeTruthy();
      expect(m.agency).toBeTruthy();
      expect(['MARS', 'MOON', 'JUPITER', 'NEPTUNE', 'PLUTO', 'CERES']).toContain(m.dest);
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

  it('outer-system dest filters return one mission each (ADR-028 3.0a-5)', async () => {
    for (const dest of ['JUPITER', 'NEPTUNE', 'PLUTO', 'CERES'] as const) {
      const rows = await filterMissions({ dest });
      expect(rows).toHaveLength(1);
      expect(rows[0].dest).toBe(dest);
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

  it('loads Galileo from the jupiter missions folder', async () => {
    const m = await getMission('galileo', 'jupiter');
    expect(m).not.toBeNull();
    expect(m!.dest).toBe('JUPITER');
    expect(m!.name).toBe('Galileo');
  });

  it('falls back gracefully when overlay missing for an unsupported locale', async () => {
    const m = await getMission('curiosity', 'mars', 'xx-TEST');
    expect(m).not.toBeNull();
    expect(m!.id).toBe('curiosity');
    // Base fields present even without locale overlay
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

  it('earthObjects() returns 20 objects (13 Earth-orbital + 7 lunar orbiters)', async () => {
    const data = await earthObjects();
    expect(data).toHaveLength(20);
    const lunar = data.filter((o) => o.regime === 'MOON');
    expect(lunar).toHaveLength(8); // LRO + the 7 backfilled v0.4 orbiters
  });

  it('moonSites() returns 24 sites (16 surface + 8 orbiters)', async () => {
    const data = await moonSites();
    expect(data).toHaveLength(24);
    const surface = data.filter((s) => !s.kind || s.kind === 'surface');
    const orbiters = data.filter((s) => s.kind === 'orbiter');
    expect(surface).toHaveLength(16);
    expect(orbiters).toHaveLength(8);
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
    const list = await getPlanets('xx-TEST');
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
    const list = await getRockets('xx-TEST');
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
    const sun = await getSun('xx-TEST');
    expect(sun.name).toBe('The Sun');
    expect(sun.spectral_class).toBe('G2V');
  });
});

describe('getMissionsForLibrary', () => {
  it('returns all 36 missions merged with their en-US overlays', async () => {
    const list = await getMissionsForLibrary();
    expect(list).toHaveLength(36);
    // Every mission should have its base fields…
    for (const m of list) {
      expect(m.id).toBeTruthy();
      expect(['MARS', 'MOON', 'JUPITER', 'NEPTUNE', 'PLUTO', 'CERES']).toContain(m.dest);
      expect(m.year).toBeGreaterThan(1900);
    }
    // …and a sample has the overlay fields merged in.
    const curiosity = list.find((m) => m.id === 'curiosity');
    expect(curiosity).toBeDefined();
    expect(curiosity!.name).toBe('Curiosity');
    expect(curiosity!.first).toContain('nuclear-powered');
  });

  it('falls back to en-US for missing locale', async () => {
    const list = await getMissionsForLibrary('xx-TEST');
    expect(list).toHaveLength(36);
  });

  it('count matches what filterMissions reports', async () => {
    const lib = await getMissionsForLibrary();
    const all = await filterMissions();
    expect(lib).toHaveLength(all.length);
  });
});

describe('getEarthObjects', () => {
  it('returns 20 objects merged with their en-US overlay', async () => {
    const list = await getEarthObjects();
    expect(list).toHaveLength(20);
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
    const list = await getEarthObjects('xx-TEST');
    expect(list).toHaveLength(20);
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
  it('returns 24 sites merged with their en-US overlay', async () => {
    const list = await getMoonSites();
    expect(list).toHaveLength(24);
    const apollo11 = list.find((s) => s.id === 'apollo11');
    expect(apollo11).toBeDefined();
    expect(apollo11!.year).toBe(1969);
    expect(apollo11!.lat).toBeCloseTo(0.67, 2);
    // Overlay-merged fields
    expect(apollo11!.name).toBe('Apollo 11');
    expect(apollo11!.crew).toEqual(['Neil Armstrong', 'Buzz Aldrin']);
    expect(apollo11!.left).toContain('flag');
  });

  it('every nation matches the surface-site nation enum', async () => {
    const list = await getMoonSites();
    // PRD-009 / RFC-012: backfilled lunar orbiters include SMART-1 (ESA →
    // nation 'Europe'), so the legend grows beyond the original five
    // nations. Both the original surface set and the orbiters share the
    // same nation enum from src/types/surface-site.ts.
    const allowed = new Set(['USA', 'USSR', 'Russia', 'China', 'India', 'Japan', 'Europe', 'UAE']);
    for (const s of list) {
      expect(allowed.has(s.nation)).toBe(true);
    }
  });

  it('falls back to en-US when locale overlay missing', async () => {
    const list = await getMoonSites('xx-TEST');
    expect(list).toHaveLength(24);
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
    const s = await getScenario('orrery-1', 'xx-TEST');
    expect(s).not.toBeNull();
    expect(s!.name).toBe('ORRERY DEMO');
  });
});

describe('getPorkchopGrid (v0.1.6 / ADR-026 + ADR-028)', () => {
  it.each([
    'mercury',
    'venus',
    'mars',
    'jupiter',
    'saturn',
    'uranus',
    'neptune',
    'pluto',
    'ceres',
  ] as const)('returns a valid grid for %s', async (id) => {
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
  });

  it('inner planets + Ceres offer LANDING + FLYBY; giants + Pluto only FLYBY', async () => {
    for (const id of ['mercury', 'venus', 'mars', 'ceres'] as const) {
      const g = await getPorkchopGrid(id);
      expect(g?.mission_types.sort()).toEqual(['FLYBY', 'LANDING']);
    }
    for (const id of ['jupiter', 'saturn', 'uranus', 'neptune', 'pluto'] as const) {
      const g = await getPorkchopGrid(id);
      expect(g?.mission_types).toEqual(['FLYBY']);
    }
  });

  it('TOF axis: Mercury–Mars + Ceres in days; gas giants + Pluto in years', async () => {
    for (const id of ['mercury', 'venus', 'mars', 'ceres'] as const) {
      const g = await getPorkchopGrid(id);
      expect(g?.tof_axis_unit).toBe('days');
    }
    for (const id of ['jupiter', 'saturn', 'uranus', 'neptune', 'pluto'] as const) {
      const g = await getPorkchopGrid(id);
      expect(g?.tof_axis_unit).toBe('years');
    }
  });

  it('LANDING dv_orbit_insertion is positive where LANDING is offered', async () => {
    for (const id of ['mercury', 'venus', 'mars', 'ceres'] as const) {
      const g = await getPorkchopGrid(id);
      expect(g?.dv_orbit_insertion.LANDING).toBeGreaterThan(0);
    }
  });
});

describe('ISS modules (PRD-010)', () => {
  it('getIssModules returns 18 merged rows', async () => {
    const list = await getIssModules('en-US');
    expect(list).toHaveLength(18);
    const zarya = list.find((m) => m.id === 'zarya');
    expect(zarya?.name).toContain('Zarya');
    expect(zarya?.description.length).toBeGreaterThan(10);
  });

  it('getIssModules(es) merges Spanish overlays', async () => {
    const list = await getIssModules('es');
    const zarya = list.find((m) => m.id === 'zarya');
    expect(zarya?.description).toContain('El primer módulo');
  });

  it('getIssModule returns one merged row', async () => {
    const m = await getIssModule('harmony', 'en-US');
    expect(m).not.toBeNull();
    expect(m!.id).toBe('harmony');
    expect(m!.name.length).toBeGreaterThan(2);
  });

  it('getIssModuleGallery returns manifest-backed URLs for ISS modules', async () => {
    const urls = await getIssModuleGallery('cupola');
    expect(urls.length).toBeGreaterThan(0);
    expect(urls[0]).toMatch(/\/images\/iss-modules\/cupola\/01\.jpg$/);
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

  it('getEarthObjectGallery returns 3+ URLs for tiangong (post v0.3 top-up)', async () => {
    // tiangong's manifest count was bumped from 0 to 3 in v0.3 once
    // Wikimedia API search produced verified filenames (Chinese
    // Tiangong Space Station, Rear view, Basic experiment cabinet).
    // Updates here every time the GALLERY_MIN_TARGET changes.
    const urls = await getEarthObjectGallery('tiangong');
    expect(urls.length).toBeGreaterThanOrEqual(3);
  });

  it('getMoonSiteGallery returns URLs for Apollo 11 (copied from missions)', async () => {
    const urls = await getMoonSiteGallery('apollo11');
    expect(urls.length).toBeGreaterThan(0);
    expect(urls[0]).toMatch(/\/images\/moon-sites\/apollo11\/01\.jpg$/);
  });
});

describe('SCIENCE_TABS', () => {
  it('exposes the six encyclopedia tab ids', () => {
    expect(SCIENCE_TABS).toEqual([
      'orbits',
      'transfers',
      'propulsion',
      'mission-phases',
      'scales-time',
      'porkchop',
    ]);
  });
});

describe('getScienceSection', () => {
  it('merges base + en-US overlay for a known section', async () => {
    const s = await getScienceSection('orbits', 'vis-viva');
    expect(s).not.toBeNull();
    expect(s!.id).toBe('vis-viva');
    expect(s!.tab).toBe('orbits');
    expect(s!.title).toBe('Vis-Viva Equation');
    expect(s!.formula_latex).toBeTruthy();
    expect(s!.body_paragraphs.length).toBeGreaterThan(0);
    expect(s!.narrative_101).toBeDefined();
    expect(s!.narrative_101!.length).toBeGreaterThan(0);
  });

  it('falls back to en-US when locale overlay is missing', async () => {
    const s = await getScienceSection('orbits', 'vis-viva', 'xx-TEST');
    expect(s).not.toBeNull();
    expect(s!.title).toBe('Vis-Viva Equation');
  });

  it('returns null for an unknown section id', async () => {
    const s = await getScienceSection('orbits', 'does-not-exist');
    expect(s).toBeNull();
  });

  it('every declared section in every tab resolves to a complete record', async () => {
    for (const tab of SCIENCE_TABS) {
      const sections = await getScienceTab(tab);
      expect(sections.length).toBeGreaterThan(0);
      for (const s of sections) {
        expect(s.id).toBeTruthy();
        expect(s.title).toBeTruthy();
        expect(s.intro_sentence).toBeTruthy();
        expect(s.body_paragraphs.length).toBeGreaterThan(0);
        expect(s.links.length).toBeGreaterThan(0);
      }
    }
  });
});

describe('getScienceTab', () => {
  it('returns orbits sections sorted by order', async () => {
    const sections = await getScienceTab('orbits');
    expect(sections.length).toBe(9);
    for (let i = 1; i < sections.length; i++) {
      expect(sections[i].order).toBeGreaterThanOrEqual(sections[i - 1].order);
    }
  });

  it('returns 42 sections across all six tabs combined', async () => {
    let total = 0;
    for (const tab of SCIENCE_TABS) {
      total += (await getScienceTab(tab)).length;
    }
    expect(total).toBe(42);
  });
});

describe('getScienceTabIntro', () => {
  it('returns the editorial 101 intro for each of the six tabs', async () => {
    for (const tab of SCIENCE_TABS) {
      const intro = await getScienceTabIntro(tab);
      expect(intro).not.toBeNull();
      expect(intro!.headline).toBeTruthy();
      expect(intro!.paragraphs.length).toBeGreaterThan(0);
    }
  });

  it('falls back to en-US for an unknown locale', async () => {
    const intro = await getScienceTabIntro('orbits', 'xx-TEST');
    expect(intro).not.toBeNull();
    expect(intro!.headline).toContain('gravity');
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
