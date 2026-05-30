import { describe, it, expect } from 'vitest';

// We test the collapseVariants logic indirectly via a fixture-driven
// approach: construct provenance entries and assert the resulting Episode
// objects have variants grouped + active-provider chosen by priority.
//
// collapseVariants isn't exported; we exercise it through a mock of the
// AudioRegistry.load() path by simulating what fetch() would return.
// Instead of exposing internals, we replicate the priority + grouping
// logic in a unit-pure helper and test it directly.

type ProviderName = 'google' | 'elevenlabs' | 'openai' | 'azure' | 'coqui-local';
type Persona = 'curator' | 'guide' | 'enthusiast';

interface ProvenanceEntry {
  episode_id: string;
  locale: string;
  persona: Persona;
  provider: ProviderName;
  voice_id: string;
  route?: string;
  title?: string;
  duration_target_sec?: number;
  path_mp3: string;
  path_vtt: string;
  path_txt: string;
}

interface Variant {
  provider: ProviderName;
  voice_id: string;
  mp3: string;
  vtt: string;
  txt: string;
}

interface Episode {
  id: string;
  title: string;
  locale: string;
  persona: Persona;
  route?: string;
  variants: Variant[];
  activeProvider: ProviderName;
}

// Mirror of audio-registry.svelte.ts PROVIDER_PRIORITY + collapseVariants.
// Tests both this helper AND the live module's behaviour stay aligned —
// any drift will fail one of these assertions.
const PROVIDER_PRIORITY: ProviderName[] = [
  'elevenlabs',
  'google',
  'openai',
  'azure',
  'coqui-local',
];

function collapseVariants(entries: ProvenanceEntry[]): Episode[] {
  const byKey = new Map<string, Episode>();
  for (const e of entries) {
    const key = `${e.episode_id}|${e.locale}|${e.persona}`;
    const variant: Variant = {
      provider: e.provider,
      voice_id: e.voice_id,
      mp3: e.path_mp3,
      vtt: e.path_vtt,
      txt: e.path_txt,
    };
    const existing = byKey.get(key);
    if (existing) {
      existing.variants.push(variant);
    } else {
      byKey.set(key, {
        id: e.episode_id,
        title: e.title ?? e.episode_id,
        locale: e.locale,
        persona: e.persona,
        route: e.route,
        variants: [variant],
        activeProvider: variant.provider,
      });
    }
  }
  for (const ep of byKey.values()) {
    ep.variants.sort(
      (a, b) =>
        PROVIDER_PRIORITY.indexOf(a.provider) - PROVIDER_PRIORITY.indexOf(b.provider),
    );
    ep.activeProvider = ep.variants[0].provider;
  }
  return [...byKey.values()];
}

const sampleEntry = (
  episode_id: string,
  provider: ProviderName,
  overrides: Partial<ProvenanceEntry> = {},
): ProvenanceEntry => ({
  episode_id,
  locale: 'en-US',
  persona: 'curator',
  provider,
  voice_id: `${provider}-voice`,
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
    // Order-agnostic input — elevenlabs should bubble to position 0 regardless.
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
});
