/**
 * Per-frame cinematic dispatcher contract tests.
 *
 * Pins the dispatch order + side effects of `runCinematicFrame` so
 * future refactors can't silently re-order or drop a step. The five
 * scenes below mirror the dispatch responsibilities documented in
 * the helper header (cruise-hold arming, cut overlay, peak-hold arm,
 * finale opacities, freeze flag).
 *
 * `src/routes/fly/+page.svelte` is the prod consumer; the harness
 * (#325) is the test consumer. Both call this same helper.
 */
import { describe, expect, it } from 'vitest';
import {
  CINEMATIC_TIMINGS,
  createCinematicBeatState,
  type CinematicBeatState,
} from './fly-cinematic-beats';
import {
  runCinematicFrame,
  type RunCinematicFrameInputs,
} from './fly-cinematic-frame';

const BASE_INPUTS: RunCinematicFrameInputs = {
  simDay: 100,
  depDay: 0,
  reducedMotion: false,
  isDrag: false,
  isMoonMission: false,
  currentFrameFlybyMet: null,
  isEarthFlyby: false,
  cruiseHoldTriggerSimDay: null,
  flybyPeakDays: 4,
};

describe('runCinematicFrame — cruise-hold arming (W3.7)', () => {
  it('arms cruiseHoldUntil + cruiseHoldFired when sim crosses the trigger', () => {
    const cine = createCinematicBeatState();
    cine.lastSeenSimDayForCruiseHold = 199; // approaching trigger
    const out = runCinematicFrame(
      cine,
      { ...BASE_INPUTS, simDay: 200, cruiseHoldTriggerSimDay: 200 },
      1_000,
    );
    expect(out.cruiseHoldArmedThisFrame).toBe(true);
    expect(cine.cruiseHoldUntil).toBe(1_000 + CINEMATIC_TIMINGS.CRUISE_HOLD_DURATION_MS);
    expect(cine.cruiseHoldFired).toBe(true);
    expect(out.isCinematicFreeze).toBe(true);
  });

  it('suppresses arming under reducedMotion but still bumps lastSeenSimDay', () => {
    const cine = createCinematicBeatState();
    cine.lastSeenSimDayForCruiseHold = 199;
    const out = runCinematicFrame(
      cine,
      { ...BASE_INPUTS, simDay: 200, cruiseHoldTriggerSimDay: 200, reducedMotion: true },
      1_000,
    );
    expect(out.cruiseHoldArmedThisFrame).toBe(false);
    expect(cine.cruiseHoldUntil).toBe(0);
    expect(cine.cruiseHoldFired).toBe(false);
    expect(cine.lastSeenSimDayForCruiseHold).toBe(200);
  });
});

describe('runCinematicFrame — cut overlay (W3.6)', () => {
  it('reports midway opacity and leaves cutStartedAt set while ramp is running', () => {
    const cine = createCinematicBeatState();
    cine.cutStartedAt = 1_000;
    const halfRamp = CINEMATIC_TIMINGS.CUT_FADE_RAMP_MS / 2;
    const out = runCinematicFrame(cine, BASE_INPUTS, 1_000 + halfRamp);
    expect(out.cutBlackOpacity).toBeCloseTo(0.5, 5);
    expect(cine.cutStartedAt).toBe(1_000);
  });

  it('clears cutStartedAt to 0 once the cut animation completes', () => {
    const cine = createCinematicBeatState();
    cine.cutStartedAt = 1_000;
    const out = runCinematicFrame(
      cine,
      BASE_INPUTS,
      1_000 + 2 * CINEMATIC_TIMINGS.CUT_FADE_RAMP_MS,
    );
    expect(out.cutBlackOpacity).toBe(0);
    expect(cine.cutStartedAt).toBe(0);
  });
});

