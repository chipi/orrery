import { existsSync, readFileSync } from 'node:fs';
import { describe, it, expect, vi } from 'vitest';

// The real census files; the overlays are synthetic (no galaxy or structure has text yet, so the
// ids that the tests give a page are the ones whose overlay `OVERLAYS` lists).
const OVERLAYS = new Set<string>();
const overlay = (locale: string, id: string) => ({
  fact: `${locale} fact of ${id}`,
  bio: `${locale} bio of ${id}`,
  links: [{ l: 'Wikipedia', u: `https://en.wikipedia.org/wiki/${id}`, t: 'intro' }],
});
vi.mock('./core', () => ({
  get: vi.fn(async (path: string) => {
    const o = /^i18n\/([^/]+)\/universe\/(?:galaxies|structures)\/(.+)\.json$/.exec(path);
    if (o) {
      // Only en-US and de are written; any other locale falls back to en-US.
      if (!OVERLAYS.has(o[2]) || !['en-US', 'de'].includes(o[1])) throw new Error(`404 ${path}`);
      return overlay(o[1], o[2]);
    }
    const file = `static/data/${path}`;
    if (!existsSync(file)) throw new Error(`404 ${path}`);
    return JSON.parse(readFileSync(file, 'utf8'));
  }),
}));

import {
  getGalaxyEntity,
  getOuterNames,
  getOuterOverlayIds,
  getStructureEntity,
  type OuterPages,
} from './outer-entity';

const ids = (xs: string[]) => new Set(xs);
const pages = (p: Partial<OuterPages>): OuterPages => ({
  galaxy: ids([]),
  structure: ids([]),
  deepSky: ids([]),
  ...p,
});
const hrefs = (e: { related: { kind: string; links: { href: string }[] }[] } | null, kind: string) =>
  e?.related.find((r) => r.kind === kind)?.links.map((l) => l.href);

describe('getGalaxyEntity', () => {
  it('is null without a page: no overlay, no page (the files decide)', async () => {
    expect(await getGalaxyEntity('lmc', 'en-US', fetch, pages({}))).toBeNull();
    OVERLAYS.add('lmc');
    // The page set lists it but the data has no such member, or the overlay is missing.
    expect(await getGalaxyEntity('no-such-galaxy', 'en-US', fetch, pages({ galaxy: ids(['no-such-galaxy']) }))).toBeNull();
    expect(await getGalaxyEntity('smc', 'en-US', fetch, pages({ galaxy: ids(['smc']) }))).toBeNull();
  });

  it('merges the census record with the overlay, and the Milky Way satellites it links', async () => {
    OVERLAYS.add('lmc');
    const lmc = await getGalaxyEntity('lmc', 'en-US', fetch, pages({ galaxy: ids(['lmc']) }));
    expect(lmc).toMatchObject({
      id: 'lmc',
      kind: 'irregular',
      parent: 'milky-way',
      scale: 'local-group',
      fact: 'en-US fact of lmc',
      bio: 'en-US bio of lmc',
    });
    expect(lmc?.distMly).toBeGreaterThan(0);
    expect(lmc?.catalogue.dist_mly?.bibcode).toBeTruthy();
    expect(lmc?.links).toHaveLength(1);
  });

  it('serves the reader’s locale and falls back to en-US', async () => {
    OVERLAYS.add('lmc');
    const p = pages({ galaxy: ids(['lmc']) });
    expect((await getGalaxyEntity('lmc', 'de', fetch, p))?.fact).toBe('de fact of lmc');
    expect((await getGalaxyEntity('lmc', 'xx', fetch, p))?.fact).toBe('en-US fact of lmc');
  });

  it('links only what has a page: the host, the Local Group, the satellites', async () => {
    for (const id of ['milky-way', 'sculptor-dwarf', 'lmc']) OVERLAYS.add(id);
    const all = pages({
      galaxy: ids(['milky-way', 'sculptor-dwarf', 'lmc']),
      structure: ids(['local-group']),
    });
    const dwarf = await getGalaxyEntity('sculptor-dwarf', 'en-US', fetch, all);
    expect(hrefs(dwarf, 'part-of')).toEqual(['/explore/galaxies/milky-way', '/explore/structures/local-group']);
    expect(hrefs(dwarf, 'members')).toBeUndefined();
    const mw = await getGalaxyEntity('milky-way', 'en-US', fetch, all);
    expect(hrefs(mw, 'part-of')).toEqual(['/explore/structures/local-group']);
    expect(hrefs(mw, 'members')).toEqual(
      expect.arrayContaining(['/explore/galaxies/lmc', '/explore/galaxies/sculptor-dwarf']),
    );
    // Without the pages there is nothing to link: no empty section.
    const lonely = await getGalaxyEntity('lmc', 'en-US', fetch, pages({ galaxy: ids(['lmc']) }));
    expect(lonely?.related).toEqual([]);
  });

  it('names a twin by its deep-sky page: an Andromeda dwarf links M31, not a second Andromeda page', async () => {
    OVERLAYS.add('ngc-147');
    const e = await getGalaxyEntity(
      'ngc-147',
      'en-US',
      fetch,
      pages({ galaxy: ids(['ngc-147']), deepSky: ids(['m31']) }),
    );
    expect(hrefs(e, 'part-of')).toEqual(['/explore/deep-sky/m31']);
    expect(e?.related[0].links[0].name).toMatch(/^M31/);
  });

  it('is null for a twin: its page is the deep-sky one', async () => {
    OVERLAYS.add('andromeda');
    expect(
      await getGalaxyEntity('andromeda', 'en-US', fetch, pages({ galaxy: ids(['andromeda']) })),
    ).toBeNull();
  });
});

