import { describe, it, expect } from 'vitest';
import { buildFlyDebugFrameSnapshot, type FlyDebugFrameInputs } from './fly-debug-frame';

const BASE_INPUTS = (overrides?: Partial<FlyDebugFrameInputs>): FlyDebugFrameInputs => ({
  simDay: 1000,
  lastHelioSubPhase: 'cruise-out',
  peakHoldArmedForFlybyMet: null,
  peakHoldUntil: 0,
  cruiseHoldUntil: 0,
  cruiseHoldFired: false,
  cruiseHoldTriggerSimDay: null,
  cutStartedAt: 0,
  cutBlackOpacity: 0,
  epilogueBlackOpacity: 0,
  camR: 60,
  camTarget: { x: 1.2, z: -0.7 },
  now: 5000,
  ...overrides,
});

describe('buildFlyDebugFrameSnapshot', () => {
  it('maps each input field through to its snapshot equivalent', () => {
    const out = buildFlyDebugFrameSnapshot(BASE_INPUTS());
    expect(out.simDay).toBe(1000);
    expect(out.lastHelioSubPhase).toBe('cruise-out');
    expect(out.peakHoldArmedForFlybyMet).toBeNull();
    expect(out.camR).toBe(60);
    expect(out.camTx).toBe(1.2);
    expect(out.camTz).toBe(-0.7);
    expect(out.epilogueBlackOpacity).toBe(0);
  });

  it('peakHoldRemainingMs counts down from peakHoldUntil', () => {
    const out = buildFlyDebugFrameSnapshot(BASE_INPUTS({ peakHoldUntil: 8000, now: 6000 }));
    expect(out.peakHoldRemainingMs).toBe(2000);
  });

  it('peakHoldRemainingMs is clamped to 0 when expired', () => {
    const out = buildFlyDebugFrameSnapshot(BASE_INPUTS({ peakHoldUntil: 4000, now: 6000 }));
    expect(out.peakHoldRemainingMs).toBe(0);
  });

  it('cruiseHoldRemainingMs counts down + clamps the same way', () => {
    expect(
      buildFlyDebugFrameSnapshot(BASE_INPUTS({ cruiseHoldUntil: 10000, now: 8500 }))
        .cruiseHoldRemainingMs,
    ).toBe(1500);
    expect(
      buildFlyDebugFrameSnapshot(BASE_INPUTS({ cruiseHoldUntil: 5000, now: 8500 }))
        .cruiseHoldRemainingMs,
    ).toBe(0);
  });

  it('does not leak the input camTarget reference (defensive copy of fields)', () => {
    const inputs = BASE_INPUTS();
    const out = buildFlyDebugFrameSnapshot(inputs);
    inputs.camTarget.x = 999;
    expect(out.camTx).toBe(1.2);
    expect(out.camTz).toBe(-0.7);
  });

  it('captures armed flyby MET when peakHold is engaged', () => {
    const out = buildFlyDebugFrameSnapshot(
      BASE_INPUTS({
        peakHoldArmedForFlybyMet: 193,
        peakHoldUntil: 12000,
        now: 10500,
        lastHelioSubPhase: 'flyby-193-venus',
      }),
    );
    expect(out.peakHoldArmedForFlybyMet).toBe(193);
    expect(out.peakHoldRemainingMs).toBe(1500);
    expect(out.lastHelioSubPhase).toBe('flyby-193-venus');
  });
});
