import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  scienceForDeepSky,
  scienceForGalaxy,
  scienceForStructure,
  scienceLinks,
} from './science-for-entity';

const key = (r: { tab: string; section: string }) => `${r.tab}/${r.section}`;

describe('science articles per deep-level page (plan C5a)', () => {
  it('maps each kind to an article that covers it, and the kinds without one to none', () => {
    expect(scienceForDeepSky('galaxy').map(key)).toEqual(['observation/galaxy-types']);
    expect(scienceForDeepSky('globular-cluster').map(key)).toEqual([
      'observation/hertzsprung-russell',
    ]);
    expect(scienceForDeepSky('galaxy-cluster').map(key)).toEqual([
      'cosmology/large-scale-structure',
    ]);
    for (const c of ['nebula', 'planetary-nebula', 'supernova-remnant', 'star-forming-region'])
      expect(scienceForDeepSky(c), c).toEqual([]);
    expect(scienceForGalaxy('dwarf-spheroidal').map(key)).toContain(
      'observation/dwarf-spheroidals',
    );
    expect(scienceForGalaxy('spiral').map(key)).toContain('observation/galaxy-types');
    expect(scienceForStructure('laniakea').map(key)).toContain(
      'cosmology/laniakea-and-the-great-attractor',
    );
  });

  it('every article named exists in the science index, and links carry its title', async () => {
    const index = JSON.parse(
      readFileSync(resolve(__dirname, '../../static/data/science-index.json'), 'utf-8'),
    ) as { tab: string; section: string; title: string }[];
    const fetchFn = (async () =>
      new Response(JSON.stringify(index), { status: 200 })) as unknown as typeof fetch;
    const refs = [
      ...scienceForDeepSky('galaxy'),
      ...scienceForDeepSky('star-cluster'),
      ...scienceForGalaxy('dwarf-spheroidal'),
      ...scienceForStructure('laniakea'),
    ];
    const links = await scienceLinks(refs, 'en-US', fetchFn);
    expect(links.length).toBe(refs.length);
    for (const l of links) expect(l.title.length).toBeGreaterThan(3);
  });
});
