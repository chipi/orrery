import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { DEEP_SKY_ALIAS, collectCanonicalRoutes } from '../../../scripts/site-routes.mjs';
import {
  FILTER_TESTS,
  SCALE_FILTERS,
  buildScaleIndexRows,
  filterRows,
  groupBySection,
  type ScaleIndexRow,
  type ScaleIndexSource,
} from './scale-index';
import { CTX_ORDER } from './scale-shell-controller';

const read = <T>(path: string): T => JSON.parse(readFileSync(`static/data/${path}`, 'utf8')) as T;

const routes = collectCanonicalRoutes();
const pageIds = (prefix: string): Set<string> =>
  new Set(
    routes
      .filter((r) => r.startsWith(prefix) && !r.slice(prefix.length).includes('/'))
      .map((r) => r.slice(prefix.length)),
  );

function source(): ScaleIndexSource {
  const members = (file: string) => read<{ members: never[] }>(`universe/${file}.json`).members;
  const body = pageIds('/explore/');
  body.delete('hub');
  body.delete('stars');
  body.delete('black-holes');
  body.delete('deep-sky');
  return {
    locale: 'en-US',
    names: { body: {}, star: {}, blackHole: {}, belt: {} },
    pages: {
      body,
      star: pageIds('/explore/stars/'),
      blackHole: pageIds('/explore/black-holes/'),
      deepSky: pageIds('/explore/deep-sky/'),
    },
    deepSkyAlias: DEEP_SKY_ALIAS,
    planets: read<{ planets: never[] }>('planets.json').planets,
    smallBodies: read<{ bodies: never[] }>('small-bodies.json').bodies,
    satellites: read<{ satellites: never[] }>('satellites.json').satellites,
    belts: read<{ belts: never[] }>('belts.json').belts,
    namedStars: read<{ stars: never[] }>('universe/named-stars.json').stars,
    hostSystems: read<{ systems: never[] }>('universe/exoplanet-systems.json').systems,
    deepSky: read<{ objects: never[] }>('universe/deep-sky-objects.json').objects,
    cultureIds: new Set(
      read<{ doors: { objectId: string }[] }>('culture-doors.json').doors.map((d) => d.objectId),
    ),
    milkyWay: read('universe/milky-way-schematic.json'),
    localGroup: members('local-group'),
    localSheet: members('local-sheet'),
    virgo: members('virgo-cluster'),
    laniakea: members('laniakea'),
    cosmicWeb: members('cosmic-web'),
    blackHoles: read<{ objects: never[] }>('universe/black-holes.json').objects,
  };
}

const src = source();
const rows = buildScaleIndexRows(src);
const ids = (scale: (typeof CTX_ORDER)[number]) => rows[scale].map((r) => r.id);
const sorted = (a: string[]) => [...a].sort();
const idsOf = (list: { id: string }[]) => list.map((x) => x.id);

