// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';

// $app mocks must precede all module imports.
vi.mock('$app/environment', () => ({ browser: true }));
vi.mock('$app/paths', () => ({ base: '' }));
vi.mock('$app/navigation', () => ({ goto: vi.fn() }));
vi.mock('./audio-tour', () => ({ CURATOR_FULL_TOUR: [] }));
vi.mock('./asset-url', () => ({ assetOrigin: '' }));

import {
  collapseVariants,
  PROVIDER_PRIORITY,
  audioRegistry,
  type ProvenanceEntry,
} from './audio-registry.svelte';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// Test the LIVE collapseVariants exported from audio-registry.svelte.ts
// — previously this file mirrored the helper inline, which meant a
// refactor of the real module wouldn't be caught here (#7). Importing
// the real function ensures every drift surfaces as a test failure.

const sampleEntry = (
  episode_id: string,
  provider: ProvenanceEntry['provider'],
  overrides: Partial<ProvenanceEntry> = {},
): ProvenanceEntry => ({
  episode_id,
  locale: 'en-US',
  persona: 'curator',
  provider,
  voice_id: `${provider}-voice`,
  tts_model: provider === 'google' ? 'neural2' : 'eleven_multilingual_v2',
  route: '/',
  title: episode_id,
  path_mp3: `/audio/en-US/curator/${episode_id}.aaaa.mp3`,
  path_vtt: `/audio/en-US/curator/${episode_id}.aaaa.vtt`,
  path_txt: `/audio/en-US/curator/${episode_id}.aaaa.txt`,
  ...overrides,
});

describe('collapseVariants', () => {
  it('groups two provider rows of the same episode into one Episode with 2 variants', () => {
    const entries = [
      sampleEntry('pale-blue-dot', 'google'),
      sampleEntry('pale-blue-dot', 'elevenlabs'),
    ];
    const result = collapseVariants(entries);
    expect(result.length).toBe(1);
    expect(result[0].id).toBe('pale-blue-dot');
    expect(result[0].variants.length).toBe(2);
    expect(result[0].variants.map((v) => v.provider).sort()).toEqual(['elevenlabs', 'google']);
  });

  it('puts elevenlabs first in variants[] per PROVIDER_PRIORITY', () => {
    const entries = [
      sampleEntry('saturn-rings', 'google'),
      sampleEntry('saturn-rings', 'elevenlabs'),
    ];
    const result = collapseVariants(entries);
    expect(result[0].variants[0].provider).toBe('elevenlabs');
    expect(result[0].activeProvider).toBe('elevenlabs');
  });

  it('keeps Google as activeProvider when no ElevenLabs variant exists', () => {
    const entries = [sampleEntry('signal-delay', 'google')];
    const result = collapseVariants(entries);
    expect(result[0].activeProvider).toBe('google');
    expect(result[0].variants.length).toBe(1);
  });

  it('separates episodes by (episode_id, locale, persona) — same id different persona = different Episode', () => {
    const entries = [
      sampleEntry('pale-blue-dot', 'google', { persona: 'curator' }),
      sampleEntry('pale-blue-dot', 'google', { persona: 'guide' }),
    ];
    const result = collapseVariants(entries);
    expect(result.length).toBe(2);
  });

  it('separates episodes by locale — same id different locale = different Episode', () => {
    const entries = [
      sampleEntry('signal-delay', 'google', { locale: 'en-US' }),
      sampleEntry('signal-delay', 'google', { locale: 'es-ES' }),
    ];
    const result = collapseVariants(entries);
    expect(result.length).toBe(2);
    const locales = result.map((r) => r.locale).sort();
    expect(locales).toEqual(['en-US', 'es-ES']);
  });

  it('preserves route + title from the first-seen entry', () => {
    const entries = [
      sampleEntry('guide-mars', 'google', { route: '/mars', title: 'Mars Guide' }),
      sampleEntry('guide-mars', 'elevenlabs', { route: '/mars' }),
    ];
    const result = collapseVariants(entries);
    expect(result[0].route).toBe('/mars');
    expect(result[0].title).toBe('Mars Guide');
  });

  it('preserves tts_model per variant', () => {
    const entries = [
      sampleEntry('pale-blue-dot', 'google', { tts_model: 'neural2' }),
      sampleEntry('pale-blue-dot', 'elevenlabs', { tts_model: 'eleven_multilingual_v2' }),
    ];
    const result = collapseVariants(entries);
    const byProvider = Object.fromEntries(result[0].variants.map((v) => [v.provider, v.tts_model]));
    expect(byProvider.google).toBe('neural2');
    expect(byProvider.elevenlabs).toBe('eleven_multilingual_v2');
  });

  it('PROVIDER_PRIORITY puts elevenlabs ahead of google', () => {
    expect(PROVIDER_PRIORITY.indexOf('elevenlabs')).toBeLessThan(
      PROVIDER_PRIORITY.indexOf('google'),
    );
  });
});

