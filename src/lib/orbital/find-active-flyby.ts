/**
 * Detect which flyby (or EDL/orbit-insertion) event is "active" at the
 * current sim-day, if any. /fly enters the iconic-shot cinema when
 * `findActiveFlybyMet` returns a non-null MET; it exits when the same
 * call returns null on a subsequent frame.
 *
 * Pure form — extracted from the top of /fly's
 * `updateHelioAutoZoomTargets`.
 */

/** Approach-side window. The cinema engages 60 days BEFORE a regular
 *  flyby so the LERP has wall-clock time to converge onto the iconic
 *  composition before the closest-approach beat (at 7× sim speed, that's
 *  ~8.5 s of wall-clock convergence). Pre-polish-wave-2 used 20 d which
 *  was too tight at default sim speeds — camera arrived AT peak instead
 *  of before. */
export const FLYBY_APPROACH_DAYS = 60;

/** Depart-side window. Closes the cinema 30 days AFTER the flyby so the
 *  camera has time to retreat into cruise framing before the next
 *  sub-phase kicks in. */
export const FLYBY_DEPART_DAYS = 30;

/** Approach window for orbit-insertion events specifically (Cassini at
 *  Saturn, Voyager Jupiter SOI, etc.) — arrivals get a longer ramp
 *  than gravity-assist flybys so the camera has wall-clock time to
 *  close in from cruise distance to the iconic-photo composition. */
export const OI_APPROACH_DAYS = 40;

export interface FlightEventLite {
  met_days?: number | null;
  type?: string | null;
}

/**
 * Scan `events` for the first flyby/EDL window that contains the
 * current sim-day. Returns the matching event's `met_days`, or null
 * when no window matches.
 *
 * Events are scanned in array order; the first match wins. /fly's
 * mission JSON ships these in MET order so overlap is rare in
 * practice — if it ever happens, the chronologically-earlier event
 * wins, which matches the audience reading order.
 */
export function findActiveFlybyMet(
  events: ReadonlyArray<FlightEventLite>,
  simDay: number,
  depDay: number,
): number | null {
  for (const e of events) {
    if (e.type !== 'flyby' && e.type !== 'edl_or_oi') continue;
    if (e.met_days == null) continue;
    const flybySimDay = depDay + e.met_days;
    const delta = simDay - flybySimDay; // negative = approaching
    const approachWindow = e.type === 'edl_or_oi' ? OI_APPROACH_DAYS : FLYBY_APPROACH_DAYS;
    if (delta >= -approachWindow && delta <= FLYBY_DEPART_DAYS) {
      return e.met_days;
    }
  }
  return null;
}
