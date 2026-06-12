/**
 * Find which cislunar trajectory phase a given mission elapsed time
 * falls into + the [0, 1] progress fraction through that phase.
 *
 * Used by /fly's `updateAutoZoomTargets` to pick the camera framing:
 *  - 'tli_coast' / 'tei_coast' → pan target across the Earth-Moon line
 *  - 'lunar_orbit' / 'descent' / 'ascent' → closeup on Moon
 *  - 'earth_orbit' / 'earth_return' → closeup on Earth
 *
 * Lifted out of the animate-loop scope so the phase-matching is
 * unit-testable independently of the camera-target dispatch. Pure
 * computation, no closure deps.
 */

import type { CislunarPhase } from '$lib/orbital/cislunar/cislunar-geometry';

export interface ActiveCislunarPhase {
  /** The phase whose [start, end] window contains `metDays`. Falls
   *  back to the first phase when `metDays` is outside every window
   *  (caller treats this as "we're not in cislunar trajectory time
   *  yet"). */
  activePhase: CislunarPhase;
  /** [0, 1] fraction through the active phase. 0 = at start_met_days,
   *  1 = at end_met_days. Clamped within the active phase; 0 for
   *  the fallback case. */
  phaseProgress: number;
}

/**
 * Scan `phases` for the first one containing `metDays`. Returns the
 * active phase + its progress fraction. When `metDays` is outside
 * every window (typically only at sim startup before launch), falls
 * back to the first phase with progress = 0.
 */
export function findActiveCislunarPhase(
  phases: ReadonlyArray<CislunarPhase>,
  metDays: number,
): ActiveCislunarPhase | null {
  if (phases.length === 0) return null;
  let activePhase = phases[0];
  let phaseProgress = 0;
  for (const p of phases) {
    if (metDays >= p.start_met_days && metDays <= p.end_met_days) {
      activePhase = p;
      const span = p.end_met_days - p.start_met_days;
      phaseProgress = span > 0 ? (metDays - p.start_met_days) / span : 0;
      break;
    }
  }
  return { activePhase, phaseProgress };
}
