// Hero sonification #2 — the /fly mission-arc velocity tone (PRD-017 promise 2).
//
// A single sustained voice whose pitch tracks the spacecraft's instantaneous
// heliocentric speed: the tone rises through the fast inner-system cruise and
// falls at aphelion / arrival. This is the clearest "change over time" the
// sensory layer offers — the whole point of sonifying (a HUD number is a value;
// a rising tone is acceleration you hear).
//
// Routed through the shared master gain, so it ducks under narration.

import { audioEngine } from '../audio-engine';

const BED_GAIN = 0.045;
const MIN_HZ = 110;
const MAX_HZ = 660;
const MAX_KMS = 60; // fast interplanetary cruise ≈ 40–50 km/s; clamp headroom

class FlyVelocitySon {
  #osc: OscillatorNode | null = null;
  #gain: GainNode | null = null;
  #running = false;

  start(): void {
    if (this.#running) return;
    const bus = audioEngine.bus();
    if (!bus) return;
    const { ctx, master } = bus;
    this.#osc = ctx.createOscillator();
    this.#osc.type = 'sine';
    this.#osc.frequency.value = MIN_HZ;
    this.#gain = ctx.createGain();
    this.#gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    this.#osc.connect(this.#gain).connect(master);
    this.#osc.start();
    this.#gain.gain.exponentialRampToValueAtTime(BED_GAIN, ctx.currentTime + 0.8);
    this.#running = true;
  }

  /** Feed the current heliocentric speed (km/s) each frame — smoothed to pitch. */
  update(kms: number): void {
    if (!this.#osc) return;
    const ctx = this.#osc.context;
    const v = Math.max(0, Math.min(MAX_KMS, kms));
    const freq = MIN_HZ + (v / MAX_KMS) * (MAX_HZ - MIN_HZ);
    // setTargetAtTime = a one-pole glide, so pitch slews rather than steps.
    this.#osc.frequency.setTargetAtTime(freq, ctx.currentTime, 0.12);
  }

  stop(): void {
    if (!this.#running) return;
    const osc = this.#osc;
    const gain = this.#gain;
    if (gain) {
      const now = gain.context.currentTime;
      gain.gain.cancelScheduledValues(now);
      gain.gain.setValueAtTime(gain.gain.value, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);
    }
    setTimeout(() => {
      try {
        osc?.stop();
        osc?.disconnect();
      } catch {
        /* already stopped */
      }
      gain?.disconnect();
    }, 400);
    this.#osc = null;
    this.#gain = null;
    this.#running = false;
  }
}

export const flyVelocitySon = new FlyVelocitySon();
