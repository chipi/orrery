import { describe, it, expect, vi, beforeEach } from 'vitest';

const calls = vi.hoisted(() => ({ list: [] as string[] }));
vi.mock('$lib/paraglide/runtime', () => ({ getLocale: () => 'de' }));
vi.mock('$lib/data/universe', () => {
  const answer = (kind: string) => async (locale: string, id: string) => {
    calls.list.push(`${kind}:${locale}:${id}`);
    return { fact: `${kind} fact`, bio: `${kind} bio` };
  };
  return {
    getGalaxyI18n: answer('galaxy'),
    getStructureI18n: answer('structure'),
    getDeepSkyI18n: answer('deep-sky'),
  };
});

import { overlayRequest } from './outer-overlay.svelte';

const ids = {
  galaxy: ['lmc'],
  structure: ['virgo-cluster'],
  deepSky: { andromeda: 'm31' },
};

// The effect around it needs a component; the e2e specs cover that. This is what it asks for.
describe('overlayRequest', () => {
  beforeEach(() => {
    calls.list = [];
  });

  it('asks for the galaxy, structure or deep-sky text of the selection, in the reader’s locale', async () => {
    expect(await overlayRequest({ kind: 'galaxy', id: 'lmc' }, ids, 'de')).toEqual({
      fact: 'galaxy fact',
      bio: 'galaxy bio',
    });
    expect(
      (await overlayRequest({ kind: 'structure', id: 'virgo-cluster' }, ids, 'fr'))?.fact,
    ).toBe('structure fact');
    expect((await overlayRequest({ kind: 'galaxy', id: 'andromeda' }, ids, 'de'))?.fact).toBe(
      'deep-sky fact',
    );
    expect(calls.list).toEqual(['galaxy:de:lmc', 'structure:fr:virgo-cluster', 'deep-sky:de:m31']);
  });

  it('asks for nothing the page did not list, and for nothing without a selection', () => {
    expect(overlayRequest(null, ids, 'de')).toBeNull();
    expect(overlayRequest({ kind: 'galaxy', id: 'sculptor-dwarf' }, ids, 'de')).toBeNull();
    expect(overlayRequest({ kind: 'structure', id: 'bootes-void' }, ids, 'de')).toBeNull();
    expect(overlayRequest({ kind: 'structure', id: 'lmc' }, ids, 'de')).toBeNull();
    expect(calls.list).toEqual([]);
  });
});
