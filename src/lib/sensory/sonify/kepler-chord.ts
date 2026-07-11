// Hero sonification #1 — the /explore "Kepler chord" (PRD-017 promise 1).
//
// Each planet gets an oscillator; pitch is assigned by orbital period (inner =
// higher) from a C-major pentatonic scale. Raw angular-velocity ratios sound
// muddy on a phone speaker (the PRD's own success-criteria flagged this), so the
// pentatonic mapping keeps "the solar system has a chord" consonant by design
// while still ordering the voices by the real orbital hierarchy.
//
// A soft sustained bed (fades in/out), routed through the shared master gain so
// it ducks under narration automatically.

import { audioEngine } from '../audio-engine';

// C3 … E4, low → high.
const PENTATONIC = [130.81, 146.83, 164.81, 196.0, 220.0, 261.63, 293.66, 329.63];
const BED_GAIN = 0.05; // ambient — deliberately quiet

class KeplerChord {
  #group: GainNode | null = null;
  #oscs: OscillatorNode[] = [];
  #running = false;

  /** Start the chord from planet orbital periods (days). Inner planets sing higher. */
  start(periods: number[]): void {
    if (this.#running) return;
    const bus = audioEngine.bus();
    if (!bus) return;
    const { ctx, master } = bus;

    const ascending = [...periods].sort((a, b) => a - b);
    const n = Math.min(ascending.length, PENTATONIC.length);

    this.#group = ctx.createGain();
    this.#group.gain.setValueAtTime(0.0001, ctx.currentTime);
    this.#group.connect(master);

    for (let k = 0; k < n; k++) {
      const osc = ctx.createOscillator();
      osc.type = k % 2 === 0 ? 'sine' : 'triangle';
      osc.frequency.value = PENTATONIC[PENTATONIC.length - 1 - k]; // k=0 (innermost) → highest
      const voice = ctx.createGain();
      voice.gain.value = 1 / n; // even mix
      osc.connect(voice).connect(this.#group);
      osc.start();
      this.#oscs.push(osc);
    }
    this.#group.gain.exponentialRampToValueAtTime(BED_GAIN, ctx.currentTime + 1.5); // gentle swell
    this.#running = true;
  }

  stop(): void {
    if (!this.#running) return;
    const group = this.#group;
    const oscs = this.#oscs;
    if (group) {
      const now = group.context.currentTime;
      group.gain.cancelScheduledValues(now);
      group.gain.setValueAtTime(group.gain.value, now);
      group.gain.exponentialRampToValueAtTime(0.0001, now + 0.4);
    }
    setTimeout(() => {
      for (const o of oscs) {
        try {
          o.stop();
          o.disconnect();
        } catch {
          /* already stopped */
        }
      }
      group?.disconnect();
    }, 500);
    this.#oscs = [];
    this.#group = null;
    this.#running = false;
  }
}

export const keplerChord = new KeplerChord();
