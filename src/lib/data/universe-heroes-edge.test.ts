import { describe, it, expect, vi } from 'vitest';

// An entry that names no picture is no hero.
vi.mock('./core', () => ({
  get: vi.fn(async (path: string) => {
    if (path === 'universe/panel-heroes.json') return { heroes: { 'virgo/empty': {} } };
    throw new Error(`404 ${path}`);
  }),
}));

import { getUniverseHero } from './universe';

describe('hero loaders without their data', () => {
  it('an entry that names no picture is no hero', async () => {
    expect(await getUniverseHero('virgo', 'empty')).toBeNull();
  });

});
