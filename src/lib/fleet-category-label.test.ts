import { describe, expect, it } from 'vitest';
import { fleetCategoryLabel } from './fleet-category-label';
import type { FleetCategory } from '$types/fleet';

const CATEGORIES: FleetCategory[] = [
  'launcher',
  'crewed-spacecraft',
  'cargo-spacecraft',
  'station',
  'rover',
  'lander',
  'orbiter',
  'observatory',
  'space-suit',
  'constellation',
  'launch-site',
  'engine',
];

describe('fleetCategoryLabel', () => {
  it('gives every category a label that is not its raw id', () => {
    for (const c of CATEGORIES) {
      const label = fleetCategoryLabel(c);
      expect(label, c).toBeTruthy();
      expect(label, c).not.toBe(c);
    }
  });

  it('falls back to the id for a category it does not know', () => {
    expect(fleetCategoryLabel('mystery')).toBe('mystery');
  });
});
