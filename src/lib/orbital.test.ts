import { describe, it, expect } from 'vitest';
import { visViva } from './orbital';

describe('visViva', () => {
  it('Earth at 1 AU ≈ 29.78 km/s', () => {
    expect(visViva(1.0, 1.0)).toBeCloseTo(29.78, 1);
  });

  it('Mars at 1.524 AU ≈ 24.13 km/s', () => {
    expect(visViva(1.524, 1.524)).toBeCloseTo(24.13, 1);
  });

  it('Hohmann transfer perihelion (a=1.262, r=1.0) ≈ 32.73 km/s', () => {
    expect(visViva(1.262, 1.0)).toBeCloseTo(32.73, 1);
  });
});
