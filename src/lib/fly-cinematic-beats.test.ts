/**
 * Unit tests for the cinematic-beat state machine + helpers.
 *
 * Audit recommendation 4 — the W3.1-W3.7 polish-wave-3 features had zero
 * test coverage at commit time. These tests cover the pure-function
 * predicates + the cruise-hold derivation + the flyby-MET parser, the
 * three pieces most likely to silently regress when we onboard the
 * remaining ~80 missions.
 *
 * The component-level timing assertions (sim-day freeze, opacity ramps)
 * still live in chrome-devtools verification — they need a live raf loop
 * and a real Three.js scene to mean anything. The pure-function layer
 * we test here is what makes those component checks deterministic.
 */
import { describe, it, expect } from 'vitest';
import {
  CINEMATIC_TIMINGS,
  createCinematicBeatState,
  resetCinematicBeatState,
  isPeakHolding,
  isAfterglowing,
  isCruiseHolding,
  isFinaleLocked,
  isAnyCinematicFreeze,
  easeInOutCubic,
  computeCruiseHoldTriggerSimDay,
  parseFlybyMetFromSubPhase,
} from './fly-cinematic-beats';

describe('CinematicBeatState — factory + reset', () => {
  it('createCinematicBeatState returns all zero / null defaults', () => {
    const s = createCinematicBeatState();
    expect(s.peakHoldUntil).toBe(0);
    expect(s.peakHoldArmedForFlybyMet).toBe(null);
    expect(s.afterglowUntil).toBe(0);
    expect(s.afterglowStartCamR).toBe(0);
    expect(s.finaleStartedAt).toBe(0);
    expect(s.cutStartedAt).toBe(0);
    expect(s.cruiseHoldUntil).toBe(0);
    expect(s.cruiseHoldFired).toBe(false);
    expect(s.lastSeenSimDayForCruiseHold).toBe(0);
    expect(s.arrivalSnapped).toBe(false);
    expect(s.lastSeenPhase).toBe(null);
  });

  it('resetCinematicBeatState clears all populated fields', () => {
    // Set every field to a non-default value so we know the reset is
    // touching all of them.
    const s = createCinematicBeatState();
    s.peakHoldUntil = 12345;
    s.peakHoldArmedForFlybyMet = 193;
    s.afterglowUntil = 99999;
    s.afterglowStartCamR = 13.5;
    s.afterglowTargetCamR = 60;
    s.afterglowCenterX = 12;
    s.afterglowCenterZ = -45;
    s.afterglowP = 0.85;
    s.finaleStartedAt = 5000;
    s.cutStartedAt = 100;
    s.cruiseHoldUntil = 88888;
    s.cruiseHoldFired = true;
    s.lastSeenSimDayForCruiseHold = 1500;
    s.arrivalSnapped = true;
    s.lastSeenPhase = 'arrived';

    resetCinematicBeatState(s);

    const fresh = createCinematicBeatState();
    expect(s).toEqual(fresh);
  });
});

describe('beat predicates', () => {
  const now = 10000;

  it('isPeakHolding: true only when now < peakHoldUntil', () => {
    const s = createCinematicBeatState();
    s.peakHoldUntil = now + 500;
    expect(isPeakHolding(s, now)).toBe(true);
    expect(isPeakHolding(s, now + 600)).toBe(false);
    expect(isPeakHolding(s, now + 500)).toBe(false); // edge — strict less-than
  });

  it('isAfterglowing: only after peak hold expires and before afterglowUntil', () => {
    const s = createCinematicBeatState();
    s.peakHoldUntil = now + 500;
    s.afterglowUntil = now + 5000;
    // During hold: not afterglowing
    expect(isAfterglowing(s, now)).toBe(false);
    // Right after hold ends: afterglowing
    expect(isAfterglowing(s, now + 500)).toBe(true);
    expect(isAfterglowing(s, now + 3000)).toBe(true);
    // After afterglowUntil: false
    expect(isAfterglowing(s, now + 5000)).toBe(false);
    expect(isAfterglowing(s, now + 6000)).toBe(false);
  });

  it('isCruiseHolding: true only when now < cruiseHoldUntil', () => {
    const s = createCinematicBeatState();
    s.cruiseHoldUntil = now + 2000;
    expect(isCruiseHolding(s, now)).toBe(true);
    expect(isCruiseHolding(s, now + 1999)).toBe(true);
    expect(isCruiseHolding(s, now + 2000)).toBe(false);
  });

  it('isFinaleLocked: only when finaleStartedAt > 0 and within FINALE_DURATION_MS', () => {
    const s = createCinematicBeatState();
    // finaleStartedAt === 0 is the inactive sentinel — must not fire even
    // if `now` happens to land within FINALE_DURATION_MS of zero.
    expect(isFinaleLocked(s, 100)).toBe(false);

    s.finaleStartedAt = now;
    expect(isFinaleLocked(s, now - 1)).toBe(false); // before start
    expect(isFinaleLocked(s, now)).toBe(true);
    expect(isFinaleLocked(s, now + CINEMATIC_TIMINGS.FINALE_DURATION_MS - 1)).toBe(true);
    expect(isFinaleLocked(s, now + CINEMATIC_TIMINGS.FINALE_DURATION_MS)).toBe(false);
  });

  it('isAnyCinematicFreeze: OR of all four beats', () => {
    const s = createCinematicBeatState();
    expect(isAnyCinematicFreeze(s, now)).toBe(false);

    s.peakHoldUntil = now + 100;
    expect(isAnyCinematicFreeze(s, now)).toBe(true);
    s.peakHoldUntil = 0;

    s.peakHoldUntil = 0; // hold ended
    s.afterglowUntil = now + 200;
    expect(isAnyCinematicFreeze(s, now)).toBe(true);
    s.afterglowUntil = 0;

    s.cruiseHoldUntil = now + 300;
    expect(isAnyCinematicFreeze(s, now)).toBe(true);
    s.cruiseHoldUntil = 0;

    s.finaleStartedAt = now;
    expect(isAnyCinematicFreeze(s, now)).toBe(true);
  });
});

