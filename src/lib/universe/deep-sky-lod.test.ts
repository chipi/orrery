import { describe, it, expect } from 'vitest';
import {
  smoothstep,
  deepSkyGlintBloom,
  deepSkyImmersionOpacity,
  deepSkyRung,
  DEEP_SKY_PHOTO_IN,
  DEEP_SKY_PHOTO_OUT,
  DEEP_SKY_FULL_IN,
  DEEP_SKY_FULL_OUT,
  type DeepSkyRung,
} from './deep-sky-lod';

describe('smoothstep', () => {
  it('clamps below/above the edges', () => {
    expect(smoothstep(0, 1, -1)).toBe(0);
    expect(smoothstep(0, 1, 2)).toBe(1);
  });
  it('is 0.5 at the midpoint', () => {
    expect(smoothstep(0, 1, 0.5)).toBeCloseTo(0.5, 5);
  });
  it('handles a degenerate range', () => {
    expect(smoothstep(0.5, 0.5, 0.4)).toBe(0);
    expect(smoothstep(0.5, 0.5, 0.6)).toBe(1);
  });
});

describe('deepSkyGlintBloom', () => {
  it('is 1 at ambient and grows monotonically', () => {
    expect(deepSkyGlintBloom(0)).toBe(1);
    expect(deepSkyGlintBloom(1)).toBe(3);
    expect(deepSkyGlintBloom(0.5)).toBeGreaterThan(deepSkyGlintBloom(0.2));
  });
  it('clamps out-of-range approach', () => {
    expect(deepSkyGlintBloom(-1)).toBe(1);
    expect(deepSkyGlintBloom(2)).toBe(3);
  });
});

describe('deepSkyImmersionOpacity', () => {
  it('stays 0 through the early approach', () => {
    expect(deepSkyImmersionOpacity(0)).toBe(0);
    expect(deepSkyImmersionOpacity(DEEP_SKY_FULL_OUT)).toBe(0);
  });
  it('reaches 1 at full immersion and is monotonic', () => {
    expect(deepSkyImmersionOpacity(1)).toBe(1);
    expect(deepSkyImmersionOpacity(0.9)).toBeGreaterThan(deepSkyImmersionOpacity(0.6));
  });
});

describe('deepSkyRung', () => {
  it('requests nothing until the photo-in threshold', () => {
    expect(deepSkyRung(0, 'none')).toBe('none');
    expect(deepSkyRung(DEEP_SKY_PHOTO_IN - 0.01, 'none')).toBe('none');
    expect(deepSkyRung(DEEP_SKY_PHOTO_IN, 'none')).toBe('thumb');
  });
  it('upgrades to full at the full-in threshold', () => {
    expect(deepSkyRung(DEEP_SKY_FULL_IN, 'thumb')).toBe('full');
    expect(deepSkyRung(DEEP_SKY_FULL_IN - 0.01, 'thumb')).toBe('thumb');
  });
  it('holds full-res through hysteresis (does not drop until FULL_OUT)', () => {
    // Between FULL_OUT and FULL_IN, a loaded full stays full.
    const mid = (DEEP_SKY_FULL_OUT + DEEP_SKY_FULL_IN) / 2;
    expect(deepSkyRung(mid, 'full')).toBe('full');
    // Fresh (prev thumb) at the same approach would NOT be full yet.
    expect(deepSkyRung(mid, 'thumb')).toBe('thumb');
  });
  it('holds the photo shown through hysteresis (does not drop until PHOTO_OUT)', () => {
    const low = (DEEP_SKY_PHOTO_OUT + DEEP_SKY_PHOTO_IN) / 2;
    expect(deepSkyRung(low, 'thumb')).toBe('thumb');
    expect(deepSkyRung(low, 'none')).toBe('none');
  });
  it('drops to none below PHOTO_OUT even from a loaded state', () => {
    expect(deepSkyRung(DEEP_SKY_PHOTO_OUT - 0.01, 'full')).toBe('none');
  });
  it('full monotone sweep up then down is stable (no oscillation)', () => {
    let prev: DeepSkyRung = 'none';
    const up: DeepSkyRung[] = [];
    for (let a = 0; a <= 1.0001; a += 0.05) {
      prev = deepSkyRung(a, prev);
      up.push(prev);
    }
    expect(up[0]).toBe('none');
    expect(up[up.length - 1]).toBe('full');
    const down: DeepSkyRung[] = [];
    for (let a = 1; a >= -0.0001; a -= 0.05) {
      prev = deepSkyRung(a, prev);
      down.push(prev);
    }
    expect(down[down.length - 1]).toBe('none');
  });
});
