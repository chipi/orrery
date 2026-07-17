// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getVideoManifest,
  getVideo,
  getVideosForEntity,
  embedUrlFor,
  posterUrlFor,
  __resetVideoProvenanceCache,
} from './video-provenance';
import type { VideoProvenanceManifest, VideoProvenanceEntry } from './video-provenance';

/**
 * PRD-031 / RFC-033 S0 — the video-provenance client. The fetcher is memoised
 * (mocked `fetch`); the entity index must scope by entity_id; `embedUrlFor`
 * must stay privacy-preserving (nocookie / dnt) and never emit autoplay (the
 * facade adds that only on the user click).
 */

function entry(over: Partial<VideoProvenanceEntry>): VideoProvenanceEntry {
  return {
    id: 'vid-000000000000',
    entity_id: 'apollo11',
    entity_kind: 'mission',
    provider: 'youtube',
    provider_ref: 'abc123',
    source_url: 'https://www.youtube.com/watch?v=abc123',
    channel: 'NASA',
    agency: 'NASA',
    title: 'Apollo 11 liftoff',
    caption: null,
    kind: 'launch',
    poster: null,
    duration_seconds: null,
    start_seconds: 0,
    license_or_fair_use: 'PD-USGov',
    content_advisory: null,
    last_verified: '2026-07-16',
    notes: null,
    ...over,
  };
}

const STUB: VideoProvenanceManifest = {
  schema_version: 1,
  generated_at: '2026-07-16T00:00:00Z',
  script_version: 'build-video-provenance@1.0.0',
  commit_sha: 'abc123',
  entries: [
    entry({ id: 'vid-aaaaaaaaaaaa', entity_id: 'apollo11', provider_ref: 'aaa', title: 'launch' }),
    entry({
      id: 'vid-bbbbbbbbbbbb',
      entity_id: 'apollo11',
      provider_ref: 'bbb',
      title: 'landing',
      kind: 'landing',
    }),
    entry({
      id: 'vid-cccccccccccc',
      entity_id: 'starship',
      entity_kind: 'fleet',
      channel: 'SpaceX',
      agency: 'SpaceX',
      provider_ref: 'ccc',
      title: 'flip',
      kind: 'milestone',
    }),
  ],
};

function stubFetch(manifest: VideoProvenanceManifest = STUB) {
  return vi.fn().mockResolvedValue({ ok: true, json: async () => manifest });
}

beforeEach(() => {
  __resetVideoProvenanceCache();
  vi.unstubAllGlobals();
});

describe('getVideoManifest (mocked fetch)', () => {
  it('returns the parsed manifest on a 2xx response', async () => {
    vi.stubGlobal('fetch', stubFetch());
    const m = await getVideoManifest();
    expect(m?.entries).toHaveLength(3);
  });

  it('memoises — second call does not re-fetch', async () => {
    const spy = stubFetch();
    vi.stubGlobal('fetch', spy);
    await getVideoManifest();
    await getVideoManifest();
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('returns null on 404', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 404, json: async () => ({}) }),
    );
    expect(await getVideoManifest()).toBeNull();
  });

  it('returns null when fetch throws', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    expect(await getVideoManifest()).toBeNull();
  });
});

describe('getVideo (by id)', () => {
  beforeEach(() => vi.stubGlobal('fetch', stubFetch()));

  it('resolves an existing id', async () => {
    const v = await getVideo('vid-cccccccccccc');
    expect(v?.title).toBe('flip');
    expect(v?.agency).toBe('SpaceX');
  });

  it('returns null for an unknown id', async () => {
    expect(await getVideo('vid-zzzzzzzzzzzz')).toBeNull();
  });
});

describe('getVideosForEntity (entity-scoped)', () => {
  beforeEach(() => vi.stubGlobal('fetch', stubFetch()));

  it('returns all clips for an entity in manifest order', async () => {
    const vids = await getVideosForEntity('apollo11');
    expect(vids.map((v) => v.title)).toEqual(['launch', 'landing']);
  });

  it('does not leak clips across entities', async () => {
    const vids = await getVideosForEntity('starship');
    expect(vids).toHaveLength(1);
    expect(vids[0].entity_id).toBe('starship');
  });

  it('returns [] for an entity with no clips', async () => {
    expect(await getVideosForEntity('ghost')).toEqual([]);
  });

  it('returns [] when the manifest fails to load', async () => {
    vi.unstubAllGlobals();
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    __resetVideoProvenanceCache();
    expect(await getVideosForEntity('apollo11')).toEqual([]);
  });
});

describe('embedUrlFor (privacy-preserving, no autoplay)', () => {
  it('youtube → nocookie host, rel=0, captions on, no autoplay', () => {
    const url = embedUrlFor(entry({ provider: 'youtube', provider_ref: 'abc123' }));
    expect(url).toContain('https://www.youtube-nocookie.com/embed/abc123');
    expect(url).toContain('rel=0');
    expect(url).toContain('cc_load_policy=1');
    expect(url).not.toContain('autoplay');
  });

  it('youtube → includes start when start_seconds > 0', () => {
    const url = embedUrlFor(
      entry({ provider: 'youtube', provider_ref: 'abc123', start_seconds: 42 }),
    );
    expect(url).toContain('start=42');
  });

  it('vimeo → dnt=1', () => {
    const url = embedUrlFor(entry({ provider: 'vimeo', provider_ref: '99887766' }));
    expect(url).toBe('https://player.vimeo.com/video/99887766?dnt=1');
  });

  it('agency-mp4 / agency-hls → provider_ref returned as-is', () => {
    const mp4 = 'https://images.nasa.gov/foo.mp4';
    expect(embedUrlFor(entry({ provider: 'agency-mp4', provider_ref: mp4 }))).toBe(mp4);
    const hls = 'https://stream.esa.int/foo.m3u8';
    expect(embedUrlFor(entry({ provider: 'agency-hls', provider_ref: hls }))).toBe(hls);
  });
});

describe('posterUrlFor', () => {
  it('prefers a hosted poster (base-prefixed)', () => {
    expect(posterUrlFor(entry({ poster: '/images/missions/apollo11/poster.jpg' }))).toBe(
      '/images/missions/apollo11/poster.jpg',
    );
  });

  it('falls back to the youtube thumbnail when poster is null', () => {
    expect(posterUrlFor(entry({ provider: 'youtube', provider_ref: 'abc123', poster: null }))).toBe(
      'https://i.ytimg.com/vi/abc123/hqdefault.jpg',
    );
  });

  it('returns null for a non-youtube clip with no poster (→ placeholder)', () => {
    expect(
      posterUrlFor(entry({ provider: 'agency-mp4', provider_ref: 'x.mp4', poster: null })),
    ).toBeNull();
  });
});
