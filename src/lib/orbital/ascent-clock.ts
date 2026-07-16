/**
 * Multi-scale journey clock for the /fly launch act (RFC-033 §4 · epic
 * #412). The launch is ~600 s; the cruise is months. A single linear
 * clock makes the ascent invisible, so the scrubber is a PIECEWISE map:
 * the ascent act occupies a fixed fraction of the bar (seconds-dense),
 * the cruise occupies the rest (days-dense). One continuous drag from
 * pad to destination — RFC-033's core promise.
 *
 * Pure functions, no DOM: the render, the scrubber UI, and tests all
 * consume the same map.
 */

/** The two time regimes on the journey timeline. */
export type Phase = 'ascent' | 'cruise';

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
}

/** A resolved instant on the journey. */
export interface ClockPoint {
  phase: Phase;
  /** Seconds since liftoff (held at ascentDurationS through cruise). */
  ascentT: number;
  /** Days since injection (0 at the seam, through cruise). */
  cruiseMetDays: number;
}

const DEFAULT_ASCENT_FRACTION = 0.15;

/** Build a timeline, clamping the ascent fraction to a sane (0,1) range. */
export function makeTimeline(
  ascentDurationS: number,
  cruiseDurationDays: number,
  ascentScrubberFraction = DEFAULT_ASCENT_FRACTION,
): JourneyTimeline {
  return {
    ascentDurationS: Math.max(0, ascentDurationS),
    cruiseDurationDays: Math.max(0, cruiseDurationDays),
    ascentScrubberFraction: Math.min(0.9, Math.max(0.01, ascentScrubberFraction)),
  };
}

/** Map a scrubber position u∈[0,1] to a resolved journey instant. */
export function scrubberToPoint(u: number, tl: JourneyTimeline): ClockPoint {
  const c = Math.min(1, Math.max(0, u));
  const fA = tl.ascentScrubberFraction;
  if (c <= fA) {
    const f = fA > 0 ? c / fA : 1;
    return { phase: 'ascent', ascentT: f * tl.ascentDurationS, cruiseMetDays: 0 };
  }
  const f = (c - fA) / (1 - fA);
  return {
    phase: 'cruise',
    ascentT: tl.ascentDurationS,
    cruiseMetDays: f * tl.cruiseDurationDays,
  };
}

/** Inverse of {@link scrubberToPoint}: a resolved instant back to u∈[0,1]. */
export function pointToScrubber(p: ClockPoint, tl: JourneyTimeline): number {
  const fA = tl.ascentScrubberFraction;
  if (p.phase === 'ascent') {
    const f = tl.ascentDurationS > 0 ? p.ascentT / tl.ascentDurationS : 1;
    return Math.min(fA, Math.max(0, f * fA));
  }
  const f = tl.cruiseDurationDays > 0 ? p.cruiseMetDays / tl.cruiseDurationDays : 1;
  return Math.min(1, Math.max(fA, fA + f * (1 - fA)));
}

/**
 * Advance the clock by `wallDtS` wall-clock seconds under the active
 * speed regime, crossing the ascent→cruise seam if the step overruns
 * the ascent. Ascent advances in real seconds × `ascentSpeedMult`;
 * cruise advances in `cruiseDaysPerSec` days per wall-second. Any time
 * left after hitting the seam is applied at the cruise regime, so a
 * fast play-through stays continuous instead of stalling at injection.
 */
export function advanceClock(
  p: ClockPoint,
  wallDtS: number,
  regime: { ascentSpeedMult: number; cruiseDaysPerSec: number },
  tl: JourneyTimeline,
): ClockPoint {
  if (wallDtS <= 0) return p;
  if (p.phase === 'ascent') {
    const nextT = p.ascentT + wallDtS * regime.ascentSpeedMult;
    if (nextT < tl.ascentDurationS) {
      return { phase: 'ascent', ascentT: nextT, cruiseMetDays: 0 };
    }
    // Crossed the seam — spend the remainder at cruise speed.
    const overshootS = (nextT - tl.ascentDurationS) / Math.max(1e-9, regime.ascentSpeedMult);
    return {
      phase: 'cruise',
      ascentT: tl.ascentDurationS,
      cruiseMetDays: Math.min(tl.cruiseDurationDays, overshootS * regime.cruiseDaysPerSec),
    };
  }
  const nextDays = Math.min(
    tl.cruiseDurationDays,
    p.cruiseMetDays + wallDtS * regime.cruiseDaysPerSec,
  );
  return { phase: 'cruise', ascentT: tl.ascentDurationS, cruiseMetDays: nextDays };
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

/** Phase-dispatched readout: `T+MM:SS` in the ascent window, `T+NNNd` in cruise. */
export function formatClock(p: ClockPoint): string {
  return p.phase === 'ascent' ? formatAscentClock(p.ascentT) : formatCruiseClock(p.cruiseMetDays);
}

// ─── Speed regimes ──────────────────────────────────────────────────

/** Real-time-multiple speed pills for the seconds-dense ascent window. */
export const ASCENT_SPEED_MULTIPLIERS = [1, 5, 20] as const;

/** Days-per-second speed pills for the days-dense cruise (matches /explore #351). */
export const CRUISE_DAYS_PER_SEC = [1, 10, 100] as const;

/** The default speed regime for a phase — gentlest pill of each. */
export function defaultRegimeFor(phase: Phase): {
  ascentSpeedMult: number;
  cruiseDaysPerSec: number;
} {
  return phase === 'ascent'
    ? { ascentSpeedMult: ASCENT_SPEED_MULTIPLIERS[0], cruiseDaysPerSec: CRUISE_DAYS_PER_SEC[0] }
    : { ascentSpeedMult: ASCENT_SPEED_MULTIPLIERS[0], cruiseDaysPerSec: CRUISE_DAYS_PER_SEC[0] };
}
