// Runtime audio state (PRD-016 M8 / ADR-057 — no localStorage; lost on reload).
// Shared Svelte 5 reactive state, consumed by AudioOverlay + Nav.

import { audioBus } from './audio-bus';

export type Persona = 'curator' | 'guide' | 'enthusiast';

export interface Episode {
  id: string;
  title: string;
  locale: string;
  persona: Persona;
  durationSec: number;
  // Public URLs under /audio/{locale}/{persona}/{id}.{hash8}.{mp3|vtt|txt}
  mp3: string;
  vtt: string;
  txt: string;
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
}

export const audio = new AudioState();
