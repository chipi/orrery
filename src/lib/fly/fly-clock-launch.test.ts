import { describe, it, expect } from 'vitest';
import { launchPlayClock } from './fly-clock';
import type { AscentSummary } from '$lib/physics/ascent/ascent-physics';

function ascent(durS: number): AscentSummary {
  const states = [];
  for (let t = 0; t <= durS; t++)
    states.push({ t, altKm: Math.min(200, t * 0.4), speedKms: Math.min(7.8, t * 0.015) });
  return { states } as unknown as AscentSummary;
}

describe('launchPlayClock', () => {
  it('has no clock without a trajectory', () => {
    expect(launchPlayClock(null, [])).toBeNull();
    expect(launchPlayClock(ascent(0), [])).toBeNull();
  });

  it('lays the launch band out over the whole ascent and round-trips', () => {
    const c = launchPlayClock(ascent(600), [150])!;
    const L = c.layout;
    expect(L.total).toBeGreaterThan(0);
    expect(L.fromBar(L.total)).toBeCloseTo(600, 0);
    let prev = -1;
    for (let t = 0; t <= 600; t += 25) {
      const w = L.toBar(t);
      expect(w).toBeGreaterThan(prev);
      prev = w;
      expect(L.fromBar(w)).toBeCloseTo(t, 0);
    }
    expect(c.advance(10, 0.25, 5)).toBeGreaterThan(10);
  });

  it('takes the act length when one is given', () => {
    const c = launchPlayClock(ascent(600), [150], 300)!;
    expect(c.layout.fromBar(c.layout.total)).toBeCloseTo(300, 0);
  });
});
