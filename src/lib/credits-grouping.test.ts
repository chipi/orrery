import { describe, it, expect } from 'vitest';
import {
  groupBySource,
  pathToRouteKey,
  provenanceSourceId,
  textSourceId,
} from './credits-grouping';
import type { ImageProvenanceEntry, SourceLogo, TextSourceEntry } from './data';

const SOURCES: SourceLogo[] = [
  {
    id: 'nasa',
    name: 'NASA',
    kind: 'space-agency',
    url: 'https://www.nasa.gov/',
    license_summary: 'PD',
  },
  {
    id: 'esa',
    name: 'ESA',
    kind: 'space-agency',
    url: 'https://www.esa.int/',
    license_summary: 'CC',
  },
  {
    id: 'wikimedia-commons',
    name: 'Wikimedia Commons',
    kind: 'media-platform',
    url: 'https://commons.wikimedia.org/',
    license_summary: 'mixed',
  },
  {
    id: 'wikipedia',
    name: 'Wikipedia',
    kind: 'encyclopedic',
    url: 'https://en.wikipedia.org/',
    license_summary: 'CC BY-SA',
  },
  {
    id: 'solar-system-scope',
    name: 'Solar System Scope',
    kind: 'publisher',
    url: 'https://www.solarsystemscope.com/',
    license_summary: 'CC BY 4.0',
  },
];

function makePhoto(p: Partial<ImageProvenanceEntry>): ImageProvenanceEntry {
  return {
    id: 'x',
    path: '/images/test.jpg',
    source_type: 'wikimedia-commons',
    title: 't',
    author: null,
    agency: 'NASA',
    source_url: 'https://commons.wikimedia.org/',
    image_url: null,
    license_short: 'PD-NASA',
    license_url: null,
    license_rationale: 'r',
    modifications: [],
    revid: null,
    pageid: null,
    nasa_id: null,
    fetched_at: '2026-01-01T00:00:00Z',
    ...p,
  };
}

function makeText(t: Partial<TextSourceEntry>): TextSourceEntry {
  return {
    id: 'x',
    location: { file: 'foo' },
    category: 'mission',
    relationship: 'paraphrased-from',
    license_short: 'CC-BY-SA-4.0',
    license_rationale: 'r',
    ...t,
  };
}

describe('pathToRouteKey', () => {
  it('routes mission images to missions', () => {
    expect(pathToRouteKey('/images/missions/curiosity/01.jpg')).toBe('missions');
    expect(pathToRouteKey('/images/missions/curiosity.jpg')).toBe('missions');
  });
  it('routes panel images to their host route', () => {
    expect(pathToRouteKey('/images/iss-modules/zarya/01.jpg')).toBe('iss');
    expect(pathToRouteKey('/images/earth-objects/iss/01.jpg')).toBe('earth');
    expect(pathToRouteKey('/images/moon-sites/apollo11/01.jpg')).toBe('moon');
    expect(pathToRouteKey('/images/mars-sites/curiosity/01.jpg')).toBe('mars');
  });
  it('routes sun and small-bodies under explore', () => {
    expect(pathToRouteKey('/images/sun/01.jpg')).toBe('explore');
    expect(pathToRouteKey('/images/small-bodies/ceres/01.jpg')).toBe('explore');
    expect(pathToRouteKey('/images/planets/mars/01.jpg')).toBe('explore');
  });
  it('routes logos and textures', () => {
    expect(pathToRouteKey('/logos/nasa.svg')).toBe('logos');
    expect(pathToRouteKey('/textures/mars.jpg')).toBe('textures');
  });
});

