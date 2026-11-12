import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
// @ts-expect-error plain .mjs without types
import { blackHolePageIds, collectCanonicalRoutes, starPageIds } from './site-routes.mjs';

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
