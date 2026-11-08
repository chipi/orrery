import { describe, it, expect, vi, beforeEach } from 'vitest';

const files: Record<string, unknown> = {};
vi.mock('./core', () => ({
  get: vi.fn(async (path: string) => {
    if (path in files) return files[path];
    throw new Error(`404 ${path}`);
  }),
}));

import { getBodyEntity } from './body-entity';
import { getSiteEntity } from './site-entity';

function reset(next: Record<string, unknown>) {
  for (const k of Object.keys(files)) delete files[k];
  Object.assign(files, next);
}

const BASE = {
  'planets.json': { planets: [{ name: 'Mars', mission_visits: ['Viking — NASA, 1976'] }] },
  'satellites.json': {
    satellites: [
      {
        id: 'europa',
        name: 'Europa',
        parent_planet_id: 'jupiter',
        description: 'Icy moon.',
        mission_visits: ['Galileo — USA'],
      },
    ],
  },
  'small-bodies.json': { bodies: [{ id: 'bennu', name: '101955 Bennu', description: 'Rubble pile.' }] },
};

describe('getBodyEntity', () => {
  beforeEach(() => reset(BASE));

  it('merges a planet overlay and keeps English-only visits for en-US only', async () => {
    files['i18n/en-US/planets/mars.json'] = { name: 'Mars', fact: 'Red.', bio: 'Long text.' };
    files['i18n/de/planets/mars.json'] = { name: 'Mars', fact: 'Rot.' };
    const en = await getBodyEntity('mars', 'en-US');
    expect(en).toMatchObject({ kind: 'planet', fact: 'Red.', text: 'Long text.' });
    expect(en?.visits).toEqual(['Viking — NASA, 1976']);
    const de = await getBodyEntity('mars', 'de');
    expect(de?.fact).toBe('Rot.');
    expect(de?.visits).toEqual([]);
  });

  it('takes a moon’s translated description and visits from its overlay', async () => {
    files['i18n/ru/satellites/europa.json'] = {
      description: 'Ледяной спутник.',
      mission_visits: ['Галилео'],
    };
    const ru = await getBodyEntity('europa', 'ru');
    expect(ru).toMatchObject({ kind: 'moon', parent: 'jupiter', text: 'Ледяной спутник.' });
    expect(ru?.visits).toEqual(['Галилео']);
  });

  it('falls back to the en-US overlay, then the base text, for a small body', async () => {
    const ja = await getBodyEntity('bennu', 'ja');
    expect(ja).toMatchObject({ kind: 'small-body', name: '101955 Bennu', text: 'Rubble pile.' });
  });

  it('returns null for an unknown id', async () => {
    expect(await getBodyEntity('vulcan', 'en-US')).toBeNull();
  });
});

describe('getSiteEntity', () => {
  beforeEach(() =>
    reset({
      'moon-sites.json': [{ id: 'apollo11', year: 1969 }],
      'site-stories/index.json': { ids: [] },
    }),
  );

  it('returns the base record with its locale overlay, en-US fallback', async () => {
    files['i18n/en-US/moon-sites/apollo11.json'] = { name: 'Apollo 11', fact: 'First landing.' };
    const de = await getSiteEntity('moon', 'apollo11', 'de');
    expect(de?.site).toMatchObject({ id: 'apollo11' });
    expect(de?.text.fact).toBe('First landing.');
    expect(de?.story).toBeNull();
  });

  it('returns null for an unknown site', async () => {
    expect(await getSiteEntity('moon', 'nope', 'en-US')).toBeNull();
  });
});
