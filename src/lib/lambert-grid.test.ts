import { describe, it, expect, vi } from 'vitest';
import { computePorkchopGrid, DV_FAILED } from './lambert-grid';
import type { LambertRequest } from './lambert-grid';

const REQ: LambertRequest = {
  id: 1,
  depRange: [0, 1460],
  arrRange: [80, 520],
  steps: [16, 12], // small grid keeps the test fast (192 cells vs 11,200)
};

describe('computePorkchopGrid', () => {
  it('returns a grid with the requested dimensions', () => {
    const result = computePorkchopGrid(
      REQ,
      () => {},
      () => false,
    );
    expect(result).not.toBeNull();
    if (!result) return;
    const [w, h] = REQ.steps;
    expect(result.depDays).toHaveLength(w);
    expect(result.arrDays).toHaveLength(h);
    expect(result.grid).toHaveLength(h);
    for (const row of result.grid) {
      expect(row).toHaveLength(w);
    }
  });

  it('depDays / arrDays span the requested ranges with uniform spacing', () => {
    const result = computePorkchopGrid(
      REQ,
      () => {},
      () => false,
    );
    if (!result) throw new Error('expected non-null result');
    expect(result.depDays[0]).toBe(REQ.depRange[0]);
    expect(result.depDays.at(-1)).toBe(REQ.depRange[1]);
    expect(result.arrDays[0]).toBe(REQ.arrRange[0]);
    expect(result.arrDays.at(-1)).toBe(REQ.arrRange[1]);
    // Uniform spacing — adjacent deltas equal across the array.
    const expectedStep = (REQ.depRange[1] - REQ.depRange[0]) / (REQ.steps[0] - 1);
    for (let i = 1; i < result.depDays.length; i++) {
      expect(result.depDays[i] - result.depDays[i - 1]).toBeCloseTo(expectedStep, 9);
    }
  });

  it('every cell is a finite ∆v in the canonical km/s range', () => {
    const result = computePorkchopGrid(
      REQ,
      () => {},
      () => false,
    );
    if (!result) throw new Error('expected non-null result');
    for (const row of result.grid) {
      for (const dv of row) {
        expect(Number.isFinite(dv)).toBe(true);
        expect(dv).toBeGreaterThanOrEqual(3.2);
        expect(dv).toBeLessThanOrEqual(DV_FAILED);
      }
    }
  });

  it('emits progress every 10 rows + final row', () => {
    const onProgress = vi.fn();
    computePorkchopGrid(
      { ...REQ, steps: [4, 25] }, // 25 rows → progress at 0, 10, 20, 24
      onProgress,
      () => false,
    );
    // j=0 (row 1), j=10 (row 11), j=20 (row 21), j=24 (final)
    expect(onProgress).toHaveBeenCalledTimes(4);
    // Last call should be 1.0
    const lastCall = onProgress.mock.calls.at(-1);
    expect(lastCall?.[0]).toBeCloseTo(1.0, 5);
    // First call should be small (1/25)
    const firstCall = onProgress.mock.calls[0];
    expect(firstCall[0]).toBeGreaterThan(0);
    expect(firstCall[0]).toBeLessThan(0.1);
  });

  it('returns null mid-flight when shouldCancel flips true', () => {
    let calls = 0;
    const result = computePorkchopGrid(
      REQ,
      () => {},
      () => {
        calls++;
        return calls > 3; // cancel after a few row checks
      },
    );
    expect(result).toBeNull();
  });

  it('returns null when shouldCancel is true on the first check', () => {
    const result = computePorkchopGrid(
      REQ,
      () => {},
      () => true,
    );
    expect(result).toBeNull();
  });

  it('produces a cheap basin near the Hohmann transfer', () => {
    const result = computePorkchopGrid(
      REQ,
      () => {},
      () => false,
    );
    if (!result) throw new Error('expected non-null result');
    // The minimum across the whole grid for the 4-year window should
    // sit comfortably below the deep-red ceiling. Hohmann ∆v from
    // Earth → Mars is ~5.6 km/s and typical low-energy launch windows
    // come out around 6–8 km/s with this simplified model.
    let min = Infinity;
    for (const row of result.grid) for (const dv of row) if (dv < min) min = dv;
    expect(min).toBeLessThan(10);
    expect(min).toBeGreaterThan(3.2); // floor sentinel
  });
});
