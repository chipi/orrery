import { describe, it, expect } from 'vitest';
import {
  normalizeStar,
  DEFAULT_CI,
  UNKNOWN_DISTANCE_PC,
  type RawHygStar,
} from './star-normalize';

const raw = (over: Partial<RawHygStar> = {}): RawHygStar => ({
  id: 1,
  distPc: 10,
  mag: 5,
  ci: 0.5,
  x: 1,
  y: 2,
  z: 3,
  ...over,
});

describe('normalizeStar', () => {
  it('passes a well-formed star through with its position, magnitude and ci', () => {
    expect(normalizeStar(raw())).toEqual({ x: 1, y: 2, z: 3, mag: 5, ci: 0.5 });
  });

  it('drops the Sun (id 0) — it is the origin of the context, not a field star', () => {
    expect(normalizeStar(raw({ id: 0 }))).toBeNull();
  });

  it('drops stars with no usable distance', () => {
    expect(normalizeStar(raw({ distPc: UNKNOWN_DISTANCE_PC }))).toBeNull();
    expect(normalizeStar(raw({ distPc: 0 }))).toBeNull();
    expect(normalizeStar(raw({ distPc: -5 }))).toBeNull();
    expect(normalizeStar(raw({ distPc: Number.NaN }))).toBeNull();
  });

  it('drops rows with a non-finite coordinate or magnitude', () => {
    expect(normalizeStar(raw({ x: Number.NaN }))).toBeNull();
    expect(normalizeStar(raw({ z: Number.POSITIVE_INFINITY }))).toBeNull();
    expect(normalizeStar(raw({ mag: Number.NaN }))).toBeNull();
  });

  it('substitutes the neutral default when the color index is missing', () => {
    expect(normalizeStar(raw({ ci: null }))?.ci).toBe(DEFAULT_CI);
  });

  it('keeps a valid negative color index (hot blue stars)', () => {
    expect(normalizeStar(raw({ ci: -0.3 }))?.ci).toBe(-0.3);
  });
});
