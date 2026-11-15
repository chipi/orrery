import { describe, it, expect } from 'vitest';
import { stepsForTier, BH_CAMERA_DISTANCE, BH_REACH_PAST_HOLE, BH_DT } from './black-hole-scene';
import { createLensRatioGuard } from './black-hole-visual';
import { ALL_TIERS, configFor } from '$lib/quality/quality-tier';

describe('black-hole ray budget', () => {
  it('camera distance matches the shader camera (0, uCamY <= 5, -30)', () => {
    expect(BH_CAMERA_DISTANCE).toBeCloseTo(Math.sqrt(30 * 30 + 5 * 5), 10);
  });

  it.each(ALL_TIERS)(
    '%s: steps x dt exceeds the camera distance plus the reach past the hole',
    (tier) => {
      expect(stepsForTier(tier) * BH_DT).toBeGreaterThan(BH_CAMERA_DISTANCE + BH_REACH_PAST_HOLE);
    },
  );

  it('the old 155-step budget stopped short of the horizon (the bug)', () => {
    expect(155 * BH_DT).toBeLessThan(BH_CAMERA_DISTANCE - 1);
  });

  it('a tier never marches less than the tier below it', () => {
    const steps = ALL_TIERS.map((t) => stepsForTier(t));
    expect(steps).toEqual([...steps].sort((a, b) => a - b));
  });
});

describe('lensScale', () => {
  it('is 0.75 on minimal and medium and 1 on low, high and cinematic', () => {
    expect(ALL_TIERS.map((t) => configFor(t).lensScale)).toEqual([0.75, 1, 0.75, 1, 1]);
  });
});

describe('createLensRatioGuard', () => {
  function fakeRenderer(ratio: number) {
    const calls: number[] = [];
    let current = ratio;
    return {
      calls,
      getPixelRatio: () => current,
      setPixelRatio: (r: number) => {
        calls.push(r);
        current = r;
      },
    };
  }

  it('scales the pixel ratio on apply and restores the original on restore', () => {
    const r = fakeRenderer(1.25);
    const guard = createLensRatioGuard(r);
    guard.apply(0.75);
    expect(r.getPixelRatio()).toBeCloseTo(0.9375, 10);
    guard.restore();
    expect(r.getPixelRatio()).toBe(1.25);
  });

  it('a second apply while active scales the original, not the scaled ratio', () => {
    const r = fakeRenderer(1);
    const guard = createLensRatioGuard(r);
    guard.apply(0.75);
    guard.apply(0.75);
    expect(r.getPixelRatio()).toBe(0.75);
    guard.restore();
    expect(r.getPixelRatio()).toBe(1);
  });

  it('restore without apply touches nothing, and a second restore is a no-op', () => {
    const r = fakeRenderer(2);
    const guard = createLensRatioGuard(r);
    guard.restore();
    expect(r.calls).toEqual([]);
    guard.apply(1);
    guard.restore();
    guard.restore();
    expect(r.calls).toEqual([2, 2]);
  });
});
