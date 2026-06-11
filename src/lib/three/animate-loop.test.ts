// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createAnimateLoop } from './animate-loop';

vi.mock('$app/environment', () => ({ browser: true }));

// Drive raf manually so we can assert frame-by-frame behaviour.
let rafQueue: { id: number; cb: (now: number) => void }[] = [];
let nextRafId = 1;

beforeEach(() => {
  rafQueue = [];
  nextRafId = 1;
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
    const id = nextRafId++;
    rafQueue.push({ id, cb });
    return id;
  });
  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation((id) => {
    rafQueue = rafQueue.filter((entry) => entry.id !== id);
  });
  // jsdom defaults to visible — fresh per test.
  Object.defineProperty(document, 'hidden', { configurable: true, value: false });
});

afterEach(() => {
  vi.restoreAllMocks();
});

/** Pop the head of the raf queue and invoke its callback with a synthetic timestamp. */
function pumpRaf(timestampMs: number): void {
  const next = rafQueue.shift();
  if (next) next.cb(timestampMs);
}

describe('createAnimateLoop — frame scheduling', () => {
  it('does not invoke onFrame before start()', () => {
    const onFrame = vi.fn();
    createAnimateLoop({ onFrame });
    expect(onFrame).not.toHaveBeenCalled();
    expect(rafQueue.length).toBe(0);
  });

  it('arms raf on start() and invokes onFrame on the second tick', () => {
    const onFrame = vi.fn();
    const loop = createAnimateLoop({ onFrame });
    loop.start();
    // First tick seeds lastTime — no onFrame callback. Second tick
    // delivers the first real dt.
    pumpRaf(0);
    expect(onFrame).not.toHaveBeenCalled();
    pumpRaf(16);
    expect(onFrame).toHaveBeenCalledTimes(1);
    expect(onFrame).toHaveBeenCalledWith({ dt: 0.016, elapsed: 0.016 });
    loop.cleanup();
  });

  it('elapsed accumulates across frames', () => {
    const onFrame = vi.fn();
    const loop = createAnimateLoop({ onFrame });
    loop.start();
    pumpRaf(0);
    pumpRaf(16);
    pumpRaf(33);
    expect(onFrame.mock.calls.map((c) => c[0].elapsed)).toEqual([0.016, 0.033]);
    loop.cleanup();
  });

  it('clamps dt at maxDtSec to keep integrators stable after a long pause', () => {
    const onFrame = vi.fn();
    const loop = createAnimateLoop({ onFrame, maxDtSec: 0.05 });
    loop.start();
    pumpRaf(0);
    // 2-second gap simulates a tab returning to the foreground after
    // being throttled — raw dt would be 2.0s, clamp keeps it at 0.05s.
    pumpRaf(2000);
    expect(onFrame).toHaveBeenCalledWith({ dt: 0.05, elapsed: 0.05 });
    loop.cleanup();
  });

  it('reducedMotion=true freezes dt to 0 so passive animations pause', () => {
    const onFrame = vi.fn();
    const loop = createAnimateLoop({ onFrame, reducedMotion: () => true });
    loop.start();
    pumpRaf(0);
    pumpRaf(16);
    pumpRaf(33);
    // Both frames see dt=0 — passive animations advance by zero.
    expect(onFrame.mock.calls.map((c) => c[0].dt)).toEqual([0, 0]);
    // elapsed stays at 0 since dt is the elapsed-accumulator's input.
    expect(onFrame.mock.calls.map((c) => c[0].elapsed)).toEqual([0, 0]);
    loop.cleanup();
  });

  it('stop() cancels the pending raf and prevents the next onFrame call', () => {
    const onFrame = vi.fn();
    const loop = createAnimateLoop({ onFrame });
    loop.start();
    pumpRaf(0);
    pumpRaf(16);
    expect(onFrame).toHaveBeenCalledTimes(1);
    loop.stop();
    expect(rafQueue.length).toBe(0);
    expect(loop.running).toBe(false);
    loop.cleanup();
  });

  it('start() is idempotent — does not double-schedule frames', () => {
    const onFrame = vi.fn();
    const loop = createAnimateLoop({ onFrame });
    loop.start();
    loop.start();
    loop.start();
    expect(rafQueue.length).toBe(1);
    loop.cleanup();
  });
});

