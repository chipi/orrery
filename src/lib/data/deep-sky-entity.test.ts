import { existsSync, readFileSync } from 'node:fs';
import { describe, it, expect, vi } from 'vitest';

// The real static/data files and i18n-src overlays, without the bundle/fetch machinery of ./core.
// Parsed once per file, as ./core caches its fetches: re-parsing the shared gallery and overlay
// files for each of the 142 pages took ~3 s and timed out in the full parallel run.
vi.mock('./core', () => {
  const parsed = new Map<string, unknown>();
  return {
    get: vi.fn(async (path: string) => {
      const file = path.startsWith('i18n/') ? `i18n-src/${path.slice(5)}` : `static/data/${path}`;
      if (!existsSync(file)) throw new Error(`404 ${path}`);
      if (!parsed.has(file)) parsed.set(file, JSON.parse(readFileSync(file, 'utf8')));
      return structuredClone(parsed.get(file));
    }),
  };
});

import { getDeepSkyEntity } from './deep-sky-entity';
import { getDeepSkyObject } from './universe';
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
      gallery: { telescope: 'Hubble', credit: 'NASA · STScI · WikiSky' },
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

  it('a photographed object has its photo as the hero: thumb, full-width pair, alt in the locale, credit', async () => {
    const m42 = await getDeepSkyEntity('m42', 'en-US');
    expect(m42?.hero).toMatchObject({
      src: '/images/deep-sky/jwst-orion.thumb.jpg',
      full: '/images/deep-sky/jwst-orion.jpg',
      fullWidth: expect.any(Number),
    });
    expect(m42?.hero?.alt.length).toBeGreaterThan(10);
    expect(m42?.hero?.credit).toBeTruthy();
    expect(m42?.hero?.pictured).toBeUndefined();
    const de = await getDeepSkyEntity('m42', 'de');
    expect(de?.hero?.alt).toBeTruthy();
    expect(de?.hero?.alt).not.toBe(m42?.hero?.alt);
  });

  it('M33 has its own gallery photo (L46), which its page shows in place of the Triangulum panel hero (NGC 604)', async () => {
    const m33 = await getDeepSkyEntity('m33', 'en-US');
    expect(m33?.gallery?.telescope).toBe('ESO');
    expect(m33?.hero?.full).toBe('/images/deep-sky/m33.jpg');
    expect(m33?.hero?.pictured).toBeUndefined();
    expect(m33?.hero?.credit).toBeTruthy();
  });

  it('an object with no photo and no twin hero has none: no hero, no slot', async () => {
    expect((await getDeepSkyEntity('m18', 'en-US'))?.hero).toBeNull();
  });

  it('every page object with a photo has a hero whose files exist and that carries alt text', async () => {
    for (const id of deepSkyPageIds() as string[]) {
      const e = await getDeepSkyEntity(id, 'en-US');
      if (!e?.gallery) continue;
      expect(e.hero, id).not.toBeNull();
      expect(existsSync(`static${e.hero!.src}`), `${id} thumb`).toBe(true);
      expect(existsSync(`static${e.hero!.full}`), `${id} full`).toBe(true);
      expect(e.hero!.alt.length, `${id} alt`).toBeGreaterThan(5);
    }
    // Builds every full entity with its hero (the work is the test): ~2 s alone, past 5 s in the full
    // parallel run, like the per-page test below.
  }, 60_000);

  it('keeps the Orion Nebula’s gateway into the TRAPPIST-1 system', async () => {
    expect((await getDeepSkyEntity('m42', 'en-US'))?.gatewaySystem).toBe('trappist-1');
  });

  it('is null for an unknown id or designation', async () => {
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
  }, 60_000);

  it('every gateway of a page object is a star page', async () => {
    // The entity passes the object's gatewaySystem through unchanged; reading the object keeps this
    // a data check (building 142 full entities took ~3 s, past the 5 s limit in the full run). That
    // every page builds an entity is the test above.
    const stars = new Set<string>(starPageIds());
    for (const id of deepSkyPageIds() as string[]) {
      const g = (await getDeepSkyObject(id))?.gatewaySystem;
      if (g) expect(stars.has(g), `${id} -> ${g}`).toBe(true);
    }
  });
});
