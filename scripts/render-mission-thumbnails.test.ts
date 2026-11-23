import { describe, expect, it } from 'vitest';
import { getEarthOrbitCoast } from '../src/lib/orbital/earth-orbit-registry';
import { suborbitalSpanRad } from './render-mission-thumbnails';

describe('suborbital thumbnail arch', () => {
  it("spans the coast's own arc when the registry gives one: Starship Flight 5 goes 165 degrees around", () => {
    const c = getEarthOrbitCoast('starship-flight-5')!;
    expect((suborbitalSpanRad(c) * 180) / Math.PI).toBeCloseTo(165, 5);
  });
  it('keeps the short drawn hop for a suborbital flight with no arc (Freedom 7)', () => {
    const c = getEarthOrbitCoast('freedom-7')!;
    expect((suborbitalSpanRad(c) * 180) / Math.PI).toBeCloseTo(93.6, 5);
  });
});