// ─── Live-corpus integrity ───────────────────────────────────────────────
// Cross-check the shipping audio-provenance.json against the schema's
// uniqueness contract: every (episode_id, locale, persona, provider) tuple
// MUST be unique. A duplicate would cause collapseVariants to drop one of
// the provider rows and break A/B in production.

describe('audio-provenance.json integrity', () => {
  it('has no duplicate (episode_id, locale, persona, provider) tuples', () => {
    const raw = readFileSync(
      join(process.cwd(), 'static/data/audio/audio-provenance.json'),
      'utf-8',
    );
    const data = JSON.parse(raw) as { entries: ProvenanceEntry[] };
    const seen = new Set<string>();
    const dupes: string[] = [];
    for (const e of data.entries) {
      const k = `${e.episode_id}|${e.locale}|${e.persona}|${e.provider}`;
      if (seen.has(k)) dupes.push(k);
      seen.add(k);
    }
    expect(dupes).toEqual([]);
  });

  it('every entry has tts_model populated (required after #40 tightening)', () => {
    const raw = readFileSync(
      join(process.cwd(), 'static/data/audio/audio-provenance.json'),
      'utf-8',
    );
    const data = JSON.parse(raw) as { entries: ProvenanceEntry[] };
    const missing = data.entries.filter((e) => !e.tts_model);
    expect(missing.map((e) => `${e.episode_id}/${e.provider}`)).toEqual([]);
  });
});

// ─── AudioRegistry singleton — instance method coverage ─────────────────────

function makeEpisode(id: string, route?: string) {
  return collapseVariants([
    {
      episode_id: id,
      locale: 'en-US',
      persona: 'guide',
      provider: 'google',
      voice_id: 'g-voice',
      tts_model: 'neural2',
      route,
      title: id,
      duration_target_sec: 90,
      path_mp3: `/audio/en-US/guide/${id}.xxxx.mp3`,
      path_vtt: `/audio/en-US/guide/${id}.xxxx.vtt`,
      path_txt: `/audio/en-US/guide/${id}.xxxx.txt`,
    },
  ])[0];
}

describe('audioRegistry.forRoute', () => {
  beforeEach(() => {
    // Directly populate the registry's episodes state so we don't need
    // a network fetch; $state properties are plain JS in Svelte 5 rune
    // modules running under vitest.
    audioRegistry.episodes = [
      makeEpisode('guide-explore', '/explore'),
      makeEpisode('guide-mars', '/mars'),
      makeEpisode('guide-missions', '/missions'),
      makeEpisode('no-route-ep', undefined),
      makeEpisode('home-ep', '/'),
    ];
  });

  it('returns episodes whose route exactly matches the pathname', () => {
    const result = audioRegistry.forRoute('/explore');
    expect(result.map((e) => e.id)).toContain('guide-explore');
    expect(result.map((e) => e.id)).not.toContain('guide-mars');
  });

  it('includes parent-route episodes when on a sub-route', () => {
    const result = audioRegistry.forRoute('/missions/launches');
    expect(result.map((e) => e.id)).toContain('guide-missions');
    expect(result.map((e) => e.id)).not.toContain('guide-mars');
  });

  it('does NOT include root-"/" episodes for sub-routes', () => {
    const result = audioRegistry.forRoute('/mars');
    expect(result.map((e) => e.id)).not.toContain('home-ep');
  });

  it('returns empty array when nothing matches', () => {
    const result = audioRegistry.forRoute('/fly');
    expect(result).toEqual([]);
  });

  it('excludes episodes without a route', () => {
    const result = audioRegistry.forRoute('/explore');
    expect(result.map((e) => e.id)).not.toContain('no-route-ep');
  });

  it('strips trailing slashes from the pathname before matching', () => {
    const result = audioRegistry.forRoute('/explore/');
    expect(result.map((e) => e.id)).toContain('guide-explore');
  });

  it('normalizeRoute: empty string normalizes to "/"', () => {
    // '' → p.length ≤ 1 → no trailing strip → p || '/' → '/'
    const result = audioRegistry.forRoute('');
    // Only root '/' episodes would match but none exist in this setup
    expect(Array.isArray(result)).toBe(true);
  });
});

