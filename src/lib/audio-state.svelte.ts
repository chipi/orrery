// Runtime audio state (PRD-016 M8 / ADR-057 — no localStorage; lost on reload).
// Shared Svelte 5 reactive state, consumed by AudioOverlay + Nav.

import { audioBus } from './audio-bus';
import {
  clearTourCookie,
  flushTourCookieWrite,
  writeTourCookie,
  writeTourCookieDebounced,
  type TourResumeState,
} from './audio-tour-cookie';

// Persona + ProviderName literal unions live in src/lib/audio-types.ts as
// the single source of truth. Re-exported here for consumer ergonomics.
export type { Persona, ProviderName } from './audio-types';
import type { Persona, ProviderName } from './audio-types';

export interface EpisodeVariant {
  provider: ProviderName;
  voice_id: string;
  // Required — every variant ships with a model id. The pipeline writes
  // provider-specific defaults from PROVIDER_MODELS when the operator
  // doesn't override (scripts/audio/tts/provider.ts). Keep this strict
  // so /credits never has to fall back to "—".
  tts_model: string;
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

  // Compact tour mode (PRD-016 §S8 / RFC-019 §11.2). Collapses the overlay
  // to a thin pill bar so the visual scene stays unobstructed during long
  // listen-throughs. Independent of `open` — the overlay can be open in
  // either expanded or compact form. Persisted via the `orrery_tour`
  // cookie alongside tour-resume state (ADR-075).
  compact = $state(false);

  toggle(): void {
    this.open = !this.open;
  }
  openOverlay(): void {
    this.open = true;
  }
  closeOverlay(): void {
    // Flush any pending tour-position write before closing so the user
    // doesn't lose the last few seconds of progress if they close mid-
    // throttle-window (ADR-075 §write triggers).
    if (this.tourActive) this.persistTourImmediate();
    this.open = false;
  }

  toggleCompact(): void {
    this.compact = !this.compact;
    // Compact flag rides on the resume cookie (ADR-075). Immediate write
    // so the user's last visual state survives a tab close — but only
    // when a tour is active, since the cookie is tour-scoped.
    if (this.tourActive) this.persistTourImmediate();
  }

  // ── Resume-cookie helpers (ADR-075) ───────────────────────────────
  // Tour-scoped writes: only meaningful while `tourActive` is true.
  // Throttled writer for steady playback (positionSec changes 60×/s);
  // immediate writer for edge transitions (advance, pause, close).
  private currentResumeState(): TourResumeState | null {
    if (!this.tourActive) return null;
    const id = this.tourCurrentId();
    if (!id) return null;
    return {
      ep: id,
      pos: Number.isFinite(this.positionSec) && this.positionSec > 0 ? this.positionSec : 0,
      idx: this.tourIndex,
      cmp: this.compact ? 1 : 0,
      // Phase 19 (#342) — persist speed + captions so resume doesn't
      // silently snap them to defaults.
      spd: this.speed,
      cc: this.captionsOn ? 1 : 0,
    };
  }

  persistTourThrottled(): void {
    const s = this.currentResumeState();
    if (s) writeTourCookieDebounced(s);
  }

  persistTourImmediate(): void {
    flushTourCookieWrite();
    const s = this.currentResumeState();
    if (s) writeTourCookie(s);
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
    // Capture exact pause point (ADR-075 §write triggers).
    if (this.tourActive) this.persistTourImmediate();
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
    this.persistTourImmediate();
  }

  // Restore a tour from a resume cookie. Sets sequence + index without
  // resetting index to 0 (which startTour would do). Caller still loads
  // the episode + seeks via the registry.
  resumeTour(sequence: string[], index: number): void {
    this.tourSequence = [...sequence];
    this.tourIndex = Math.max(0, Math.min(index, sequence.length - 1));
    this.tourActive = true;
  }

  stopTour(): void {
    this.tourActive = false;
    clearTourCookie();
  }

  // Returns the next episode id, or null if the tour has ended (in which
  // case the tour is auto-deactivated and the resume cookie is cleared).
  nextTourId(): string | null {
    if (!this.tourActive) return null;
    const next = this.tourIndex + 1;
    if (next >= this.tourSequence.length) {
      this.tourActive = false;
      clearTourCookie();
      return null;
    }
    this.tourIndex = next;
    this.persistTourImmediate();
    return this.tourSequence[next];
  }

  prevTourId(): string | null {
    if (!this.tourActive) return null;
    const prev = this.tourIndex - 1;
    if (prev < 0) return null;
    this.tourIndex = prev;
    this.persistTourImmediate();
    return this.tourSequence[prev];
  }

  tourCurrentId(): string | null {
    if (!this.tourActive || this.tourSequence.length === 0) return null;
    return this.tourSequence[this.tourIndex] ?? null;
  }

  // Move the tour pointer to a specific episode id (page-follows-user
  // navigation — #354/#358). When the listener manually navigates to a
  // page that owns a tour episode, we "fast-forward" (or rewind) the
  // tour to that episode rather than yanking them back to the old route.
  // Returns true when the id is in the active sequence and the pointer
  // moved (or already pointed there); false when the id isn't part of the
  // tour, so the caller can fall back to single-episode handling.
  jumpTourToId(id: string): boolean {
    if (!this.tourActive) return false;
    const idx = this.tourSequence.indexOf(id);
    if (idx < 0) return false;
    if (idx !== this.tourIndex) {
      this.tourIndex = idx;
      this.persistTourImmediate();
    }
    return true;
  }
}

export const audio = new AudioState();
