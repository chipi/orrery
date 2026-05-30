import { describe, it, expect } from 'vitest';
import { collapseVariants, PROVIDER_PRIORITY, type ProvenanceEntry } from './audio-registry.svelte';
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
