// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Force the channel active + motion allowed so consume() exercises the math.
vi.mock('./state.svelte', () => ({ sensory: { active: () => true, reducedMotion: false } }));

import { gyro } from './device-orientation';

function orient(beta: number, gamma: number): void {
  const e = new Event('deviceorientation') as Event & { beta: number; gamma: number };
  e.beta = beta;
  e.gamma = gamma;
  window.dispatchEvent(e);
}

beforeEach(() => {
  gyro.stop();
  gyro.start();
});

describe('gyro delta math', () => {
  it('captures home on the first event and emits no delta yet', () => {
    orient(10, 20);
    expect(gyro.consume()).toEqual({ dAz: 0, dEl: 0 });
  });

  it('a left-right tilt past the dead zone produces an azimuth delta', () => {
    orient(0, 0); // home
    orient(0, 40); // gamma jumps → azimuth turns
    const d = gyro.consume();
    expect(d.dAz).toBeGreaterThan(0);
    // Second consume with no new event → offset already applied, no further delta.
    expect(gyro.consume().dAz).toBeCloseTo(0, 5);
  });

  it('a front-back tilt produces an elevation delta', () => {
    orient(0, 0);
    orient(40, 0);
    expect(gyro.consume().dEl).toBeGreaterThan(0);
  });

  it('ignores tilt within the ±2° dead zone', () => {
    orient(0, 0);
    orient(0, 1); // 1° < dead zone
    expect(gyro.consume()).toEqual({ dAz: 0, dEl: 0 });
  });

  it('re-homes after a touch (T-B) — no delta until a fresh home is captured', () => {
    orient(0, 0);
    orient(0, 40);
    gyro.consume();
    gyro.recordTouchEnd(); // drag just ended
    orient(0, 80); // arrives within the 200ms pause → drops home
    expect(gyro.consume()).toEqual({ dAz: 0, dEl: 0 });
  });
});
