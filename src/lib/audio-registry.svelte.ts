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
import { assetOrigin } from './asset-url';
import type { Episode, EpisodeVariant, Persona, ProviderName } from './audio-state.svelte';

export interface ProvenanceEntry {
  episode_id: string;
  locale: string;
  persona: Persona;
  provider: ProviderName;
  voice_id: string;
  tts_model: string;
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
  // Shared in-flight promise so concurrent callers (AudioOverlay onMount +
  // +layout.svelte ?audio= deep-link handler) await the same fetch instead
  // of racing — the second caller previously returned early on `loading`
  // and proceeded with empty episodes[] (deep-link load silently failed).
  private inflight: Promise<void> | null = null;

  async load(): Promise<void> {
    if (this.loaded || !browser) return;
    if (this.inflight) return this.inflight;
    this.inflight = this.doLoad();
    try {
      await this.inflight;
    } finally {
      this.inflight = null;
    }
  }

  private async doLoad(): Promise<void> {
    this.loading = true;
    try {
      const res = await fetch(`${base}/data/audio/audio-provenance.json`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as { entries: ProvenanceEntry[] };
      this.episodes = collapseVariants(json.entries).sort((a, b) => {
        const ra = a.route ?? '~';
        const rb = b.route ?? '~';
        if (ra !== rb) return ra.localeCompare(rb);
        // Within the same route: Guide pieces lead (orienting),
        // Enthusiast pieces follow (technical/lateral), Curator pieces
        // last (slower deep-time anchors that work alone or as Tour
        // bookends). Within the same persona, ascending duration so
        // a curious tap surfaces the short piece first.
        const pa = PERSONA_WEIGHT[a.persona] ?? 9;
        const pb = PERSONA_WEIGHT[b.persona] ?? 9;
        if (pa !== pb) return pa - pb;
        if (a.durationSec !== b.durationSec) return a.durationSec - b.durationSec;
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
    // Exact route match OR parent-route match for sub-routes:
    // listening from /missions/launches surfaces /missions episodes too.
    // Root '/' deliberately does NOT match every sub-route — that would
    // bury the home-only Curator pieces under every page's inventory.
    return this.episodes.filter((e) => {
      if (!e.route) return false;
      if (e.route === route) return true;
      if (e.route === '/') return false;
      return route.startsWith(e.route + '/');
    });
  }

  byId(id: string): Episode | undefined {
    return this.episodes.find((e) => e.id === id);
  }

  // Locale-aware lookup used by the AudioOverlay's locale-switch effect
  // (PRD-016 US-5 / S4). When v0.8 i18n lands and the registry holds
  // multiple locales per episode_id, this picks the variant matching
  // the active page locale. Falls back to `byId` so v0.7's en-US-only
  // corpus still resolves when called.
  byIdLocale(id: string, locale: string): Episode | undefined {
    return (
      this.episodes.find((e) => e.id === id && e.locale === locale) ??
      this.episodes.find((e) => e.id === id)
    );
  }
}

// Provider preference for the default-active variant when an episode has
// multiple. ElevenLabs leads on prosody for the editorial anchor takes;
// Google is the baseline for the rest of the corpus. Exported so tests
// can pin the ordering instead of replicating it.
export const PROVIDER_PRIORITY: ProviderName[] = [
  'elevenlabs',
  'google',
  'openai',
  'azure',
  'coqui-local',
];

// Within-route persona ordering (#37 — registry sort).
const PERSONA_WEIGHT: Record<Persona, number> = {
  guide: 0,
  enthusiast: 1,
  curator: 2,
};

// Curator Full Tour sequence + per-episode stage hooks live in
// src/lib/audio-tour.ts — one declarative file for both. Re-export here
// for backwards-compatible imports; new code should import from audio-tour.
export { CURATOR_FULL_TOUR } from './audio-tour';

export function collapseVariants(entries: ProvenanceEntry[]): Episode[] {
  const byKey = new Map<string, Episode>();
  for (const e of entries) {
    const key = `${e.episode_id}|${e.locale}|${e.persona}`;
    const variant: EpisodeVariant = {
      provider: e.provider,
      voice_id: e.voice_id,
      tts_model: e.tts_model,
      // Audio is pruned from the mobile bundle and streamed (ADR-079 D1);
      // assetOrigin === base in every browser build.
      mp3: `${assetOrigin}${e.path_mp3}`,
      vtt: `${assetOrigin}${e.path_vtt}`,
      txt: `${assetOrigin}${e.path_txt}`,
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
