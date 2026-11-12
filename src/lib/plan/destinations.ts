import type { PlanDestinationId } from '$lib/physics/transfer/lambert-grid.constants';

/**
 * Every destination /plan lists, ordered as an outward tour (each planet's moons follow it,
 * ADR-086). The selector reads this list; so does a body panel that offers "Plan mission".
 */
export const PLAN_DESTINATION_IDS: PlanDestinationId[] = [
  'moon',
  'mercury',
  'venus',
  'mars',
  'phobos',
  'deimos',
  'vesta',
  'ceres',
  'psyche',
  'jupiter',
  'io',
  'europa',
  'ganymede',
  'callisto',
  'saturn',
  'titan',
  'enceladus',
  'uranus',
  'neptune',
  'triton',
  'pluto',
  'bennu',
];

/** Whether /plan can plot a mission to this body (`?dest=<id>`). */
export function isPlanDestination(id: string): boolean {
  return (PLAN_DESTINATION_IDS as string[]).includes(id);
}