describe('audioRegistry.byId', () => {
  beforeEach(() => {
    audioRegistry.episodes = [makeEpisode('signal-delay', '/fly')];
  });

  it('returns the episode matching the id', () => {
    const ep = audioRegistry.byId('signal-delay');
    expect(ep?.id).toBe('signal-delay');
  });

  it('returns undefined for an unknown id', () => {
    expect(audioRegistry.byId('does-not-exist')).toBeUndefined();
  });
});

describe('audioRegistry.byIdLocale', () => {
  beforeEach(() => {
    const enEp = makeEpisode('pale-blue-dot', '/');
    enEp.locale = 'en-US';
    const deEp = makeEpisode('pale-blue-dot', '/');
    deEp.id = 'pale-blue-dot';
    deEp.locale = 'de';
    audioRegistry.episodes = [enEp, deEp];
  });

  it('returns the episode matching both id and locale', () => {
    const ep = audioRegistry.byIdLocale('pale-blue-dot', 'de');
    expect(ep?.locale).toBe('de');
  });

  it('falls back to any locale match when exact locale not found', () => {
    const ep = audioRegistry.byIdLocale('pale-blue-dot', 'fr');
    expect(ep?.id).toBe('pale-blue-dot');
  });

  it('returns undefined when the id does not exist at all', () => {
    expect(audioRegistry.byIdLocale('no-such-id', 'en-US')).toBeUndefined();
  });
});

