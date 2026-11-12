import { describe, expect, it } from 'vitest';
import smallBodies from '$data/small-bodies.json';
import { PLAN_DESTINATION_IDS, isPlanDestination } from './destinations';

describe('/plan destinations', () => {
  it('lists every destination once', () => {
    expect(new Set(PLAN_DESTINATION_IDS).size).toBe(PLAN_DESTINATION_IDS.length);
  });

  it('knows the small bodies a mission can be planned to (the small-body panel offers Plan mission)', () => {
    const ids = smallBodies.bodies.map((b: { id: string }) => b.id);
    expect(ids.filter(isPlanDestination).sort()).toEqual(
      ['bennu', 'ceres', 'pluto', 'psyche', 'vesta'].sort(),
    );
  });

  it('refuses what /plan cannot plot', () => {
    expect(isPlanDestination('halley')).toBe(false);
    expect(isPlanDestination('eris')).toBe(false);
    expect(isPlanDestination('')).toBe(false);
  });
});
