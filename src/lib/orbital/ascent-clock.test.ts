import { describe, it, expect } from 'vitest';
import {
  advanceClock,
  cruiseDate,
  defaultRegimeFor,
  formatAscentClock,
  formatClock,
  formatCruiseClock,
  formatDescentClock,
  makeTimeline,
  pointToScrubber,
  scrubberToPoint,
  ASCENT_SPEED_MULTIPLIERS,
  CRUISE_DAYS_PER_SEC,
  DESCENT_SPEED_MULTIPLIERS,
} from './ascent-clock';
import { expectCloseTo } from '../test-helpers/expect-close';

// 540 s ascent, 259-day cruise, ascent gets 15% of the bar.
const TL = makeTimeline(540, 259, 0.15);

describe('makeTimeline', () => {
  it('clamps the ascent fraction into (0.01, 0.9)', () => {
    expect(makeTimeline(540, 259, 5).ascentScrubberFraction).toBe(0.9);
    expect(makeTimeline(540, 259, -1).ascentScrubberFraction).toBe(0.01);
  });
});

describe('scrubber ↔ point mapping', () => {
  it('u=0 is liftoff', () => {
    const p = scrubberToPoint(0, TL);
    expect(p.phase).toBe('ascent');
    expect(p.ascentT).toBe(0);
  });

  it('the ascent fraction boundary is exactly the seam (end of ascent)', () => {
    const p = scrubberToPoint(0.15, TL);
    expect(p.phase).toBe('ascent');
    expectCloseTo(p.ascentT, 540, 1e-6, 'ascentT at seam');
  });

  it('just past the seam is cruise at MET 0', () => {
    const p = scrubberToPoint(0.1500001, TL);
    expect(p.phase).toBe('cruise');
    expectCloseTo(p.cruiseMetDays, 0, 1e-3, 'cruise MET at seam');
  });

  it('u=1 is arrival', () => {
    const p = scrubberToPoint(1, TL);
    expect(p.phase).toBe('cruise');
    expectCloseTo(p.cruiseMetDays, 259, 1e-6, 'cruise MET at arrival');
  });

  it('half the ascent slice ⇒ half the ascent time', () => {
    const p = scrubberToPoint(0.075, TL);
    expectCloseTo(p.ascentT, 270, 1e-6, 'ascentT at u=0.075');
  });

  it('mid-cruise maps to half the cruise days', () => {
    const p = scrubberToPoint(0.15 + 0.85 / 2, TL);
    expectCloseTo(p.cruiseMetDays, 129.5, 1e-6, 'cruise MET mid-bar');
  });

  it('round-trips through pointToScrubber', () => {
    for (const u of [0, 0.05, 0.15, 0.4, 0.9, 1]) {
      expectCloseTo(pointToScrubber(scrubberToPoint(u, TL), TL), u, 1e-9, `round-trip u=${u}`);
    }
  });

  it('clamps out-of-range scrubber input', () => {
    expect(scrubberToPoint(-1, TL).ascentT).toBe(0);
    expect(scrubberToPoint(2, TL).cruiseMetDays).toBe(259);
  });
});

describe('advanceClock', () => {
  it('advances within the ascent in real seconds × multiplier', () => {
    const p = advanceClock(
      { phase: 'ascent', ascentT: 0, cruiseMetDays: 0 },
      2,
      {
        ascentSpeedMult: 5,
        cruiseDaysPerSec: 1,
      },
      TL,
    );
    expect(p.phase).toBe('ascent');
    expectCloseTo(p.ascentT, 10, 1e-6, '2 s × 5');
  });

  it('crosses the seam and spends the remainder at cruise speed', () => {
    // At t=538 s, 2 ascent-seconds remain. At 5×, hitting the seam costs
    // 2/5 = 0.4 wall-seconds; the other 0.6 wall-seconds run at cruise
    // speed → 0.6 s × 10 day/s = 6 cruise-days.
    const p = advanceClock(
      { phase: 'ascent', ascentT: 538, cruiseMetDays: 0 },
      1,
      {
        ascentSpeedMult: 5,
        cruiseDaysPerSec: 10,
      },
      TL,
    );
    expect(p.phase).toBe('cruise');
    expectCloseTo(p.cruiseMetDays, 6, 1e-6, 'seam-crossing carry-over');
  });

  it('advances cruise in days-per-second and clamps at arrival', () => {
    const p = advanceClock(
      { phase: 'cruise', ascentT: 540, cruiseMetDays: 255 },
      1,
      {
        ascentSpeedMult: 1,
        cruiseDaysPerSec: 100,
      },
      TL,
    );
    expect(p.cruiseMetDays).toBe(259);
  });

  it('is a no-op for non-positive dt', () => {
    const start = { phase: 'ascent' as const, ascentT: 10, cruiseMetDays: 0 };
    expect(advanceClock(start, 0, { ascentSpeedMult: 5, cruiseDaysPerSec: 1 }, TL)).toBe(start);
  });
});

