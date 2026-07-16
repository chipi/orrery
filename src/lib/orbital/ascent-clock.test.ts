import { describe, it, expect } from 'vitest';
import {
  advanceClock,
  cruiseDate,
  formatAscentClock,
  formatClock,
  formatCruiseClock,
  makeTimeline,
  pointToScrubber,
  scrubberToPoint,
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
    const p = advanceClock({ phase: 'ascent', ascentT: 0, cruiseMetDays: 0 }, 2, {
      ascentSpeedMult: 5,
      cruiseDaysPerSec: 1,
    }, TL);
    expect(p.phase).toBe('ascent');
    expectCloseTo(p.ascentT, 10, 1e-6, '2 s × 5');
  });

  it('crosses the seam and spends the remainder at cruise speed', () => {
    // At t=538 s, 2 ascent-seconds remain. At 5×, hitting the seam costs
    // 2/5 = 0.4 wall-seconds; the other 0.6 wall-seconds run at cruise
    // speed → 0.6 s × 10 day/s = 6 cruise-days.
    const p = advanceClock({ phase: 'ascent', ascentT: 538, cruiseMetDays: 0 }, 1, {
      ascentSpeedMult: 5,
      cruiseDaysPerSec: 10,
    }, TL);
    expect(p.phase).toBe('cruise');
    expectCloseTo(p.cruiseMetDays, 6, 1e-6, 'seam-crossing carry-over');
  });

  it('advances cruise in days-per-second and clamps at arrival', () => {
    const p = advanceClock({ phase: 'cruise', ascentT: 540, cruiseMetDays: 255 }, 1, {
      ascentSpeedMult: 1,
      cruiseDaysPerSec: 100,
    }, TL);
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
