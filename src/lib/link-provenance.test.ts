// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  canonicaliseLinkUrl,
  getLinkProvenanceManifest,
  getLinkProvenance,
  __resetLinkProvenanceCache,
} from './link-provenance';
import type { LinkProvenanceManifest } from './link-provenance';

/**
 * ADR-051 outbound-link locale-fallback machinery. The `canonicalise`
 * helper is pure and the highest-leverage thing to lock down — its
 * normalisation MUST match `scripts/build-link-provenance.ts`, otherwise
 * client lookups silently miss the manifest entry. The fetcher
 * (`getLinkProvenanceManifest`) is tested with a `vi.fn()`-mocked
 * `fetch`.
 */

beforeEach(() => {
  __resetLinkProvenanceCache();
});

// ─── canonicaliseLinkUrl ─────────────────────────────────────────────

describe('canonicaliseLinkUrl', () => {
  it('strips utm_* tracker parameters', () => {
    const raw = 'https://nasa.gov/foo?utm_source=newsletter&utm_medium=email&utm_campaign=apollo';
    expect(canonicaliseLinkUrl(raw)).toBe('https://nasa.gov/foo');
  });

  it('strips fbclid + gclid + mc_cid + mc_eid + _ga', () => {
    const raw = 'https://nasa.gov/foo?fbclid=abc&gclid=def&mc_cid=ghi&mc_eid=jkl&_ga=mno';
    expect(canonicaliseLinkUrl(raw)).toBe('https://nasa.gov/foo');
  });

  it('preserves non-tracker query parameters', () => {
    const raw = 'https://nasa.gov/foo?id=123&utm_source=newsletter';
    expect(canonicaliseLinkUrl(raw)).toBe('https://nasa.gov/foo?id=123');
  });

  it('strips m. mobile prefix on wikipedia + agency hosts', () => {
    expect(canonicaliseLinkUrl('https://m.wikipedia.org/wiki/Saturn_V')).toBe(
      'https://wikipedia.org/wiki/Saturn_V',
    );
    expect(canonicaliseLinkUrl('https://m.nasa.gov/foo')).toBe('https://nasa.gov/foo');
    expect(canonicaliseLinkUrl('https://m.roscosmos.ru/foo')).toBe('https://roscosmos.ru/foo');
  });

  it('does NOT strip m. prefix on arbitrary hosts (would change identity)', () => {
    // m.example.com is a legitimate hostname, not a mobile wrapper.
    expect(canonicaliseLinkUrl('https://m.example.com/foo')).toBe('https://m.example.com/foo');
  });

  it('strips trailing /amp and /amp/ AMP suffix entirely (both forms collapse to /foo)', () => {
    expect(canonicaliseLinkUrl('https://nasa.gov/foo/amp')).toBe('https://nasa.gov/foo');
    // The regex `/amp\/?$/` matches both `/amp` and `/amp/` and replaces
    // with '', so the trailing slash also drops.
    expect(canonicaliseLinkUrl('https://nasa.gov/foo/amp/')).toBe('https://nasa.gov/foo');
  });

  it('strips URL fragment', () => {
    expect(canonicaliseLinkUrl('https://nasa.gov/foo#section-2')).toBe('https://nasa.gov/foo');
  });

  it('returns input unchanged when URL parsing fails', () => {
    // Browser URL constructor throws on malformed input → fall-through.
    expect(canonicaliseLinkUrl('not a url')).toBe('not a url');
    expect(canonicaliseLinkUrl('')).toBe('');
  });

  it('combines all normalisations in one pass', () => {
    const raw =
      'https://m.wikipedia.org/wiki/Apollo_11/amp?utm_source=newsletter&fbclid=xyz#references';
    expect(canonicaliseLinkUrl(raw)).toBe('https://wikipedia.org/wiki/Apollo_11');
  });

  it('treats utm_SOURCE (mixed case) the same as utm_source (case-insensitive lookup)', () => {
    const raw = 'https://nasa.gov/foo?UTM_SOURCE=x&Utm_Medium=y';
    expect(canonicaliseLinkUrl(raw)).toBe('https://nasa.gov/foo');
  });
});

// ─── getLinkProvenanceManifest (mocked fetch) ────────────────────────