describe('getStructureEntity', () => {
  it('is null without a page, and for an id no scale lists', async () => {
    expect(await getStructureEntity('virgo-cluster', 'en-US', fetch, pages({}))).toBeNull();
    OVERLAYS.add('no-such-structure');
    expect(
      await getStructureEntity(
        'no-such-structure',
        'en-US',
        fetch,
        pages({ structure: ids(['no-such-structure']) }),
      ),
    ).toBeNull();
    expect(
      await getStructureEntity('bootes-void', 'en-US', fetch, pages({ structure: ids(['bootes-void']) })),
    ).toBeNull();
  });

  it('carries the record of the first scale that lists it, and the scale ?context= opens it in', async () => {
    for (const id of ['virgo-cluster', 'bootes-void', 'local-group', 'laniakea', 'virgo-supercluster'])
      OVERLAYS.add(id);
    const at = async (id: string) =>
      getStructureEntity(id, 'en-US', fetch, pages({ structure: ids([id]) }));
    expect(await at('virgo-cluster')).toMatchObject({ kind: 'cluster', scale: 'virgo', distMpc: 16.5 });
    expect(await at('bootes-void')).toMatchObject({ kind: 'void', scale: 'cosmic-web' });
    // The anchor of a scale opens in the scale where it is itself a member.
    expect((await at('local-group'))?.scale).toBe('local-sheet');
    expect((await at('virgo-supercluster'))?.scale).toBe('laniakea');
    expect((await at('laniakea'))?.scale).toBe('cosmic-web');
  });

  it('links what contains it, what it holds and its neighbours, each once', async () => {
    const all = [
      'local-group',
      'm81-group',
      'ic-342-group',
      'virgo-cluster',
      'virgo-supercluster',
      'laniakea',
    ];
    for (const id of all) OVERLAYS.add(id);
    const p = pages({
      structure: ids(all),
      galaxy: ids(['milky-way', 'lmc']),
      deepSky: ids(['m31']),
    });
    const lg = await getStructureEntity('local-group', 'en-US', fetch, p);
    expect(hrefs(lg, 'part-of')).toEqual(['/explore/structures/virgo-supercluster']);
    // The galaxies it holds, a twin under its deep-sky page.
    expect(hrefs(lg, 'members')).toEqual(
      expect.arrayContaining([
        '/explore/galaxies/milky-way',
        '/explore/galaxies/lmc',
        '/explore/deep-sky/m31',
      ]),
    );
    expect(hrefs(lg, 'same-scale')).toEqual(
      expect.arrayContaining(['/explore/structures/m81-group', '/explore/structures/virgo-cluster']),
    );
    const every = lg!.related.flatMap((r) => r.links.map((l) => l.href));
    expect(new Set(every).size).toBe(every.length);
    expect(every).not.toContain('/explore/structures/local-group');

    const vsc = await getStructureEntity('virgo-supercluster', 'en-US', fetch, p);
    expect(hrefs(vsc, 'part-of')).toEqual(['/explore/structures/laniakea']);
    // Its own scale's members (the Virgo file), the anchor one of them.
    expect(hrefs(vsc, 'members')).toEqual(
      expect.arrayContaining(['/explore/structures/local-group', '/explore/structures/virgo-cluster']),
    );

    const m81 = await getStructureEntity('m81-group', 'en-US', fetch, p);
    expect(hrefs(m81, 'part-of')).toBeUndefined();
    expect(hrefs(m81, 'members')).toBeUndefined();
    expect(hrefs(m81, 'same-scale')).toContain('/explore/structures/ic-342-group');
  });

  it('carries the distance source where a paper states it, none for an anchor or an unsourced value', async () => {
    for (const id of ['maffei-group', 'local-group', 'm81-group']) OVERLAYS.add(id);
    const at = (id: string) => getStructureEntity(id, 'en-US', fetch, pages({ structure: ids([id]) }));
    const maffei = await at('maffei-group');
    expect(maffei?.catalogue.dist_mpc).toMatchObject({
      value: maffei?.distMpc,
      record_url: 'https://arxiv.org/abs/1901.05981',
    });
    expect((await at('local-group'))?.catalogue).toEqual({});
    expect((await at('m81-group'))?.catalogue).toEqual({});
  });
});

