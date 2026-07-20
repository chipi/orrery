/**
 * Descent timeline warp (RFC-034 §13).
 *
 * The 1-DOF entry model runs unphysically long, so a *linear* descent timeline
 * crushes the terminal EDL — parachute, heat-shield jettison, backshell /
 * skycrane, touchdown (the "seven minutes of terror" money shots) — into an
 * unreachable sliver at the very end. We warp the SAMPLE time so ballistic
 * entry owns the first `entryFrac` of the scrubber and the terminal EDL owns
 * the rest.
 *
 * `warpDescentTime` and `unwarpDescentTime` are exact inverses — a piecewise-
 * linear map with the knee at (`entryFrac·duration` scrubber → `terminalStartT`
 * trajectory). Pure functions so both the scene (which renders the warped
 * time) and the /fly play-clock (which must find where a sep event lands in
 * *raw* scrubber time) can share one source of truth.
 */

/** Ballistic entry's share of the descent scrubber band. */
export const ENTRY_TIMELINE_FRAC = 0.45;

/**
 * The trajectory time at which the entry ends (first non-`ballistic_entry`
 * state — chute deploy / first terminal phase). Falls back to 0.9·duration
 * when every state is still ballistic (no terminal beats authored).
 */
export function terminalStartTime(
  states: { t: number; phaseKind: string }[],
  duration: number,
): number {
  const s = states.find((st) => st.phaseKind !== 'ballistic_entry');
  return s ? s.t : duration * 0.9;
}

/** Scrubber time (raw, linear) → trajectory sample time (warped). */
export function warpDescentTime(
  rawT: number,
  duration: number,
  terminalStartT: number,
  entryFrac = ENTRY_TIMELINE_FRAC,
): number {
  if (duration <= 0) return rawT;
  const f = Math.max(0, Math.min(1, rawT / duration));
  const tB = terminalStartT;
  if (f <= entryFrac) return (f / entryFrac) * tB;
  return tB + ((f - entryFrac) / (1 - entryFrac)) * (duration - tB);
}

/** Inverse of {@link warpDescentTime}: trajectory time → raw scrubber time. */
export function unwarpDescentTime(
  trajT: number,
  duration: number,
  terminalStartT: number,
  entryFrac = ENTRY_TIMELINE_FRAC,
): number {
  if (duration <= 0) return trajT;
  const tB = terminalStartT;
  if (trajT <= tB) return (tB > 0 ? trajT / tB : 0) * entryFrac * duration;
  return (entryFrac + ((trajT - tB) / (duration - tB)) * (1 - entryFrac)) * duration;
}
