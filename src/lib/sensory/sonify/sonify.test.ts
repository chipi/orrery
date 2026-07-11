// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

class FakeParam {
  value = 0;
  setValueAtTime = vi.fn();
  linearRampToValueAtTime = vi.fn();
  exponentialRampToValueAtTime = vi.fn();
  cancelScheduledValues = vi.fn();
  setTargetAtTime = vi.fn();
}
class FakeNode {
  gain = new FakeParam();
  frequency = new FakeParam();
  type = 'sine';
  connect = vi.fn((n: unknown) => n);
  start = vi.fn();
  stop = vi.fn();
  disconnect = vi.fn();
  get context() {
    return { currentTime: 0 };
  }
}
class FakeCtx {
  currentTime = 0;
  state = 'running';
  destination = {};
  createGain = vi.fn(() => new FakeNode());
  createOscillator = vi.fn(() => new FakeNode());
  resume = vi.fn(() => Promise.resolve());
  suspend = vi.fn(() => Promise.resolve());
}

beforeEach(() => {
  vi.stubGlobal('AudioContext', FakeCtx as unknown as typeof AudioContext);
  vi.useFakeTimers();
});
afterEach(() => {
  vi.runAllTimers();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('kepler-chord', () => {
  it('starts a chord from planet periods and stops cleanly', async () => {
    const { keplerChord } = await import('./kepler-chord');
    expect(() => keplerChord.start([0.24, 0.62, 1, 1.88, 11.86, 29.4, 84, 164])).not.toThrow();
    keplerChord.start([1, 2]); // second call is a no-op while running
    expect(() => keplerChord.stop()).not.toThrow();
    vi.runAllTimers(); // flush the deferred disconnect
    keplerChord.stop(); // idempotent
  });
});

describe('fly-velocity', () => {
  it('starts, tracks velocity → pitch, and stops', async () => {
    const { flyVelocitySon } = await import('./fly-velocity');
    expect(() => flyVelocitySon.start()).not.toThrow();
    flyVelocitySon.update(0);
    flyVelocitySon.update(30);
    flyVelocitySon.update(999); // clamped
    expect(() => flyVelocitySon.stop()).not.toThrow();
    vi.runAllTimers();
  });
});