describe('names in the reader’s language', () => {
  it('the glossary name on the page, in its Related links and in getOuterNames, the data name in en-US', async () => {
    for (const id of ['sculptor-dwarf', 'milky-way', 'local-group']) OVERLAYS.add(id);
    const p = pages({
      galaxy: ids(['sculptor-dwarf', 'milky-way']),
      structure: ids(['local-group']),
    });
    const de = await getGalaxyEntity('sculptor-dwarf', 'de', fetch, p);
    expect(de?.name).toBe('Sculptor-Zwerggalaxie');
    const en = await getGalaxyEntity('sculptor-dwarf', 'en-US', fetch, p);
    expect(en?.name).toBe('Sculptor Dwarf');
    expect(de?.related[0].links.map((l) => l.name)).toEqual(['Milchstraße', 'Lokale Gruppe']);
    const names = await getOuterNames('de', fetch);
    expect(names.galaxy['sculptor-dwarf']).toBe(de?.name);
    expect(names.structure['local-group']).toBe('Lokale Gruppe');
    expect((await getOuterNames('en-US', fetch)).structure['local-group']).toBe('Local Group');
    // A twin has no glossary name: its data name stands (its page is a deep-sky one).
    expect(names.galaxy.andromeda).toBe('Andromeda (M31)');
  });

  it('the glossary holds every one of the 59 names in all 13 locales (a catalogue code may equal English)', async () => {
    const LOCALES = ['de', 'fr', 'es', 'it', 'nl', 'pt-BR', 'ru', 'ja', 'zh-CN', 'ko', 'hi', 'ar', 'sr-Cyrl'];
    const star = JSON.parse(readFileSync('scripts/i18n-tools/native-terms.json', 'utf8')).star as Record<
      string,
      Record<string, string>
    >;
    const twins = new Set(['Andromeda (M31)', 'Triangulum (M33)', 'M32', 'M110 (NGC 205)']);
    const en = await getOuterNames('en-US', fetch);
    const data = [...Object.values(en.galaxy), ...Object.values(en.structure)].filter(
      (n) => !twins.has(n),
    );
    expect(new Set(data).size).toBe(59);
    for (const name of data)
      for (const loc of LOCALES) expect(star[name]?.[loc], `${name} ${loc}`).toBeTruthy();
  });
});

describe('getOuterOverlayIds', () => {
  it('lists the overlay ids and the Local Group members whose text is a deep-sky object’s', async () => {
    const out = await getOuterOverlayIds(
      fetch,
      pages({
        galaxy: ids(['lmc']),
        structure: ids(['virgo-cluster']),
        deepSky: ids(['m31', 'm32', 'm33']),
      }),
    );
    expect(out.galaxy).toEqual(['lmc']);
    expect(out.structure).toEqual(['virgo-cluster']);
    expect(out.deepSky).toEqual({ andromeda: 'm31', triangulum: 'm33', m32: 'm32' });
  });

  it('is empty with no overlay', async () => {
    expect(await getOuterOverlayIds(fetch, pages({}))).toEqual({
      galaxy: [],
      structure: [],
      deepSky: {},
    });
  });
});
