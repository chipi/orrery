import { describe, it, expect, vi } from 'vitest';

// panel-heroes.json fails once, then loads: a failed fetch must not be cached as "no heroes".
let calls = 0;
vi.mock('./core', () => ({
  get: vi.fn(async (path: string) => {
    if (path !== 'universe/panel-heroes.json') throw new Error(`404 ${path}`);
    if (++calls === 1) throw new Error('Failed to fetch');
    return { heroes: { 'black-holes/sagittarius-a-star': { src: '/images/sgra.webp' } } };
  }),
}));

import { getUniverseHero } from './universe';

describe('panel-heroes.json load failure', () => {
  it('is not cached: the next call fetches again and gets the hero', async () => {
    expect(await getUniverseHero('black-holes', 'sagittarius-a-star')).toBeNull();
    expect((await getUniverseHero('black-holes', 'sagittarius-a-star'))?.src).toBe(
      '/images/sgra.webp',
    );
    expect(calls).toBe(2);
  });

  it('a success is cached: no third fetch', async () => {
    await getUniverseHero('black-holes', 'sagittarius-a-star');
    expect(calls).toBe(2);
  });
});
