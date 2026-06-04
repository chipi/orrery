import { describe, expect, it } from 'vitest';
import {
  tourTotalSec,
  tourElapsedSec,
  tourRemainingSec,
  type DurationLookup,
} from './audio-tour-progress';

const fixture: Record<string, number> = {
  'pale-blue-dot': 115,
  'guide-explore': 240,
  'guide-earth': 180,
  'guide-moon': 220,
  'capability-ladder-close': 130,
};
const lookup: DurationLookup = (id) => fixture[id];

const seq = [
  'pale-blue-dot',
  'guide-explore',
  'guide-earth',
  'guide-moon',
  'capability-ladder-close',
];
const total = 115 + 240 + 180 + 220 + 130; // 885

describe('tourTotalSec', () => {
  it('sums every episode duration in the sequence', () => {
    expect(tourTotalSec(seq, lookup)).toBe(total);
  });

  it('returns 0 for an empty sequence', () => {
    expect(tourTotalSec([], lookup)).toBe(0);
  });

  it('skips ids the registry does not know', () => {
    expect(tourTotalSec(['unknown-id', 'pale-blue-dot'], lookup)).toBe(115);
  });
});

describe('tourElapsedSec', () => {
  it('returns the in-episode position when index is 0', () => {
    expect(tourElapsedSec(seq, 0, 30, lookup)).toBe(30);
  });

  it('sums prior episode durations + current position mid-tour', () => {
    // idx=2 means episodes 0 + 1 are done (115 + 240 = 355), plus 60s into episode 2.
    expect(tourElapsedSec(seq, 2, 60, lookup)).toBe(355 + 60);
  });

  it('handles the final episode at full position', () => {
    // idx=4 (last), positionSec = its duration (130). Elapsed = 115+240+180+220+130 = total.
    expect(tourElapsedSec(seq, 4, 130, lookup)).toBe(total);
  });

  it('clamps negative or NaN positionSec to 0', () => {
    expect(tourElapsedSec(seq, 0, -5, lookup)).toBe(0);
    expect(tourElapsedSec(seq, 0, Number.NaN, lookup)).toBe(0);
    expect(tourElapsedSec(seq, 0, Number.POSITIVE_INFINITY, lookup)).toBe(0);
  });

  it('clamps an out-of-range index instead of throwing', () => {
    // idx beyond sequence length: treat as last episode.
    expect(tourElapsedSec(seq, 99, 0, lookup)).toBe(115 + 240 + 180 + 220);
    expect(tourElapsedSec(seq, -3, 10, lookup)).toBe(10);
  });

  it('returns 0 for an empty sequence', () => {
    expect(tourElapsedSec([], 0, 50, lookup)).toBe(0);
  });
});

describe('tourRemainingSec', () => {
  it('is total - elapsed at the start of the tour', () => {
    expect(tourRemainingSec(seq, 0, 0, lookup)).toBe(total);
  });

  it('is 0 at natural tour end', () => {
    expect(tourRemainingSec(seq, 4, 130, lookup)).toBe(0);
  });

  it('never goes negative when elapsed exceeds total (drift guard)', () => {
    // If somehow positionSec drifts past the episode duration, clamp to 0.
    expect(tourRemainingSec(seq, 4, 9999, lookup)).toBe(0);
  });

  it('matches the documented mid-tour example (idx=2, pos=60)', () => {
    expect(tourRemainingSec(seq, 2, 60, lookup)).toBe(total - (355 + 60));
  });
});
