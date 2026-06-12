import { describe, it, expect } from 'vitest';
import { predictShipPosAtMet } from './predict-ship-pos';
import type { Vec2 } from '$lib/mission-arc';

const TWO_POINT_LINE: Vec2[] = [
  { x: 0, z: 0, y: 0 },
  { x: 10, z: 5, y: 2 },
];
const FIVE_POINT_ARC: Vec2[] = [
  { x: 0, z: 0 },
  { x: 1, z: 1 },
  { x: 2, z: 4 },
  { x: 3, z: 9 },
  { x: 4, z: 16 },
];

describe('predictShipPosAtMet', () => {
  it('returns null for fewer than 2 points', () => {
    expect(predictShipPosAtMet([], 50, 100)).toBeNull();
    expect(predictShipPosAtMet([{ x: 0, z: 0 }], 50, 100)).toBeNull();
  });

  it('returns null for non-positive arrival', () => {
    expect(predictShipPosAtMet(TWO_POINT_LINE, 50, 0)).toBeNull();
    expect(predictShipPosAtMet(TWO_POINT_LINE, 50, -10)).toBeNull();
  });

  it('returns the start point exactly at met=0', () => {
    const out = predictShipPosAtMet(TWO_POINT_LINE, 0, 100);
    expect(out).toEqual({ x: 0, y: 0, z: 0 });
  });

  it('returns the end point exactly at met=arrival', () => {
    const out = predictShipPosAtMet(TWO_POINT_LINE, 100, 100);
    expect(out).toEqual({ x: 10, y: 2, z: 5 });
  });

  it('linearly interpolates between adjacent points at the midpoint', () => {
    const out = predictShipPosAtMet(TWO_POINT_LINE, 50, 100);
    expect(out).toEqual({ x: 5, y: 1, z: 2.5 });
  });

  it('clamps met < 0 to the start point', () => {
    const out = predictShipPosAtMet(TWO_POINT_LINE, -100, 100);
    expect(out).toEqual({ x: 0, y: 0, z: 0 });
  });

  it('clamps met > arrival to the end point', () => {
    const out = predictShipPosAtMet(TWO_POINT_LINE, 200, 100);
    expect(out).toEqual({ x: 10, y: 2, z: 5 });
  });

  it('treats missing y as zero (xz-only Vec2s)', () => {
    const out = predictShipPosAtMet(FIVE_POINT_ARC, 200, 400);
    expect(out?.y).toBe(0);
  });

  it('walks the right segment at fractional met (multi-point arc)', () => {
    // 5 points → 4 segments. met=100 / 400 = 0.25 → index 1.0 → exactly point[1]
    expect(predictShipPosAtMet(FIVE_POINT_ARC, 100, 400)).toEqual({ x: 1, y: 0, z: 1 });
    // met=200 / 400 = 0.5 → index 2.0 → exactly point[2]
    expect(predictShipPosAtMet(FIVE_POINT_ARC, 200, 400)).toEqual({ x: 2, y: 0, z: 4 });
    // met=300 / 400 = 0.75 → index 3.0 → exactly point[3]
    expect(predictShipPosAtMet(FIVE_POINT_ARC, 300, 400)).toEqual({ x: 3, y: 0, z: 9 });
  });
});
