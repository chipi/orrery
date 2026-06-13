/**
 * Harness-driven cinematic-beat orchestration tests.
 *
 * Five specs covering polish-wave-3 beats end-to-end via
 * `createFlyHarness` — driving the real `runCinematicFrame` dispatcher
 * /fly's animate body runs (slice 20), with deterministic frame-by-frame
 * sim-clock + camera state (slice 21). Issue #325.
 *
 * Each spec sets up a realistic mission scenario (Cassini, the
 * canonical multi-flyby helio mission) and asserts a single beat's
 * timing-curve behaviour against the spec-document's expected ranges.
 *
 * Why this layer matters: the pure step-functions in
 * `fly-cinematic-beats.ts` are unit-tested in isolation (predicate +
 * arm semantics). But the ORDER in which `runCinematicFrame` calls
 * them, and how they interact across many frames against the simDay
 * advance gate + camera tweens, was previously only verified via
 * chrome-devtools-mcp browser instrumentation. These five specs cover
 * the cross-frame orchestration so silent regressions trip a unit test
 * instead of an observation.
 */
import { describe, expect, it } from 'vitest';
import { CINEMATIC_TIMINGS } from './fly-cinematic-beats';
import { createFlyHarness } from './test-helpers/fly-harness';

describe('runCinematicFrame harness — W3.1 peak hold sim freeze', () => {
  it('Cassini Venus #1: arming at the iconic moment freezes simDay for the full hold', () => {
    const h = createFlyHarness({ mission: 'cassini', dest: 'saturn' });
    // Cassini's Venus #1 is at MET=193 days. ICONIC_LEAD_DAYS default
    // is 2, so the iconic peak fires at simDay = depDay + 191 inside
    // the ±0.5-day peakHoldRadius window.
    h.setSubPhase('flyby-193-venus');
    h.scrubToMet(191);
    const simDayAtArm = h.simDay;

    h.advanceFrames(1);
    expect(h.cine.peakHoldUntil).toBeGreaterThan(0);
    expect(h.cine.peakHoldArmedForFlybyMet).toBe(193);
    expect(h.lastOut.peakHoldArmedThisFrame).toBe(true);

    // 2.5 s hold = 150 frames at 60 fps. Sim is frozen the entire
    // window (peakHold) and remains frozen into the afterglow window
    // (isCinematicFreeze stays true through both).
    h.advanceFrames(150);
    expect(h.simDay).toBeCloseTo(simDayAtArm, 5);
    expect(h.lastOut.isCinematicFreeze).toBe(true);
  });
});

describe('runCinematicFrame harness — W3.2 afterglow tween', () => {
  it('Cassini Venus #1: camR eases out to startingCamR × AFTERGLOW_PULLBACK_FACTOR by end of tween', () => {
    const STARTING_R = 10;
    const h = createFlyHarness({
      mission: 'cassini',
      dest: 'saturn',
      startingCamR: STARTING_R,
    });
    h.setSubPhase('flyby-193-venus');
    h.scrubToMet(191);
    h.advanceFrames(1); // peak hold arms; afterglow window armed in the same step
    // 2.5 s peak hold + 6 s afterglow = 8.5 s = ~510 frames at 60 fps.
    // computeAfterglowCameraFrame eases over the 6 s window; at t≈1 the
    // eased value lands on the target within rounding.
    h.advanceFrames(510);
    expect(h.camR).toBeCloseTo(STARTING_R * CINEMATIC_TIMINGS.AFTERGLOW_PULLBACK_FACTOR, 0);
  });
});

describe('runCinematicFrame harness — W3.4 finale opacity timing', () => {
  it('caption + black ramp on schedule once cine.finaleStartedAt is armed', () => {
    const h = createFlyHarness({ mission: 'cassini', dest: 'saturn' });
    // /fly does NOT auto-arm the finale today (epilogue tableau covers
    // the end-of-mission beat) but the state machine + dispatcher are
    // preserved so a future re-activation works. Spec arms manually
    // to exercise the W3.4 path.
    h.cine.finaleStartedAt = h.now;

    // t = 8.5 s — caption mid-ramp, black still 0.
    h.advanceFrames(60 * 9 - 30);
    expect(h.lastOut.finaleCaptionOpacity).toBeGreaterThan(0);
    expect(h.lastOut.finaleCaptionOpacity).toBeLessThan(1);
    expect(h.lastOut.finaleBlackOpacity).toBe(0);

    // t ≈ 12.5 s — both at full opacity, finale ready to settle.
    h.advanceFrames(60 * 4);
    expect(h.lastOut.finaleCaptionOpacity).toBe(1);
    expect(h.lastOut.finaleBlackOpacity).toBe(1);
  });
});

describe('runCinematicFrame harness — W3.6 cut overlay threshold', () => {
  it('Launch → Saturn jump > CUT_THRESHOLD_DAYS arms the cut and the ramp clears itself', () => {
    const h = createFlyHarness({ mission: 'cassini', dest: 'saturn' });
    h.scrubToMet(0); // anchor at launch (Δ = 0, no cut)
    h.advanceFrames(1);
    expect(h.cine.cutStartedAt).toBe(0);

    // Cassini Saturn OI is at MET=2451 — far beyond the 365-day cut
    // threshold. The scrub arms the cut immediately.
    h.scrubToMet(2451);
    expect(h.cine.cutStartedAt).toBeGreaterThan(0);

    // First frame after scrub — cut is mid fade-out, opacity > 0.
    h.advanceFrames(1);
    expect(h.lastOut.cutBlackOpacity).toBeGreaterThan(0);

    // After the full 2×CUT_FADE_RAMP_MS window (200 ms ≈ 12 frames),
    // the helper clears cutStartedAt and opacity returns to 0.
    h.advanceFrames(15);
    expect(h.cine.cutStartedAt).toBe(0);
    expect(h.lastOut.cutBlackOpacity).toBe(0);
  });
});

describe('runCinematicFrame harness — W3.7 cruise hold trigger', () => {
  it('Cassini Jupiter→Saturn cruise gap: hold arms once simDay crosses the midpoint', () => {
    // Higher simSpeed so simDay crosses the trigger in a couple of
    // frames instead of thousands — the cinematic timing isn't tied
    // to simSpeed, only the wall-clock rate at which sim-days flow.
    const h = createFlyHarness({ mission: 'cassini', dest: 'saturn', simSpeed: 500 });
    const triggerSim = h.cruiseHoldTriggerSimDay;
    if (triggerSim == null) {
      throw new Error('Cassini should have a cruise-hold trigger; check mission events.');
    }

    // Park 5 sim-days before the trigger. (The big jump fires a W3.6
    // cut overlay, which is harmless for this spec — cut + cruise-hold
    // are independent state machines and the cut doesn't freeze sim.)
    h.scrubToMet(triggerSim - 5 - h.depDay);
    h.advanceFrames(1); // lastSeenSimDayForCruiseHold catches up to pre-trigger
    expect(h.cine.cruiseHoldFired).toBe(false);

    // simSpeed=500, dt=1/60s → ~8.3 days/frame; 1 more frame crosses
    // the trigger inside the 30-day slop window.
    h.advanceFrames(1);
    expect(h.cine.cruiseHoldFired).toBe(true);
    expect(h.cine.cruiseHoldUntil).toBeGreaterThan(0);
    expect(h.lastOut.isCinematicFreeze).toBe(true);
  });
});
