import { describe, expect, it } from 'vitest';
import { eastWestSourcePx } from './fetch-mars-ctx.ts';

describe('eastWestSourcePx (Murray CTX tiles are 5 m N-S but 5 x cos(lat) m E-W)', () => {
  it('is the crop size at the equator', () => {
    expect(eastWestSourcePx(3072, 0)).toBe(3072);
  });

  it('widens the window by 1 / cos(lat)', () => {
    // Jezero 18.5 N: 3482 px of ground needs ~3672 source columns, not 3482.
    expect(eastWestSourcePx(3482, 18.496)).toBe(3672);
    // Viking 2 47.7 N: 49 % wider.
    expect(eastWestSourcePx(3072, 47.67)).toBe(4562);
  });

  it('is symmetric in hemisphere', () => {
    expect(eastWestSourcePx(3072, -45)).toBe(eastWestSourcePx(3072, 45));
  });
});
