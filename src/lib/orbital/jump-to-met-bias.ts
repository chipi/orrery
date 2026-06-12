/**
 * Pure helper for the /fly `jumpToMet` flyby-bias.
 *
 * Why this exists: the peakHold arming fires when `simDay ∈ [peakMet − 2 ±
 * 0.5d]`. Landing exactly on `peakMet` skips straight past the hold window,
 * so a direct timeline-button click lands at peak with no freeze. Biasing
 * the jump onto `peakMet − 2` puts the user in the centre of the arming
 * window, so the iconic composition freezes immediately.
 *
 * Extracted from /fly's inline jumpToMet so the bias is unit-testable and
 * the gate doesn't quietly disappear during a future cleanup refactor.
 *
 * See docs/reference/fly-cinematic-state-machine.md §"peakHold arming" for
 * the invariants this helper preserves.
 */

/** Days to subtract from a flyby/edl_or_oi event's MET to land in the
 *  middle of the peakHold arming window. Must match
 *  PLANET_COMPOSITION[*].iconicLeadDays' commonest value — currently 2.
 *  Setting this lower puts the camera too close to peak (ship inside
 *  planet's render volume); higher misses the ±0.5d arming window. */
export const ICONIC_LEAD_DAYS_FOR_JUMP_BIAS = 2;

export interface FlightEventLite {
  met_days?: number | null;
  type?: string | null;
}

/**
 * Returns the MET we should LAND on, given the user-requested jump target.
 * For flyby / edl_or_oi events, snaps to `metDays − 2`. For all other
 * jumps (cruise, approach, MET 0 = launch, scrubbing through cruise), the
 * target is returned unchanged. Never returns a negative value.
 *
 * The event match is loose — anything within 1 day of `metDays` counts as
 * "the same event" — so floating-point representations of MET (e.g.
 * 3.13 for Apollo 13's lunar flyby) don't fall through the gate.
 */
export function biasJumpToIconicMoment(
  metDays: number,
  events: ReadonlyArray<FlightEventLite> | null | undefined,
): number {
  if (!Number.isFinite(metDays)) return 0;
  if (metDays <= 0) return 0;
  if (!events || events.length === 0) return metDays;
  const evt = events.find(
    (e) =>
      (e.type === 'flyby' || e.type === 'edl_or_oi') &&
      Number.isFinite(e.met_days ?? null) &&
      Math.abs((e.met_days ?? 0) - metDays) < 1,
  );
  if (!evt) return metDays;
  return Math.max(0, metDays - ICONIC_LEAD_DAYS_FOR_JUMP_BIAS);
}
