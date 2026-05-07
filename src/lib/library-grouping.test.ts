import { describe, it, expect } from 'vitest';
import { groupBySource, summarise } from './library-grouping';
import type { SourceLogo } from '$lib/data';
import type { LinkProvenanceEntry } from './link-provenance';

const SOURCES: SourceLogo[] = [
  {
    id: 'nasa',
    name: 'NASA',
    kind: 'space-agency',
    url: 'https://nasa.gov',
    license_summary: 'Public domain',
    logo_path: '/logos/nasa.png',
  },
  {
    id: 'esa',
    name: 'ESA',
    kind: 'space-agency',
    url: 'https://esa.int',
    license_summary: 'CC BY-SA',
    logo_path: '/logos/esa.png',
  },
  {
    id: 'wikipedia',
    name: 'Wikipedia',
    kind: 'encyclopedic',
    url: 'https://wikipedia.org',
    license_summary: 'CC BY-SA',
    logo_path: '/logos/wikipedia.png',
  },
];

function entry(overrides: Partial<LinkProvenanceEntry>): LinkProvenanceEntry {
  return {
    id: 'fixture',
    entity_id: 'apollo11',
    category: 'mission',
    route: '/missions',
    url: 'https://en.wikipedia.org/wiki/Apollo_11',
    label: 'Wikipedia',
    tier: 'intro',
    source_id: 'wikipedia',
    language: 'en',
    kind: 'encyclopedic',
    fair_use_rationale: 'External link with rel=noopener noreferrer external',
    last_verified: '2026-05-07',
    ...overrides,
  };
}

describe('library-grouping', () => {
  it('groupBySource clusters by source then by entity', () => {
    const entries: LinkProvenanceEntry[] = [
      entry({ id: 'a', source_id: 'nasa', entity_id: 'apollo11' }),
      entry({ id: 'b', source_id: 'nasa', entity_id: 'apollo12' }),
      entry({ id: 'c', source_id: 'wikipedia', entity_id: 'apollo11' }),
    ];
    const groups = groupBySource(SOURCES, entries);
    // ESA group has 0 links → dropped.
    expect(groups.map((g) => g.source.id)).toEqual(['nasa', 'wikipedia']);
    expect(groups[0].total_links).toBe(2);
    expect(groups[0].entities.map((e) => e.entity_id)).toEqual(['apollo11', 'apollo12']);
    expect(groups[1].entities[0].entity_id).toBe('apollo11');
    expect(groups[1].entities[0].links).toHaveLength(1);
  });

  it('groupBySource preserves source-logos order, not insertion order', () => {
    // Wiki entry first, then NASA entry — expect NASA first because it
    // appears earlier in SOURCES.
    const entries: LinkProvenanceEntry[] = [
      entry({ id: 'wiki', source_id: 'wikipedia', entity_id: 'apollo11' }),
      entry({ id: 'nasa', source_id: 'nasa', entity_id: 'apollo11' }),
    ];
    const groups = groupBySource(SOURCES, entries);
    expect(groups.map((g) => g.source.id)).toEqual(['nasa', 'wikipedia']);
  });

  it('groupBySource sorts links inside an entity by tier then language then url', () => {
    const entries: LinkProvenanceEntry[] = [
      entry({ id: 'a', tier: 'deep', language: 'en' }),
      entry({ id: 'b', tier: 'intro', language: 'es' }),
      entry({ id: 'c', tier: 'intro', language: 'en' }),
      entry({ id: 'd', tier: 'core', language: 'en' }),
    ];
    const groups = groupBySource(SOURCES, entries);
    const order = groups[0].entities[0].links.map((l) => l.id);
    // intro/en, intro/es, core/en, deep/en
    expect(order).toEqual(['c', 'b', 'd', 'a']);
  });

  it("groupBySource drops entries whose source_id isn't in sources", () => {
    const entries: LinkProvenanceEntry[] = [
      entry({ id: 'orphan', source_id: 'mystery-host' }),
      entry({ id: 'good', source_id: 'nasa' }),
    ];
    const groups = groupBySource(SOURCES, entries);
    expect(groups).toHaveLength(1);
    expect(groups[0].source.id).toBe('nasa');
    expect(groups[0].total_links).toBe(1);
  });

  it('summarise counts unique sources, languages, entities and tracks newest_verified', () => {
    const entries: LinkProvenanceEntry[] = [
      entry({ id: 'a', source_id: 'nasa', language: 'en', last_verified: '2026-04-01' }),
      entry({ id: 'b', source_id: 'esa', language: 'es', last_verified: '2026-05-07' }),
      entry({ id: 'c', source_id: 'esa', language: 'en', last_verified: '2026-03-15' }),
      entry({ id: 'd', source_id: 'nasa', language: 'en', last_verified: '2026-04-30' }),
    ];
    const s = summarise(entries);
    expect(s.links).toBe(4);
    expect(s.sources).toBe(2);
    expect(s.languages).toBe(2);
    expect(s.entities).toBe(1); // all default to apollo11
    expect(s.newest_verified).toBe('2026-05-07');
  });

  it('summarise on empty entries returns zeroes and null newest', () => {
    const s = summarise([]);
    expect(s).toEqual({
      links: 0,
      sources: 0,
      languages: 0,
      entities: 0,
      newest_verified: null,
    });
  });
});
