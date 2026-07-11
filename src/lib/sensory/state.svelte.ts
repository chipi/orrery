// Sensory-layer runtime state (PRD-017 / RFC-020 §7; ADR-057 — no persistence,
// lost on reload). Shared Svelte 5 reactive state, consumed by the nav toggle,
// the settings sheet, the feedback/haptics engine, and the gyro service.
//
// Master defaults OFF (polite on shared/public devices — PRD-017 §7 decision 7).
// A channel produces output only when master is ON, the user wants it, and the
// device can offer it — see `active()`.

import { Capacitor } from '@capacitor/core';
import { viewport } from '../viewport.svelte';
import { prefersReducedMotion, onReducedMotionChange } from '../reduced-motion';
import { capabilities, type SensoryChannel, type SensoryCapabilities } from './capabilities';

const isBrowser = typeof window !== 'undefined';

class SensoryState {
  /** Master switch. Default OFF; reload resets to OFF (in-memory only). */
  on = $state(false);

  /** Per-channel desired state — independent of capability + master. */
  gyroWanted = $state(false);
  audioWanted = $state(true);
  hapticWanted = $state(false);

  /** Settings-sheet visibility. */
  settingsOpen = $state(false);

  /** First-time toggle-on hint shown yet this session (S2 / #174). */
  hintShown = $state(false);

  /** Live `prefers-reduced-motion` — seeded here, kept in sync below. */
  reducedMotion = $state(isBrowser ? prefersReducedMotion() : false);

  /** Static device facts (constant within a session). */
  readonly native = isBrowser && Capacitor.isNativePlatform();
  readonly hasVibrate = isBrowser && 'vibrate' in navigator;

  /** Which channels the device can offer right now (reactive via `viewport`). */
  capabilities: SensoryCapabilities = $derived(
    capabilities({
      form: viewport.form,
      native: this.native,
      reducedMotion: this.reducedMotion,
      hasVibrate: this.hasVibrate,
    }),
  );

  /** Is this channel producing output? master ON + wanted + capable. */
  active(ch: SensoryChannel): boolean {
    const wanted =
      ch === 'gyro' ? this.gyroWanted : ch === 'audio' ? this.audioWanted : this.hapticWanted;
    return this.on && wanted && this.capabilities[ch];
  }

  /** Any channel active — drives the nav-button "teal fill" indicator. */
  get anyActive(): boolean {
    return this.active('gyro') || this.active('audio') || this.active('haptic');
  }

  toggleMaster(): void {
    this.on = !this.on;
  }

  setChannel(ch: SensoryChannel, value: boolean): void {
    if (ch === 'gyro') this.gyroWanted = value;
    else if (ch === 'audio') this.audioWanted = value;
    else this.hapticWanted = value;
  }

  openSettings(): void {
    this.settingsOpen = true;
  }

  closeSettings(): void {
    this.settingsOpen = false;
  }

  markHintShown(): void {
    this.hintShown = true;
  }
}

export const sensory = new SensoryState();

// Keep reduced-motion live so the settings sheet hides GYRO/HAPTIC the moment the
// OS preference flips (no reload needed).
if (isBrowser) {
  onReducedMotionChange((reduced) => {
    sensory.reducedMotion = reduced;
  });
}
