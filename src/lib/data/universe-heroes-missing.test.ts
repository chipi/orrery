import { describe, it, expect, vi } from 'vitest';

// Neither sidecar can be read: every panel is simply without a hero or a gallery.
vi.mock('./core', () => ({
  get: vi.fn(async (path: string) => {
    throw new Error(`404 ${path}`);
  }),
}));

import { getNamedStarGallery, getUniverseHero } from './universe';

describe('hero loaders with no data at all', () => {
  it('no panel-heroes.json is no hero', async () => {
    expect(await getUniverseHero('milky-way', 'omega-centauri')).toBeNull();
  });

  it('no star-gallery.json is an empty gallery', async () => {
    expect(await getNamedStarGallery('antares')).toEqual([]);
  });
});
