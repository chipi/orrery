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

import { getNamedStarGallery, getUniverseHero } from './universe';

const heroes = (
  JSON.parse(readFileSync('static/data/universe/panel-heroes.json', 'utf8')) as {
    heroes: Record<string, { photoKey?: string; src?: string; pictured?: boolean }>;
  }
).heroes;

describe('getUniverseHero (B3, UXD-023)', () => {
  it('an exact photo is served as its thumb, credited from the full image, with no pictured part', async () => {
    const h = await getUniverseHero('local-group', 'andromeda');
    expect(h).toEqual({
      src: '/images/deep-sky/hst-andromeda.thumb.jpg',
      full: '/images/deep-sky/hst-andromeda.jpg',
      position: undefined,
    });
  });

  it('a part-of photo names the pictured part, in the reader locale', async () => {
    expect((await getUniverseHero('milky-way', 'lmc', 'en-US'))?.pictured).toBe('Tarantula Nebula');
    const de = await getUniverseHero('milky-way', 'lmc', 'de');
    expect(de?.pictured).toBeTruthy();
  });

  it('a src entry is served as it is: the EHT 2022 image, the EHT 2019 science photo', async () => {
    expect((await getUniverseHero('black-holes', 'sagittarius-a-star'))?.src).toBe(
      '/images/black-holes/sagittarius-a-star/01.webp',
    );
    expect((await getUniverseHero('black-holes', 'm87-star'))?.full).toBe(
      '/images/science/black-holes-m87.webp',
    );
  });

  it('no entry, no hero: Laniakea, Virgo, Cygnus X-1 and Gargantua have none', async () => {
    expect(await getUniverseHero('laniakea', 'virgo-supercluster')).toBeNull();
    expect(await getUniverseHero('virgo', 'virgo-cluster')).toBeNull();
    expect(await getUniverseHero('black-holes', 'cygnus-x-1')).toBeNull();
    expect(await getUniverseHero('black-holes', 'gargantua')).toBeNull();
  });

  it('every entry of panel-heroes.json resolves to a hero whose files exist', async () => {
    for (const key of Object.keys(heroes)) {
      const [level, id] = key.split('/') as [Parameters<typeof getUniverseHero>[0], string];
      const h = await getUniverseHero(level, id);
      expect(h, key).not.toBeNull();
      expect(existsSync(`static${h!.src}`), `${key} ${h!.src}`).toBe(true);
      expect(existsSync(`static${h!.full}`), `${key} ${h!.full}`).toBe(true);
    }
  });

  it('a part-of entry always has a gallery title to name', async () => {
    for (const [key, e] of Object.entries(heroes)) {
      if (!e.pictured) continue;
      const [level, id] = key.split('/') as [Parameters<typeof getUniverseHero>[0], string];
      expect((await getUniverseHero(level, id))?.pictured, key).toBeTruthy();
    }
  });
});

describe('getNamedStarGallery', () => {
  it('is empty for every star at ship (the sidecar exists, Gallery tab hidden)', async () => {
    expect(await getNamedStarGallery('antares')).toEqual([]);
    expect(await getNamedStarGallery('no-such-star')).toEqual([]);
  });
});
