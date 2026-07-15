import { describe, it, expect } from 'vitest';
import {
  categoryColor,
  angularSizeFactor,
  directionToPosition,
  isGatewayCategory,
  DEEP_SKY_RADIUS,
} from './deep-sky-visual';
import type { DeepSkyCategory } from '$lib/data';

describe('categoryColor', () => {
  const cats: DeepSkyCategory[] = [
    'galaxy',
    'galaxy-cluster',
    'nebula',
    'planetary-nebula',
    'supernova-remnant',
    'star-forming-region',
    'dark-nebula',
    'star-cluster',
    'globular-cluster',
    'star',
    'other',
  ];
  it('returns a #rrggbb hex for every category', () => {
    for (const c of cats) expect(categoryColor(c)).toMatch(/^#[0-9a-f]{6}$/i);
  });
  it('distinguishes emission from planetary nebulae', () => {
    expect(categoryColor('star-forming-region')).not.toBe(categoryColor('planetary-nebula'));
  });
});

describe('angularSizeFactor', () => {
  it('maps null/zero/negative to 1', () => {
    expect(angularSizeFactor(null)).toBe(1);
    expect(angularSizeFactor(0)).toBe(1);
    expect(angularSizeFactor(-5)).toBe(1);
  });
  it('is monotonic in size', () => {
    expect(angularSizeFactor(2)).toBeLessThan(angularSizeFactor(20));
    expect(angularSizeFactor(20)).toBeLessThan(angularSizeFactor(180));
  });
  it('is bounded to [0.6, 2.4]', () => {
    expect(angularSizeFactor(0.01)).toBeGreaterThanOrEqual(0.6);
    expect(angularSizeFactor(100000)).toBeLessThanOrEqual(2.4);
  });
  it('keeps a giant well under 90× a small object (log-compressed)', () => {
    const ratio = angularSizeFactor(180) / angularSizeFactor(2);
    expect(ratio).toBeLessThan(4);
  });
});

describe('directionToPosition', () => {
  it('scales a unit direction by the default radius', () => {
    expect(directionToPosition(1, 0, 0)).toEqual([DEEP_SKY_RADIUS, 0, 0]);
  });
  it('honours an explicit radius', () => {
    expect(directionToPosition(0, 1, 0, 10)).toEqual([0, 10, 0]);
    expect(directionToPosition(0, 0, -1, 5)).toEqual([0, 0, -5]);
  });
});

describe('isGatewayCategory', () => {
  it('is true only for star-forming regions', () => {
    expect(isGatewayCategory('star-forming-region')).toBe(true);
    expect(isGatewayCategory('galaxy')).toBe(false);
    expect(isGatewayCategory('planetary-nebula')).toBe(false);
  });
});
