/**
 * Which sensory sub-modalities a device can actually offer (RFC-020 §7.3).
 *
 * Pure — takes primitives, returns booleans — so the whole §7.3 visibility table
 * is unit-testable without a browser or component scope. The reactive store
 * (`state.svelte.ts`) feeds it live `viewport` / reduced-motion / Capacitor values.
 *
 * The three channels:
 *  - AUDIO  — Web Audio works everywhere, so it's the one channel present on desktop.
 *  - GYRO   — needs a device that tilts (non-desktop) and motion allowed.
 *  - HAPTIC — needs a vibration path: Capacitor-native (iOS Taptic / Android) or the
 *             web Vibration API (Android web). iOS-web and desktop have neither.
 * Reduced-motion suppresses the two *motion/physical* channels; AUDIO stays.
 */

export type SensoryChannel = 'gyro' | 'audio' | 'haptic';

export interface SensoryEnv {
  /** Viewport form factor — `'desktop'` means no tilt sensor / no touch. */
  form: 'phone' | 'tablet' | 'desktop';
  /** Running inside the Capacitor native wrapper (iOS/Android app). */
  native: boolean;
  /** `prefers-reduced-motion: reduce` is set. */
  reducedMotion: boolean;
  /** The web Vibration API is present (`'vibrate' in navigator`) — Android web. */
  hasVibrate: boolean;
}

export type SensoryCapabilities = Record<SensoryChannel, boolean>;

export function capabilities(env: SensoryEnv): SensoryCapabilities {
  const onDevice = env.form !== 'desktop';
  return {
    audio: true,
    gyro: onDevice && !env.reducedMotion,
    // A desktop browser can expose `navigator.vibrate` (Chrome does) while
    // having no vibration hardware — so web vibrate only counts on a real touch
    // device. Native always has a haptics path.
    haptic: !env.reducedMotion && (env.native || (onDevice && env.hasVibrate)),
  };
}

/** True when at least one channel is offerable — i.e. show the sensory UI at all. */
export function anyCapability(caps: SensoryCapabilities): boolean {
  return caps.audio || caps.gyro || caps.haptic;
}
