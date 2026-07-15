import { describe, it, expect } from 'vitest';
import { lyToScene, lightShells, LY_PER_PC, CAUSALITY_EPOCHS, CAUSALITY_NOW } from './causality';

describe('causality lens defaults', () => {
  it('epochs are past, ordered newest→oldest, and produce sorted shells', () => {
    expect(CAUSALITY_NOW).toBeGreaterThan(CAUSALITY_EPOCHS[0]);
    for (let i = 1; i < CAUSALITY_EPOCHS.length; i++) {
      expect(CAUSALITY_EPOCHS[i]).toBeLessThan(CAUSALITY_EPOCHS[i - 1]);
    }
    const shells = lightShells(CAUSALITY_EPOCHS, CAUSALITY_NOW);
    expect(shells).toHaveLength(CAUSALITY_EPOCHS.length);
    expect(shells.map((s) => s.radius)).toEqual(
      [...shells.map((s) => s.radius)].sort((a, b) => a - b),
    );
  });
});

describe('lyToScene', () => {
  it('converts light-years to parsecs', () => {
    expect(lyToScene(LY_PER_PC)).toBeCloseTo(1, 6); // one pc's worth of ly → 1 unit
    expect(lyToScene(0)).toBe(0);
  });
});

describe('lightShells', () => {
  it('radius = light-travel distance since the epoch', () => {
    const [s] = lightShells([2000], 2100);
    expect(s.ly).toBe(100);
    expect(s.radius).toBeCloseTo(100 / LY_PER_PC, 6);
    expect(s.epoch).toBe(2000);
  });
  it('older epochs give larger shells; sorted inner→outer', () => {
    const shells = lightShells([1900, 2000, 1800], 2026);
    expect(shells.map((s) => s.epoch)).toEqual([2000, 1900, 1800]);
    expect(shells[0].radius).toBeLessThan(shells[2].radius);
  });
  it('drops future/zero epochs and shells beyond maxScene', () => {
    const shells = lightShells([2050, 2000, 1000], 2026, 50);
    // 2050 → future (0); 1000 → 1026 ly ≈ 314 pc > 50 dropped; 2000 → 26 ly ≈ 8 pc kept.
    expect(shells).toHaveLength(1);
    expect(shells[0].epoch).toBe(2000);
  });
});