describe('buildScaleIndexRows: row ids are the data ids (C9)', () => {
  it('solar system: Sun, planets and small bodies, Pluto once, plus the moons and belts', () => {
    const planets = src.planets.map((p) => p.name.toLowerCase());
    const small = idsOf(src.smallBodies).filter((id) => !planets.includes(id));
    expect(sorted(ids('solar-system'))).toEqual(
      sorted(['sun', ...planets, ...small, ...idsOf(src.satellites), ...idsOf(src.belts)]),
    );
    expect(ids('solar-system').filter((id) => id === 'pluto')).toHaveLength(1);
    expect(rows['solar-system'].find((r) => r.id === 'pluto')?.kind).toBe('planet');
    expect(rows['solar-system']).toHaveLength(51);
  });

  it('neighbourhood: named stars, exoplanet hosts and deep-sky objects', () => {
    const stars = new Set([...idsOf(src.namedStars), ...src.hostSystems.map((s) => s.hostId)]);
    expect(stars.size).toBe(66);
    expect(sorted(ids('neighborhood'))).toEqual(sorted([...stars, ...idsOf(src.deepSky)]));
    expect(rows.neighborhood).toHaveLength(66 + 141);
  });

  it('milky way: the host merge of objects, globulars, Magellanic clouds and arms, plus Cygnus X-1', () => {
    const mw = src.milkyWay;
    expect(sorted(ids('milky-way'))).toEqual(
      sorted([
        ...idsOf(mw.objects),
        ...idsOf(mw.globulars ?? []),
        ...idsOf(mw.magellanic ?? []),
        ...idsOf(mw.arms),
        'cygnus-x-1',
      ]),
    );
    expect(rows['milky-way']).toHaveLength(20);
  });

  it.each([
    ['local-group', 'localGroup'],
    ['local-sheet', 'localSheet'],
    ['laniakea', 'laniakea'],
  ] as const)('%s: one row per member, nearest first', (scale, key) => {
    expect(sorted(ids(scale))).toEqual(sorted(idsOf(src[key])));
    const dist = (id: string) => {
      const m = src[key].find((x) => x.id === id) as unknown as Record<string, number>;
      return m.dist_mly ?? m.dist_mpc;
    };
    const d = ids(scale).map(dist);
    expect(d).toEqual([...d].sort((a, b) => a - b));
  });

  it('virgo and the cosmic web: the members, then one black hole', () => {
    expect(sorted(ids('virgo'))).toEqual(sorted([...idsOf(src.virgo), 'm87-star']));
    expect(sorted(ids('cosmic-web'))).toEqual(sorted([...idsOf(src.cosmicWeb), 'gargantua']));
  });

  it('every scale has rows, 344 in all', () => {
    for (const scale of CTX_ORDER) expect(rows[scale].length).toBeGreaterThan(0);
    expect(CTX_ORDER.reduce((n, s) => n + rows[s].length, 0)).toBe(344);
  });
});

describe('black holes (C10)', () => {
  it('every black hole is in exactly one scale', () => {
    const where = (id: string) =>
      CTX_ORDER.filter((s) => rows[s].some((r) => r.id === id && r.badges?.includes('black-hole')));
    expect(where('sagittarius-a-star')).toEqual(['milky-way']);
    expect(where('cygnus-x-1')).toEqual(['milky-way']);
    expect(where('m87-star')).toEqual(['virgo']);
    expect(where('gargantua')).toEqual(['cosmic-web']);
    expect(idsOf(src.blackHoles)).toHaveLength(4);
  });

  it('the neighbourhood has no black-hole row; Gargantua sits last, in Fiction', () => {
    expect(rows.neighborhood.some((r) => r.badges?.includes('black-hole'))).toBe(false);
    const last = rows['cosmic-web'].at(-1);
    expect(last).toMatchObject({ id: 'gargantua', section: 'fiction', kind: 'fictional' });
    expect(rows.virgo.at(-1)).toMatchObject({ id: 'm87-star', section: 'black-holes' });
  });
});

