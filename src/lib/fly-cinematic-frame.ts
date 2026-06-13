/**
 * Per-frame cinematic dispatcher for /fly.
 *
 * Single source of truth for the ORDER in which /fly's animate body
 * runs the cinematic state machine each frame. Previously inline in
 * `src/routes/fly/+page.svelte` (~50 lines spread across ~500 lines of
 * animate body); lifted here so:
 *   - the dispatch order is grep-able instead of buried in closures
 *   - the test harness (issue #325) drives the SAME dispatcher prod
 *     uses, not a parallel mirror with drift risk
 *
 * Pure. Mutates `cine` in place + returns derived flags / opacities.
 * No Three.js, no DOM, no `performance.now()` — caller passes `now`.
 *
 * Call order matches /fly's animate body:
 *   1. Cruise-hold arming (W3.7) — sets `cruiseHoldUntil` if crossing trigger
 *   2. Cut overlay update (W3.6) — current opacity + clears `cutStartedAt` when done
 *   3. Peak-hold arm step (W3.1 + arms W3.2 afterglow window)
 *   4. Finale opacities (W3.4) — caption + black + settled flag
 *   5. Cinematic freeze flag — caller gates `simDay` advance on this
 *
 * Side effects on `cine`:
 *   - peakHoldUntil, peakHoldArmedForFlybyMet, afterglowUntil
 *   - afterglowStartCamR (cleared to 0 when a new arm fires)
 *   - cruiseHoldUntil, cruiseHoldFired, lastSeenSimDayForCruiseHold
 *   - cutStartedAt (cleared to 0 when the cut animation completes)
 *
 * Things this helper does NOT do (still inline in /fly):
 *   - Advance simDay (caller does, gated on `isCinematicFreeze`)
 *   - Camera math (cruise oscillations, parallax orbit, lerps)
 *   - Phase / sub-phase transitions
 *   - Arrival snap + epilogue handoff
 *   - Arming `cine.finaleStartedAt` (currently dormant in /fly per the
 *     comment at +page.svelte §"Finale lock … was removed per Marko")
 */
import {
  CINEMATIC_TIMINGS,
  type CinematicBeatState,
  computeCutOverlayOpacity,
  computePeakHoldArmStep,
  isAnyCinematicFreeze,
  shouldArmCruiseHold,
} from './fly-cinematic-beats';

export interface RunCinematicFrameInputs {
  /** Current sim-day (dep_day + MET). */
  simDay: number;
  /** Mission's launch reference (sim time at MET 0). */
  depDay: number;
  /** True under `prefers-reduced-motion: reduce` (or test override). */
  reducedMotion: boolean;
  /** True while user is mid pointer-drag on the scrubber. */
  isDrag: boolean;
  /** Moon-mode missions suppress every cinematic beat. */
  isMoonMission: boolean;
  /** `parseFlybyMetFromSubPhase(lastHelioSubPhase)` — null while in
   *  launch / cruise / approach / arrived. */
  currentFrameFlybyMet: number | null;
  /** True if the active flyby event label contains "earth" — picks
   *  the longer 4 s peak hold instead of the 2.5 s default. */
  isEarthFlyby: boolean;
  /** Cruise-hold trigger sim-day (or null when no qualifying gap). */
  cruiseHoldTriggerSimDay: number | null;
  /** /fly's `FLYBY_PEAK_DAYS` — reset window radius for peakHold arming. */
  flybyPeakDays: number;
}

export interface RunCinematicFrameOutputs {
  /** True when ANY beat (peak hold / afterglow / cruise hold / finale)
   *  is freezing sim time. Caller gates `simDay += dt * simSpeed` on this. */
  isCinematicFreeze: boolean;
  /** Current W3.6 cut-overlay opacity [0, 1]. */
  cutBlackOpacity: number;
  /** Current W3.4 finale-caption opacity [0, 1]. */
  finaleCaptionOpacity: number;
  /** Current W3.4 finale black-fade opacity [0, 1]. */
  finaleBlackOpacity: number;
  /** True the frame after the finale has fully run (12 s + 1 s settle).
   *  Caller transitions to the epilogue tableau. */
  finaleSettled: boolean;
  /** True if a peak-hold arm fired this frame (informational, useful in tests). */
  peakHoldArmedThisFrame: boolean;
  /** True if a cruise-hold arm fired this frame (informational). */
  cruiseHoldArmedThisFrame: boolean;
}

