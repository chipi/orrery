import { describe, it, expect } from 'vitest';
import {
  bundlePhotos,
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
    expect(pathToRouteKey('/images/missions/apollo11/02.4x3.jpg')).toBe('missions');
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
  it('maps CMSA / SpaceIL / CSA / USAF to their sections, not Wikimedia-Commons (v0.7 sweep)', () => {
    // CMSA (China Manned Space Agency — Tiangong/Shenzhou) folds into the
    // CNSA China section rather than miscrediting to Commons.
    expect(
      provenanceSourceId(makePhoto({ source_type: 'wikimedia-commons', agency: 'CMSA' })),
    ).toBe('cnsa');
    // SpaceIL gets its own section (Israeli Beresheet program).
    expect(
      provenanceSourceId(makePhoto({ source_type: 'wikimedia-commons', agency: 'SpaceIL' })),
    ).toBe('spaceil');
    // USAF (legacy military space) → US military space section.
    expect(
      provenanceSourceId(makePhoto({ source_type: 'wikimedia-commons', agency: 'USAF' })),
    ).toBe('us-space-force');
    // CSA as the primary (first) token → Canadian Space Agency section.
    expect(
      provenanceSourceId(makePhoto({ source_type: 'wikimedia-commons', agency: 'CSA / NASA' })),
    ).toBe('csa');
    // But NASA-first joint missions still bucket to NASA (CSA not first).
    expect(
      provenanceSourceId(
        makePhoto({ source_type: 'wikimedia-commons', agency: 'NASA / ESA / CSA' }),
      ),
    ).toBe('nasa');
    // Guard: CMSA folding must not break the distinct CNSA mapping.
    expect(
      provenanceSourceId(makePhoto({ source_type: 'wikimedia-commons', agency: 'CNSA' })),
    ).toBe('cnsa');
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
  it('routes orbital instrument imagery to its own per-instrument section (#360)', () => {
    // HiRISE + CTX surface patches are a distinct product class — they get
    // dedicated NASA · HiRISE / NASA · CTX sections, not the general NASA
    // bucket. The instrument field wins over the agency mapping.
    expect(
      provenanceSourceId(
        makePhoto({ source_type: 'direct-agency', agency: 'NASA', instrument: 'HiRISE' }),
      ),
    ).toBe('nasa-hirise');
    expect(
      provenanceSourceId(
        makePhoto({ source_type: 'derived-mosaic', agency: 'NASA', instrument: 'CTX' }),
      ),
    ).toBe('nasa-ctx');
    // Moon regional context (#361) — JAXA Kaguya Terrain Camera gets its own
    // section, surfacing JAXA rather than collapsing into the NASA bucket.
    expect(
      provenanceSourceId(
        makePhoto({ source_type: 'direct-agency', agency: 'JAXA', instrument: 'Kaguya TC' }),
      ),
    ).toBe('jaxa-kaguya-tc');
    // Without an instrument, the agency mapping still applies.
    expect(provenanceSourceId(makePhoto({ source_type: 'direct-agency', agency: 'NASA' }))).toBe(
      'nasa',
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
        source_url: 'https://commons.wikimedia.org/a',
      }),
      makePhoto({
        path: '/images/b.jpg',
        source_type: 'nasa-images-api',
        agency: 'NASA',
        source_url: 'https://images.nasa.gov/b',
      }),
      makePhoto({
        path: '/images/c.jpg',
        source_type: 'direct-other',
        agency: 'Solar System Scope',
        source_url: 'https://solarsystemscope.com/c',
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
  it('bundles cross-source reuse globally before grouping (Slice A v3 / Stage 1.4)', () => {
    // Same upstream Hubble photo used by two missions; one mission has
    // primary-agency 'ESA/Hubble', the other has 'NASA via Wikimedia
    // Commons mirror'. Previously these would split into two source
    // buckets and render twice on /credits. After bundle-first-group-
    // after, they collapse into one bundle routed by the representative.
    const shared = 'https://commons.wikimedia.org/wiki/Special:FilePath/Hubble.jpg';
    const photos = [
      makePhoto({
        path: '/images/missions/mission-a/01.jpg',
        agency: 'ESA/Hubble',
        image_url: shared,
        source_type: 'wikimedia-commons',
        source_url: 'https://commons.wikimedia.org/wiki/File:Hubble.jpg',
      }),
      makePhoto({
        path: '/images/missions/mission-b/01.jpg',
        agency: 'NASA via Wikimedia Commons mirror',
        image_url: shared,
        source_type: 'wikimedia-commons',
        source_url: 'https://commons.wikimedia.org/wiki/File:Hubble.jpg',
      }),
    ];
    const groups = groupBySource(SOURCES, photos, []);
    const totalBundles = groups.reduce((n, g) => n + g.bundles.length, 0);
    expect(totalBundles).toBe(1);
    // Both paths land under the one bundle that survived.
    const onlyBundle = groups.flatMap((g) => g.bundles)[0];
    expect(new Set(onlyBundle.paths)).toEqual(
      new Set(['/images/missions/mission-a/01.jpg', '/images/missions/mission-b/01.jpg']),
    );
  });
  it('sorts photos by path within a group', () => {
    const photos = [
      makePhoto({
        path: '/images/b.jpg',
        source_type: 'nasa-images-api',
        source_url: 'https://images.nasa.gov/b',
      }),
      makePhoto({
        path: '/images/a.jpg',
        source_type: 'nasa-images-api',
        source_url: 'https://images.nasa.gov/a',
      }),
    ];
    const groups = groupBySource(SOURCES, photos, []);
    const nasa = groups.find((g) => g.source.id === 'nasa')!;
    expect(nasa.bundles.map((b) => b.representative.path)).toEqual([
      '/images/a.jpg',
      '/images/b.jpg',
    ]);
  });
});

describe('bundlePhotos', () => {
  it('collapses aspect-ratio crops of the same source into one bundle with variant chips', () => {
    const url = 'https://images.nasa.gov/search?q=lro';
    const photos = [
      makePhoto({ path: '/images/missions/lro/02.16x9.jpg', source_url: url, title: 'lro' }),
      makePhoto({ path: '/images/missions/lro/02.1x1.jpg', source_url: url, title: 'lro' }),
      makePhoto({ path: '/images/missions/lro/02.4x3.jpg', source_url: url, title: 'lro' }),
      makePhoto({ path: '/images/missions/lro/02.jpg', source_url: url, title: 'lro' }),
    ];
    const bundles = bundlePhotos(photos);
    expect(bundles).toHaveLength(1);
    expect(bundles[0].variants).toEqual(['16:9', '4:3', '1:1', 'original']);
    expect(bundles[0].stems).toEqual(['/images/missions/lro/02']);
    expect(bundles[0].paths).toHaveLength(4);
    // Representative is the un-cropped original when present.
    expect(bundles[0].representative.path).toBe('/images/missions/lro/02.jpg');
  });
  it('keeps separate bundles when the same stem has different source attributions', () => {
    // beidou pattern: /01.16x9.jpg, /01.1x1.jpg, /01.4x3.jpg each
    // pulled from a DIFFERENT Wikimedia file — attribution must not
    // be fudged by collapsing.
    const photos = [
      makePhoto({
        path: '/images/earth-objects/beidou/01.16x9.jpg',
        source_url: 'https://commons.wikimedia.org/wiki/File:A.jpg',
        title: 'A',
      }),
      makePhoto({
        path: '/images/earth-objects/beidou/01.1x1.jpg',
        source_url: 'https://commons.wikimedia.org/wiki/File:B.jpg',
        title: 'B',
      }),
      makePhoto({
        path: '/images/earth-objects/beidou/01.4x3.jpg',
        source_url: 'https://commons.wikimedia.org/wiki/File:C.jpg',
        title: 'C',
      }),
    ];
    const bundles = bundlePhotos(photos);
    expect(bundles).toHaveLength(3);
    for (const b of bundles) {
      expect(b.variants).toHaveLength(1);
      expect(b.paths).toHaveLength(1);
    }
  });
  it('leaves a single-path photo as a one-variant bundle', () => {
    const bundles = bundlePhotos([makePhoto({ path: '/logos/nasa.svg' })]);
    expect(bundles).toHaveLength(1);
    expect(bundles[0].variants).toEqual(['original']);
    expect(bundles[0].paths).toEqual(['/logos/nasa.svg']);
    expect(bundles[0].stems).toEqual(['/logos/nasa']);
  });
  it('collapses aspect-ratio variants of one slot via image_url', () => {
    // /images/missions/apollo11/01.{16x9,1x1,4x3,jpg} are all crops of
    // the same Wikimedia upload — same image_url. Collapse into one
    // bundle. Since the unified-path migration, the mission card hero
    // IS the gallery's 01.jpg (no separate <id>.jpg top-level to merge).
    const imageUrl = 'https://upload.wikimedia.org/wikipedia/commons/9/9c/Aldrin_Apollo_11.jpg';
    const bundles = bundlePhotos([
      makePhoto({ path: '/images/missions/apollo11/01.16x9.jpg', image_url: imageUrl }),
      makePhoto({ path: '/images/missions/apollo11/01.1x1.jpg', image_url: imageUrl }),
      makePhoto({ path: '/images/missions/apollo11/01.4x3.jpg', image_url: imageUrl }),
      makePhoto({ path: '/images/missions/apollo11/01.jpg', image_url: imageUrl }),
    ]);
    expect(bundles).toHaveLength(1);
    expect(bundles[0].paths).toHaveLength(4);
    expect(bundles[0].stems).toEqual(['/images/missions/apollo11/01']);
    // Un-cropped variant wins as representative.
    expect(bundles[0].representative.path).toBe('/images/missions/apollo11/01.jpg');
  });
  it('collapses cross-route reuse via image_url', () => {
    // Same Aldrin photo used on /missions and /moon-sites.
    const imageUrl = 'https://upload.wikimedia.org/wikipedia/commons/9/9c/Aldrin.jpg';
    const bundles = bundlePhotos([
      makePhoto({ path: '/images/missions/apollo11/01.jpg', image_url: imageUrl }),
      makePhoto({ path: '/images/moon-sites/apollo11/01.jpg', image_url: imageUrl }),
    ]);
    expect(bundles).toHaveLength(1);
    expect(bundles[0].stems).toEqual([
      '/images/missions/apollo11/01',
      '/images/moon-sites/apollo11/01',
    ]);
  });
  it('collapses via nasa_id when image_url is absent', () => {
    const bundles = bundlePhotos([
      makePhoto({
        path: '/images/missions/lro/02.jpg',
        nasa_id: 'PIA-12345',
        source_url: 'https://images.nasa.gov/search?q=lro',
      }),
      makePhoto({
        path: '/images/earth-objects/lro/02.jpg',
        nasa_id: 'PIA-12345',
        source_url: 'https://images.nasa.gov/search?q=lro',
      }),
    ]);
    expect(bundles).toHaveLength(1);
    expect(bundles[0].stems).toHaveLength(2);
  });
  it('collapses generic same-source-family rows into one credit line', () => {
    // Rows sharing a generic title + search-query source_url with no reliable
    // per-image id would otherwise render as N identical credit lines. They
    // collapse into ONE bundle that credits the shared source and lists both
    // images (the credit is the source, not each frame).
    const url = 'https://images.nasa.gov/search?q=apollo11';
    const bundles = bundlePhotos([
      makePhoto({ path: '/images/missions/apollo11/02.jpg', source_url: url, title: 'apollo11' }),
      makePhoto({ path: '/images/missions/apollo11/03.jpg', source_url: url, title: 'apollo11' }),
    ]);
    expect(bundles).toHaveLength(1);
    expect(bundles[0].stems).toHaveLength(2);
  });
  it('keeps genuinely distinct-title images apart', () => {
    // Descriptive, different titles are NOT a family — they stay separate so
    // real per-image attribution is preserved.
    const url = 'https://images.nasa.gov/search?q=apollo11';
    const bundles = bundlePhotos([
      makePhoto({
        path: '/images/missions/apollo11/02.jpg',
        source_url: url,
        title: 'Apollo 11 lunar module ascent',
      }),
      makePhoto({
        path: '/images/missions/apollo11/03.jpg',
        source_url: url,
        title: 'Apollo 11 crew portrait',
      }),
    ]);
    expect(bundles).toHaveLength(2);
  });
  it('bundles a partial crop set (no 16:9 emitted) correctly', () => {
    // Some slots only emit 1x1 + 4x3 + original (per the LRO/01 example).
    const url = 'https://images.nasa.gov/search?q=lro';
    const bundles = bundlePhotos([
      makePhoto({ path: '/images/missions/lro/01.1x1.jpg', source_url: url, title: 'lro' }),
      makePhoto({ path: '/images/missions/lro/01.4x3.jpg', source_url: url, title: 'lro' }),
      makePhoto({ path: '/images/missions/lro/01.jpg', source_url: url, title: 'lro' }),
    ]);
    expect(bundles).toHaveLength(1);
    expect(bundles[0].variants).toEqual(['4:3', '1:1', 'original']);
  });
  it('collapses same generic-title slots from one source into one bundle', () => {
    // LRO/02 and LRO/03 share the same generic title + NASA search URL. Rather
    // than two identical "lro" credit lines, they collapse into one bundle
    // covering both stems.
    const url = 'https://images.nasa.gov/search?q=lro';
    const bundles = bundlePhotos([
      makePhoto({ path: '/images/missions/lro/02.jpg', source_url: url, title: 'lro' }),
      makePhoto({ path: '/images/missions/lro/03.jpg', source_url: url, title: 'lro' }),
    ]);
    expect(bundles).toHaveLength(1);
    expect(bundles[0].stems).toHaveLength(2);
  });
});
