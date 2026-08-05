import type { FlightTimelineEvent } from '$types/mission';

/**
 * Pure per-frame selection helpers for the /fly heliocentric HUD overlays
 * (RFC-036 WS-B/B4).
 *
 * The `onFrame` body in `src/routes/fly/+page.svelte` projects a handful of HUD
 * marker overlays each frame. The Three.js screen projection already lives in
 * extracted helpers (`helioAuToScreenPx` / `eciKmToScreenPx`); what remained inline
 * was the *selection + gating brains* — which milestones are visible this frame,
 * and how far each Flight-Director stage's leg has progressed. Those are pure
 * `(inputs) → result` functions with the trickiest branching in the block, so they
 * move here where they can be unit-tested (the frame body keeps only the projection
 * glue that assigns the result to `$state`). Byte-identical to the inline logic.
 */

/** The 3-state visibility a milestone chip renders in. */
export type MilestoneState = 'past' | 'active' | 'future';

/** A milestone the ship should render this frame, with its visibility state. */
export interface PickedMilestone {
  evt: FlightTimelineEvent;
  state: MilestoneState;
}

/** Tunables for {@link pickVisibleMilestones} — the ±day windows that bound the
 *  "active" state around the current MET. */
export interface MilestoneWindow {
  /** Days BEFORE a milestone's MET at which it starts showing as "active". */
  approachDays: number;
  /** Days AFTER a milestone's MET past which it drops from "active" to "past". */
  departDays: number;
}

/**
 * Pick the milestones to render this frame — always at most three: the most recent
 * one behind us (`past`), every one currently inside its ±window (`active`), and the
 * first one ahead (`future`). Mirrors the inline heliocentric milestone logic 1:1:
 * events are filtered to labelled+timed, sorted by MET, then classified by
 * `delta = currentMet - met_days` against the approach/depart windows. "Always show
 * where we came from + where we are + where we're going", not the whole roster
 * (which would clutter grand-tour missions).
 */
export function pickVisibleMilestones(
  events: readonly FlightTimelineEvent[],
  currentMet: number,
  window: MilestoneWindow,
): PickedMilestone[] {
  const labeled = events
    .filter((e) => e.label && e.met_days != null)
    .sort((a, b) => (a.met_days ?? 0) - (b.met_days ?? 0));
  let latestPast: FlightTimelineEvent | null = null;
  let nextFuture: FlightTimelineEvent | null = null;
  const actives: FlightTimelineEvent[] = [];
  for (const evt of labeled) {
    const delta = currentMet - (evt.met_days ?? 0);
    if (delta > window.departDays) {
      latestPast = evt; // overwrite — keep the MOST RECENT past
    } else if (delta >= -window.approachDays) {
      actives.push(evt);
    } else if (!nextFuture) {
      nextFuture = evt; // first future encountered
    }
  }
  const picked: PickedMilestone[] = [];
  if (latestPast) picked.push({ evt: latestPast, state: 'past' });
  for (const a of actives) picked.push({ evt: a, state: 'active' });
  if (nextFuture) picked.push({ evt: nextFuture, state: 'future' });
  return picked;
}

/** The phase of the spacecraft along its transfer arc — the subset the leg-progress
 *  gate reads (other phases collapse to the `default` branch). */
export type SpacecraftArcPhase = 'pre-launch' | 'outbound' | 'return' | (string & {});

/** Leg-relative progress (0 → 1 across each leg's own arc). */
export interface LegProgress {
  outboundT: number;
  returnT: number;
}

/**
 * Leg-relative progress for the Flight-Director stage reveal gate. Normalising over
 * each leg's OWN arc (rather than the whole round-trip) keeps stage thresholds
 * intuitive on both one-way and round-trip missions — an outbound-arrival threshold
 * at 0.95 fires at outbound arrival, not ~95% of the round-trip. `sc.progress` runs
 * 0→1 across the whole mission (0→0.5 outbound, 0.5→1 return), so each leg doubles
 * its half-range. Byte-identical to the inline `outboundT` / `returnT` expressions.
 */
export function fdLegProgress(phase: SpacecraftArcPhase, progress: number): LegProgress {
  const outboundT = phase === 'pre-launch' ? 0 : phase === 'outbound' ? progress * 2 : 1;
  const returnT =
    phase === 'pre-launch' || phase === 'outbound'
      ? 0
      : phase === 'return'
        ? (progress - 0.5) * 2
        : 1;
  return { outboundT, returnT };
}
