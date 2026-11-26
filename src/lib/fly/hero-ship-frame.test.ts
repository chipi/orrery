import { describe, it, expect } from 'vitest';
import { clampToFrame, heroShipScale, HERO_SHIP_NDC } from './hero-ship-frame';

describe('heroShipScale (flyby review call 6)', () => {
  it('the same share of the frame at any distance', () => {
    const frac = (d: number) => {
      const s = heroShipScale(2, d, 50);
      return (2 * s) / (2 * d * Math.tan((50 * Math.PI) / 360));
    };
    expect(frac(1)).toBeCloseTo(0.18, 10);
    expect(frac(80)).toBeCloseTo(0.18, 10);
  });

  it('a larger model gets a smaller scale', () => {
    expect(heroShipScale(4, 10, 50)).toBeCloseTo(heroShipScale(2, 10, 50) / 2, 10);
  });
});

describe('clampToFrame', () => {
  it('leaves a ship already in frame alone', () => {
    expect(clampToFrame({ x: 0, y: 0, z: 0.5 })).toBeNull();
  });

  it('pulls a ship on the top edge back inside, keeping its depth', () => {
    expect(clampToFrame({ x: 0.1, y: 0.95, z: 0.7 })).toEqual({
      x: 0.1,
      y: HERO_SHIP_NDC.maxY,
      z: 0.7,
    });
    expect(clampToFrame({ x: -0.9, y: -0.9, z: 0.7 })).toEqual({
      x: HERO_SHIP_NDC.minX,
      y: HERO_SHIP_NDC.minY,
      z: 0.7,
    });
  });

  it('ignores a point past the far plane', () => {
    expect(clampToFrame({ x: 3, y: 0, z: 1.2 })).toBeNull();
  });
});
