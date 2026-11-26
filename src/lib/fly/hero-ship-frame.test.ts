import { describe, it, expect } from 'vitest';
import {
  clampToFrame,
  clearOfBody,
  heroShipScale,
  inFrame,
  HERO_SHIP_NDC,
} from './hero-ship-frame';

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

describe('inFrame', () => {
  it('a body behind the right panel is out of frame (Giotto at Halley, x 0.76)', () => {
    expect(inFrame({ x: 0.76, y: 0.3, z: 0.65 })).toBe(false);
    expect(inFrame({ x: 0, y: 0, z: 0.5 })).toBe(true);
  });

  it('a point behind the camera is never in frame', () => {
    expect(inFrame({ x: 0, y: 0, z: 1.2 })).toBe(false);
  });
});

describe('clearOfBody', () => {
  it('moves a ship in front of a comet to beside it, on its own side', () => {
    const p = clearOfBody({ x: 0, y: 0.1, z: 0.6 }, { x: 0, y: -0.13 }, 0.2, 0.2, 1.6)!;
    expect(p.y).toBeCloseTo(-0.13 + 0.4, 10);
    expect(p.x).toBeCloseTo(0, 10);
    expect(p.z).toBe(0.6);
  });

  it('leaves a ship already clear alone', () => {
    expect(clearOfBody({ x: 0.5, y: 0.5, z: 0.6 }, { x: 0, y: 0 }, 0.1, 0.1, 1.6)).toBeNull();
  });

  it('measures across the aspect: 0.2 NDC in x on a 1.6 screen is 0.32 height units', () => {
    expect(clearOfBody({ x: 0.2, y: 0, z: 0.5 }, { x: 0, y: 0 }, 0.15, 0.15, 1.6)).toBeNull();
    expect(clearOfBody({ x: 0.2, y: 0, z: 0.5 }, { x: 0, y: 0 }, 0.2, 0.15, 1.6)).not.toBeNull();
  });
});
