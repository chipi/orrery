import { describe, it, expect } from 'vitest';
import {
  selectShot,
  shotProgress,
  isCut,
  flybySlowmoSpeed,
  FLYBY_SLOWMO_MAX_DPS,
  DEFAULT_FLYBY_SCHEDULE,
} from './flyby-shot-schedule';

describe('selectShot', () => {
  it('walks establish → approach → hero → depart across the encounter', () => {
    expect(selectShot(-40)).toBe('establish');
    expect(selectShot(-10)).toBe('approach');
    expect(selectShot(-2)).toBe('approach'); // approach now runs to -1.5
    expect(selectShot(0)).toBe('hero'); // closest approach
    expect(selectShot(-1.5)).toBe('hero'); // inclusive start
    expect(selectShot(1.5)).toBe('depart'); // hero ends (exclusive) at +1.5
    expect(selectShot(10)).toBe('depart');
  });

  it('returns null outside the montage window (cruise framing)', () => {
    expect(selectShot(-100)).toBeNull();
    expect(selectShot(60)).toBeNull();
  });

  it('honours a custom schedule', () => {
    const sched = [{ kind: 'hero' as const, from: -1, to: 1 }];
    expect(selectShot(0, sched)).toBe('hero');
    expect(selectShot(-5, sched)).toBeNull();
  });
});

describe('shotProgress', () => {
  it('runs 0→1 across the active window', () => {
    expect(shotProgress(-20)).toBeCloseTo(0, 5); // approach start
    expect(shotProgress(-10.75)).toBeCloseTo(0.5, 5); // approach midpoint (-20..-1.5)
    expect(shotProgress(-60)).toBeCloseTo(0, 5); // establish start
  });
  it('is 0 outside the montage', () => {
    expect(shotProgress(999)).toBe(0);
  });
});

describe('isCut', () => {
  it('fires only on a change into a real shot', () => {
    expect(isCut('approach', 'hero')).toBe(true);
    expect(isCut('hero', 'hero')).toBe(false);
    expect(isCut('depart', null)).toBe(false); // leaving the montage isn't a cut
    expect(isCut(null, 'establish')).toBe(true);
  });
});

describe('flybySlowmoSpeed', () => {
  it('passes simSpeed through outside the close passage', () => {
    expect(flybySlowmoSpeed(-30, 30)).toBe(30);
    expect(flybySlowmoSpeed(40, 30)).toBe(30);
  });
  it('caps the rate through the close passage', () => {
    expect(flybySlowmoSpeed(6, 30)).toBeCloseTo(FLYBY_SLOWMO_MAX_DPS, 5); // mid-window
  });
  it('eases in (ramp) rather than snapping the speed', () => {
    const edge = flybySlowmoSpeed(-5, 30); // 1 day into the −6 edge
    expect(edge).toBeLessThan(30);
    expect(edge).toBeGreaterThan(FLYBY_SLOWMO_MAX_DPS);
  });
  it('never speeds the sim up when already slow', () => {
    expect(flybySlowmoSpeed(6, 2)).toBe(2); // 2 < cap → unchanged
  });
});

describe('DEFAULT_FLYBY_SCHEDULE', () => {
  it('is contiguous with no gaps or overlaps', () => {
    for (let i = 1; i < DEFAULT_FLYBY_SCHEDULE.length; i++) {
      expect(DEFAULT_FLYBY_SCHEDULE[i].from).toBe(DEFAULT_FLYBY_SCHEDULE[i - 1].to);
    }
  });
});