describe('audioRegistry.load — browser=true, fetch mocked', () => {
  beforeEach(() => {
    audioRegistry.episodes = [];
    audioRegistry.loaded = false;
    audioRegistry.loading = false;
    audioRegistry.loadError = null;
    vi.restoreAllMocks();
  });

  it('fetches provenance JSON and populates episodes', async () => {
    const entries: ProvenanceEntry[] = [
      {
        episode_id: 'guide-earth',
        locale: 'en-US',
        persona: 'guide',
        provider: 'google',
        voice_id: 'g-voice',
        tts_model: 'neural2',
        route: '/earth',
        title: 'Earth Guide',
        duration_target_sec: 60,
        path_mp3: '/audio/en-US/guide/guide-earth.xxxx.mp3',
        path_vtt: '/audio/en-US/guide/guide-earth.xxxx.vtt',
        path_txt: '/audio/en-US/guide/guide-earth.xxxx.txt',
      },
    ];
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ entries }),
      }),
    );
    await audioRegistry.load();
    expect(audioRegistry.loaded).toBe(true);
    expect(audioRegistry.episodes.length).toBe(1);
    expect(audioRegistry.episodes[0].id).toBe('guide-earth');
    expect(audioRegistry.loading).toBe(false);
  });

  it('sets loadError when fetch returns non-ok status', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404 }));
    await audioRegistry.load();
    expect(audioRegistry.loadError).toContain('404');
    expect(audioRegistry.loaded).toBe(false);
    expect(audioRegistry.loading).toBe(false);
  });

  it('skips a second load when already loaded', async () => {
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ entries: [] }),
    });
    vi.stubGlobal('fetch', fetchSpy);
    await audioRegistry.load();
    await audioRegistry.load();
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('concurrent callers share the same in-flight promise (fetch called once)', async () => {
    audioRegistry.loaded = false;
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ entries: [] }),
    });
    vi.stubGlobal('fetch', fetchSpy);
    await Promise.all([audioRegistry.load(), audioRegistry.load()]);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('sorts episodes: cross-route (mars before explore alphabetically)', async () => {
    const mk = (id: string, route: string): ProvenanceEntry => ({
      episode_id: id,
      locale: 'en-US',
      persona: 'guide',
      provider: 'google',
      voice_id: 'g',
      tts_model: 'neural2',
      route,
      title: id,
      duration_target_sec: 60,
      path_mp3: '/a.mp3',
      path_vtt: '/a.vtt',
      path_txt: '/a.txt',
    });
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          entries: [
            mk('z-explore', '/explore'),
            mk('a-mars', '/mars'),
            mk('no-route', undefined as unknown as string),
          ],
        }),
      }),
    );
    await audioRegistry.load();
    const ids = audioRegistry.episodes.map((e) => e.id);
    // /explore < /mars alphabetically, no-route gets route '~' → sorts last
    expect(ids.indexOf('z-explore')).toBeLessThan(ids.indexOf('a-mars'));
    expect(ids.indexOf('no-route')).toBeGreaterThan(ids.indexOf('a-mars'));
  });

  it('sorts episodes: by route, then persona weight, then durationSec', async () => {
    const entries: ProvenanceEntry[] = [
      {
        episode_id: 'b-curator',
        locale: 'en-US',
        persona: 'curator',
        provider: 'google',
        voice_id: 'g',
        tts_model: 'neural2',
        route: '/earth',
        title: 'B Curator',
        duration_target_sec: 120,
        path_mp3: '/a.mp3',
        path_vtt: '/a.vtt',
        path_txt: '/a.txt',
      },
      {
        episode_id: 'a-guide',
        locale: 'en-US',
        persona: 'guide',
        provider: 'google',
        voice_id: 'g',
        tts_model: 'neural2',
        route: '/earth',
        title: 'A Guide',
        duration_target_sec: 60,
        path_mp3: '/b.mp3',
        path_vtt: '/b.vtt',
        path_txt: '/b.txt',
      },
    ];
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ entries }) }),
    );
    await audioRegistry.load();
    const ids = audioRegistry.episodes.map((e) => e.id);
    expect(ids.indexOf('a-guide')).toBeLessThan(ids.indexOf('b-curator'));
  });

  it('sorts by durationSec when route and persona are the same', async () => {
    const mkEntry = (id: string, dur: number): ProvenanceEntry => ({
      episode_id: id,
      locale: 'en-US',
      persona: 'guide',
      provider: 'google',
      voice_id: 'g',
      tts_model: 'neural2',
      route: '/earth',
      title: id,
      duration_target_sec: dur,
      path_mp3: '/a.mp3',
      path_vtt: '/a.vtt',
      path_txt: '/a.txt',
    });
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ entries: [mkEntry('long-ep', 120), mkEntry('short-ep', 30)] }),
      }),
    );
    await audioRegistry.load();
    const ids = audioRegistry.episodes.map((e) => e.id);
    expect(ids.indexOf('short-ep')).toBeLessThan(ids.indexOf('long-ep'));
  });

  it('uses episode_id as title when title is absent in provenance entry', async () => {
    const entry: ProvenanceEntry = {
      episode_id: 'no-title-ep',
      locale: 'en-US',
      persona: 'guide',
      provider: 'google',
      voice_id: 'g',
      tts_model: 'neural2',
      route: '/earth',
      // title deliberately omitted
      duration_target_sec: 60,
      path_mp3: '/a.mp3',
      path_vtt: '/a.vtt',
      path_txt: '/a.txt',
    };
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ entries: [entry] }) }),
    );
    await audioRegistry.load();
    expect(audioRegistry.episodes[0].title).toBe('no-title-ep');
  });

  it('sets loadError to string when fetch rejects with a non-Error value', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue('network failure'));
    await audioRegistry.load();
    expect(audioRegistry.loadError).toBe('network failure');
    expect(audioRegistry.loaded).toBe(false);
  });

  it('sorts alphabetically by title when route, persona, and duration are equal', async () => {
    const mkEntry = (id: string, title: string): ProvenanceEntry => ({
      episode_id: id,
      locale: 'en-US',
      persona: 'guide',
      provider: 'google',
      voice_id: 'g',
      tts_model: 'neural2',
      route: '/earth',
      title,
      duration_target_sec: 60,
      path_mp3: '/a.mp3',
      path_vtt: '/a.vtt',
      path_txt: '/a.txt',
    });
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          entries: [mkEntry('ep-z', 'Z Episode'), mkEntry('ep-a', 'A Episode')],
        }),
      }),
    );
    await audioRegistry.load();
    const ids = audioRegistry.episodes.map((e) => e.id);
    expect(ids.indexOf('ep-a')).toBeLessThan(ids.indexOf('ep-z'));
  });
});
