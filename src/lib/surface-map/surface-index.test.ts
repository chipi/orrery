import { describe, it, expect } from 'vitest';
import type { SurfaceSite } from '$types/surface-site';
import type { EarthObject } from '$types/earth-object';
import {
  surfaceSiteToIndexItem,
  earthObjectToIndexItem,
  toIndexItems,
  indexAgencies,
  indexStatuses,
  filterIndexItems,
  type IndexItem,
} from './surface-index';

// Minimal fixtures — the adapter only reads a handful of fields, so partial
// objects cast to the full type keep the tests readable.
const marsRover = {
  id: 'curiosity',
  kind: 'surface',
  agency: 'NASA',
  year: 2012,
  status: 'ACTIVE',
  mission_type: 'ROVER · ACTIVE',
  name: 'Curiosity',
} as SurfaceSite;

const marsOrbiter = {
  id: 'mariner9',
  kind: 'orbiter',
  agency: 'NASA',
  year: 1971,
  status: 'ENDED',
  altitude_km: 1394,
  name: 'Mariner 9',
} as SurfaceSite;

const marsSoviet = {
  id: 'mars3',
  kind: 'surface',
  agency: 'ROSCOSMOS',
  year: 1971,
  status: 'CRASHED',
  mission_type: 'LANDER · FLOWN',
  name: 'Mars 3',
} as SurfaceSite;

const moonCrewed = {
  id: 'apollo11',
  kind: 'surface',
  agency: 'NASA',
  year: 1969,
  status: 'FLOWN',
  mission_type: 'CREWED LANDER · FLOWN',
  name: 'Apollo 11',
} as SurfaceSite;

const hubble = {
  id: 'hubble',
  regime: 'LEO',
  body: 'EARTH',
  agencies: ['NASA', 'ESA'],
  launched: 1990,
  status: 'ACTIVE',
  altitude_km: 538,
  color: '#4ecdc4',
  count: 1,
  crew: 0,
  name: 'Hubble',
} as EarthObject;

const baikonur = {
  id: 'baikonur',
  kind: 'surface',
  agency: 'ROSCOSMOS',
  year: 1957,
  status: 'ACTIVE',
  lat: 45.9,
  lon: 63.3,
  name: 'Baikonur',
} as SurfaceSite;

describe('surfaceSiteToIndexItem', () => {
  it('maps a surface lander/rover to domain:land with a derived category', () => {
    const item = surfaceSiteToIndexItem(marsRover, 'mars');
    expect(item).toMatchObject({
      id: 'curiosity',
      name: 'Curiosity',
      domain: 'land',
      category: 'rover',
      year: 2012,
      status: 'ACTIVE',
      agencies: ['NASA'],
      body: 'mars',
    });
  });

  it('maps an orbiter to domain:orbit', () => {
    expect(surfaceSiteToIndexItem(marsOrbiter, 'mars').domain).toBe('orbit');
  });

  it('categorises Soviet Mars hardware as soviet-petal (agency-driven)', () => {
    expect(surfaceSiteToIndexItem(marsSoviet, 'mars').category).toBe('soviet-petal');
  });

  it('uses the moon categoriser for moon sites', () => {
    expect(surfaceSiteToIndexItem(moonCrewed, 'moon').category).toBe('crewed');
  });

  it('falls back to the id when no overlay name is present', () => {
    const noName = { ...marsRover, name: undefined } as SurfaceSite;
    expect(surfaceSiteToIndexItem(noName, 'mars').name).toBe('curiosity');
  });
});

describe('earthObjectToIndexItem', () => {
  it('maps an earth object to domain:orbit, splits agencies[], keeps regime + launch year', () => {
    const item = earthObjectToIndexItem(hubble);
    expect(item).toMatchObject({
      id: 'hubble',
      name: 'Hubble',
      domain: 'orbit',
      category: 'telescope',
      year: 1990,
      status: 'ACTIVE',
      regime: 'LEO',
      color: '#4ecdc4',
      body: 'earth',
    });
    expect(item.agencies).toEqual(['NASA', 'ESA']);
  });

  it('splits compound agency entries inside the array', () => {
    const compound = { ...hubble, agencies: ['NASA / ESA', 'ASI'] } as EarthObject;
    expect(earthObjectToIndexItem(compound).agencies).toEqual(['NASA', 'ESA', 'ASI']);
  });
});

describe('toIndexItems', () => {
  it('dispatches to the surface adapter for mars/moon and ignores earthObjects', () => {
    const items = toIndexItems([marsRover, marsOrbiter], [hubble], 'mars');
    expect(items.map((i) => i.id)).toEqual(['curiosity', 'mariner9']);
    expect(items.every((i) => i.body === 'mars')).toBe(true);
  });

  it('for earth, combines launch sites (land) then orbital objects (orbit)', () => {
    const items = toIndexItems([baikonur], [hubble], 'earth');
    expect(items.map((i) => i.id)).toEqual(['baikonur', 'hubble']);
    expect(items.map((i) => i.domain)).toEqual(['land', 'orbit']);
    expect(items.every((i) => i.body === 'earth')).toBe(true);
    expect(items[0].category).toBe('launch-site');
  });
});

describe('facets', () => {
  const items: IndexItem[] = toIndexItems([marsRover, marsOrbiter, marsSoviet], [], 'mars');

  it('indexAgencies returns unique sorted codes', () => {
    expect(indexAgencies(items)).toEqual(['NASA', 'ROSCOSMOS']);
  });

  it('indexStatuses returns unique codes in first-seen order', () => {
    expect(indexStatuses(items)).toEqual(['ACTIVE', 'ENDED', 'CRASHED']);
  });
});

describe('filterIndexItems', () => {
  const items: IndexItem[] = toIndexItems([marsRover, marsOrbiter, marsSoviet], [], 'mars');

  it('empty filters return everything', () => {
    expect(filterIndexItems(items, {})).toHaveLength(3);
  });

  it('free-text search matches name', () => {
    expect(filterIndexItems(items, { query: 'curio' }).map((i) => i.id)).toEqual(['curiosity']);
  });

  it('free-text search matches agency + category', () => {
    expect(filterIndexItems(items, { query: 'roscosmos' }).map((i) => i.id)).toEqual(['mars3']);
    expect(filterIndexItems(items, { query: 'rover' }).map((i) => i.id)).toEqual(['curiosity']);
  });

  it('domain filter splits orbit vs land', () => {
    expect(filterIndexItems(items, { domain: 'orbit' }).map((i) => i.id)).toEqual(['mariner9']);
    expect(filterIndexItems(items, { domain: 'land' }).map((i) => i.id)).toEqual([
      'curiosity',
      'mars3',
    ]);
  });

  it('agency + status facets are exact-match', () => {
    expect(filterIndexItems(items, { agency: 'ROSCOSMOS' }).map((i) => i.id)).toEqual(['mars3']);
    expect(filterIndexItems(items, { status: 'ENDED' }).map((i) => i.id)).toEqual(['mariner9']);
  });

  it('year range is inclusive', () => {
    expect(filterIndexItems(items, { yearMax: 1971 }).map((i) => i.id)).toEqual([
      'mariner9',
      'mars3',
    ]);
    expect(filterIndexItems(items, { yearMin: 2000 }).map((i) => i.id)).toEqual(['curiosity']);
  });

  it('ALL sentinels are no-ops', () => {
    expect(filterIndexItems(items, { domain: 'ALL', agency: 'ALL', status: 'ALL' })).toHaveLength(
      3,
    );
  });
});
