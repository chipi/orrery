import { describe, expect, it } from 'vitest';
import { DESTINATIONS } from '$lib/physics/transfer/lambert-grid.constants';
import type { DestinationId } from '$lib/physics/transfer/lambert-grid.constants';
import {
  destinationExtentAu,
  easeScale2d,
  fitScale2d,
  FLY_2D_FIT_FRACTION,
  pointsExtentAu,
} from './fly-2d-scale';

const SIZES: [number, number][] = [
  [1440, 900],
  [390, 844],
  [844, 390],
];
const IDS = Object.keys(DESTINATIONS) as DestinationId[];

describe('fitScale2d (G-11a)', () => {
  it('has destinations to check', () => {
    expect(IDS.length).toBeGreaterThanOrEqual(21);
  });

  it.each(SIZES)('every destination orbit fits the shorter half-extent at %ix%i', (w, h) => {
    for (const id of IDS) {
      const ext = destinationExtentAu(id);
      const px = ext * fitScale2d(ext, w, h);
      expect(px, id).toBeLessThanOrEqual(FLY_2D_FIT_FRACTION * (Math.min(w, h) / 2) + 1e-6);
    }
  });

  it('floors the extent at 1.5 AU: Venus gets the Mars-sized fit, not a closer zoom', () => {
    expect(fitScale2d(destinationExtentAu('venus'), 1440, 900)).toBe(fitScale2d(1.5, 1440, 900));
  });

  it('Jupiter and Pluto land inside the canvas where the old fixed scale left them off it', () => {
    const old = Math.min(1440, 900) / 4;
    expect(destinationExtentAu('jupiter') * old).toBeGreaterThan(450);
    expect(
      destinationExtentAu('jupiter') * fitScale2d(destinationExtentAu('jupiter'), 1440, 900),
    ).toBeLessThan(450);
    expect(
      destinationExtentAu('pluto') * fitScale2d(destinationExtentAu('pluto'), 1440, 900),
    ).toBeLessThan(450);
  });

  it('a trajectory that runs past the destination widens the fit', () => {
    const ext = pointsExtentAu([{ x: 1, z: 0 }], [{ x: 0, z: -7 }]);
    expect(ext).toBe(7);
  });
});

describe('easeScale2d', () => {
  it('snaps on the first value', () => {
    expect(easeScale2d(0, 120, 0.016)).toBe(120);
  });

  it('settles at least 95 % of a change in 0.8 s of frames', () => {
    let s = 250;
    for (let i = 0; i < 50; i++) s = easeScale2d(s, 10, 0.016);
    expect((250 - s) / (250 - 10)).toBeGreaterThan(0.94);
    expect(s).toBeGreaterThan(10);
  });
});