describe('entity-page links (C11)', () => {
  const linked = (prefix: string): Map<string, string> => {
    const out = new Map<string, string>();
    for (const scale of CTX_ORDER)
      for (const r of rows[scale]) if (r.href?.startsWith(prefix)) out.set(r.href, r.id);
    return out;
  };

  it('every body, star, black-hole and deep-sky page has a row with that href: 48 + 66 + 4 + 120', () => {
    const bodyPages = routes.filter(
      (r) => /^\/explore\/[^/]+$/.test(r) && !['/explore/hub'].includes(r) && !r.includes('/stars'),
    );
    const bodyRows = new Set(rows['solar-system'].flatMap((r) => (r.href ? [r.href] : [])));
    expect(bodyPages.filter((p) => !bodyRows.has(p))).toEqual([]);
    expect(bodyRows.size).toBe(48);

    const starPages = routes.filter((r) => r.startsWith('/explore/stars/'));
    const starRows = new Set(
      rows.neighborhood.flatMap((r) => (r.href?.startsWith('/explore/stars/') ? [r.href] : [])),
    );
    expect([...starRows].sort()).toEqual([...starPages].sort());
    expect(starRows.size).toBe(66);

    const holePages = routes.filter((r) => r.startsWith('/explore/black-holes/'));
    expect([...linked('/explore/black-holes/').keys()].sort()).toEqual([...holePages].sort());
    expect(holePages).toHaveLength(4);

    const dsPages = routes.filter((r) => r.startsWith('/explore/deep-sky/'));
    expect([...linked('/explore/deep-sky/').keys()].sort()).toEqual([...dsPages].sort());
    expect(dsPages).toHaveLength(120);
  });

  it('one real object, one page: the Milky Way globulars and Local Group twins link the deep-sky page', () => {
    const href = (scale: (typeof CTX_ORDER)[number], id: string) =>
      rows[scale].find((r) => r.id === id)?.href;
    for (const id of ['m3', 'm4', 'm5', 'm13', 'm15', 'm22', 'm92'])
      expect(href('milky-way', id), id).toBe(`/explore/deep-sky/${id}`);
    for (const id of ['m32', 'm110'])
      expect(href('local-group', id), id).toBe(`/explore/deep-sky/${id}`);
    expect(href('local-group', 'andromeda')).toBe('/explore/deep-sky/m31');
    expect(href('local-group', 'triangulum')).toBe('/explore/deep-sky/m33');
    expect(href('neighborhood', 'm31')).toBe('/explore/deep-sky/m31');
    // No second page: the other members have none, and omega-centauri waits for ngc-5139's text.
    expect(href('milky-way', '47-tucanae')).toBeUndefined();
    expect(href('milky-way', 'omega-centauri')).toBeUndefined();
    expect(href('local-group', 'lmc')).toBeUndefined();
  });

  it('a row names its object as its page does: designation, then the common name', () => {
    const name = (scale: (typeof CTX_ORDER)[number], id: string) =>
      rows[scale].find((r) => r.id === id)?.name;
    expect(name('neighborhood', 'm13')).toBe('M13 · Hercules Globular Cluster');
    expect(name('milky-way', 'm13')).toBe('M13 · Hercules Globular Cluster');
    expect(name('neighborhood', 'm3')).toBe('M3 · NGC 5272');
    expect(name('local-group', 'andromeda')).toBe(name('neighborhood', 'm31'));
  });

  it('only the aliases and the same-id twins share a deep-sky id with the Milky Way or Local Group', () => {
    const shared = [...rows['milky-way'], ...rows['local-group']]
      .filter((r) => src.deepSky.some((o) => o.id === r.id))
      .map((r) => r.id)
      .sort();
    expect(shared).toEqual(['m110', 'm13', 'm15', 'm22', 'm3', 'm32', 'm4', 'm5', 'm92']);
    for (const target of Object.values(DEEP_SKY_ALIAS))
      expect(
        src.deepSky.some((o) => o.id === target),
        target,
      ).toBe(true);
  });

  it('a row links only a page that exists', () => {
    const all = new Set(routes);
    for (const scale of CTX_ORDER)
      for (const r of rows[scale]) if (r.href) expect(all.has(r.href)).toBe(true);
  });

  it('every other row is a button without a link: 95 of 344', () => {
    const n = CTX_ORDER.reduce((s, c) => s + rows[c].filter((r) => !r.href).length, 0);
    expect(n).toBe(344 - (118 + 120 + 7 + 4));
  });
});

