import { describe, it, expect } from 'vitest';
import { readdirSync } from 'node:fs';
// @ts-expect-error plain .mjs without types
import * as mod from './build-route-lastmod.mjs';
import { SUPPORTED_LOCALES } from '../src/lib/locale';
import { localeSitemapXml } from '../src/lib/sitemap';
// @ts-expect-error plain .mjs without types
import { parseUrlset, filterSince } from './indexnow-submit.mjs';

const {
  parseNameLog,
  entryDatesFromVersions,
  compact,
  serialize,
  routeFiles,
  inputsFor,
  newestTs,
} = mod;

const day = (s: string) => Date.parse(`${s}T12:00:00Z`) / 1000;

describe('parseNameLog', () => {
  it('keeps the newest commit time per file, whatever the log order', () => {
    const log = '\x01200\n\na.json\nb.json\n\x01300\n\na.json\n\x01100\n\nb.json\nc.json\n';
    const m = parseNameLog(log);
    expect(m.get('a.json')).toBe(300);
    expect(m.get('b.json')).toBe(200);
    expect(m.get('c.json')).toBe(100);
  });
});

describe('entryDatesFromVersions', () => {
  const entries = (j: { id: string }[]) => j.map((e) => [e.id, e]);
  it('moves an entry only when its own content changes', () => {
    const v = [
      {
        ts: 1,
        json: [
          { id: 'a', n: 1 },
          { id: 'b', n: 1 },
        ],
      },
      {
        ts: 2,
        json: [
          { id: 'a', n: 2 },
          { id: 'b', n: 1 },
        ],
      },
      {
        ts: 3,
        json: [
          { n: 2, id: 'a' },
          { id: 'b', n: 1 },
          { id: 'c', n: 9 },
        ],
      },
    ];
    const d = entryDatesFromVersions(v, entries);
    expect(d.get('a')).toBe(2);
    expect(d.get('b')).toBe(1);
    expect(d.get('c')).toBe(3);
  });
});

describe('compact / serialize', () => {
  it('collapses equal locales to one date and keeps only exceptions otherwise', () => {
    expect(compact({ a: '2026-01-01', b: '2026-01-01' })).toBe('2026-01-01');
    expect(compact({ a: '2026-01-01', b: '2026-01-01', c: '2026-02-02' })).toEqual({
      '*': '2026-01-01',
      c: '2026-02-02',
    });
  });
  it('writes one sorted route per line', () => {
    expect(serialize({ '/b': '2026-01-01', '/a': { '*': '2026-01-01', de: '2026-02-02' } })).toBe(
      '{\n"/a": {"*":"2026-01-01","de":"2026-02-02"},\n"/b": "2026-01-01"\n}\n',
    );
  });
});

describe('route inputs', () => {
  const tracked = new Set([
    'src/routes/+page.svelte',
    'src/routes/+layout.svelte',
    'src/routes/missions/+page.svelte',
    'src/routes/missions/helper/Card.svelte',
    'src/routes/missions/helper/Card.test.ts',
    'src/routes/missions/launches/+page.svelte',
    'src/routes/missions/[id]/+page.svelte',
    'static/data/missions/lunar/apollo11.json',
    'i18n-src/en-US/missions/lunar/apollo11.json',
    'i18n-src/de/missions/lunar/apollo11.json',
  ]);
  const latest = new Map<string, number>([
    ['src/routes/+page.svelte', day('2026-01-01')],
    ['src/routes/+layout.svelte', day('2026-09-09')],
    ['src/routes/missions/+page.svelte', day('2026-02-01')],
    ['src/routes/missions/helper/Card.svelte', day('2026-03-01')],
    ['src/routes/missions/launches/+page.svelte', day('2026-09-09')],
    ['src/routes/missions/[id]/+page.svelte', day('2026-04-01')],
    ['static/data/missions/lunar/apollo11.json', day('2026-05-01')],
    ['i18n-src/en-US/missions/lunar/apollo11.json', day('2026-06-01')],
    ['i18n-src/de/missions/lunar/apollo11.json', day('2026-07-01')],
  ]);
  const ctx = { tracked, latest, entryDates: new Map(), locales: ['de', 'fr'] };
  const data = { missions: new Map([['apollo11', 'LUNAR']]), fleet: new Map(), labFiles: [] };

  it('takes a route’s own files and helper folders, not child routes, layouts or tests', () => {
    expect(routeFiles(ctx, '').sort()).toEqual(['src/routes/+page.svelte']);
    expect(routeFiles(ctx, 'missions').sort()).toEqual([
      'src/routes/missions/+page.svelte',
      'src/routes/missions/helper/Card.svelte',
    ]);
  });

  it('dates an entity page from data, route and its locale overlay (en-US when absent)', () => {
    const inputs = inputsFor('/missions/apollo11', ctx, data);
    expect(newestTs(inputs, 'de', ctx)).toBe(day('2026-07-01'));
    expect(newestTs(inputs, 'fr', ctx)).toBe(day('2026-06-01'));
  });

  it('dates an index page without the entity pages under it', () => {
    expect(newestTs(inputsFor('/missions', ctx, data), 'de', ctx)).toBe(day('2026-03-01'));
  });

  it('returns 0 (so the build errors) for a route with no inputs', () => {
    expect(newestTs(inputsFor('/fly', ctx, data), 'de', ctx)).toBe(0);
  });
});

