import { describe, it, expect } from 'vitest';
import { buildActivityClock, type ActivitySample } from './activity-clock';

/** A coast at constant altitude and speed from 0 to 600 s, then a 60 s descent to the ground. */
function coastThenLand(): ActivitySample[] {
  const s: ActivitySample[] = [];
  for (let t = 0; t <= 600; t += 1) s.push({ t, altM: 50_000, speedMs: 1_000 });
  for (let t = 601; t <= 660; t += 1) {
    const f = (t - 600) / 60;
    s.push({ t, altM: 50_000 * (1 - f), speedMs: 1_000 * (1 - f) + 2 });
  }
  return s;
}

describe('activity clock', () => {
  it('runs fast where nothing changes and near real time where things do', () => {
    const c = buildActivityClock(coastThenLand(), []);
    expect(c.rate(300)).toBeGreaterThan(25);
    expect(c.rate(640)).toBeLessThan(2);
  });

  it('slows to the slow-motion rate at an event, easing in before it', () => {
    const c = buildActivityClock(coastThenLand(), [300]);
    expect(c.rate(300)).toBeCloseTo(0.22, 2);
    // The slew limit brings the rate down ahead of the event: below the coast rate well before
    // the beat's own 2.6 s slow-in (at 30x the ease covers ~20 s of mission time).
    expect(c.rate(295)).toBeLessThan(c.rate(200) / 3);
    expect(c.rate(200)).toBeGreaterThan(25);
  });

  it('never changes ln(rate) faster than the slew limit per wall second', () => {
    const c = buildActivityClock(coastThenLand(), [300, 620]);
    const slew = Math.log(30) / 2;
    let t = 0;
    let prev = Math.log(c.rate(0));
    const dt = 1 / 60;
    while (t < 655) {
      t = c.advance(t, dt);
      const now = Math.log(c.rate(t));
      expect(Math.abs(now - prev)).toBeLessThanOrEqual(slew * dt * 1.02 + 1e-9);
      prev = now;
    }
  });

  it('is monotonic and positive, and its wall time inverts its advance', () => {
    const c = buildActivityClock(coastThenLand(), [300]);
    let t = 0;
    let wall = 0;
    while (t < 660) {
      const next = c.advance(t, 0.05);
      expect(next).toBeGreaterThan(t);
      t = next;
      wall += 0.05;
    }
    expect(c.wallSeconds(0, 660)).toBeGreaterThan(wall * 0.95);
    expect(c.wallSeconds(0, 660)).toBeLessThan(wall * 1.05);
  });

  it('cuts the boring stretch: a 600 s coast plays in well under a minute', () => {
    const c = buildActivityClock(coastThenLand(), []);
    expect(c.wallSeconds(0, 600)).toBeLessThan(40);
    expect(c.wallSeconds(600, 660)).toBeGreaterThan(30);
  });

  it('a long frame cannot jump over an event beat', () => {
    const c = buildActivityClock(coastThenLand(), [300]);
    let t = 250;
    for (let k = 0; k < 400 && t < 299.5; k++) t = c.advance(t, 0.5);
    // Within a few hundred half-second frames the clock reaches the event region without
    // overshooting it in one step.
    const after = c.advance(t, 0.5);
    expect(after - t).toBeLessThan(2);
  });
});
