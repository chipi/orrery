/**
 * Presentation helpers for the launch HUD (RFC-034 §5.1 / §11) — pure functions
 * of an AscentSummary plus the mission clock t, driving the /fly launch pre-roll
 * (LaunchScene): the countdown, beat strip, status line, and pad-clamped state.
 * No Three.js / Svelte / DOM — unit-tested like the rest of the orbital lib.
 */

import type { AscentState, AscentSummary } from '$lib/physics/ascent/ascent-physics';

/** Countdown length (s): the HUD opens at T-minus this before liftoff. */
export const T_MINUS_S = 12;
/** Engine ignition (s; negative = before liftoff) — the terminal-count boundary. */
export const IGNITION_T_S = -3;
/** Circular LEO speed (km·s⁻¹) — the dv-budget "will it make it" HUD line. */
export const ORBIT_TARGET_KMS = 7.8;

/**
 * Injection-burn beat timing (RFC-034 §3.1) — appended after SECO, before the
 * warp to cruise: a parking-orbit coast then the kick/upper-stage burn that
 * leaves parking orbit. Cinematic wall-clock, consistent with the post-SECO
 * coast (real injection burns start hours after SECO).
 */
export const INJECTION_COAST_S = 15;
export const INJECTION_BURN_S = 12;
/** The spacecraft rides the upper stage through the injection burn and separates after it,
 *  as on a real flight (Orion off the ICPS, Apollo off the S-IVB, a probe off its Centaur):
 *  this beat after the burn shows it. */
export const INJECTION_SEP_S = 8;
/** The whole post-SECO injection beat: parking coast, burn, spacecraft separation. */
export const INJECTION_BEAT_S = INJECTION_COAST_S + INJECTION_BURN_S + INJECTION_SEP_S;

/** Mission time (s) the spacecraft leaves the upper stage on a flight with an injection
 *  burn: the burn's end. `ascentDurationS` is `summary.totalDurationS`. */
export function injectionSepT(ascentDurationS: number): number {
  return ascentDurationS + INJECTION_COAST_S + INJECTION_BURN_S;
}

/**
 * When the spacecraft leaves the launcher, if not at SECO (undefined = at SECO, or no
 * injection beat). With a launcher injection it rides the stage through the burn and leaves
 * at its end; with its own kick stage (Shuttle + IUS) it is deployed midway through the
 * parking coast and the kick stage fires after.
 */
export function payloadSepTFor(
  ascentDurationS: number,
  injection: { kickStage?: boolean } | null | undefined,
): number | undefined {
  if (!injection) return undefined;
  return injection.kickStage
    ? ascentDurationS + INJECTION_COAST_S * 0.5
    : injectionSepT(ascentDurationS);
}

/**
 * The status line during the post-SECO injection beat, or null when t is before
 * the beat (the caller falls back to `ascentStatus`). `ascentDurationS` is the
 * ascent's SECO/orbit time (`summary.totalDurationS`); `burnLabel` is the
 * mission's `injectionBurnLabel(burnType)`.
 */
export function injectionPhaseStatus(
  t: number,
  ascentDurationS: number,
  burnLabel: string,
): string | null {
  if (t < ascentDurationS) return null;
  if (t < ascentDurationS + INJECTION_COAST_S) return 'PARKING ORBIT';
  if (t < injectionSepT(ascentDurationS)) return burnLabel;
  return 'SPACECRAFT SEP';
}

/** AscentEvent.type → the short HUD label shown on the timeline strip. */
export const BEAT_LABEL: Record<string, string> = {
  meco: 'MECO',
  staging: 'STAGE SEP',
  fairing_jettison: 'FAIRING',
  seco: 'SECO',
  orbit: 'ORBIT',
};

/** A labelled beat on the ascent timeline strip. */
export interface AscentBeat {
  label: string;
  t: number;
}

/**
 * The ascent timeline beats in order: Max-Q plus the labelled events within
 * (0, duration]. A MECO is dropped when a STAGE SEP sits within 2 s of it —
 * on a serial stack they read as one beat.
 */
export function buildAscentBeats(summary: AscentSummary): AscentBeat[] {
  const duration = summary.totalDurationS;
  const raw: AscentBeat[] = [
    { label: 'MAX-Q', t: summary.maxQ.t },
    ...summary.events
      .filter((e) => BEAT_LABEL[e.type])
      .map((e) => ({ label: BEAT_LABEL[e.type], t: e.t })),
  ].filter((b) => b.t > 0 && b.t <= duration);
  const hasSepNear = (t: number) =>
    raw.some((b) => b.label === 'STAGE SEP' && Math.abs(b.t - t) < 2);
  return raw.filter((b) => !(b.label === 'MECO' && hasSepNear(b.t))).sort((a, b) => a.t - b.t);
}

/**
 * The broadcast status line at mission time t (s): the countdown calls through
 * liftoff, then the most-recent passed beat label, else ASCENT.
 */
export function ascentStatus(t: number, beats: AscentBeat[], ignitionT = IGNITION_T_S): string {
  if (t <= -10) return 'GO FOR LAUNCH';
  if (t < ignitionT) return 'TERMINAL COUNT';
  if (t < 0) return 'IGNITION SEQUENCE';
  if (t < 10) return 'LIFTOFF';
  const passed = beats.filter((b) => b.t <= t);
  const last = passed[passed.length - 1];
  if (!last) return 'ASCENT';
  // An event (Max-Q, a separation, the fairing) is a moment: show it for its beat, then the
  // powered flight is ASCENT again. A state (MECO, SECO, ORBIT) stays true, so it holds.
  return STATE_LABELS.has(last.label) || t - last.t <= EVENT_LABEL_HOLD_S ? last.label : 'ASCENT';
}

/** Seconds an event label stays up after its beat. */
export const EVENT_LABEL_HOLD_S = 20;
/** Beat labels that describe a lasting state rather than a moment. */
const STATE_LABELS = new Set(['MECO', 'SECO', 'ORBIT']);

/** Whole seconds remaining in the countdown, or null once t ≥ 0. */
export function countdownSeconds(t: number): number | null {
  return t < 0 ? Math.max(0, Math.ceil(-t)) : null;
}

/**
 * The pre-liftoff pad state: the first integrated state frozen on the pad
 * (zero altitude / speed / q), engine dark until ignition at `ignitionT`.
 * Lets the scene + telemetry render the countdown from real profile data.
 */
export function padState(summary: AscentSummary, t: number, ignitionT = IGNITION_T_S): AscentState {
  const first = summary.states[0];
  return {
    ...first,
    t,
    altKm: 0,
    downrangeKm: 0,
    speedKms: 0,
    velUpKms: 0,
    qPa: 0,
    stageIndex: t < ignitionT ? -1 : 0,
    thrustN: t < ignitionT ? 0 : first.thrustN,
    dragN: 0,
  };
}
