import { describe, expect, it } from 'vitest';
import { anchorTurn, groundAngle, radPerPx } from './touch-camera';

const R = 30;
const HALF_FOV = (45 * Math.PI) / 180 / 2;
const HALF_H = 422;

describe('groundAngle', () => {
  it('is 0 on the view axis and grows off it', () => {
    expect(groundAngle(0, 36, R)).toBe(0);
    expect(groundAngle(0.1, 36, R)!).toBeGreaterThan(0);
  });
  it('is null past the horizon', () => {
    expect(groundAngle(Math.PI / 2, 36, R)).toBeNull();
  });
  it('matches the flat-ground limit close in: height × tan(alpha) / r', () => {
    const a = 0.2;
    expect(groundAngle(a, 30.01, R)!).toBeCloseTo((0.01 * Math.tan(a)) / R, 6);
  });
});

describe('anchorTurn', () => {
  it('does not turn for a pinch at the view centre', () => {
    expect(anchorTurn(0, HALF_H, HALF_FOV, 36, 33)).toBe(0);
  });
  it('turns toward the fingers when zooming in, away when zooming out', () => {
    expect(anchorTurn(150, HALF_H, HALF_FOV, 36, 33)).toBeGreaterThan(0);
    expect(anchorTurn(150, HALF_H, HALF_FOV, 33, 36)).toBeLessThan(0);
  });
  // After the turn the ground point that was under the fingers is under them again: the new
  // sub-camera point plus the new ray's ground angle lands where the old ray did.
  it('keeps the ground under the fingers', () => {
    const off = 200;
    const alpha = Math.atan((off / HALF_H) * Math.tan(HALF_FOV));
    const before = groundAngle(alpha, 40, R)!;
    const turn = anchorTurn(off, HALF_H, HALF_FOV, 40, 31);
    expect(turn + groundAngle(alpha, 31, R)!).toBeCloseTo(before, 10);
  });
});

describe('radPerPx', () => {
  it('scales with the height above the ground, not the distance from the centre', () => {
    expect(radPerPx(36, HALF_H, HALF_FOV) / radPerPx(31, HALF_H, HALF_FOV)).toBeCloseTo(6, 6);
  });
  it('moves the ground one pixel at the centre', () => {
    const k = radPerPx(36, HALF_H, HALF_FOV);
    const onePx = Math.atan((1 / HALF_H) * Math.tan(HALF_FOV));
    expect(k).toBeCloseTo(groundAngle(onePx, 36, R)!, 7);
  });
});
