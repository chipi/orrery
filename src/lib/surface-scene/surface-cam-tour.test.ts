import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { animateCamTour, bindSurfaceCamTour, easeInOutTour } from './surface-cam-tour';

describe('easeInOutTour', () => {
  it('is 0 at 0, 1 at 1 and 0.5 at the midpoint', () => {
    expect(easeInOutTour(0)).toBe(0);
    expect(easeInOutTour(1)).toBe(1);
    expect(easeInOutTour(0.5)).toBe(0.5);
  });

  it('is monotonic', () => {
    let prev = -1;
    for (let t = 0; t <= 1; t += 0.05) {
      const v = easeInOutTour(t);
      expect(v).toBeGreaterThanOrEqual(prev);
      prev = v;
    }
  });
});

describe('animateCamTour', () => {
  let now = 0;
  let queue: Array<() => void> = [];
  beforeEach(() => {
    now = 0;
    queue = [];
    vi.spyOn(performance, 'now').mockImplementation(() => now);
    vi.stubGlobal('requestAnimationFrame', (cb: () => void) => {
      queue.push(cb);
      return queue.length;
    });
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  function flush() {
    const q = queue;
    queue = [];
    for (const cb of q) cb();
  }

  it('tweens from the current value to the target and stops', () => {
    let v = 10;
    animateCamTour(
      () => v,
      (x) => (v = x),
      30,
      1000,
    );
    now = 500;
    flush();
    expect(v).toBeCloseTo(20, 10);
    expect(queue.length).toBe(1);
    now = 1000;
    flush();
    expect(v).toBe(30);
    expect(queue.length).toBe(0);
  });
});

describe('bindSurfaceCamTour', () => {
  it('detaches both listeners on teardown and reads camera state at event time', () => {
    const target = new EventTarget();
    const add = vi.spyOn(target, 'addEventListener');
    const remove = vi.spyOn(target, 'removeEventListener');
    let camR = 100;
    let camRTarget = 100;
    let now = 0;
    const frames: Array<() => void> = [];
    vi.spyOn(performance, 'now').mockImplementation(() => now);
    vi.stubGlobal('requestAnimationFrame', (cb: () => void) => frames.push(cb));
    const teardown = bindSurfaceCamTour({
      container: target as unknown as HTMLElement,
      getCamT: () => 0,
      setCamT: () => {},
      getCamR: () => camR,
      getCamRTarget: () => camRTarget,
      setCamRTarget: (v) => (camRTarget = v),
    });
    expect(add).toHaveBeenCalledTimes(2);
    camR = 200;
    target.dispatchEvent(new CustomEvent('audio-stage-zoom', { detail: { durationMs: 1 } }));
    now = 1;
    frames.shift()!();
    // factor 0.55 of the camR current at dispatch time (200), not at bind time.
    expect(camRTarget).toBeCloseTo(110, 10);
    teardown();
    expect(remove).toHaveBeenCalledTimes(2);
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });
});
