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

import { getDeepSkyEntity } from './deep-sky-entity';
import { deepSkyPageIds } from '../../../scripts/site-routes.mjs';
import { starPageIds } from '../../../scripts/site-routes.mjs';

describe('getDeepSkyEntity', () => {
  it('merges the catalogue record with the overlay text, and M13 with its Arecibo door', async () => {
    const m13 = await getDeepSkyEntity('m13', 'en-US');
    expect(m13).toMatchObject({
      id: 'm13',
      designation: 'M13',
      name: 'Hercules Globular Cluster',
      category: 'globular-cluster',
      con: 'Her',
      gatewaySystem: null,
      gallery: null,
    });
    expect(m13?.fact).toContain('The Hercules Cluster, over 100,000 stars');
    expect(m13?.bio).toContain('Edmond Halley discovered it in 1714');
    expect(m13?.links.map((l) => l.l)).toEqual(['Wikipedia', 'NASA Hubble']);
    expect(m13?.cultureDoors.map((d) => d.id)).toEqual(['arecibo-message']);
    expect(m13?.cultureDoors[0].blurb).toBeTruthy();
  });

  it('cites a paper for the distance and magnitude, and the SIMBAD page', async () => {
    const m13 = await getDeepSkyEntity('m13', 'en-US');
    expect(m13?.distLy).toBe(24201);
    expect(m13?.mag).toBe(5.78);
    expect(m13?.catalogue.dist_ly).toMatchObject({
      value: 24201,
      bibcode: '2021MNRAS.505.5957B',
    });
    expect(m13?.catalogue.mag?.bibcode).toBe('1996AJ....112.1487H');
    expect(m13?.records.simbad).toContain('simbad.cds.unistra.fr');
  });

  it('serves the reader’s locale and falls back to en-US where a locale has no overlay', async () => {
    const de = await getDeepSkyEntity('m13', 'de');
    expect(de?.fact).toContain('Der Herkuleshaufen, über 100.000 Sterne');
    expect(de?.cultureDoors[0].blurb).toBeTruthy();
    const fallback = await getDeepSkyEntity('m13', 'xx-fallback');
    expect(fallback?.fact).toContain('The Hercules Cluster');
  });

  it('gives a photographed object its gallery telescope, caption and credit', async () => {
    const m42 = await getDeepSkyEntity('m42', 'en-US');
    expect(m42?.gallery?.telescope).toBeTruthy();
    expect(m42?.gallery?.caption.length).toBeGreaterThan(20);
    expect(m42?.gallery?.credit).toBeTruthy();
    const m42de = await getDeepSkyEntity('m42', 'de');
    expect(m42de?.gallery?.caption).not.toBe(m42?.gallery?.caption);
  });

  it('keeps the Orion Nebula’s gateway into the TRAPPIST-1 system', async () => {
    expect((await getDeepSkyEntity('m42', 'en-US'))?.gatewaySystem).toBe('trappist-1');
  });

  it('is null for an object with no overlay (it has no page), and for an unknown id or designation', async () => {
    expect(await getDeepSkyEntity('ngc-3372', 'en-US')).toBeNull();
    expect(await getDeepSkyEntity('no-such-object', 'en-US')).toBeNull();
    expect(await getDeepSkyEntity('M13', 'en-US')).toBeNull();
  });

  it('exists for every page id, in en-US and de, with fact, bio and one or two links', async () => {
    for (const id of deepSkyPageIds() as string[]) {
      for (const locale of ['en-US', 'de']) {
        const e = await getDeepSkyEntity(id, locale);
        expect(e, `${id} ${locale}`).not.toBeNull();
        expect(e!.fact.length, `${id} ${locale} fact`).toBeGreaterThan(10);
        expect(e!.bio.length, `${id} ${locale} bio`).toBeGreaterThan(20);
        expect(e!.links.length, `${id} ${locale} links`).toBeGreaterThanOrEqual(1);
        expect(e!.links.length, `${id} ${locale} links`).toBeLessThanOrEqual(2);
      }
    }
  });

  it('every gateway of a page object is a star page', async () => {
    const stars = new Set<string>(starPageIds());
    for (const id of deepSkyPageIds() as string[]) {
      const g = (await getDeepSkyEntity(id, 'en-US'))?.gatewaySystem;
      if (g) expect(stars.has(g), `${id} -> ${g}`).toBe(true);
    }
  });
});
