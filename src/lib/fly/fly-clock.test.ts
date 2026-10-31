import { describe, it, expect, vi } from 'vitest';
import {
  OI_WINDOW_DAYS,
  coastAscentFraction,
  cruiseTickPercent,
  descentSeparationTimes,
  isCinematicCutJump,
  isOrbitInsertionBeatActive,
  isOrbitInsertionFiring,
  jumpToMet,
  launchSeparationTimes,
  masterScrubFraction,
  masterScrubTarget,
  type JumpToMetContext,
} from './fly-clock';
import { makeTimeline, pointToScrubber } from '$lib/orbital/ascent-clock';
import { CINEMATIC_TIMINGS, createCinematicBeatState } from '$lib/fly-cinematic-beats';
import type { AscentSummary } from '$lib/physics/ascent/ascent-physics';
import type { DescentSummary } from '$lib/physics/descent/descent-physics';

describe('orbit-insertion beat', () => {
  const base = { showLaunch: false, showDescent: false, arrDay: 100 };
  it('opens OI_WINDOW_DAYS before arrival and closes a day after', () => {
    const at = (simDay: number) => isOrbitInsertionBeatActive({ ...base, simDay });
    expect(at(100 - OI_WINDOW_DAYS - 0.01)).toBe(false);
    expect(at(100 - OI_WINDOW_DAYS)).toBe(true);
    expect(at(101)).toBe(true);
    expect(at(101.01)).toBe(false);
  });
  it('is suppressed during the launch and descent acts', () => {
    expect(isOrbitInsertionBeatActive({ ...base, showLaunch: true, simDay: 100 })).toBe(false);
    expect(isOrbitInsertionBeatActive({ ...base, showDescent: true, simDay: 100 })).toBe(false);
  });
  it('fires over the last half window into arrival, until half a day after', () => {
    const at = (simDay: number) => isOrbitInsertionFiring({ simDay, arrDay: 100 });
    expect(at(100 - OI_WINDOW_DAYS / 2 - 0.01)).toBe(false);
    expect(at(100 - OI_WINDOW_DAYS / 2)).toBe(true);
    expect(at(100.5)).toBe(true);
    expect(at(100.51)).toBe(false);
  });
});

describe('coastAscentFraction', () => {
  it('keeps the interplanetary default', () => {
    expect(coastAscentFraction(false, 500)).toBe(0.15);
  });
  it('is 0.2 for sub-hour coasts and shrinks with log(hours), floored at 0.1', () => {
    expect(coastAscentFraction(true, 0.01)).toBe(0.2);
    const oneDay = coastAscentFraction(true, 1);
    expect(oneDay).toBeCloseTo(0.2 - 0.03 * Math.log10(24), 10);
    expect(coastAscentFraction(true, 84)).toBeLessThan(oneDay);
    expect(coastAscentFraction(true, 1e12)).toBe(0.1);
  });
});

describe('separation times', () => {
  it('launch: keeps staging / fairing / SECO event times only', () => {
    const summary = {
      events: [
        { type: 'liftoff', t: 0 },
        { type: 'staging', t: 150 },
        { type: 'fairing_jettison', t: 200 },
        { type: 'max_q', t: 70 },
        { type: 'seco', t: 500 },
      ],
    } as unknown as AscentSummary;
    expect(launchSeparationTimes(summary)).toEqual([150, 200, 500]);
    expect(launchSeparationTimes(null)).toEqual([]);
  });
  it('descent: null summary gives no beats; non-beat events are dropped', () => {
    expect(descentSeparationTimes(null)).toEqual([]);
    const summary = {
      totalDurationS: 400,
      states: [
        { t: 0, phaseKind: 'ballistic_entry' },
        { t: 200, phaseKind: 'parachute' },
      ],
      events: [
        { type: 'entry_interface', t: 0 },
        { type: 'parachute_deploy', t: 200 },
      ],
    } as unknown as DescentSummary;
    expect(descentSeparationTimes(summary)).toHaveLength(1);
  });
});

