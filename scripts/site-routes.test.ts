import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
// @ts-expect-error plain .mjs without types
import {
  DEEP_SKY_ALIAS,
  blackHolePageIds,
  collectCanonicalRoutes,
  deepSkyPageIds,
  galaxyPageIds,
  starPageIds,
  structurePageIds,
} from './site-routes.mjs';

const read = (p: string) => JSON.parse(readFileSync(p, 'utf8'));
const named: string[] = read('static/data/universe/named-stars.json').stars.map(
  (s: { id: string }) => s.id,
);
const hosts: string[] = read('static/data/universe/exoplanet-systems.json').systems.map(
  (s: { hostId: string }) => s.hostId,
);

describe('star page routes (/explore/stars/<id>)', () => {
  it('are every named star and every exoplanet host, once each', () => {
    const ids: string[] = starPageIds();
    expect(new Set(ids).size).toBe(ids.length);
    expect([...ids].sort()).toEqual([...new Set([...named, ...hosts])].sort());
  });

  it('are 62 named stars + the four host-only stars (trappist-1, 51-pegasi, toi-700, kepler-16)', () => {
    expect(named).toHaveLength(62);
    expect(hosts.filter((h) => !named.includes(h)).sort()).toEqual([
      '51-pegasi',
      'kepler-16',
      'toi-700',
      'trappist-1',
    ]);
    expect(starPageIds()).toHaveLength(66);
  });

  it('are in the canonical route list, each exactly once', () => {
    const routes: string[] = collectCanonicalRoutes();
    const pages = routes.filter((r) => r.startsWith('/explore/stars/'));
    expect(pages.sort()).toEqual(
      starPageIds()
        .map((id: string) => `/explore/stars/${id}`)
        .sort(),
    );
    expect(new Set(routes).size).toBe(routes.length);
  });

  it('never share an id with a planet, moon or small body, and are one path segment', () => {
    const bodies = new Set<string>([
      ...read('static/data/planets.json').planets.map((p: { name: string }) =>
        p.name.toLowerCase(),
      ),
      ...read('static/data/satellites.json').satellites.map((s: { id: string }) => s.id),
      ...read('static/data/small-bodies.json').bodies.map((b: { id: string }) => b.id),
    ]);
    for (const id of starPageIds()) {
      expect(bodies.has(id), `${id} is also a body id`).toBe(false);
      expect(id).toMatch(/^[a-z0-9-]+$/);
    }
  });
});

describe('black-hole page routes (/explore/black-holes/<id>)', () => {
  const holes: string[] = read('static/data/universe/black-holes.json').objects.map(
    (o: { id: string }) => o.id,
  );

  it('are the four black holes, once each', () => {
    expect([...blackHolePageIds()].sort()).toEqual([...holes].sort());
    expect([...blackHolePageIds()].sort()).toEqual([
      'cygnus-x-1',
      'gargantua',
      'm87-star',
      'sagittarius-a-star',
    ]);
  });

  it('are in the canonical route list, each exactly once', () => {
    const routes: string[] = collectCanonicalRoutes();
    expect(routes.filter((r) => r.startsWith('/explore/black-holes/')).sort()).toEqual(
      blackHolePageIds()
        .map((id: string) => `/explore/black-holes/${id}`)
        .sort(),
    );
    expect(new Set(routes).size).toBe(routes.length);
  });

  it('never share an id with a planet, moon, small body or star page, and are one path segment', () => {
    const taken = new Set<string>([
      ...read('static/data/planets.json').planets.map((p: { name: string }) =>
        p.name.toLowerCase(),
      ),
      ...read('static/data/satellites.json').satellites.map((s: { id: string }) => s.id),
      ...read('static/data/small-bodies.json').bodies.map((b: { id: string }) => b.id),
      ...starPageIds(),
    ]);
    for (const id of blackHolePageIds()) {
      expect(taken.has(id), `${id} is also a body or star id`).toBe(false);
      expect(id).toMatch(/^[a-z0-9-]+$/);
    }
  });
});