describe('createAnimateLoop — document.hidden pause (TA.md contract)', () => {
  it('pauses raf when document becomes hidden', () => {
    const onFrame = vi.fn();
    const loop = createAnimateLoop({ onFrame });
    loop.start();
    pumpRaf(0);
    pumpRaf(16);
    expect(onFrame).toHaveBeenCalledTimes(1);

    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    document.dispatchEvent(new Event('visibilitychange'));

    // No new raf scheduled while hidden.
    expect(rafQueue.length).toBe(0);
    expect(loop.running).toBe(false);
    loop.cleanup();
  });

  it('resumes raf when document becomes visible again, dt is fresh (not inflated)', () => {
    const onFrame = vi.fn();
    const loop = createAnimateLoop({ onFrame });
    loop.start();
    pumpRaf(0);
    pumpRaf(16);
    onFrame.mockClear();

    // Hide tab.
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    document.dispatchEvent(new Event('visibilitychange'));

    // 5 seconds pass. Re-show.
    Object.defineProperty(document, 'hidden', { configurable: true, value: false });
    document.dispatchEvent(new Event('visibilitychange'));

    // visibilitychange resume calls start() flow — running should be
    // armed once again.
    loop.start();
    pumpRaf(5_000);
    pumpRaf(5_016);
    expect(onFrame).toHaveBeenCalledTimes(1);
    // dt for the resume frame is the 16ms gap between pumps, NOT the
    // 5-second hidden span. The visibility-handler reset lastTime so
    // we don't hand `onFrame` an inflated dt.
    expect(onFrame.mock.calls[0][0].dt).toBeCloseTo(0.016, 3);
    loop.cleanup();
  });

  it('ignoreVisibilityPause=true keeps raf running while hidden (diagnostic opt-out)', () => {
    const onFrame = vi.fn();
    const loop = createAnimateLoop({ onFrame, ignoreVisibilityPause: true });
    loop.start();
    pumpRaf(0);
    pumpRaf(16);
    onFrame.mockClear();

    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    // No visibilitychange listener registered, but even if dispatched
    // the tick wouldn't bail.
    document.dispatchEvent(new Event('visibilitychange'));

    pumpRaf(33);
    expect(onFrame).toHaveBeenCalledTimes(1);
    loop.cleanup();
  });
});

describe('createAnimateLoop — cleanup', () => {
  it('cancels the pending raf', () => {
    const onFrame = vi.fn();
    const loop = createAnimateLoop({ onFrame });
    loop.start();
    expect(rafQueue.length).toBe(1);
    loop.cleanup();
    expect(rafQueue.length).toBe(0);
  });

  it('removes the visibilitychange listener', () => {
    const onFrame = vi.fn();
    const loop = createAnimateLoop({ onFrame });
    loop.start();
    pumpRaf(0);
    loop.cleanup();
    // A post-cleanup visibilitychange event should not affect anything —
    // running stays false, no raf scheduled.
    Object.defineProperty(document, 'hidden', { configurable: true, value: false });
    document.dispatchEvent(new Event('visibilitychange'));
    expect(rafQueue.length).toBe(0);
    expect(loop.running).toBe(false);
  });

  it('is idempotent — second cleanup() is a no-op', () => {
    const onFrame = vi.fn();
    const loop = createAnimateLoop({ onFrame });
    loop.start();
    loop.cleanup();
    expect(() => loop.cleanup()).not.toThrow();
  });

  it('start() after cleanup() does nothing (life-cycle one-shot)', () => {
    const onFrame = vi.fn();
    const loop = createAnimateLoop({ onFrame });
    loop.cleanup();
    loop.start();
    expect(rafQueue.length).toBe(0);
    expect(loop.running).toBe(false);
  });
});
