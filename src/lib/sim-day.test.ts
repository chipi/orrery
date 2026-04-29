import { describe, it, expect } from 'vitest';
import { dateToSimDay } from './sim-day';

describe('dateToSimDay', () => {
  it('returns 0 for the epoch (2000-01-01)', () => {
    expect(dateToSimDay('2000-01-01')).toBe(0);
  });

  it('returns 365 for 2001-01-01 (2000 was a leap year)', () => {
    expect(dateToSimDay('2001-01-01')).toBe(366);
  });

  it('handles a real Curiosity launch date (2011-11-26)', () => {
    // 2000-01-01 → 2011-11-26: 11 years + 10 months + 26 days
    // Verify approximately (4346 days is the actual count; allow ±1 for tz)
    const d = dateToSimDay('2011-11-26');
    expect(d).toBeGreaterThan(4345);
    expect(d).toBeLessThan(4348);
  });

  it('handles negative day-counts for pre-epoch dates', () => {
    // Apollo 11 launched 1969-07-16 — well before epoch.
    const d = dateToSimDay('1969-07-16');
    expect(d).toBeLessThan(0);
  });

  it('returns null for undefined input', () => {
    expect(dateToSimDay(undefined)).toBeNull();
  });

  it('returns null for unparseable strings', () => {
    expect(dateToSimDay('bad')).toBeNull();
    expect(dateToSimDay('2011/11/26')).toBeNull(); // wrong separator
    expect(dateToSimDay('2011-11')).toBeNull(); // partial
    expect(dateToSimDay('11-26-2011')).toBeNull(); // wrong order
  });

  it('round-trips through the day count: same date → same day', () => {
    expect(dateToSimDay('2024-01-19')).toBe(dateToSimDay('2024-01-19'));
  });
});