describe('deep-sky page routes (/explore/deep-sky/<id>)', () => {
  const objects: { id: string }[] = read('static/data/universe/deep-sky-objects.json').objects;
  const overlayIds = (locale: string): string[] =>
    readdirSync(`i18n-src/${locale}/universe/deep-sky`)
      .filter((f) => f.endsWith('.json'))
      .map((f) => f.slice(0, -5));

  it('are the ids of the overlay files but the aliases, once each: the files decide', () => {
    const ids: string[] = deepSkyPageIds();
    expect(new Set(ids).size).toBe(ids.length);
    expect([...ids].sort()).toEqual(
      overlayIds('en-US')
        .filter((id) => !Object.hasOwn(DEEP_SKY_ALIAS, id))
        .sort(),
    );
    expect(ids).toHaveLength(140);
  });

  it('are objects of deep-sky-objects.json, and have the overlay in all 14 locales or none', () => {
    const known = new Set(objects.map((o) => o.id));
    for (const id of deepSkyPageIds()) expect(known.has(id), `${id} is not an object`).toBe(true);
    const locales = readdirSync('i18n-src').filter((d) => existsSync(`i18n-src/${d}/universe`));
    expect(locales).toHaveLength(14);
    for (const o of objects) {
      const have = locales.filter((l) =>
        existsSync(`i18n-src/${l}/universe/deep-sky/${o.id}.json`),
      );
      expect([0, 14], `${o.id} has an overlay in ${have.length} locales`).toContain(have.length);
    }
  });

  it('are in the canonical route list, each exactly once', () => {
    const routes: string[] = collectCanonicalRoutes();
    expect(routes.filter((r) => r.startsWith('/explore/deep-sky/')).sort()).toEqual(
      deepSkyPageIds()
        .map((id: string) => `/explore/deep-sky/${id}`)
        .sort(),
    );
    expect(new Set(routes).size).toBe(routes.length);
  });

  it('never share an id with a planet, moon, small body, star or black hole, and are one path segment', () => {
    const taken = new Set<string>([
      ...read('static/data/planets.json').planets.map((p: { name: string }) =>
        p.name.toLowerCase(),
      ),
      ...read('static/data/satellites.json').satellites.map((s: { id: string }) => s.id),
      ...read('static/data/small-bodies.json').bodies.map((b: { id: string }) => b.id),
      ...starPageIds(),
      ...blackHolePageIds(),
    ]);
    for (const id of deepSkyPageIds()) {
      expect(taken.has(id), `${id} is also a body, star or hole id`).toBe(false);
      expect(id).toMatch(/^[a-z0-9-]+$/);
    }
  });

  it('the alias map names ids that are not pages themselves and objects that exist (carina-nebula is the one alias that is also an object)', () => {
    const known = new Set(objects.map((o) => o.id));
    const pages = new Set<string>(deepSkyPageIds());
    expect(DEEP_SKY_ALIAS).toEqual({
      andromeda: 'm31',
      triangulum: 'm33',
      'omega-centauri': 'ngc-5139',
      'carina-nebula': 'ngc-3372',
    });
    for (const [alias, target] of Object.entries(DEEP_SKY_ALIAS) as [string, string][]) {
      expect(known.has(target), `${alias} -> ${target}`).toBe(true);
      expect(pages.has(alias), `${alias} is a page of its own`).toBe(false);
      expect(pages.has(target), `${alias}'s target ${target} has no page`).toBe(true);
      expect(known.has(alias), `${alias} is itself an object`).toBe(alias === 'carina-nebula');
    }
  });
});

describe('galaxy and structure page routes (/explore/galaxies|structures/<id>, ADR-096 item 18)', () => {
  const members = (file: string): string[] =>
    read(`static/data/universe/${file}.json`).members.map((m: { id: string }) => m.id);
  const overlayIds = (dir: string): string[] =>
    existsSync(`i18n-src/en-US/universe/${dir}`)
      ? readdirSync(`i18n-src/en-US/universe/${dir}`)
          .filter((f) => f.endsWith('.json'))
          .map((f) => f.slice(0, -5))
      : [];
  const deepSkyIds = new Set<string>(
    read('static/data/universe/deep-sky-objects.json').objects.map((o: { id: string }) => o.id),
  );
  // What a page could be: the Local Group members that are not a deep-sky twin, and every structure.
  const galaxyCandidates = members('local-group').filter(
    (id) => !Object.hasOwn(DEEP_SKY_ALIAS, id) && !deepSkyIds.has(id),
  );
  const structureCandidates = [
    ...new Set(['local-sheet', 'virgo-cluster', 'laniakea', 'cosmic-web'].flatMap(members)),
  ];

  it('are the ids of the overlay files that name a member: the files decide, so none exist before the text', () => {
    expect([...galaxyPageIds()].sort()).toEqual(
      overlayIds('galaxies')
        .filter((id) => galaxyCandidates.includes(id))
        .sort(),
    );
    expect([...structurePageIds()].sort()).toEqual(
      overlayIds('structures')
        .filter((id) => structureCandidates.includes(id))
        .sort(),
    );
    for (const id of overlayIds('galaxies')) expect(galaxyCandidates, id).toContain(id);
    for (const id of overlayIds('structures')) expect(structureCandidates, id).toContain(id);
  });

  it('can be 29 galaxies and 30 structures, none of them a twin of a deep-sky page', () => {
    expect(members('local-group')).toHaveLength(33);
    expect(galaxyCandidates).toHaveLength(29);
    for (const twin of ['andromeda', 'triangulum', 'm32', 'm110'])
      expect(galaxyCandidates).not.toContain(twin);
    // local-group is a member of two scales and one page.
    expect(structureCandidates).toHaveLength(30);
  });

  it('are in the canonical route list, each exactly once, under their own prefix', () => {
    const routes: string[] = collectCanonicalRoutes();
    expect(routes.filter((r) => r.startsWith('/explore/galaxies/')).sort()).toEqual(
      galaxyPageIds()
        .map((id: string) => `/explore/galaxies/${id}`)
        .sort(),
    );
    expect(routes.filter((r) => r.startsWith('/explore/structures/')).sort()).toEqual(
      structurePageIds()
        .map((id: string) => `/explore/structures/${id}`)
        .sort(),
    );
    expect(new Set(routes).size).toBe(routes.length);
  });

  it('never share an id with a planet, moon, small body, star, black hole or deep-sky object, and are one path segment', () => {
    const taken = new Set<string>([
      ...read('static/data/planets.json').planets.map((p: { name: string }) =>
        p.name.toLowerCase(),
      ),
      ...read('static/data/satellites.json').satellites.map((s: { id: string }) => s.id),
      ...read('static/data/small-bodies.json').bodies.map((b: { id: string }) => b.id),
      ...starPageIds(),
      ...blackHolePageIds(),
      ...deepSkyIds,
    ]);
    for (const id of [...galaxyCandidates, ...structureCandidates]) {
      expect(taken.has(id), `${id} is also another entity's id`).toBe(false);
      expect(id).toMatch(/^[a-z0-9-]+$/);
    }
    // A galaxy and a structure never share an id either (two prefixes, but one INDEX id space).
    expect(galaxyCandidates.filter((id) => structureCandidates.includes(id))).toEqual([]);
  });
});
