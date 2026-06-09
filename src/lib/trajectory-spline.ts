/**
 * Catmull-Rom spline sampler for multi-waypoint trajectories — used by
 * /fly to build a path that passes through every flyby planet on a
 * grand-tour mission (Cassini's VVEJGA, Voyager's planetary tour, etc.).
 *
 * Input: the labeled waypoints from `/static/data/trajectories/<id>.json`
 * (same data /explore's PATHS layer already uses).
 *
 * Output: an array of (x, y, z) heliocentric-AU positions of the requested
 * sample count, sampled at uniform MET-time intervals along a Catmull-Rom
 * spline that interpolates each waypoint.
 *
 * Date parsing handles both "YYYY-MM-DD" and "YYYY-MM" (the latter is
 * coalesced to the 15th of the month — middle-of-month assumption that
 * keeps adjacent waypoints' relative spacing reasonable for the cruise
 * segments where /explore omits the day component).
 */

export interface TrajectoryWaypoint {
  date: string;
  label?: string;
  x: number;
  /** Optional Y axis (out-of-plane). Most /explore inner-system waypoints
   *  carry y=0 (ecliptic plane); outer-system Cassini / Voyager waypoints
   *  carry small non-zero y to indicate the slight inclination climb. */
  y?: number;
  z?: number;
}

export interface SplinePoint {
  /** Heliocentric AU, ecliptic-frame X axis. */
  x: number;
  /** Heliocentric AU, ecliptic-frame Y axis (small for inner-system, climbs for outer). */
  y: number;
  /** Heliocentric AU, ecliptic-frame Z axis. */
  z: number;
  /** Mission elapsed time (days since dep_day) at which the spacecraft
   *  is at this point. Used by spacecraftPos to look up the ship's
   *  position from simDay. */
  met_days: number;
}

const MS_PER_DAY = 86_400_000;

/**
 * Parse a waypoint date to MET days relative to `depDay`. Handles
 * - `"YYYY-MM-DD"` (exact day)
 * - `"YYYY-MM"`     (assumed 15th of month)
 *
 * Returns NaN when the input is unparseable.
 */
export function parseWaypointDateToMet(dateStr: string, depDay: string): number {
  // depDay is a YYYY-MM-DD string; convert to Date.
  const dep = new Date(depDay + 'T00:00:00Z');
  if (isNaN(dep.getTime())) return NaN;
  let date: Date;
  if (/^\d{4}-\d{2}$/.test(dateStr)) {
    // "YYYY-MM" → mid-month
    date = new Date(dateStr + '-15T00:00:00Z');
  } else if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    date = new Date(dateStr + 'T00:00:00Z');
  } else {
    return NaN;
  }
  if (isNaN(date.getTime())) return NaN;
  return Math.round((date.getTime() - dep.getTime()) / MS_PER_DAY);
}

/**
 * Catmull-Rom interpolation between p1 and p2, with p0 and p3 as
 * tangent-control neighbours. Returns the position at parameter
 * `t ∈ [0, 1]`. Uses the standard centripetal form (alpha = 0.5)
 * implicitly via uniform parameterisation since our segments span
 * roughly comparable MET intervals.
 */
function catmullRom(
  p0: number,
  p1: number,
  p2: number,
  p3: number,
  t: number,
): number {
  const t2 = t * t;
  const t3 = t2 * t;
  return (
    0.5 *
    (2 * p1 +
      (-p0 + p2) * t +
      (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 +
      (-p0 + 3 * p1 - 3 * p2 + p3) * t3)
  );
}

/**
 * Build a Catmull-Rom spline through the supplied waypoints (parsed
 * to MET days). For each requested sample's met_days, find the
 * bracketing segment and interpolate along it. Sample met values are
 * spaced uniformly between `metStart` and `metEnd`.
 *
 * Phantom endpoints (p[-1] and p[N]) are extrapolated by mirroring
 * the neighbour so the spline passes through the actual first and
 * last waypoints cleanly.
 */
export function sampleSplineAcrossWaypoints(
  waypointsWithMet: Array<SplinePoint>,
  metStart: number,
  metEnd: number,
  sampleCount: number,
): SplinePoint[] {
  if (waypointsWithMet.length < 2 || sampleCount < 2) return [];
  // Sort waypoints by MET to allow bracket lookup.
  const wp = waypointsWithMet.slice().sort((a, b) => a.met_days - b.met_days);
  const N = wp.length;
  // Phantom endpoints — mirror the first/last neighbour deltas so the
  // spline tangent at the endpoint extrapolates straight. Without this
  // the spline can pull away from the first/last waypoint at t=0/1.
  const ghost = (a: SplinePoint, b: SplinePoint): SplinePoint => ({
    x: 2 * a.x - b.x,
    y: 2 * a.y - b.y,
    z: 2 * a.z - b.z,
    met_days: 2 * a.met_days - b.met_days,
  });
  const p = [ghost(wp[0], wp[1]), ...wp, ghost(wp[N - 1], wp[N - 2])];

  const out: SplinePoint[] = [];
  for (let i = 0; i < sampleCount; i++) {
    const met = metStart + ((metEnd - metStart) * i) / (sampleCount - 1);
    // Find segment such that p[seg+1].met <= met < p[seg+2].met
    // (using p indices, so the "between waypoint k and k+1" segment is
    // bracketed by p[k+1] and p[k+2]).
    let seg = 0;
    for (let k = 0; k < N - 1; k++) {
      if (met >= wp[k].met_days && met <= wp[k + 1].met_days) {
        seg = k;
        break;
      }
      if (met >= wp[N - 1].met_days) seg = N - 2;
    }
    const a = p[seg];
    const b = p[seg + 1];
    const c = p[seg + 2];
    const d = p[seg + 3];
    const span = c.met_days - b.met_days;
    const t = span > 0 ? Math.max(0, Math.min(1, (met - b.met_days) / span)) : 0;
    out.push({
      x: catmullRom(a.x, b.x, c.x, d.x, t),
      y: catmullRom(a.y, b.y, c.y, d.y, t),
      z: catmullRom(a.z, b.z, c.z, d.z, t),
      met_days: met,
    });
  }
  return out;
}

/**
 * Public top-level: take a raw trajectory.json waypoints array + the
 * mission's dep_day date string + sample count, return Vec3-with-met
 * sample points along a Catmull-Rom spline. Returns null when the
 * waypoint list can't produce a valid spline (fewer than 2 parseable
 * waypoints).
 */
export function buildSplineFromTrajectoryWaypoints(
  waypoints: TrajectoryWaypoint[],
  depDay: string,
  sampleCount: number,
): SplinePoint[] | null {
  const parsed: SplinePoint[] = [];
  for (const wp of waypoints) {
    const met = parseWaypointDateToMet(wp.date, depDay);
    if (isNaN(met)) continue;
    parsed.push({
      x: wp.x,
      y: wp.y ?? 0,
      z: wp.z ?? 0,
      met_days: met,
    });
  }
  if (parsed.length < 2) return null;
  // Sort + dedupe by MET so the spline brackets work.
  parsed.sort((a, b) => a.met_days - b.met_days);
  const metStart = parsed[0].met_days;
  const metEnd = parsed[parsed.length - 1].met_days;
  return sampleSplineAcrossWaypoints(parsed, metStart, metEnd, sampleCount);
}
