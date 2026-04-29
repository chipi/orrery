import { describe, it, expect } from 'vitest';
import { categoriseMoonMarker } from './moon-marker-category';

describe('categoriseMoonMarker', () => {
  it('returns "lander" for undefined / empty', () => {
    expect(categoriseMoonMarker(undefined)).toBe('lander');
    expect(categoriseMoonMarker('')).toBe('lander');
  });

  it('classifies plain CREWED LANDER as crewed', () => {
    expect(categoriseMoonMarker('CREWED LANDER · FLOWN')).toBe('crewed');
    expect(categoriseMoonMarker('CREWED LANDER · PLANNED')).toBe('crewed');
  });

  it('classifies multi-tag CREWED LANDER · ROVER as crewed (priority over rover)', () => {
    expect(categoriseMoonMarker('CREWED LANDER · ROVER · FLOWN')).toBe('crewed');
  });

  it('classifies SAMPLE RETURN as sample-return', () => {
    expect(categoriseMoonMarker('SAMPLE RETURN · FLOWN')).toBe('sample-return');
    expect(categoriseMoonMarker('FAR-SIDE SAMPLE RETURN · FLOWN')).toBe('sample-return');
  });

  it('classifies LANDER · ROVER as rover (rover wins over plain lander)', () => {
    expect(categoriseMoonMarker('LANDER · ROVER · FLOWN')).toBe('rover');
    expect(categoriseMoonMarker('FAR-SIDE LANDER · ROVER · ACTIVE')).toBe('rover');
    expect(categoriseMoonMarker('ROVER · FLOWN')).toBe('rover');
  });

  it('classifies ORBITER as orbiter', () => {
    expect(categoriseMoonMarker('ORBITER · ACTIVE')).toBe('orbiter');
    expect(categoriseMoonMarker('ORBITER · FLOWN')).toBe('orbiter');
  });

  it('classifies plain LANDER (no rover, no crew) as lander', () => {
    expect(categoriseMoonMarker('UNCREWED LANDER · FLOWN')).toBe('lander');
    expect(categoriseMoonMarker('PRECISION LANDER · ACTIVE')).toBe('lander');
  });

  it('is case-insensitive', () => {
    expect(categoriseMoonMarker('crewed lander · flown')).toBe('crewed');
    expect(categoriseMoonMarker('Sample Return · Flown')).toBe('sample-return');
  });
});