describe('runCinematicFrame — peak-hold arm step (W3.1 + W3.2 window)', () => {
  it('arms peakHoldUntil + afterglowUntil inside the iconic window', () => {
    const cine = createCinematicBeatState();
    // Iconic moment = depDay + flybyMet - 2 (ICONIC_LEAD_DAYS default).
    // simDay = 191 puts us exactly on the iconic peak for flybyMet=193.
    const out = runCinematicFrame(
      cine,
      {
        ...BASE_INPUTS,
        simDay: 191,
        depDay: 0,
        currentFrameFlybyMet: 193,
      },
      1_000,
    );
    expect(out.peakHoldArmedThisFrame).toBe(true);
    expect(cine.peakHoldUntil).toBe(1_000 + CINEMATIC_TIMINGS.PEAK_HOLD_DURATION_MS);
    expect(cine.peakHoldArmedForFlybyMet).toBe(193);
    expect(cine.afterglowUntil).toBe(
      1_000 + CINEMATIC_TIMINGS.PEAK_HOLD_DURATION_MS + CINEMATIC_TIMINGS.AFTERGLOW_DURATION_MS,
    );
    expect(cine.afterglowStartCamR).toBe(0); // cleared on arm
    expect(out.isCinematicFreeze).toBe(true);
  });

  it('does NOT arm under reducedMotion / isDrag / isMoonMission', () => {
    const baseArm = {
      ...BASE_INPUTS,
      simDay: 191,
      depDay: 0,
      currentFrameFlybyMet: 193,
    };
    for (const gate of ['reducedMotion', 'isDrag', 'isMoonMission'] as const) {
      const cine = createCinematicBeatState();
      const out = runCinematicFrame(cine, { ...baseArm, [gate]: true }, 1_000);
      expect(out.peakHoldArmedThisFrame, `gate=${gate}`).toBe(false);
      expect(cine.peakHoldUntil, `gate=${gate}`).toBe(0);
    }
  });
});

describe('runCinematicFrame — finale opacities (W3.4)', () => {
  // 0 is the not-armed sentinel; pick any positive timestamp + offset
  // `now` from there so `now - finaleStartedAt` matches the t=0…13 s window.
  const ARM_AT = 10_000;
  function armedCine(): CinematicBeatState {
    const cine = createCinematicBeatState();
    cine.finaleStartedAt = ARM_AT;
    return cine;
  }

  it('reports caption=0, black=0 in the silent hold (t < 8 s)', () => {
    const out = runCinematicFrame(armedCine(), BASE_INPUTS, ARM_AT + 5_000);
    expect(out.finaleCaptionOpacity).toBe(0);
    expect(out.finaleBlackOpacity).toBe(0);
    expect(out.finaleSettled).toBe(false);
  });

  it('reports caption ramping 0→1 between t=8s and t=9s', () => {
    const halfway = ARM_AT + CINEMATIC_TIMINGS.FINALE_CAPTION_FADE_IN_AT_MS + 500;
    const out = runCinematicFrame(armedCine(), BASE_INPUTS, halfway);
    expect(out.finaleCaptionOpacity).toBeCloseTo(0.5, 5);
    expect(out.finaleBlackOpacity).toBe(0);
  });

  it('reports both opacities at 1 by t=12s', () => {
    const out = runCinematicFrame(armedCine(), BASE_INPUTS, ARM_AT + 12_000);
    expect(out.finaleCaptionOpacity).toBe(1);
    expect(out.finaleBlackOpacity).toBe(1);
  });

  it('flips finaleSettled true once 12s + 1s settle has elapsed', () => {
    const out = runCinematicFrame(
      armedCine(),
      BASE_INPUTS,
      ARM_AT + CINEMATIC_TIMINGS.FINALE_DURATION_MS + 1_000,
    );
    expect(out.finaleSettled).toBe(true);
  });
});

describe('runCinematicFrame — isCinematicFreeze (W3.5 chrome predicate)', () => {
  it('is false when nothing is armed', () => {
    const out = runCinematicFrame(createCinematicBeatState(), BASE_INPUTS, 1_000);
    expect(out.isCinematicFreeze).toBe(false);
  });

  it('is true while peakHoldUntil is in the future', () => {
    const cine = createCinematicBeatState();
    cine.peakHoldUntil = 2_000;
    const out = runCinematicFrame(cine, BASE_INPUTS, 1_500);
    expect(out.isCinematicFreeze).toBe(true);
  });

  it('is true while afterglowUntil is in the future (after peak ends)', () => {
    const cine = createCinematicBeatState();
    cine.peakHoldUntil = 1_000;
    cine.afterglowUntil = 5_000;
    const out = runCinematicFrame(cine, BASE_INPUTS, 2_000);
    expect(out.isCinematicFreeze).toBe(true);
  });
});
