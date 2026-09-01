/**
 * Kernel systems — re-entry lift-vector steering (ADR-087/088). Guards the downrange integration,
 * the range-vs-bank monotonicity the range control relies on, and the bisection range solve.
 */
import { describe, it, expect } from 'vitest';
import { simulateLiftingEntry, solveEntryBankForRange } from './entry-steering';

// Apollo CM at LEO-return entry: m/(Cd·A) ≈ 5560/6, L/D 0.3, 7.82 km/s, 1.5° interface angle.
const APOLLO = {
  entryVelocityMs: 7820,
  entryAngleDeg: 1.5,
  liftToDrag: 0.3,
  ballisticCoeff: 927,
};

describe('simulateLiftingEntry downrange', () => {
  it('integrates a downrange that grows with lift-up (monotone in bank)', () => {
    const short = simulateLiftingEntry({ ...APOLLO, targetDecelG: 0, bankCommand: () => -1 });
    const long = simulateLiftingEntry({ ...APOLLO, targetDecelG: 0, bankCommand: () => 1 });
    expect(short.outcome).toBe('captured');
    expect(long.outcome).toBe('captured');
    expect(long.downrangeM).toBeGreaterThan(short.downrangeM);
  });

  it('trades range against peak-g: the short (lift-down) entry pulls higher g', () => {
    const down = simulateLiftingEntry({ ...APOLLO, targetDecelG: 0, bankCommand: () => -1 });
    const up = simulateLiftingEntry({ ...APOLLO, targetDecelG: 0, bankCommand: () => 1 });
    expect(down.peakG).toBeGreaterThan(up.peakG);
  });
});

describe('solveEntryBankForRange', () => {
  it('solves a bank that lands within a few km of a reachable target', () => {
    for (const target of [2400, 2800, 3200, 3600]) {
      const s = solveEntryBankForRange(APOLLO, target * 1000);
      expect(s.reachable).toBe(true);
      expect(Math.abs(s.landedRangeM / 1000 - target)).toBeLessThan(15);
      expect(s.bankCos).toBeGreaterThanOrEqual(-1);
      expect(s.bankCos).toBeLessThanOrEqual(1);
    }
  });

  it('flags an out-of-footprint target and clamps to the reachable edge', () => {
    const s = solveEntryBankForRange(APOLLO, 6000 * 1000);
    expect(s.reachable).toBe(false);
    expect(s.landedRangeM / 1000).toBeLessThan(6000); // clamped to full-lift-up max
    expect(s.bankCos).toBeCloseTo(1, 1); // rails to max-range bank
  });
});