describe('master scrubber', () => {
  const tl = makeTimeline(540, 100, 0.15, 400, 0.2);
  const inputs = {
    timeline: tl,
    launchT: 0,
    descentT: 0,
    launchDurationS: 540,
    cruiseDays: 100,
    coastMetDays: 0,
    simDay: 50,
    depDay: 0,
  };

  it('fraction follows the live phase', () => {
    expect(masterScrubFraction({ ...inputs, live: 'ascent', launchT: 270 })).toBeCloseTo(0.075, 10);
    expect(masterScrubFraction({ ...inputs, live: 'ascent', launchT: -10 })).toBe(0);
    expect(masterScrubFraction({ ...inputs, live: 'cruise', simDay: 0 })).toBeCloseTo(0.15, 10);
    expect(masterScrubFraction({ ...inputs, live: 'cruise', simDay: 50 })).toBeCloseTo(
      pointToScrubber({ phase: 'cruise', ascentT: 540, cruiseMetDays: 50 }, tl),
      10,
    );
    expect(masterScrubFraction({ ...inputs, live: 'coast', coastMetDays: 100 })).toBeCloseTo(
      0.8,
      10,
    );
    expect(masterScrubFraction({ ...inputs, live: 'descent', descentT: 400 })).toBe(1);
  });

  it('a cruise sim day before departure clamps to the seam', () => {
    expect(masterScrubFraction({ ...inputs, live: 'cruise', simDay: -5 })).toBeCloseTo(0.15, 10);
  });

  it('scrub target round-trips each band', () => {
    expect(masterScrubTarget(0.075, tl, false)).toEqual({ phase: 'ascent', launchT: 270 });
    const cruise = masterScrubTarget(0.475, tl, false);
    expect(cruise.phase).toBe('cruise');
    expect(masterScrubTarget(0.475, tl, true).phase).toBe('coast');
    const tail = masterScrubTarget(0.9, tl, false);
    expect(tail.phase).toBe('descent');
    expect((tail as { descentT: number }).descentT).toBeCloseTo(200, 8);
  });

  it('scrub target without a descent tail never yields descent', () => {
    const noTail = makeTimeline(540, 100);
    expect(masterScrubTarget(1, noTail, false).phase).toBe('cruise');
  });

  it('tick percent maps a cruise MET onto [seam, 1] and clamps', () => {
    expect(cruiseTickPercent(50, 100, 0)).toBe(50);
    expect(cruiseTickPercent(50, 100, 0.2)).toBeCloseTo(60, 10);
    expect(cruiseTickPercent(500, 100, 0.2)).toBe(100);
    expect(cruiseTickPercent(-5, 100, 0.2)).toBeCloseTo(16, 10);
    expect(cruiseTickPercent(-500, 100, 0.2)).toBe(0);
    expect(cruiseTickPercent(5, 0, 0.2)).toBe(20);
  });
});

describe('isCinematicCutJump', () => {
  it('cuts strictly beyond the threshold, either direction', () => {
    const t = CINEMATIC_TIMINGS.CUT_THRESHOLD_DAYS;
    expect(isCinematicCutJump(0, t)).toBe(false);
    expect(isCinematicCutJump(0, t + 1)).toBe(true);
    expect(isCinematicCutJump(t + 1, 0)).toBe(true);
  });
});

describe('jumpToMet', () => {
  function makeCtx(over: Partial<{ simDay: number; playing: boolean; events: unknown[] }> = {}) {
    let simDay = over.simDay ?? 10;
    let playing = over.playing ?? true;
    let camSnapUntil = -1;
    let launchDwellUntil = -1;
    const cine = createCinematicBeatState();
    const restartOpening = vi.fn();
    const cueSelect = vi.fn();
    let clock = 1000;
    const ctx: JumpToMetContext = {
      getSimDay: () => simDay,
      setSimDay: (d) => (simDay = d),
      getIsPlaying: () => playing,
      setIsPlaying: (v) => (playing = v),
      getMissionDepDay: () => 5,
      getMissionFlightEvents: () => (over.events ?? []) as never,
      setCamSnapUntil: (ms) => (camSnapUntil = ms),
      setLaunchDwellUntil: (ms) => (launchDwellUntil = ms),
      getOpeningDurationMs: () => 9500,
      restartOpening,
      cine,
      cueSelect,
      now: () => clock,
    };
    return {
      ctx,
      cine,
      restartOpening,
      cueSelect,
      state: () => ({ simDay, playing, camSnapUntil, launchDwellUntil }),
      tick: (ms: number) => (clock += ms),
    };
  }

  it('ignores negative and non-finite targets without side effects', () => {
    const h = makeCtx();
    jumpToMet(h.ctx, -1);
    jumpToMet(h.ctx, Number.NaN);
    expect(h.cueSelect).not.toHaveBeenCalled();
    expect(h.state().simDay).toBe(10);
  });

  it('snaps to dep_day + MET, pauses, arms the camera snap window and clears the peak hold', () => {
    const h = makeCtx();
    h.cine.peakHoldArmedForFlybyMet = 3;
    h.cine.peakHoldUntil = 99999;
    jumpToMet(h.ctx, 20);
    expect(h.cueSelect).toHaveBeenCalledTimes(1);
    expect(h.state()).toMatchObject({ simDay: 25, playing: false, camSnapUntil: 1700 });
    expect(h.cine.peakHoldArmedForFlybyMet).toBeNull();
    expect(h.cine.peakHoldUntil).toBe(0);
    expect(h.restartOpening).not.toHaveBeenCalled();
  });

  it('biases a flyby jump two days early', () => {
    const h = makeCtx({ events: [{ type: 'flyby', met_days: 20 }] });
    jumpToMet(h.ctx, 20);
    expect(h.state().simDay).toBe(5 + 18);
  });

  it('MET 0 replays the opening and re-arms the dwell + cruise hold', () => {
    const h = makeCtx({ playing: false });
    h.cine.cruiseHoldFired = true;
    jumpToMet(h.ctx, 0);
    expect(h.restartOpening).toHaveBeenCalledTimes(1);
    expect(h.state().launchDwellUntil).toBe(1000 + 9500 + 300);
    expect(h.cine.cruiseHoldFired).toBe(false);
  });

  it('a jump across more than the cut threshold starts the cut fade', () => {
    const h = makeCtx({ simDay: 0 });
    jumpToMet(h.ctx, CINEMATIC_TIMINGS.CUT_THRESHOLD_DAYS + 10);
    expect(h.cine.cutStartedAt).toBe(1000);
    const small = makeCtx({ simDay: 0 });
    small.cine.cutStartedAt = 0;
    jumpToMet(small.ctx, 30);
    expect(small.cine.cutStartedAt).toBe(0);
  });
});