describe('easeInOutCubic', () => {
  it('hits 0 at t=0 and 1 at t=1', () => {
    expect(easeInOutCubic(0)).toBe(0);
    expect(easeInOutCubic(1)).toBe(1);
  });

  it('is symmetric around 0.5', () => {
    expect(easeInOutCubic(0.5)).toBeCloseTo(0.5, 5);
    expect(easeInOutCubic(0.3)).toBeCloseTo(1 - easeInOutCubic(0.7), 5);
  });

  it('is monotonically increasing', () => {
    let prev = -1;
    for (let t = 0; t <= 1.0001; t += 0.05) {
      const v = easeInOutCubic(Math.min(1, t));
      expect(v).toBeGreaterThanOrEqual(prev);
      prev = v;
    }
  });
});

describe('computeCruiseHoldTriggerSimDay', () => {
  const depDay = -808; // Cassini dep_day for the canonical Cassini case

  it('returns null when events is undefined', () => {
    expect(computeCruiseHoldTriggerSimDay(undefined, depDay)).toBe(null);
  });

  it('returns null when fewer than 2 labeled events', () => {
    expect(computeCruiseHoldTriggerSimDay([], depDay)).toBe(null);
    expect(computeCruiseHoldTriggerSimDay([{ met_days: 0 }], depDay)).toBe(null);
  });

  it('returns null when no gap meets the minimum', () => {
    // Apollo-11-ish — 7-day mission with tightly-packed events
    const apollo = [{ met_days: 0 }, { met_days: 1 }, { met_days: 4 }, { met_days: 7 }];
    expect(computeCruiseHoldTriggerSimDay(apollo, depDay)).toBe(null);
  });

  it('Cassini case: longest gap is Jupiter → Saturn (1172 → 2451), midpoint = simDay 1003.5', () => {
    const cassini = [
      { met_days: 0 }, // Launch
      { met_days: 193 }, // Venus #1
      { met_days: 617 }, // Venus #2
      { met_days: 672 }, // Earth
      { met_days: 1172 }, // Jupiter
      { met_days: 2451 }, // Saturn
    ];
    // longestGap = 2451 - 1172 = 1279, longestStart = 1172
    // midpoint = -808 + 1172 + 1279/2 = -808 + 1811.5 = 1003.5
    expect(computeCruiseHoldTriggerSimDay(cassini, depDay)).toBe(1003.5);
  });

  it('drops events with null met_days', () => {
    const events = [
      { met_days: 0 },
      { met_days: null },
      { met_days: 1500 }, // 1500-day gap
    ];
    // Effective: [0, 1500], gap = 1500, midpoint = -808 + 750 = -58
    expect(computeCruiseHoldTriggerSimDay(events, depDay)).toBe(-58);
  });

  it('handles unsorted events', () => {
    const reversed = [{ met_days: 2451 }, { met_days: 1172 }, { met_days: 0 }];
    // After sort: [0, 1172, 2451]. Longest gap 1279, midpoint = -808 + 1811.5
    expect(computeCruiseHoldTriggerSimDay(reversed, depDay)).toBe(1003.5);
  });
});

describe('parseFlybyMetFromSubPhase', () => {
  it('extracts MET from canonical "flyby-N-body" strings', () => {
    expect(parseFlybyMetFromSubPhase('flyby-193-venus')).toBe(193);
    expect(parseFlybyMetFromSubPhase('flyby-2451-saturn')).toBe(2451);
    expect(parseFlybyMetFromSubPhase('flyby-0-earth')).toBe(0);
  });

  it('handles fractional + negative METs', () => {
    expect(parseFlybyMetFromSubPhase('flyby-193.5-venus')).toBe(193.5);
    expect(parseFlybyMetFromSubPhase('flyby--10-earth')).toBe(-10);
  });

  it('returns null for non-flyby sub-phases', () => {
    expect(parseFlybyMetFromSubPhase('prelaunch')).toBe(null);
    expect(parseFlybyMetFromSubPhase('cruise-out')).toBe(null);
    expect(parseFlybyMetFromSubPhase('depart')).toBe(null);
    expect(parseFlybyMetFromSubPhase('approach')).toBe(null);
    expect(parseFlybyMetFromSubPhase('arrived')).toBe(null);
  });

  it('returns null for null / undefined / empty input', () => {
    expect(parseFlybyMetFromSubPhase(null)).toBe(null);
    expect(parseFlybyMetFromSubPhase(undefined)).toBe(null);
    expect(parseFlybyMetFromSubPhase('')).toBe(null);
  });

  it('returns null for malformed flyby strings', () => {
    expect(parseFlybyMetFromSubPhase('flyby-')).toBe(null);
    expect(parseFlybyMetFromSubPhase('flyby--')).toBe(null);
    expect(parseFlybyMetFromSubPhase('flybynothing')).toBe(null);
    expect(parseFlybyMetFromSubPhase('flyby-abc-venus')).toBe(null);
  });
});
