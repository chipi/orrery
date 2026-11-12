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

import { getBlackHoleEntity } from './black-hole-entity';
import { getBlackHoleI18n } from './universe';

describe('getBlackHoleEntity', () => {
  it('merges a real hole’s catalogue record with its overlay text', async () => {
    const m87 = await getBlackHoleEntity('m87-star', 'en-US');
    expect(m87).toMatchObject({
      id: 'm87-star',
      name: 'M87*',
      kind: 'supermassive',
      massSolar: 6_500_000_000,
      distLy: 54_794_271,
      scienceSection: 'black-holes',
      cultureDoors: [],
    });
    expect(m87?.fact).toContain('first black hole ever imaged');
    expect(m87?.bio).toContain('10 April 2019');
    expect(m87?.discovery).toContain('Event Horizon Telescope 2019');
  });

  it('gives M87* the EHT picture with its alt text, and no other hole a picture', async () => {
    const m87 = await getBlackHoleEntity('m87-star', 'en-US');
    expect(m87?.hero?.src).toBe('/images/science/black-holes-m87.webp');
    expect(m87?.hero?.alt).toContain('M87');
    const de = await getBlackHoleEntity('m87-star', 'de');
    expect(de?.hero?.alt).toContain('Schwarzen Lochs');
    for (const id of ['sagittarius-a-star', 'cygnus-x-1', 'gargantua'])
      expect((await getBlackHoleEntity(id, 'en-US'))?.hero).toBeNull();
  });

  it('shows no figure for Gargantua: it is fiction, its mass, distance and radius are unsourced', async () => {
    const g = await getBlackHoleEntity('gargantua', 'en-US');
    expect(g).toMatchObject({ kind: 'fictional', massSolar: null, distLy: null, rsKm: null });
    expect(g?.bio).toContain('does not exist');
    expect(g?.cultureDoors.map((d) => d.id)).toEqual(['gargantua-interstellar']);
    expect(g?.cultureDoors[0].blurb).toBeTruthy();
  });

  it('takes M87*’s distance from the EHT paper (16.8 Mpc = 54.8 million light-years), cited with its paper and record', async () => {
    const m87 = await getBlackHoleEntity('m87-star', 'en-US');
    expect(m87?.distLy).toBe(54_794_271);
    expect(m87?.catalogue.dist_ly).toMatchObject({
      value: 54_794_271,
      bibcode: '2019ApJ...875L...6E',
      record_url: 'https://ui.adsabs.harvard.edu/abs/2019ApJ...875L...6E/abstract',
    });
    expect(m87?.catalogue.dist_ly?.note).toContain('Cosmicflows-4');
    expect(m87?.records.simbad).toContain('simbad.cds.unistra.fr');
  });

  it('cites a paper for the mass and distance of each real hole and for fiction nothing', async () => {
    for (const id of ['sagittarius-a-star', 'm87-star', 'cygnus-x-1']) {
      const h = await getBlackHoleEntity(id, 'en-US');
      expect(h?.catalogue.mass_solar?.value).toBe(h?.massSolar);
      expect(h?.catalogue.dist_ly?.value).toBe(h?.distLy);
      expect(h?.catalogue.mass_solar?.bibcode).toMatch(/^\d{4}/);
    }
    const g = await getBlackHoleEntity('gargantua', 'en-US');
    expect(g?.catalogue).toEqual({});
    expect(g?.records).toEqual({});
  });

  it('takes the locale overlay (its localized name and discovery line too)', async () => {
    const ru = await getBlackHoleEntity('sagittarius-a-star', 'ru');
    const en = await getBlackHoleEntity('sagittarius-a-star', 'en-US');
    expect(ru?.name).toBe('Стрелец A*');
    expect(ru?.fact).not.toBe(en?.fact);
    expect(ru?.discovery).not.toBe(en?.discovery);
    expect(ru?.discovery).toContain('GRAVITY');
  });

  it('falls back to the catalogue name and the en-US overlay when a locale has none', async () => {
    const xx = await getBlackHoleEntity('cygnus-x-1', 'xx');
    const en = await getBlackHoleEntity('cygnus-x-1', 'en-US');
    expect(xx?.name).toBe('Cygnus X-1');
    expect(xx?.fact).toBe(en?.fact);
    expect(xx?.discovery).toBe(en?.discovery);
  });

  it('is keyed by black-hole id only: a star, planet or unknown id is null', async () => {
    for (const id of ['sirius', 'mars', 'sagittarius-a', 'nope'])
      expect(await getBlackHoleEntity(id, 'en-US')).toBeNull();
  });
});

describe('getBlackHoleI18n (the panel’s copy)', () => {
  it('carries the overlay’s name and discovery line over the catalogue’s English', async () => {
    const h = await getBlackHoleI18n('cygnus-x-1', 'ja');
    expect(h?.name).toBe('はくちょう座X-1');
    expect(h?.discovery).not.toBe('First widely accepted stellar-mass black hole; mass revised upward Miller-Jones et al. 2021');
    expect(h?.mass_solar).toBe(21.2);
  });
  it('is the catalogue record in en-US and for an unknown locale', async () => {
    expect((await getBlackHoleI18n('m87-star', 'xx'))?.discovery).toBe(
      'First black hole ever imaged — Event Horizon Telescope 2019',
    );
    expect(await getBlackHoleI18n('nope', 'en-US')).toBeNull();
  });
});
