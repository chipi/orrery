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

const CINEMA_TYPES = new Set(['flyby', 'edl_or_oi', 'arrival']);

/**
 * The flyby/EDL event whose window contains the current sim-day. Returns
 * its `met_days`, or null when no window matches.
 *
 * Each window is clipped at the midpoint to its neighbours' peaks, by MET,
 * so two close flybys hand the shot over half-way between them instead of
 * the earlier one holding it through the later one's closest approach. On
 * the midpoint itself the earlier event wins.
 */
export function findActiveFlybyMet(
  events: ReadonlyArray<FlightEventLite>,
  simDay: number,
  depDay: number,
): number | null {
  // Cinema fires for flyby (gravity-assist), edl_or_oi (orbit
  // insertion at the mission's primary destination), and arrival
  // (Dawn's Vesta + Ceres OIs, Hayabusa2's Ryugu arrival — same
  // beat as edl_or_oi but the mission data uses the more generic
  // type). Cislunar missions also use 'arrival' but they take the
  // findActiveCislunarHero path instead; the helio flyby branch is
  // gated by !isMoonMission in /fly so there's no overlap.
  const cinema = events
    .filter((e) => e.met_days != null && CINEMA_TYPES.has(e.type ?? ''))
    .map((e) => ({ met: e.met_days as number, type: e.type }))
    .sort((a, b) => a.met - b.met);
  const met = simDay - depDay;
  for (let i = 0; i < cinema.length; i++) {
    const e = cinema[i];
    const approach =
      e.type === 'edl_or_oi' || e.type === 'arrival' ? OI_APPROACH_DAYS : FLYBY_APPROACH_DAYS;
    let from = e.met - approach;
    let to = e.met + FLYBY_DEPART_DAYS;
    if (i > 0) from = Math.max(from, (cinema[i - 1].met + e.met) / 2);
    if (i < cinema.length - 1) to = Math.min(to, (e.met + cinema[i + 1].met) / 2);
    if (met >= from && met <= to) return e.met;
  }
  return null;
}
