/**
 * Pure reveal state machine for cislunar phase markers (GH #107
 * prep for /fly commit 5).
 *
 * Each event marker on the trajectory passes through three states
 * as sim time advances:
 *
 *   ghosted   — MET hasn't been reached yet. Dot is dim, label hidden.
 *   fresh     — MET was just crossed. Dot brightens, label fades in,
 *               briefly pulses (the "discovered as we get there" moment
 *               Marko asked for). Stays in this state for
 *               `freshDurationDays` after the event.
 *   visited   — MET is well past. Dot stays bright (waypoint visited),
 *               label fades back to a subtle hover-only reveal so it
 *               doesn't clutter the scene with N labels stacked.
 *
 * Reveal progress (0..1) is exposed for the Svelte component to drive
 * CSS transitions. `reducedMotion: true` snaps to the final state
 * instantly per ADR-025 (no rAF-driven animation when the user has
 * `prefers-reduced-motion: reduce`).
 *
 * Stateless / deterministic / unit-testable. /fly calls
 * `markerStateFor(...)` per marker per frame; no internal state to
 * persist between calls.
 */

export type RevealState = 'ghosted' | 'fresh' | 'visited';

export interface RevealResult {
  state: RevealState;
  /** 0..1 — useful for CSS opacity / scale transitions. ghosted=0,
   *  fresh peaks at 1 mid-window, visited=0.4 (steady dim-bright).   */
  intensity: number;
  /** True iff the label should be shown by default (no hover needed). */
  labelVisible: boolean;
}

export interface RevealOptions {
  /** How long after the event MET the marker stays in `fresh` state. */
  freshDurationDays?: number;
  /** Steady-state intensity for visited markers (0..1). Default 0.4. */
  visitedIntensity?: number;
  /** Snap directly to terminal states without ramping. Per ADR-025. */
  reducedMotion?: boolean;
  /** Duration of the fade-in ramp at the start of `fresh` (days).
   *  After this elapses inside the fresh window, label opacity is 1. */
  freshFadeInDays?: number;
}

const DEFAULTS: Required<RevealOptions> = {
  freshDurationDays: 0.25, // ~6 hours of "just arrived" label visibility
  visitedIntensity: 0.4,
  reducedMotion: false,
  freshFadeInDays: 0.04, // ~1 hour ramp at the start of `fresh`
};

/**
 * Reveal state for one event marker at the current simulation MET.
 * `eventMet` and `currentMet` are both in mission-elapsed days
 * (relative to the mission's launch / dep_day_sim).
 */
export function markerStateFor(
  eventMet: number,
  currentMet: number,
  opts: RevealOptions = {},
): RevealResult {
  const o = { ...DEFAULTS, ...opts };
  const delta = currentMet - eventMet;

  if (delta < 0) {
    return { state: 'ghosted', intensity: 0, labelVisible: false };
  }

  if (delta >= o.freshDurationDays) {
    return { state: 'visited', intensity: o.visitedIntensity, labelVisible: false };
  }

  // In the fresh window. With reduced-motion, snap to full label
  // visible at full intensity; no ramp.
  if (o.reducedMotion) {
    return { state: 'fresh', intensity: 1, labelVisible: true };
  }

  // Smooth fade-in over freshFadeInDays, then steady at 1 until
  // the end of the fresh window.
  const intensity = Math.min(1, delta / o.freshFadeInDays);
  return { state: 'fresh', intensity, labelVisible: intensity > 0.05 };
}

/**
 * Map intensity (0..1) to a CSS opacity that keeps ghosted markers
 * subtly visible (so the user has a hint that future events exist)
 * without dominating. 0 → 0.18, 1 → 1.0.
 */
export function intensityToOpacity(intensity: number): number {
  return 0.18 + 0.82 * Math.max(0, Math.min(1, intensity));
}
