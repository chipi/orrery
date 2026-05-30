// Runtime audio state (PRD-016 M8 / ADR-057 — no localStorage; lost on reload).
// Shared Svelte 5 reactive state, consumed by AudioOverlay + Nav.

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
