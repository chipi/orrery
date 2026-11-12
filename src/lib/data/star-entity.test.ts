import { existsSync, readFileSync } from 'node:fs';
import { describe, it, expect, vi } from 'vitest';

// The real static/data files and i18n-src overlays, without the bundle/fetch machinery of ./core.
vi.mock('./core', () => ({
  get: vi.fn(async (path: string) => {
    const file = path.startsWith('i18n/') ? `i18n-src/${path.slice(5)}` : `static/data/${path}`;
    if (!existsSync(file)) throw new Error(`404 ${path}`);
    return JSON.parse(readFileSync(file, 'utf8'));
  }),
}));

import { getStarEntity } from './star-entity';

describe('getStarEntity', () => {
  it('merges a named star’s catalogue record with its overlay text', async () => {
    const sirius = await getStarEntity('sirius', 'en-US');
    expect(sirius).toMatchObject({
      id: 'sirius',
      name: 'Sirius',
      named: true,
      hip: 32349,
      con: 'CMa',
      mag: -1.44,
      planets: [],
    });
    expect(sirius?.fact).toContain('brightest star');
    expect(sirius?.bio).toBeTruthy();
    expect(sirius?.cultural).toBeTruthy();
    expect(sirius?.links.length).toBeGreaterThan(0);
  });

  it('takes the locale overlay (its localized name too) and falls back to en-US when a locale has none', async () => {
    const ru = await getStarEntity('sirius', 'ru');
    const en = await getStarEntity('sirius', 'en-US');
    expect(ru?.fact).toBeTruthy();
    expect(ru?.fact).not.toBe(en?.fact);
    const xx = await getStarEntity('sirius', 'xx');
    expect(xx?.fact).toBe(en?.fact);
    expect(xx?.name).toBe('Sirius');
  });

  it('adds the exoplanet system of a named host, each planet with its overlay text', async () => {
    const prox = await getStarEntity('proxima-centauri', 'en-US');
    expect(prox?.named).toBe(true);
    expect(prox?.planets.map((p) => p.id).sort()).toEqual(['proxima-cen-b', 'proxima-cen-d']);
    for (const p of prox?.planets ?? []) {
      expect(p.fact).toBeTruthy();
      expect(p.period_days).toBeGreaterThan(0);
    }
    expect(prox?.fact).toBeTruthy();
  });

  it('builds a host-only star from the system record: no magnitudes, not a named star', async () => {
    const t1 = await getStarEntity('trappist-1', 'en-US');
    expect(t1).toMatchObject({ name: 'TRAPPIST-1', named: false, spect: 'M8.0 V', con: null });
    expect(t1?.mag).toBeUndefined();
    expect(t1?.fact).toBeUndefined();
    expect(t1?.planets).toHaveLength(7);
    expect(t1?.planets.every((p) => p.fact && p.bio)).toBe(true);
  });

  it('still returns kepler-16, whose one planet has no overlay, with the planet’s culture door', async () => {
    const k = await getStarEntity('kepler-16', 'en-US');
    expect(k?.planets).toHaveLength(1);
    expect(k?.planets[0]).toMatchObject({ id: 'kepler-16-b', fact: undefined, bio: undefined });
    expect(k?.planets[0].cultureDoors.map((d) => d.work)).toEqual(['Tatooine (Star Wars)']);
    expect(k?.planets[0].cultureDoors[0].blurb).toBeTruthy();
  });

  it('carries the culture doors attached to the star', async () => {
    const vega = await getStarEntity('vega', 'en-US');
    expect(vega?.cultureDoors.map((d) => d.id).sort()).toEqual(['vega-contact', 'vega-oumuamua']);
  });

  it('is keyed by star id only: a planet, moon, black hole or unknown id is null', async () => {
    for (const id of ['mars', 'europa', 'gargantua', 'proxima-cen-b', 'nope'])
      expect(await getStarEntity(id, 'en-US')).toBeNull();
  });
});
