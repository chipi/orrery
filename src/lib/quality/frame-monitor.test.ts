import { describe, it, expect, vi } from 'vitest';
import { attachFrameMonitor, nextLowerTier } from './frame-monitor';

describe('attachFrameMonitor', () => {
  it('does not fire when frames are healthy', () => {
    let t = 0;
    const onStruggle = vi.fn();
    const monitor = attachFrameMonitor({
      windowMs: 1000,
      frameBudgetMs: 33.3,
      sustainedFor: 500,
      cooldownMs: 5000,
      getNow: () => t,
      onStruggle,
    });
    // Simulate 5 s of 16 ms frames (60 fps — under budget).
    for (let i = 0; i < 300; i++) {
      t += 16;
      monitor.tick();
    }
    monitor.stop();
    expect(onStruggle).not.toHaveBeenCalled();
  });

  it('ignores backgrounded-tab dt samples (>500ms)', () => {
    let t = 0;
    const onStruggle = vi.fn();
    const monitor = attachFrameMonitor({
      windowMs: 1000,
      frameBudgetMs: 33.3,
      sustainedFor: 500,
      cooldownMs: 5000,
      getNow: () => t,
      onStruggle,
    });
    // Warm up with normal frames.
    for (let i = 0; i < 30; i++) {
      t += 16;
      monitor.tick();
    }
    // Simulate a 3 s tab background — single huge dt sample.
    t += 3000;
    monitor.tick();
    // Resume normal frames.
    for (let i = 0; i < 30; i++) {
      t += 16;
      monitor.tick();
    }
    monitor.stop();
    expect(onStruggle).not.toHaveBeenCalled();
  });

  it('fires onStruggle for sustained slow frames', () => {
    let t = 0;
    const onStruggle = vi.fn();
    const monitor = attachFrameMonitor({
      windowMs: 1000,
      frameBudgetMs: 33.3,
      sustainedFor: 500,
      cooldownMs: 5000,
      getNow: () => t,
      onStruggle,
    });
    // Simulate 3 s of 50 ms frames (20 fps — over budget).
    for (let i = 0; i < 60; i++) {
      t += 50;
      monitor.tick();
    }
    monitor.stop();
    expect(onStruggle).toHaveBeenCalled();
    expect(onStruggle.mock.calls[0][0]).toBeGreaterThan(33.3);
  });

  it('respects cooldown — fires once not twice', () => {
    let t = 0;
    const onStruggle = vi.fn();
    const monitor = attachFrameMonitor({
      windowMs: 1000,
      frameBudgetMs: 33.3,
      sustainedFor: 500,
      cooldownMs: 5000,
      getNow: () => t,
      onStruggle,
    });
    // 4 s of slow frames.
    for (let i = 0; i < 80; i++) {
      t += 50;
      monitor.tick();
    }
    monitor.stop();
    // Should have fired exactly once thanks to cooldown.
    expect(onStruggle).toHaveBeenCalledTimes(1);
  });

  // #334 slice 34 — accessors for the DebugPanel "Rendering" tab.
  it('getAvgFrameMs returns 0 until the 5-sample floor is reached', () => {
    let t = 0;
    const monitor = attachFrameMonitor({ getNow: () => t, onStruggle: () => {} });
    for (let i = 0; i < 3; i++) {
      t += 16;
      monitor.tick();
    }
    expect(monitor.getAvgFrameMs()).toBe(0);
    for (let i = 0; i < 10; i++) {
      t += 16;
      monitor.tick();
    }
    expect(monitor.getAvgFrameMs()).toBeCloseTo(16, 0);
    monitor.stop();
  });

  it('getLastStruggleAt updates when onStruggle fires', () => {
    let t = 0;
    const monitor = attachFrameMonitor({
      windowMs: 1000,
      frameBudgetMs: 33.3,
      sustainedFor: 500,
      cooldownMs: 5000,
      getNow: () => t,
      onStruggle: () => {},
    });
    expect(monitor.getLastStruggleAt()).toBe(-Infinity);
    for (let i = 0; i < 80; i++) {
      t += 50;
      monitor.tick();
    }
    expect(monitor.getLastStruggleAt()).toBeGreaterThan(0);
    monitor.stop();
  });
});

describe('nextLowerTier', () => {
  it('demotes one rung', () => {
    expect(nextLowerTier('cinematic')).toBe('high');
    expect(nextLowerTier('high')).toBe('medium');
    expect(nextLowerTier('medium')).toBe('low');
    expect(nextLowerTier('low')).toBe('minimal');
  });
  it('returns null at the floor', () => {
    expect(nextLowerTier('minimal')).toBeNull();
  });
});
