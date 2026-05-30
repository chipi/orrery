// Runtime audio state (PRD-016 M8 / ADR-057 — no localStorage; lost on reload).
// Shared Svelte 5 reactive state, consumed by AudioOverlay + Nav.

import { audioBus } from './audio-bus';

export type Persona = 'curator' | 'guide' | 'enthusiast';
export type ProviderName = 'google' | 'elevenlabs' | 'openai' | 'azure' | 'coqui-local';

export interface EpisodeVariant {
  provider: ProviderName;
  voice_id: string;
  tts_model?: string;
  mp3: string;
  vtt: string;
  txt: string;
}

export interface Episode {
  id: string;
  title: string;
  locale: string;
  persona: Persona;
  route?: string;
  durationSec: number;
  // The active variant's URLs (mirrored from variants[activeProvider]) —
  // kept at top level so the <audio> binding stays simple.
  mp3: string;
  vtt: string;
  txt: string;
  // All available provider variants for A/B comparison.
  variants: EpisodeVariant[];
  activeProvider: ProviderName;
}

class AudioState {
  open = $state(false);
  currentEpisode = $state<Episode | null>(null);
  positionSec = $state(0);
  durationSec = $state(0);
  playing = $state(false);
  speed = $state<number>(1);
  captionsOn = $state(false);
  currentCaption = $state('');
  // Replace the Set on mutation to trigger reactivity.
  heardEpisodeIds = $state<Set<string>>(new Set());

  // Curator Full Tour (PRD-016 US-3 / RFC-019 §2). In-memory playlist;
  // AudioOverlay drives the actual episode loads since it has the registry.
  tourActive = $state(false);
  tourIndex = $state(0);
  tourSequence = $state<string[]>([]);

  toggle(): void {
    this.open = !this.open;
  }
  openOverlay(): void {
    this.open = true;
  }
  closeOverlay(): void {
    this.open = false;
  }

  loadEpisode(ep: Episode): void {
    this.currentEpisode = ep;
    this.positionSec = 0;
    this.durationSec = ep.durationSec;
    this.playing = false;
    this.currentCaption = '';
  }

  // Swap the active variant on the currently-loaded episode (A/B testing).
  // Preserves position; the <audio> element reloads + the position $effect
  // restores it on the new variant.
  switchVariant(provider: ProviderName): void {
    const ep = this.currentEpisode;
    if (!ep) return;
    const v = ep.variants.find((x) => x.provider === provider);
    if (!v) return;
    this.currentEpisode = {
      ...ep,
      mp3: v.mp3,
      vtt: v.vtt,
      txt: v.txt,
      activeProvider: provider,
    };
  }

  // Play / pause / end emit on the audio-bus (PRD-017 sensory ducking
  // listens here). Callers should use these instead of mutating
  // `playing` directly so the bus stays in sync.
  play(): void {
    if (this.playing) return;
    this.playing = true;
    audioBus.emit('play', { episode: this.currentEpisode });
  }

  pause(): void {
    if (!this.playing) return;
    this.playing = false;
    audioBus.emit('pause', { episode: this.currentEpisode });
  }

  togglePlay(): void {
    if (this.playing) this.pause();
    else this.play();
  }

  endEpisode(): void {
    const ep = this.currentEpisode;
    this.playing = false;
    if (ep) {
      this.markHeard(ep.id);
      audioBus.emit('ended', { episode: ep });
    }
  }

  markHeard(id: string): void {
    if (!this.heardEpisodeIds.has(id)) {
      this.heardEpisodeIds = new Set([...this.heardEpisodeIds, id]);
    }
  }

  isHeard(id: string): boolean {
    return this.heardEpisodeIds.has(id);
  }

  // Tour controls. Episode loading is done by AudioOverlay (it has the
  // registry); these methods just maintain the queue position.
  startTour(sequence: string[]): void {
    this.tourSequence = [...sequence];
    this.tourIndex = 0;
    this.tourActive = true;
  }

  stopTour(): void {
    this.tourActive = false;
  }

  // Returns the next episode id, or null if the tour has ended (in which
  // case the tour is auto-deactivated).
  nextTourId(): string | null {
    if (!this.tourActive) return null;
    const next = this.tourIndex + 1;
    if (next >= this.tourSequence.length) {
      this.tourActive = false;
      return null;
    }
    this.tourIndex = next;
    return this.tourSequence[next];
  }

  prevTourId(): string | null {
    if (!this.tourActive) return null;
    const prev = this.tourIndex - 1;
    if (prev < 0) return null;
    this.tourIndex = prev;
    return this.tourSequence[prev];
  }

  tourCurrentId(): string | null {
    if (!this.tourActive || this.tourSequence.length === 0) return null;
    return this.tourSequence[this.tourIndex] ?? null;
  }
}

export const audio = new AudioState();
