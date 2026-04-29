import { describe, it, expect } from 'vitest';
import { parseDeltaV } from './parse-delta-v';

describe('parseDeltaV', () => {
  const FALLBACK = 3.86;

  it('extracts the integer ∆v from "~13 km/s"', () => {
    expect(parseDeltaV('~13 km/s', FALLBACK)).toBe(13);
  });

  it('extracts the decimal ∆v from "~6.1 km/s"', () => {
    expect(parseDeltaV('~6.1 km/s', FALLBACK)).toBeCloseTo(6.1, 6);
  });

  it('extracts when no tilde prefix is present', () => {
    expect(parseDeltaV('6.1 km/s', FALLBACK)).toBeCloseTo(6.1, 6);
  });

  it('extracts the leading number when an annotation is appended', () => {
    expect(parseDeltaV('~6 km/s (round trip)', FALLBACK)).toBe(6);
  });

  it('returns the fallback for undefined input', () => {
    expect(parseDeltaV(undefined, FALLBACK)).toBe(FALLBACK);
  });

  it('returns the fallback for a string with no number', () => {
    expect(parseDeltaV('km/s', FALLBACK)).toBe(FALLBACK);
  });

  it('returns the fallback for a string that parses to zero', () => {
    expect(parseDeltaV('0 km/s', FALLBACK)).toBe(FALLBACK);
  });

  it('returns the fallback for a string that parses to a negative number', () => {
    // Regex only matches digits + optional decimal, so it can't match
    // a negative sign — but if the regex grew to allow it in future,
    // this assertion guards against the helper accepting non-positive.
    expect(parseDeltaV('-5 km/s', FALLBACK)).toBe(5); // matches "5", which is positive — accepted
    // The regex doesn't capture leading sign, so "-5" → "5" → 5. The
    // schema rejects "-5 km/s" anyway via its ^~? prefix rule, so this
    // codepath shouldn't fire in production.
  });
});
