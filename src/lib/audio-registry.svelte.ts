// Runtime episode registry — fetches static/data/audio/audio-provenance.json
// once on first read and exposes typed Episode[] for the AudioOverlay to
// filter (per-route vs all) and look up by id (?audio=<id> deep-link).
//
// Multiple provenance rows that share (episode_id, locale, persona) but
// differ in `provider` are collapsed into one logical Episode with a
// `variants` array — supports A/B testing across providers (PRD-016 / RFC-019).
// Pure runtime, no localStorage (ADR-057).

import { browser } from '$app/environment';
import { base } from '$app/paths';
import type { Episode, EpisodeVariant, Persona, ProviderName } from './audio-state.svelte';

interface ProvenanceEntry {
  episode_id: string;
  locale: string;
  persona: Persona;
  provider: ProviderName;
  voice_id: string;
  tts_model?: string;
  route?: string;
  title?: string;
  duration_target_sec?: number;
  path_mp3: string;
  path_vtt: string;
  path_txt: string;
}

class AudioRegistry {
  episodes = $state<Episode[]>([]);
  loaded = $state(false);
  loading = $state(false);
  loadError = $state<string | null>(null);

  async load(): Promise<void> {
    if (this.loaded || this.loading || !browser) return;
    this.loading = true;
    try {
      const res = await fetch(`${base}/data/audio/audio-provenance.json`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as { entries: ProvenanceEntry[] };
      this.episodes = collapseVariants(json.entries).sort((a, b) => {
        const ra = a.route ?? '~';
        const rb = b.route ?? '~';
        if (ra !== rb) return ra.localeCompare(rb);
        if (a.persona !== b.persona) return a.persona.localeCompare(b.persona);
        return a.title.localeCompare(b.title);
      });
      this.loaded = true;
    } catch (err) {
      this.loadError = err instanceof Error ? err.message : String(err);
    } finally {
      this.loading = false;
    }
  }

  forRoute(pathname: string): Episode[] {
    const route = normalizeRoute(pathname);
    return this.episodes.filter((e) => e.route === route);
  }

  byId(id: string): Episode | undefined {
    return this.episodes.find((e) => e.id === id);
  }
}

// Provider preference for the default-active variant when an episode has
// multiple. ElevenLabs leads on prosody for the editorial anchor takes;
// Google is the baseline for the rest of the corpus.
const PROVIDER_PRIORITY: ProviderName[] = [
  'elevenlabs',
  'google',
  'openai',
  'azure',
  'coqui-local',
];

// Curator Full Tour — hand-curated documentary order (PRD-016 US-3 /
// RFC-019 §2). 21 episodes, ~70 min listen-through. Opens with the
// Curator pale-blue-dot, walks Earth → Moon → ISS/Tiangong → Missions →
// Mars → Fly/Plan → Fleet → Science → close with capability-ladder.
// Atmospheric Moves anchored to a route are interleaved after that route's
// Guide screen episode. Curator deep-time pieces (moon-one-lifetime,
// mars-what-for) sit after the Guide screen for their route, before that
// route's Enthusiast anchors.
export const CURATOR_FULL_TOUR: string[] = [
  'pale-blue-dot',
  'guide-explore',
  'guide-earth',
  'guide-moon',
  'moon-one-lifetime',
  'cernan-last-words',
  'far-side',
  'guide-iss',
  'guide-tiangong',
  'guide-missions',
  'guide-mars',
  'mars-what-for',
  'signal-delay',
  'one-way-light-time',
  'curiosity-persistence',
  'guide-fly',
  'guide-plan',
  'porkchop',
  'guide-fleet',
  'guide-science',
  'capability-ladder-close',
];

function collapseVariants(entries: ProvenanceEntry[]): Episode[] {
  const byKey = new Map<string, Episode>();
  for (const e of entries) {
    const key = `${e.episode_id}|${e.locale}|${e.persona}`;
    const variant: EpisodeVariant = {
      provider: e.provider,
      voice_id: e.voice_id,
      tts_model: e.tts_model,
      mp3: `${base}${e.path_mp3}`,
      vtt: `${base}${e.path_vtt}`,
      txt: `${base}${e.path_txt}`,
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
        durationSec: e.duration_target_sec ?? 0,
        mp3: variant.mp3,
        vtt: variant.vtt,
        txt: variant.txt,
        variants: [variant],
        activeProvider: variant.provider,
      });
    }
  }
  // Pick a stable default variant by provider priority + sync top-level URLs.
  for (const ep of byKey.values()) {
    ep.variants.sort(
      (a, b) => PROVIDER_PRIORITY.indexOf(a.provider) - PROVIDER_PRIORITY.indexOf(b.provider),
    );
    const active = ep.variants[0];
    ep.mp3 = active.mp3;
    ep.vtt = active.vtt;
    ep.txt = active.txt;
    ep.activeProvider = active.provider;
  }
  return [...byKey.values()];
}

function normalizeRoute(pathname: string): string {
  let p = pathname;
  if (base && p.startsWith(base)) p = p.slice(base.length);
  if (p.length > 1) p = p.replace(/\/+$/, '');
  return p || '/';
}

export const audioRegistry = new AudioRegistry();
