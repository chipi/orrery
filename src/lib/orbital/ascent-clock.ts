/**
 * Multi-scale journey clock for the /fly launch act (RFC-034 §4 · epic
 * #412). The launch is ~600 s; the cruise is months. A single linear
 * clock makes the ascent invisible, so the scrubber is a PIECEWISE map:
 * the ascent act occupies a fixed fraction of the bar (seconds-dense),
 * the cruise occupies the rest (days-dense). One continuous drag from
 * pad to destination — RFC-034's core promise.
 *
 * Pure functions, no DOM: the render, the scrubber UI, and tests all
 * consume the same map.
 */

/** The time regimes on the journey timeline (RFC-034 §4 + §9). */
export type Phase = 'ascent' | 'cruise' | 'descent';

/** Journey geometry: how long each act lasts + how the bar is split. */
export interface JourneyTimeline {
  /** Ascent duration, liftoff → orbit injection / handoff (seconds). */
  ascentDurationS: number;
  /** Cruise duration, injection → arrival (days). */
  cruiseDurationDays: number;
  /**
   * Fraction of the scrubber [0,1] the ascent act occupies. The 8-min
   * ascent is a rounding error in real time, so it gets a deliberate
   * slice of the bar to stay scrubbable. Default 0.15.
   */
  ascentScrubberFraction: number;
  /** Descent duration, entry interface → touchdown (seconds). 0 = no descent. */
  descentDurationS: number;
  /** Fraction of the scrubber [0,1] the descent act (the tail) occupies. The
   *  ~7-min EDL is dense in real time, so it gets a deliberate tail slice to
   *  stay scrubbable. 0 = the mission doesn't land (orbiter). Default 0. */
  descentScrubberFraction: number;
}

/** A resolved instant on the journey. */
export interface ClockPoint {
  phase: Phase;
  /** Seconds since liftoff (held at ascentDurationS through cruise + descent). */
  ascentT: number;
  /** Days since injection (0 at the seam, held at cruiseDurationDays in descent). */
  cruiseMetDays: number;
  /** Seconds since the entry interface (0/absent through ascent + cruise). Only
   *  the 'descent' phase carries a non-zero value. */
  descentT?: number;
}

const DEFAULT_ASCENT_FRACTION = 0.15;

/** Build a timeline, clamping the act fractions to a sane range (ascent + descent < 1). */
export function makeTimeline(
  ascentDurationS: number,
  cruiseDurationDays: number,
  ascentScrubberFraction = DEFAULT_ASCENT_FRACTION,
  descentDurationS = 0,
  descentScrubberFraction = 0,
): JourneyTimeline {
  const fA = Math.min(0.9, Math.max(0.01, ascentScrubberFraction));
  // The descent tail can't overrun the cruise: cap so ascent + descent ≤ 0.95.
  const fD = descentDurationS > 0 ? Math.min(0.95 - fA, Math.max(0, descentScrubberFraction)) : 0;
  return {
    ascentDurationS: Math.max(0, ascentDurationS),
    cruiseDurationDays: Math.max(0, cruiseDurationDays),
    ascentScrubberFraction: fA,
    descentDurationS: Math.max(0, descentDurationS),
    descentScrubberFraction: Math.max(0, fD),
  };
}

/** Map a scrubber position u∈[0,1] to a resolved journey instant. */
export function scrubberToPoint(u: number, tl: JourneyTimeline): ClockPoint {
  const c = Math.min(1, Math.max(0, u));
  const fA = tl.ascentScrubberFraction;
  const fD = tl.descentScrubberFraction;
  const cruiseEnd = Math.max(fA, 1 - fD); // scrubber pos where cruise ends / descent begins
  if (c <= fA) {
    const f = fA > 0 ? c / fA : 1;
    return { phase: 'ascent', ascentT: f * tl.ascentDurationS, cruiseMetDays: 0, descentT: 0 };
  }
  if (fD <= 0 || c <= cruiseEnd) {
    const span = cruiseEnd - fA;
    const f = span > 0 ? (c - fA) / span : 1;
    return {
      phase: 'cruise',
      ascentT: tl.ascentDurationS,
      cruiseMetDays: f * tl.cruiseDurationDays,
      descentT: 0,
    };
  }
  const f = fD > 0 ? (c - cruiseEnd) / fD : 1;
  return {
    phase: 'descent',
    ascentT: tl.ascentDurationS,
    cruiseMetDays: tl.cruiseDurationDays,
    descentT: f * tl.descentDurationS,
  };
}

/** Inverse of {@link scrubberToPoint}: a resolved instant back to u∈[0,1]. */
export function pointToScrubber(p: ClockPoint, tl: JourneyTimeline): number {
  const fA = tl.ascentScrubberFraction;
  const fD = tl.descentScrubberFraction;
  const cruiseEnd = Math.max(fA, 1 - fD);
  if (p.phase === 'ascent') {
    const f = tl.ascentDurationS > 0 ? p.ascentT / tl.ascentDurationS : 1;
    return Math.min(fA, Math.max(0, f * fA));
  }
  if (p.phase === 'descent') {
    const f = tl.descentDurationS > 0 ? (p.descentT ?? 0) / tl.descentDurationS : 1;
    return Math.min(1, Math.max(cruiseEnd, cruiseEnd + f * fD));
  }
  const f = tl.cruiseDurationDays > 0 ? p.cruiseMetDays / tl.cruiseDurationDays : 1;
  return Math.min(cruiseEnd, Math.max(fA, fA + f * (cruiseEnd - fA)));
}

/** The speed regime across the three acts. `descentSpeedMult` defaults to the
 *  ascent multiplier when omitted (both are real-time multiples). */
