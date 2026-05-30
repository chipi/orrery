// Runtime episode registry — fetches static/data/audio/audio-provenance.json
// once on first read and exposes typed Episode[] for the AudioOverlay to
// filter (per-route vs all) and look up by id (?audio=<id> deep-link).
// Pure runtime, no localStorage (ADR-057).

import { browser } from '$app/environment';
import { base } from '$app/paths';
import type { Episode, Persona } from './audio-state.svelte';

interface ProvenanceEntry {
  episode_id: string;
  locale: string;
  persona: Persona;
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
      this.episodes = json.entries
        .map((e) => ({
          id: e.episode_id,
          title: e.title ?? e.episode_id,
          locale: e.locale,
          persona: e.persona,
          route: e.route,
          durationSec: e.duration_target_sec ?? 0,
          mp3: `${base}${e.path_mp3}`,
          vtt: `${base}${e.path_vtt}`,
          txt: `${base}${e.path_txt}`,
        }))
        // Sort: route-anchored first (alphabetical by route, then persona,
        // then title), unanchored at the bottom.
        .sort((a, b) => {
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

function normalizeRoute(pathname: string): string {
  // Strip the SvelteKit base + trailing slashes; map empty to '/'.
  let p = pathname;
  if (base && p.startsWith(base)) p = p.slice(base.length);
  if (p.length > 1) p = p.replace(/\/+$/, '');
  return p || '/';
}

export const audioRegistry = new AudioRegistry();
