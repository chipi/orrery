import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect, vi, beforeAll } from 'vitest';

// Hero overrides only load in the browser; the panel runs there, so the test does too.
vi.mock('$app/environment', () => ({ browser: true, dev: false, building: false }));

import { getMoonSiteGallery, getMarsSiteGallery, getVenusSiteGallery } from './galleries';
import frozen from './galleries-frozen.json';
import { thumbOfSite } from '../entity-thumb';

type Site = { id: string; mission_id?: string };
const sitesOf = (file: string): Site[] => {
  const doc = JSON.parse(readFileSync(`static/data/${file}`, 'utf8')) as
    Site[] | { sites: Site[] };
  return Array.isArray(doc) ? doc : doc.sites;
};

beforeAll(() => {
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = typeof input === 'string' ? input : input.toString();
    try {
      const content = readFileSync(join('static/data', url.replace(/^.*?\/data\//, '')), 'utf8');
      return new Response(content, { status: 200 });
    } catch {
      return new Response('not found', { status: 404 });
    }
  }) as typeof fetch;
});

// D3: the three site loaders share one ladder. The frozen file holds what the separate Moon and
// Mars loaders returned for every site before the refactor (hero override applied, panel order).
describe('the shared site gallery ladder keeps the Moon and Mars galleries as they were', () => {
  const moon = sitesOf('moon-sites.json');
  const mars = sitesOf('mars-sites.json');

  it('freezes every site', () => {
    expect(moon.length).toBe(30);
    expect(mars.length).toBe(27);
    expect(Object.keys(frozen.moon)).toEqual(moon.map((s) => s.id));
    expect(Object.keys(frozen.mars)).toEqual(mars.map((s) => s.id));
  });

  it.each(moon.map((s) => [s.id, s.mission_id] as const))('moon %s', async (id, missionId) => {
    expect(await getMoonSiteGallery(id, missionId)).toEqual(
      (frozen.moon as Record<string, string[]>)[id],
    );
  });

  it.each(mars.map((s) => [s.id, s.mission_id] as const))('mars %s', async (id, missionId) => {
    expect(await getMarsSiteGallery(id, missionId)).toEqual(
      (frozen.mars as Record<string, string[]>)[id],
    );
  });
});

describe('Venus sites use the same ladder (VE1)', () => {
  // The blessed hero slots in missions-hero-overrides.json (venera-13 02, vega-1 02, vega-2 03).
  const cases: [string, string[]][] = [
    ['venera-13', ['02', '01', '03']],
    ['vega-1', ['02', '01', '03', '04']],
    ['vega-2', ['03', '01', '02']],
  ];

  it.each(cases)('%s: the mission gallery, blessed hero first', async (id, slots) => {
    const urls = await getVenusSiteGallery(id);
    expect(urls).toEqual(slots.map((n) => `/images/missions/${id}/${n}.webp`));
  });

  // UXD-025: the INDEX round photo and the panel hero are one picture.
  it.each(['moon', 'mars', 'venus'] as const)(
    '%s: every site\'s panel hero is its INDEX thumb (same folder and slot)',
    async (body) => {
      const stem = (u: string) => u.match(/\/images\/(.+?)(?:-\d+)?\.webp$/)![1];
      const thumbStem = (u: string) => u.match(/\/images\/(.+?)\.1x1\.webp$/)![1];
      const load = { moon: getMoonSiteGallery, mars: getMarsSiteGallery, venus: getVenusSiteGallery };
      for (const s of sitesOf(`${body}-sites.json`)) {
        const gallery = await load[body](s.id, s.mission_id);
        expect(stem(gallery[0]!), `${body}/${s.id}`).toBe(thumbStem(thumbOfSite(body, s.id)!));
      }
    },
  );

  it('every Venus site has a gallery and an unknown id has none', async () => {
    for (const s of sitesOf('venus-sites.json'))
      expect((await getVenusSiteGallery(s.id, s.mission_id)).length, s.id).toBeGreaterThan(0);
    expect(await getVenusSiteGallery('no-such-site')).toEqual([]);
  });
});
