/**
 * Smoke tests for `createFlyHarness`. The substantive cinematic-beat
 * coverage (W3.1 / W3.2 / W3.4 / W3.6 / W3.7) lives in
 * `src/lib/fly-cinematic-beats.harness.test.ts` — this file just pins
 * the harness's construction contract so a typo in the mission-loader
 * surfaces as a focused failure instead of cascading through every
 * beat spec.
 */
import { describe, expect, it } from 'vitest';
import { createFlyHarness } from './fly-harness';

describe('createFlyHarness — construction smoke', () => {
  it('loads the Cassini mission off disk and primes a clean cine state', () => {
    const h = createFlyHarness({ mission: 'cassini', dest: 'saturn' });
    expect(h.mission.id).toBe('cassini');
    expect(h.depDay).toBeLessThan(0); // 1997-10-15 is pre-J2000
    expect(h.simDay).toBe(h.depDay);
    expect(h.cine.peakHoldUntil).toBe(0);
    expect(h.cine.cruiseHoldUntil).toBe(0);
    expect(h.cine.cutStartedAt).toBe(0);
    expect(h.cine.finaleStartedAt).toBe(0);
  });

  it('reports a cruise-hold trigger sim-day for Cassini (Jupiter→Saturn gap)', () => {
    const h = createFlyHarness({ mission: 'cassini', dest: 'saturn' });
    expect(h.cruiseHoldTriggerSimDay).not.toBeNull();
    expect(h.cruiseHoldTriggerSimDay).toBeGreaterThan(h.depDay);
  });

  it('advanceFrames(0) is a no-op; advanceFrames(60) advances now by 1 s', () => {
    const h = createFlyHarness({ mission: 'cassini', dest: 'saturn' });
    const startNow = h.now;
    h.advanceFrames(60);
    expect(h.now).toBeCloseTo(startNow + 1_000, 1);
  });
});