const STUB_MANIFEST: LinkProvenanceManifest = {
  schema_version: 1,
  generated_at: '2026-05-08T12:00:00Z',
  script_version: '1.0.0',
  commit_sha: 'abc123',
  entries: [
    {
      id: 'apollo11__https://history.nasa.gov/SP-4029',
      entity_id: 'apollo11',
      category: 'mission',
      route: '/missions',
      url: 'https://history.nasa.gov/SP-4029',
      label: 'Apollo by the Numbers',
      tier: 'core',
      source_id: 'nasa-history',
      language: 'en',
      kind: 'agency-official',
      fair_use_rationale: 'external reference; rel=noopener noreferrer external',
      last_verified: '2026-05-08',
    },
    {
      id: 'soyuz-ms__https://roscosmos.ru/foo',
      entity_id: 'soyuz-ms',
      category: 'crewed-spacecraft',
      route: '/fleet',
      url: 'https://roscosmos.ru/foo',
      label: 'Союз-МС',
      tier: 'intro',
      source_id: 'roscosmos',
      language: 'ru',
      kind: 'agency-official',
      fair_use_rationale: 'external reference; rel=noopener noreferrer external',
      last_verified: '2026-05-08',
    },
  ],
};

describe('getLinkProvenanceManifest (with mocked fetch)', () => {
  it('returns the parsed manifest on a 2xx response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => STUB_MANIFEST,
      }),
    );
    const m = await getLinkProvenanceManifest();
    expect(m).not.toBeNull();
    expect(m?.entries).toHaveLength(2);
    vi.unstubAllGlobals();
  });

  it('memoises the manifest — second call does not re-fetch', async () => {
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => STUB_MANIFEST,
    });
    vi.stubGlobal('fetch', fetchSpy);
    await getLinkProvenanceManifest();
    await getLinkProvenanceManifest();
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    vi.unstubAllGlobals();
  });

  it('returns null on a 404 response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        json: async () => ({}),
      }),
    );
    const m = await getLinkProvenanceManifest();
    expect(m).toBeNull();
    vi.unstubAllGlobals();
  });

  it('returns null when fetch throws (network error)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));
    const m = await getLinkProvenanceManifest();
    expect(m).toBeNull();
    vi.unstubAllGlobals();
  });
});

// ─── getLinkProvenance (lookup-by-entity+url) ────────────────────────

describe('getLinkProvenance (manifest lookup with canonicalisation)', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => STUB_MANIFEST,
      }),
    );
  });

  it('returns the provenance entry for an exact (entity_id, url) match', async () => {
    const entry = await getLinkProvenance('apollo11', 'https://history.nasa.gov/SP-4029');
    expect(entry).not.toBeNull();
    expect(entry?.source_id).toBe('nasa-history');
    expect(entry?.language).toBe('en');
  });

  it('returns the entry after canonicalising the input URL (utm_* stripped)', async () => {
    const entry = await getLinkProvenance(
      'apollo11',
      'https://history.nasa.gov/SP-4029?utm_source=newsletter',
    );
    expect(entry).not.toBeNull();
    expect(entry?.source_id).toBe('nasa-history');
  });

  it('returns null when the entity id has no manifest entry', async () => {
    const entry = await getLinkProvenance('ghost-entity', 'https://history.nasa.gov/SP-4029');
    expect(entry).toBeNull();
  });

  it('returns null when the URL has no manifest entry for the given entity', async () => {
    const entry = await getLinkProvenance('apollo11', 'https://example.com/unrelated');
    expect(entry).toBeNull();
  });

  it('returns null when the manifest itself fails to load (network error)', async () => {
    vi.unstubAllGlobals();
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    __resetLinkProvenanceCache();
    const entry = await getLinkProvenance('apollo11', 'https://history.nasa.gov/SP-4029');
    expect(entry).toBeNull();
  });

  it('byKey lookup respects entity_id scope (same URL on different entity ≠ match)', async () => {
    // Stub a manifest with collision on URL across two entities.
    const collisionManifest: LinkProvenanceManifest = {
      ...STUB_MANIFEST,
      entries: [
        { ...STUB_MANIFEST.entries[0], entity_id: 'entity-a' },
        { ...STUB_MANIFEST.entries[0], entity_id: 'entity-b' },
      ],
    };
    vi.unstubAllGlobals();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => collisionManifest,
      }),
    );
    __resetLinkProvenanceCache();
    const a = await getLinkProvenance('entity-a', 'https://history.nasa.gov/SP-4029');
    const b = await getLinkProvenance('entity-b', 'https://history.nasa.gov/SP-4029');
    const c = await getLinkProvenance('entity-c', 'https://history.nasa.gov/SP-4029');
    expect(a?.entity_id).toBe('entity-a');
    expect(b?.entity_id).toBe('entity-b');
    expect(c).toBeNull();
  });
});