describe('readouts', () => {
  it('formats ascent as T+MM:SS', () => {
    expect(formatAscentClock(7)).toBe('T+00:07');
    expect(formatAscentClock(132)).toBe('T+02:12');
    expect(formatAscentClock(-8)).toBe('T-00:08');
  });

  it('formats cruise as T+NNNd', () => {
    expect(formatCruiseClock(129.7)).toBe('T+129d');
  });

  it('phase-dispatches via formatClock', () => {
    expect(formatClock({ phase: 'ascent', ascentT: 65, cruiseMetDays: 0 })).toBe('T+01:05');
    expect(formatClock({ phase: 'cruise', ascentT: 540, cruiseMetDays: 200 })).toBe('T+200d');
  });

  it('computes an absolute cruise date from the departure date', () => {
    expect(cruiseDate('2011-11-26', 253)).toBe('2012-08-05'); // Curiosity launch → landing
    expect(cruiseDate('not-a-date', 10)).toBeNull();
  });
});

describe('defaultRegimeFor', () => {
  it('picks the gentlest pill of each speed set for both phases', () => {
    for (const phase of ['ascent', 'cruise'] as const) {
      const regime = defaultRegimeFor(phase);
      expect(regime.ascentSpeedMult).toBe(ASCENT_SPEED_MULTIPLIERS[0]);
      expect(regime.cruiseDaysPerSec).toBe(CRUISE_DAYS_PER_SEC[0]);
      expect(regime.descentSpeedMult).toBe(DESCENT_SPEED_MULTIPLIERS[0]);
    }
  });
});

// ─── Descent tail (RFC-034 §9): a 3-segment ascent → cruise → descent bar ─────

// 540 s ascent (15%), 259-day cruise, 420 s EDL owning the last 10% of the bar.
const TLD = makeTimeline(540, 259, 0.15, 420, 0.1);

describe('three-segment (descent) timeline', () => {
  it('defaults to no descent tail — backward-compatible 2-segment bar', () => {
    expect(TL.descentScrubberFraction).toBe(0);
    expect(scrubberToPoint(1, TL).phase).toBe('cruise');
  });

  it('caps the descent tail so ascent + descent stay under the cruise', () => {
    expect(makeTimeline(540, 259, 0.15, 420, 0.95).descentScrubberFraction).toBeLessThanOrEqual(
      0.8,
    );
  });

  it('the cruise now ends at 1 − descentFraction, then the tail is descent', () => {
    expect(scrubberToPoint(0.9, TLD).phase).toBe('cruise'); // seam
    const d = scrubberToPoint(0.95, TLD);
    expect(d.phase).toBe('descent');
    expectCloseTo(d.descentT ?? 0, 210, 1e-6, 'mid-descent E+');
    expectCloseTo(scrubberToPoint(1, TLD).descentT ?? 0, 420, 1e-6, 'touchdown E+'); // touchdown
  });

  it('round-trips across all three segments', () => {
    for (const u of [0, 0.15, 0.5, 0.9, 0.95, 1]) {
      expectCloseTo(pointToScrubber(scrubberToPoint(u, TLD), TLD), u, 1e-9, `round-trip u=${u}`);
    }
  });

  it('advanceClock crosses the cruise → descent seam with carry-over', () => {
    // At 258 cruise-days with 1 day left, 100 day/s hits the seam in 0.01 wall-s;
    // the remaining 0.99 wall-s run at 3× descent speed → 2.97 descent-seconds.
    const p = advanceClock(
      { phase: 'cruise', ascentT: 540, cruiseMetDays: 258, descentT: 0 },
      1,
      { ascentSpeedMult: 1, cruiseDaysPerSec: 100, descentSpeedMult: 3 },
      TLD,
    );
    expect(p.phase).toBe('descent');
    expectCloseTo(p.descentT ?? 0, 2.97, 1e-6, 'cruise→descent carry-over');
  });

  it('advanceClock advances descent in real seconds × multiplier and clamps at touchdown', () => {
    const mid = advanceClock(
      { phase: 'descent', ascentT: 540, cruiseMetDays: 259, descentT: 100 },
      2,
      { ascentSpeedMult: 1, cruiseDaysPerSec: 1, descentSpeedMult: 3 },
      TLD,
    );
    expect(mid.descentT).toBe(106);
    const end = advanceClock(
      { phase: 'descent', ascentT: 540, cruiseMetDays: 259, descentT: 419 },
      5,
      { ascentSpeedMult: 1, cruiseDaysPerSec: 1, descentSpeedMult: 3 },
      TLD,
    );
    expect(end.descentT).toBe(420); // clamped at touchdown
  });

  it('formats descent as E+MM:SS and phase-dispatches', () => {
    expect(formatDescentClock(7)).toBe('E+00:07');
    expect(formatDescentClock(132)).toBe('E+02:12');
    expect(formatClock({ phase: 'descent', ascentT: 540, cruiseMetDays: 259, descentT: 65 })).toBe(
      'E+01:05',
    );
  });
});
