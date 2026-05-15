import { describe, it, expect } from 'vitest';
import { expectCloseTo, expectInRange } from './expect-close';

/**
 * Numerical-tolerance test-helper sanity. Exercises both the happy
 * paths (existing physics tests already do) and the throw paths
 * (uncovered by the corpus before this slice). G9 of the test-coverage
 * gap-closure plan.
 */

describe('expectCloseTo', () => {
  it('passes when delta is within tolerance', () => {
    expect(() => expectCloseTo(33.4, 33.5, 0.5, 'curiosity peak speed')).not.toThrow();
    expect(() => expectCloseTo(1.0, 1.0, 0.0, 'exact match')).not.toThrow();
  });

  it('throws when delta exceeds tolerance', () => {
    expect(() => expectCloseTo(40, 33.5, 0.5, 'curiosity peak speed')).toThrow(
      /curiosity peak speed/,
    );
  });

  it('error message includes computed + golden + delta + tolerance', () => {
    try {
      expectCloseTo(10, 5, 0.5, 'test');
      throw new Error('should have thrown');
    } catch (e) {
      const msg = (e as Error).message;
      expect(msg).toContain('10.000');
      expect(msg).toContain('5.000');
      expect(msg).toContain('Δ=5.000');
      expect(msg).toContain('tolerance=0.5');
    }
  });

  it('handles negative values + symmetric tolerance', () => {
    expect(() => expectCloseTo(-5.2, -5.0, 0.5, 'neg')).not.toThrow();
    expect(() => expectCloseTo(-5.5, -5.0, 0.4, 'neg-too-far')).toThrow();
  });
});

describe('expectInRange', () => {
  it('passes for values inside the inclusive range', () => {
    expect(() => expectInRange(5, 1, 10, 'mid')).not.toThrow();
    expect(() => expectInRange(1, 1, 10, 'min boundary inclusive')).not.toThrow();
    expect(() => expectInRange(10, 1, 10, 'max boundary inclusive')).not.toThrow();
  });

  it('throws for values below min', () => {
    expect(() => expectInRange(0.5, 1, 10, 'below')).toThrow(/below/);
  });

  it('throws for values above max', () => {
    expect(() => expectInRange(11, 1, 10, 'above')).toThrow(/above/);
  });

  it('error message includes computed + bounds', () => {
    try {
      expectInRange(0, 1, 10, 'test');
      throw new Error('should have thrown');
    } catch (e) {
      const msg = (e as Error).message;
      expect(msg).toContain('0.000');
      expect(msg).toContain('[1, 10]');
    }
  });
});