describe('row fields', () => {
  it('stars carry the constellation, the planetary-system and culture badges', () => {
    const sirius = rows.neighborhood.find((r) => r.id === 'sirius');
    expect(sirius?.meta).toBe('Canis Major');
    const hosts = rows.neighborhood.filter((r) => r.badges?.includes('system'));
    expect(hosts).toHaveLength(11);
    expect(rows.neighborhood.find((r) => r.id === 'trappist-1')).toMatchObject({
      section: 'stars',
      href: '/explore/stars/trappist-1',
    });
  });

  it('moons carry their parent planet', () => {
    expect(rows['solar-system'].find((r) => r.id === 'io')).toMatchObject({
      kind: 'moon',
      section: 'moons',
      parent: 'jupiter',
      meta: 'Jupiter',
    });
  });

  it('localised names replace the data names, and the stars sort by them', () => {
    const named = buildScaleIndexRows({
      ...src,
      locale: 'de',
      names: {
        body: { mars: 'Mars (de)' },
        star: { sirius: 'Sirius (de)' },
        blackHole: { gargantua: 'Gargantua (de)' },
        belt: { asteroid: 'Gürtel (de)' },
        sun: 'Sonne',
      },
    });
    expect(named['solar-system'].find((r) => r.id === 'mars')?.name).toBe('Mars (de)');
    expect(named['solar-system'].find((r) => r.id === 'sun')?.name).toBe('Sonne');
    expect(named['solar-system'].find((r) => r.id === 'asteroid')?.name).toBe('Gürtel (de)');
    expect(named.neighborhood.find((r) => r.id === 'sirius')?.name).toBe('Sirius (de)');
    expect(named['cosmic-web'].at(-1)?.name).toBe('Gargantua (de)');
  });

  it('headliners carry the highlight badge: 3 globulars, 6 of the Local Group', () => {
    const star = (s: string) =>
      rows[s as (typeof CTX_ORDER)[number]].filter((r) => r.badges?.includes('headliner'));
    expect(
      star('milky-way')
        .map((r) => r.id)
        .sort(),
    ).toEqual(['47-tucanae', 'm13', 'omega-centauri']);
    expect(star('local-group')).toHaveLength(6);
  });
});

describe('filters', () => {
  it('every chip of every scale matches at least one row of that scale', () => {
    for (const scale of CTX_ORDER)
      for (const id of SCALE_FILTERS[scale])
        expect(rows[scale].some(FILTER_TESTS[id]), `${scale}: ${id}`).toBe(true);
  });

  it('at most five chips after All per scale', () => {
    for (const scale of CTX_ORDER) expect(SCALE_FILTERS[scale].length).toBeLessThanOrEqual(5);
  });

  it('the Local Group dwarf chip takes the three dwarf kinds', () => {
    const dwarfs = filterRows(rows['local-group'], 'dwarf-galaxy', '');
    expect(dwarfs.length).toBe(17 + 2 + 9);
    expect(filterRows(rows['local-group'], 'spiral', '')).toHaveLength(3);
  });

  it('search matches the name and the meta line, case-insensitively', () => {
    expect(filterRows(rows.neighborhood, null, 'SIRIUS').map((r) => r.id)).toContain('sirius');
    expect(filterRows(rows.neighborhood, null, 'canis major').map((r) => r.id)).toContain('sirius');
    expect(filterRows(rows.neighborhood, null, 'zzzz')).toEqual([]);
    expect(
      filterRows(rows.virgo, null, 'galaxy cluster', (r) =>
        r.kind === 'cluster' ? 'Galaxy cluster' : '',
      ),
    ).toHaveLength(1);
  });

  it('a chip and the search combine', () => {
    const planets = filterRows(rows['solar-system'], 'planet', 'a');
    expect(planets.every((r) => r.kind === 'planet' && r.name.toLowerCase().includes('a'))).toBe(
      true,
    );
  });
});

describe('groupBySection', () => {
  it('groups consecutive rows and keeps unsectioned rows first', () => {
    const groups = groupBySection(rows['solar-system']);
    expect(groups.map((g) => g.section)).toEqual([
      undefined,
      'planets',
      'small-bodies',
      'moons',
      'belts',
    ]);
    expect(groups[0].rows.map((r) => r.id)).toEqual(['sun']);
    expect(groupBySection(rows.neighborhood).map((g) => g.section)).toEqual(['stars', 'deep-sky']);
    expect(groupBySection(rows['milky-way']).map((g) => g.section)).toEqual([
      'objects',
      'globulars',
      'satellites',
      'arms',
    ]);
  });

  it('is empty for no rows', () => {
    expect(groupBySection([] as ScaleIndexRow[])).toEqual([]);
  });
});