export function runCinematicFrame(
  cine: CinematicBeatState,
  inputs: RunCinematicFrameInputs,
  now: number,
): RunCinematicFrameOutputs {
  // 1. Cruise-hold arming (W3.7).
  //    Under reducedMotion the hold is suppressed entirely (it's a
  //    multi-second unsolicited camera ramp). `lastSeenSimDayForCruiseHold`
  //    is still bumped so a subsequent prefers-reduced-motion: no-preference
  //    swap doesn't fire a stale-trigger arm.
  let cruiseHoldArmedThisFrame = false;
  if (
    !inputs.reducedMotion &&
    shouldArmCruiseHold(cine, inputs.simDay, inputs.cruiseHoldTriggerSimDay)
  ) {
    cine.cruiseHoldUntil = now + CINEMATIC_TIMINGS.CRUISE_HOLD_DURATION_MS;
    cine.cruiseHoldFired = true;
    cruiseHoldArmedThisFrame = true;
  }
  cine.lastSeenSimDayForCruiseHold = inputs.simDay;

  // 2. Cut overlay (W3.6).
  let cutBlackOpacity = 0;
  if (cine.cutStartedAt > 0) {
    const { opacity, cutComplete } = computeCutOverlayOpacity(cine.cutStartedAt, now);
    cutBlackOpacity = opacity;
    if (cutComplete) cine.cutStartedAt = 0;
  }

  // 3. Peak-hold arm step (W3.1 + arms W3.2 afterglow window).
  //    The reset → arm round-trip is in `computePeakHoldArmStep`; we
  //    just commit the returned mutations + clear the captured
  //    afterglow start so this flyby's afterglow re-captures fresh
  //    values when its hold expires.
  const armStep = computePeakHoldArmStep(cine, {
    currentFrameFlybyMet: inputs.currentFrameFlybyMet,
    simDay: inputs.simDay,
    depDay: inputs.depDay,
    now,
    isEarthFlyby: inputs.isEarthFlyby,
    isMoonMission: inputs.isMoonMission,
    reducedMotion: inputs.reducedMotion,
    isDrag: inputs.isDrag,
    flybyPeakDays: inputs.flybyPeakDays,
  });
  if (armStep.newArmedForFlybyMet !== undefined) {
    cine.peakHoldArmedForFlybyMet = armStep.newArmedForFlybyMet;
  }
  if (armStep.newPeakHoldUntil !== undefined) {
    cine.peakHoldUntil = armStep.newPeakHoldUntil;
  }
  if (armStep.newAfterglowUntil !== undefined) {
    cine.afterglowUntil = armStep.newAfterglowUntil;
  }
  if (armStep.armed) {
    cine.afterglowStartCamR = 0;
  }

  // 4. Finale opacities (W3.4). `cine.finaleStartedAt > 0` is the
  //    arm sentinel; while the path is currently dormant in /fly
  //    (epilogue tableau covers the end-of-mission beat), the state
  //    machine stays correct so a future re-activation Just Works.
  let finaleCaptionOpacity = 0;
  let finaleBlackOpacity = 0;
  let finaleSettled = false;
  if (cine.finaleStartedAt > 0 && now >= cine.finaleStartedAt) {
    const elapsed = now - cine.finaleStartedAt;
    if (elapsed >= CINEMATIC_TIMINGS.FINALE_CAPTION_FADE_IN_AT_MS) {
      finaleCaptionOpacity = Math.min(
        1,
        (elapsed - CINEMATIC_TIMINGS.FINALE_CAPTION_FADE_IN_AT_MS) /
          CINEMATIC_TIMINGS.FINALE_FADE_RAMP_MS,
      );
    }
    if (elapsed >= CINEMATIC_TIMINGS.FINALE_BLACK_FADE_IN_AT_MS) {
      finaleBlackOpacity = Math.min(
        1,
        (elapsed - CINEMATIC_TIMINGS.FINALE_BLACK_FADE_IN_AT_MS) /
          CINEMATIC_TIMINGS.FINALE_FADE_RAMP_MS,
      );
    }
    if (elapsed >= CINEMATIC_TIMINGS.FINALE_DURATION_MS + 1000) {
      finaleSettled = true;
    }
  }

  // 5. Cinematic freeze flag — caller gates simDay advance + chrome
  //    suppression UI on this. Single predicate to avoid drift between
  //    the gate site and the chrome site.
  const isCinematicFreeze = isAnyCinematicFreeze(cine, now);

  return {
    isCinematicFreeze,
    cutBlackOpacity,
    finaleCaptionOpacity,
    finaleBlackOpacity,
    finaleSettled,
    peakHoldArmedThisFrame: armStep.armed,
    cruiseHoldArmedThisFrame,
  };
}