describe('provenanceSourceId', () => {
  it('credits the upstream publisher, not the retrieval conduit, for Wikimedia-routed photos', () => {
    // Editorial rule: a CNSA / Roscosmos photo retrieved via
    // Wikimedia Commons appears in the CNSA / Roscosmos section.
    // Commons is just the conduit; the publisher is who flew it.
    expect(
      provenanceSourceId(makePhoto({ source_type: 'wikimedia-commons', agency: 'CNSA' })),
    ).toBe('cnsa');
    expect(
      provenanceSourceId(makePhoto({ source_type: 'wikimedia-commons', agency: 'ROSCOSMOS' })),
    ).toBe('roscosmos');
    expect(
      provenanceSourceId(makePhoto({ source_type: 'wikimedia-commons', agency: 'NASA' })),
    ).toBe('nasa');
    expect(provenanceSourceId(makePhoto({ source_type: 'wikimedia-commons', agency: 'ESA' }))).toBe(
      'esa',
    );
    expect(
      provenanceSourceId(makePhoto({ source_type: 'wikimedia-commons', agency: 'JAXA' })),
    ).toBe('jaxa');
    expect(
      provenanceSourceId(makePhoto({ source_type: 'wikimedia-commons', agency: 'Blue Origin' })),
    ).toBe('blue-origin');
  });
  it('falls back to wikimedia-commons when the upstream is a Commons volunteer', () => {
    expect(
      provenanceSourceId(
        makePhoto({
          source_type: 'wikimedia-commons',
          agency: 'Wikimedia Commons contributors',
        }),
      ),
    ).toBe('wikimedia-commons');
  });
  it('takes the first agency token on partner credits (ADR-046 primary)', () => {
    expect(
      provenanceSourceId(
        makePhoto({ source_type: 'wikimedia-commons', agency: 'ROSCOSMOS / NASA' }),
      ),
    ).toBe('roscosmos');
    expect(
      provenanceSourceId(makePhoto({ source_type: 'nasa-images-api', agency: 'NASA / ESA' })),
    ).toBe('nasa');
  });
  it('maps NASA Images API entries to nasa even without an explicit agency hint', () => {
    expect(provenanceSourceId(makePhoto({ source_type: 'nasa-images-api', agency: '' }))).toBe(
      'nasa',
    );
  });
  it('maps direct-other (e.g. Solar System Scope) to solar-system-scope', () => {
    expect(
      provenanceSourceId(makePhoto({ source_type: 'direct-other', agency: 'Solar System Scope' })),
    ).toBe('solar-system-scope');
  });
  it('maps direct-agency by agency name', () => {
    expect(provenanceSourceId(makePhoto({ source_type: 'direct-agency', agency: 'CNSA' }))).toBe(
      'cnsa',
    );
    expect(provenanceSourceId(makePhoto({ source_type: 'direct-agency', agency: 'ESA' }))).toBe(
      'esa',
    );
  });
});

describe('textSourceId', () => {
  it('finds NASA from publisher hints', () => {
    expect(textSourceId(makeText({ source_publisher: 'NASA / JPL' }))).toBe('nasa');
  });
  it('finds Wikipedia from URL', () => {
    expect(textSourceId(makeText({ source_url: 'https://en.wikipedia.org/wiki/Foo' }))).toBe(
      'wikipedia',
    );
  });
  it('falls back to wikipedia when no hint matches', () => {
    expect(textSourceId(makeText({ source_publisher: undefined }))).toBe('wikipedia');
  });
});

describe('groupBySource', () => {
  it('places photos into wikimedia-commons / nasa / solar-system-scope by upstream agency', () => {
    const photos = [
      makePhoto({
        path: '/images/a.jpg',
        source_type: 'wikimedia-commons',
        agency: 'Wikimedia Commons contributors',
      }),
      makePhoto({ path: '/images/b.jpg', source_type: 'nasa-images-api', agency: 'NASA' }),
      makePhoto({
        path: '/images/c.jpg',
        source_type: 'direct-other',
        agency: 'Solar System Scope',
      }),
    ];
    const texts: TextSourceEntry[] = [];
    const groups = groupBySource(SOURCES, photos, texts);
    const ids = groups.map((g) => g.source.id);
    expect(ids).toContain('wikimedia-commons');
    expect(ids).toContain('nasa');
    expect(ids).toContain('solar-system-scope');
  });
  it('drops empty groups', () => {
    const groups = groupBySource(SOURCES, [], []);
    expect(groups).toEqual([]);
  });
  it('sorts photos by path within a group', () => {
    const photos = [
      makePhoto({ path: '/images/b.jpg', source_type: 'nasa-images-api' }),
      makePhoto({ path: '/images/a.jpg', source_type: 'nasa-images-api' }),
    ];
    const groups = groupBySource(SOURCES, photos, []);
    const nasa = groups.find((g) => g.source.id === 'nasa')!;
    expect(nasa.photos.map((p) => p.path)).toEqual(['/images/a.jpg', '/images/b.jpg']);
  });
});