export interface SpeedRegime {
  ascentSpeedMult: number;
  cruiseDaysPerSec: number;
  descentSpeedMult?: number;
}

/**
 * Advance the clock by `wallDtS` wall-clock seconds under the active speed
 * regime, crossing the ascent→cruise and cruise→descent seams if a step
 * overruns an act. Ascent + descent advance in real seconds × their
 * multiplier; cruise advances in `cruiseDaysPerSec` days per wall-second. Time
 * left after a seam is applied under the next act's regime, so a fast
 * play-through stays continuous instead of stalling at a boundary.
 */
export function advanceClock(
  p: ClockPoint,
  wallDtS: number,
  regime: SpeedRegime,
  tl: JourneyTimeline,
): ClockPoint {
  if (wallDtS <= 0) return p;
  const descentMult = regime.descentSpeedMult ?? regime.ascentSpeedMult;
  const hasDescent = tl.descentScrubberFraction > 0 && tl.descentDurationS > 0;

  if (p.phase === 'ascent') {
    const nextT = p.ascentT + wallDtS * regime.ascentSpeedMult;
    if (nextT < tl.ascentDurationS) {
      return { phase: 'ascent', ascentT: nextT, cruiseMetDays: 0, descentT: 0 };
    }
    // Crossed the seam — spend the remainder at cruise speed.
    const overshootS = (nextT - tl.ascentDurationS) / Math.max(1e-9, regime.ascentSpeedMult);
    return {
      phase: 'cruise',
      ascentT: tl.ascentDurationS,
      cruiseMetDays: Math.min(tl.cruiseDurationDays, overshootS * regime.cruiseDaysPerSec),
      descentT: 0,
    };
  }

  if (p.phase === 'cruise') {
    const nextDays = p.cruiseMetDays + wallDtS * regime.cruiseDaysPerSec;
    if (!hasDescent || nextDays < tl.cruiseDurationDays) {
      return {
        phase: 'cruise',
        ascentT: tl.ascentDurationS,
        cruiseMetDays: Math.min(tl.cruiseDurationDays, nextDays),
        descentT: 0,
      };
    }
    // Crossed into descent — spend the remainder at descent speed.
    const overshootS = (nextDays - tl.cruiseDurationDays) / Math.max(1e-9, regime.cruiseDaysPerSec);
    return {
      phase: 'descent',
      ascentT: tl.ascentDurationS,
      cruiseMetDays: tl.cruiseDurationDays,
      descentT: Math.min(tl.descentDurationS, overshootS * descentMult),
    };
  }

  // Descent.
  const nextT = Math.min(tl.descentDurationS, (p.descentT ?? 0) + wallDtS * descentMult);
  return {
    phase: 'descent',
    ascentT: tl.ascentDurationS,
    cruiseMetDays: tl.cruiseDurationDays,
    descentT: nextT,
  };
}

// ─── Readouts ───────────────────────────────────────────────────────

/** Format an ascent time as `T+MM:SS` (or `T-MM:SS` for a pre-liftoff hold). */
export function formatAscentClock(ascentT: number): string {
  const sign = ascentT < 0 ? '-' : '+';
  const abs = Math.abs(ascentT);
  const mm = Math.floor(abs / 60);
  const ss = Math.floor(abs % 60);
  return `T${sign}${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
}

/** Format cruise elapsed days as `T+NNNd`. */
export function formatCruiseClock(cruiseMetDays: number): string {
  return `T+${Math.floor(cruiseMetDays)}d`;
}

/**
 * Absolute calendar date (YYYY-MM-DD, UTC) at a cruise offset from a
 * departure date. Returns null for an unparseable departure date.
 */
export function cruiseDate(departureDate: string, cruiseMetDays: number): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(departureDate);
  if (!m) return null;
  const [, y, mo, d] = m;
  const base = Date.UTC(Number(y), Number(mo) - 1, Number(d));
  if (Number.isNaN(base)) return null;
  const at = new Date(base + Math.floor(cruiseMetDays) * 86_400_000);
  return at.toISOString().slice(0, 10);
}

/** Format a descent time as `E+MM:SS` (from the entry interface). */
export function formatDescentClock(descentT: number): string {
  const abs = Math.max(0, descentT);
  const mm = Math.floor(abs / 60);
  const ss = Math.floor(abs % 60);
  return `E+${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
}

/** Phase-dispatched readout: `T+MM:SS` ascent, `T+NNNd` cruise, `E+MM:SS` descent. */
export function formatClock(p: ClockPoint): string {
  if (p.phase === 'ascent') return formatAscentClock(p.ascentT);
  if (p.phase === 'descent') return formatDescentClock(p.descentT ?? 0);
  return formatCruiseClock(p.cruiseMetDays);
}

// ─── Speed regimes ──────────────────────────────────────────────────

/** Real-time-multiple speed pills for the seconds-dense ascent window. */
export const ASCENT_SPEED_MULTIPLIERS = [1, 5, 20] as const;

/** Days-per-second speed pills for the days-dense cruise (matches /explore #351). */
export const CRUISE_DAYS_PER_SEC = [1, 10, 100] as const;

/** Real-time-multiple speed pills for the seconds-dense descent (EDL) window. */
export const DESCENT_SPEED_MULTIPLIERS = [1, 3, 10] as const;

/** The default speed regime — the gentlest pill of each act. (The `phase` arg
 *  is retained for API stability; the default regime is now phase-independent.) */
export function defaultRegimeFor(_phase: Phase): SpeedRegime {
  return {
    ascentSpeedMult: ASCENT_SPEED_MULTIPLIERS[0],
    cruiseDaysPerSec: CRUISE_DAYS_PER_SEC[0],
    descentSpeedMult: DESCENT_SPEED_MULTIPLIERS[0],
  };
}
