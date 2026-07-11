// Web Audio engine for the sensory layer (PRD-017 / RFC-020 §4-5).
//
// One lazily-created AudioContext + a master GainNode. The context is only born
// on the first real sound request (which happens inside a user gesture — a cue
// click — satisfying the autoplay policy, M5). Everything routes through the
// master gain so narration ducking (M9) is a single ramp, and so the Phase-4
// hero sonifications can hang their oscillator graphs off the same bus.
//
// Off-device / SSR / no-WebAudio → every method is a silent no-op.

import { audioBus } from '../audio-bus';

export interface BlipSpec {
  /** Oscillator frequency in Hz. An array plays a chord (one oscillator each). */
  freq: number | number[];
  type?: OscillatorType;
  /** Total envelope length in seconds (default 0.12). */
  dur?: number;
  /** Peak gain of the note (default 0.14). Kept low — cues sit under narration. */
  gain?: number;
}

const DUCK_GAIN = 0.02; // ≈ −34 dB while narration plays (M9).

class AudioEngine {
  #ctx: AudioContext | null = null;
  #master: GainNode | null = null;
  #wired = false;
  /** Screen-reader-safe mute (M10): when true, tonal output is suppressed. */
  muted = false;

  /** Create/resume the context on demand. Returns null when Web Audio is absent. */
  #ensure(): { ctx: AudioContext; master: GainNode } | null {
    if (typeof window === 'undefined') return null;
    if (!this.#ctx) {
      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      try {
        this.#ctx = new Ctor();
      } catch {
        return null;
      }
      this.#master = this.#ctx.createGain();
      this.#master.gain.value = 1;
      this.#master.connect(this.#ctx.destination);
      this.#wire();
    }
    if (this.#ctx.state === 'suspended') void this.#ctx.resume();
    return this.#master ? { ctx: this.#ctx, master: this.#master } : null;
  }

  #wire(): void {
    if (this.#wired) return;
    this.#wired = true;
    // Duck under PRD-016 narration; restore when it pauses/ends.
    audioBus.on('play', () => this.#duck(true));
    audioBus.on('pause', () => this.#duck(false));
    audioBus.on('ended', () => this.#duck(false));
    // Suspend when the tab/app backgrounds; resume on return (M5).
    document.addEventListener('visibilitychange', () => {
      if (!this.#ctx) return;
      if (document.hidden) void this.#ctx.suspend();
      else void this.#ctx.resume();
    });
  }

  #duck(on: boolean): void {
    if (!this.#ctx || !this.#master) return;
    const now = this.#ctx.currentTime;
    this.#master.gain.cancelScheduledValues(now);
    this.#master.gain.setValueAtTime(this.#master.gain.value, now);
    // Fast drop (≤50ms) so narration is heard immediately; gentler restore (200ms).
    this.#master.gain.linearRampToValueAtTime(on ? DUCK_GAIN : 1, now + (on ? 0.05 : 0.2));
  }

  /** Play a short cue tone (or chord). No-op when muted or Web Audio is absent. */
  blip(spec: BlipSpec): void {
    if (this.muted) return;
    const engine = this.#ensure();
    if (!engine) return;
    const { ctx, master } = engine;
    const dur = spec.dur ?? 0.12;
    const peak = spec.gain ?? 0.14;
    const now = ctx.currentTime;
    const freqs = Array.isArray(spec.freq) ? spec.freq : [spec.freq];

    // One shared envelope for the whole cue; per-frequency oscillators feed it.
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, now);
    env.gain.exponentialRampToValueAtTime(peak, now + 0.008);
    env.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    env.connect(master);

    for (const f of freqs) {
      const osc = ctx.createOscillator();
      osc.type = spec.type ?? 'sine';
      osc.frequency.setValueAtTime(f, now);
      osc.connect(env);
      osc.start(now);
      osc.stop(now + dur + 0.02);
    }
  }

  /** For the Phase-4 hero generators: the shared context + master bus, or null. */
  bus(): { ctx: AudioContext; master: GainNode } | null {
    return this.#ensure();
  }
}

export const audioEngine = new AudioEngine();