describe('star page inputs', () => {
  const tracked = new Set([
    'src/routes/explore/stars/[id]/+page.svelte',
    'static/data/culture-doors.json',
    'i18n-src/en-US/universe/named-stars/vega.json',
    'i18n-src/de/universe/named-stars/vega.json',
    'i18n-src/en-US/universe/exoplanets/kepler-16-b.json',
    'i18n-src/en-US/culture-doors/kepler16b-tatooine.json',
  ]);
  const latest = new Map<string, number>([
    ['src/routes/explore/stars/[id]/+page.svelte', day('2026-03-01')],
    ['static/data/culture-doors.json', day('2026-01-01')],
    ['i18n-src/en-US/universe/named-stars/vega.json', day('2026-04-01')],
    ['i18n-src/de/universe/named-stars/vega.json', day('2026-05-01')],
    ['i18n-src/en-US/culture-doors/kepler16b-tatooine.json', day('2026-08-01')],
  ]);
  const entryDates = new Map([
    ['static/data/universe/named-stars.json#vega', day('2026-06-01')],
    ['static/data/universe/exoplanet-systems.json#kepler-16', day('2026-07-01')],
  ]);
  const ctx = { tracked, latest, entryDates, locales: ['de', 'fr'] };
  const data = {
    missions: new Map(),
    fleet: new Map(),
    labFiles: [],
    hostPlanets: new Map([['kepler-16', ['kepler-16-b']]]),
    doors: [{ id: 'kepler16b-tatooine', objectId: 'kepler-16-b' }],
  };

  it('dates a named star from its own record and overlay, not the body pages', () => {
    const inputs = inputsFor('/explore/stars/vega', ctx, data);
    expect(newestTs(inputs, 'de', ctx)).toBe(day('2026-06-01'));
    expect(newestTs(inputs, 'fr', ctx)).toBe(day('2026-06-01'));
  });

  it('dates a host-only star from its system record, its planets’ overlays and its planets’ culture doors', () => {
    const inputs = inputsFor('/explore/stars/kepler-16', ctx, data);
    expect(inputs.overlays).toContain('universe/exoplanets/kepler-16-b.json');
    expect(inputs.overlays).toContain('culture-doors/kepler16b-tatooine.json');
    expect(newestTs(inputs, 'de', ctx)).toBe(day('2026-08-01'));
  });
});

describe('black-hole page inputs', () => {
  const tracked = new Set([
    'src/routes/explore/black-holes/[id]/+page.svelte',
    'static/data/culture-doors.json',
    'i18n-src/en-US/universe/black-holes/gargantua.json',
    'i18n-src/de/universe/black-holes/gargantua.json',
    'i18n-src/en-US/culture-doors/gargantua-interstellar.json',
  ]);
  const latest = new Map<string, number>([
    ['src/routes/explore/black-holes/[id]/+page.svelte', day('2026-03-01')],
    ['static/data/culture-doors.json', day('2026-01-01')],
    ['i18n-src/en-US/universe/black-holes/gargantua.json', day('2026-04-01')],
    ['i18n-src/de/universe/black-holes/gargantua.json', day('2026-05-01')],
    ['i18n-src/en-US/culture-doors/gargantua-interstellar.json', day('2026-08-01')],
  ]);
  const entryDates = new Map([
    ['static/data/universe/black-holes.json#gargantua', day('2026-06-01')],
    ['static/data/universe/black-holes.json#cygnus-x-1', day('2026-02-01')],
  ]);
  const ctx = { tracked, latest, entryDates, locales: ['de', 'fr'] };
  const data = {
    missions: new Map(),
    fleet: new Map(),
    labFiles: [],
    hostPlanets: new Map(),
    doors: [{ id: 'gargantua-interstellar', objectId: 'gargantua' }],
  };

  it('dates a black hole from its own list entry, its overlay and its culture door', () => {
    const inputs = inputsFor('/explore/black-holes/gargantua', ctx, data);
    expect(inputs.entries).toEqual(['static/data/universe/black-holes.json#gargantua']);
    expect(inputs.overlays).toContain('universe/black-holes/gargantua.json');
    expect(inputs.overlays).toContain('culture-doors/gargantua-interstellar.json');
    expect(newestTs(inputs, 'de', ctx)).toBe(day('2026-08-01'));
  });

  it('does not take a neighbour’s edit: a hole with no door and no overlay is dated by its own entry', () => {
    const inputs = inputsFor('/explore/black-holes/cygnus-x-1', ctx, data);
    expect(newestTs(inputs, 'fr', ctx)).toBe(day('2026-03-01'));
  });
});

describe('locale list', () => {
  it('the generator’s locales (messages/*.json) are the app’s SUPPORTED_LOCALES', () => {
    const codes = readdirSync('messages')
      .filter((f) => f.endsWith('.json'))
      .map((f) => f.slice(0, -5))
      .sort();
    expect(codes).toEqual(SUPPORTED_LOCALES.map((l) => l.code).sort());
  });
});

describe('indexnow --since on the generated sitemap', () => {
  it('parses every generated <url> with a lastmod and drops the ones older than the cutoff', () => {
    const urls: { loc: string; lastmod?: string }[] = parseUrlset(localeSitemapXml('en-US'));
    expect(urls.length).toBeGreaterThan(200);
    expect(urls.every((u) => /^\d{4}-\d{2}-\d{2}$/.test(u.lastmod ?? ''))).toBe(true);
    const aged = urls.map((u, i) => (i < 5 ? { ...u, lastmod: '2000-01-01' } : u));
    expect(filterSince(aged, '2001-01-01')).toHaveLength(urls.length - 5);
    expect(filterSince(urls, '2999-01-01')).toEqual([]);
  });
});
