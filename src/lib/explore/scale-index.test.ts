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

function source(pages: Partial<ScaleIndexSource['pages']> = {}): ScaleIndexSource {
  const members = (file: string) => read<{ members: never[] }>(`universe/${file}.json`).members;
  const body = pageIds('/explore/');
  body.delete('hub');
  body.delete('stars');
  body.delete('black-holes');
  body.delete('deep-sky');
  body.delete('galaxies');
  body.delete('structures');
  return {
    locale: 'en-US',
    names: { body: {}, star: {}, blackHole: {}, belt: {}, galaxy: {}, structure: {} },
    pages: {
      body,
      star: pageIds('/explore/stars/'),
      blackHole: pageIds('/explore/black-holes/'),
      deepSky: pageIds('/explore/deep-sky/'),
      galaxy: pageIds('/explore/galaxies/'),
      structure: pageIds('/explore/structures/'),
      ...pages,
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
    expect(rows.neighborhood).toHaveLength(66 + 143);
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

  it('every scale has rows, 346 in all', () => {
    for (const scale of CTX_ORDER) expect(rows[scale].length).toBeGreaterThan(0);
    expect(CTX_ORDER.reduce((n, s) => n + rows[s].length, 0)).toBe(346);
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

  it('every body, star, black-hole and deep-sky page has a row with that href: 48 + 66 + 4 + 142', () => {
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
    expect(dsPages).toHaveLength(142);
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
    expect(href('milky-way', 'omega-centauri')).toBe('/explore/deep-sky/ngc-5139');
    // carina-nebula is a second scene object of the nebula ngc-3372 holds: no page of its own.
    expect(href('neighborhood', 'carina-nebula')).toBe('/explore/deep-sky/ngc-3372');
    expect(href('neighborhood', 'ngc-3372')).toBe('/explore/deep-sky/ngc-3372');
    expect(routes).not.toContain('/explore/deep-sky/carina-nebula');
    expect(href('milky-way', '47-tucanae')).toBe('/explore/deep-sky/ngc-104');
    expect(href('milky-way', 'ngc-6752')).toBe('/explore/deep-sky/ngc-6752');
    // The Local Group galaxies have a page of their own only once their overlay exists.
    expect(href('local-group', 'lmc')).toBe(
      src.pages.galaxy.has('lmc') ? '/explore/galaxies/lmc' : undefined,
    );
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
    expect(shared).toEqual(['m110', 'm13', 'm15', 'm22', 'm3', 'm32', 'm4', 'm5', 'm92', 'ngc-6752']);
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

  it('every other row is a button without a link: 73 of 346 with no galaxy or structure overlay', () => {
    // A galaxy page links its Local Group row and, for the Magellanic Clouds, a Milky Way row; a
    // structure page one row per scale that lists it (local-group: two).
    const galaxyRows =
      src.localGroup.filter((m) => src.pages.galaxy.has(m.id)).length +
      (src.milkyWay.magellanic ?? []).filter((m) => src.pages.galaxy.has(m.id)).length;
    const structureRows = [src.localSheet, src.virgo, src.laniakea, src.cosmicWeb].reduce(
      (n, scale) => n + scale.filter((m) => src.pages.structure.has(m.id)).length,
      0,
    );
    const n = CTX_ORDER.reduce((s, c) => s + rows[c].filter((r) => !r.href).length, 0);
    expect(n).toBe(346 - (118 + 142 + 9 + 4 + 1 + 1) - galaxyRows - structureRows);
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
        galaxy: {},
        structure: {},
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

// ADR-096 item 18: the rows of the five outer scales link /explore/galaxies|structures/<id> once the
// page exists. No overlay exists yet, so the route list is empty; these give every member a page.
describe('galaxy and structure pages (item 18)', () => {
  const memberIds = (list: { id: string }[]) => list.map((m) => m.id);
  const twins = new Set(['andromeda', 'triangulum', 'm32', 'm110']);
  const withPages = (): ScaleIndexSource =>
    source({
      galaxy: new Set(memberIds(source().localGroup).filter((id) => !twins.has(id))),
      structure: new Set(
        [...src.localSheet, ...src.virgo, ...src.laniakea, ...src.cosmicWeb].map((m) => m.id),
      ),
    });
  const full = buildScaleIndexRows(withPages());

  it('no overlay, no page, no link: the rows of today are unchanged', () => {
    const bare = buildScaleIndexRows(source({ galaxy: new Set(), structure: new Set() }));
    for (const scale of ['local-sheet', 'laniakea', 'cosmic-web'] as const)
      expect(bare[scale].filter((r) => r.href?.startsWith('/explore/structures/'))).toEqual([]);
    expect(bare['milky-way'].find((r) => r.id === 'lmc')?.href).toBeUndefined();
    expect(bare['local-group'].find((r) => r.id === 'lmc')?.href).toBeUndefined();
  });

  it('every Local Group member links a page, a twin its deep-sky one: 29 + 4', () => {
    const lg = full['local-group'];
    expect(lg.filter((r) => !r.href)).toEqual([]);
    expect(lg.filter((r) => r.href?.startsWith('/explore/galaxies/'))).toHaveLength(29);
    const twin = (id: string) => lg.find((r) => r.id === id)?.href;
    expect(twin('andromeda')).toBe('/explore/deep-sky/m31');
    expect(twin('triangulum')).toBe('/explore/deep-sky/m33');
    expect(twin('m32')).toBe('/explore/deep-sky/m32');
    expect(twin('m110')).toBe('/explore/deep-sky/m110');
    expect(twin('lmc')).toBe('/explore/galaxies/lmc');
  });

  it('the Milky Way scale links the two Magellanic Clouds to the same pages as the Local Group', () => {
    const mw = full['milky-way'];
    for (const id of ['lmc', 'smc']) {
      expect(mw.find((r) => r.id === id)?.href).toBe(`/explore/galaxies/${id}`);
      expect(full['local-group'].find((r) => r.id === id)?.href).toBe(`/explore/galaxies/${id}`);
    }
    expect(mw.filter((r) => r.href?.startsWith('/explore/galaxies/'))).toHaveLength(2);
  });

  it('the four structure scales link every member: 9 + 7 + 8 + 7, local-group in two scales, one page', () => {
    const count = (scale: (typeof CTX_ORDER)[number]) =>
      full[scale].filter((r) => r.href?.startsWith('/explore/structures/')).length;
    expect([count('local-sheet'), count('virgo'), count('laniakea'), count('cosmic-web')]).toEqual([
      9, 7, 8, 7,
    ]);
    const lg = (scale: 'local-sheet' | 'virgo') => full[scale].find((r) => r.id === 'local-group');
    expect(lg('local-sheet')?.href).toBe('/explore/structures/local-group');
    expect(lg('virgo')?.href).toBe('/explore/structures/local-group');
  });

  it('links 62 rows to 59 pages, only /explore/galaxies and /explore/structures', () => {
    const hrefs = CTX_ORDER.flatMap((s) => full[s].flatMap((r) => (r.href ? [r.href] : []))).filter(
      (h) => /^\/explore\/(galaxies|structures)\//.test(h),
    );
    expect(hrefs).toHaveLength(62);
    expect(new Set(hrefs).size).toBe(59);
  });

  it("a row takes the reader's name with or without a page; a page keeps it", () => {
    const names = {
      ...src.names,
      galaxy: { lmc: 'LMC (de)', 'sculptor-dwarf': 'Sculptor (de)' },
      structure: { 'virgo-cluster': 'Virgo (de)', laniakea: 'Laniakea (de)' },
    };
    const named = (pages: ScaleIndexSource['pages']) =>
      buildScaleIndexRows({ ...source(), names, pages });
    const none = named(source().pages);
    const all = named(withPages().pages);
    for (const r of [none, all]) {
      expect(r['local-group'].find((x) => x.id === 'lmc')?.name).toBe('LMC (de)');
      expect(r['milky-way'].find((x) => x.id === 'lmc')?.name).toBe('LMC (de)');
      expect(r.virgo.find((x) => x.id === 'virgo-cluster')?.name).toBe('Virgo (de)');
      expect(r['cosmic-web'].find((x) => x.id === 'laniakea')?.name).toBe('Laniakea (de)');
    }
    expect(all['local-group'].find((x) => x.id === 'sculptor-dwarf')?.href).toBe(
      '/explore/galaxies/sculptor-dwarf',
    );
    expect(none['local-group'].find((x) => x.id === 'ic-10')?.name).toBe('IC 10');
  });
});
