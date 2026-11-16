import { describe, expect, it } from 'vitest';
import smallBodies from '$data/small-bodies.json';
import { PLAN_DESTINATION_GROUPS, PLAN_DESTINATION_IDS, isPlanDestination } from './destinations';

describe('/plan destination groups (the select’s optgroups)', () => {
  it('has the five groups, in order, with exactly the agreed members', () => {
    expect(PLAN_DESTINATION_GROUPS.map((g) => [g.id, g.members])).toEqual([
      ['inner', ['moon', 'mercury', 'venus', 'mars', 'phobos', 'deimos']],
      ['asteroids', ['vesta', 'ceres', 'psyche', 'bennu']],
      ['jupiter', ['jupiter', 'io', 'europa', 'ganymede', 'callisto']],
      ['saturn', ['saturn', 'titan', 'enceladus']],
      ['outer', ['uranus', 'neptune', 'triton', 'pluto']],
    ]);
  });

  it('puts every destination in exactly one group (22 in all) and derives the flat list from them', () => {
    const all = PLAN_DESTINATION_GROUPS.flatMap((g) => g.members);
    expect(all).toHaveLength(22);
    expect(new Set(all).size).toBe(22);
    expect([...PLAN_DESTINATION_IDS].sort()).toEqual([...all].sort());
  });
});

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
