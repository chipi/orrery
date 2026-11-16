import type { PlanDestinationId } from '$lib/physics/transfer/lambert-grid.constants';

export interface PlanDestinationGroup {
  /** The label is the message `plan_group_<id>` (the page maps it: messages are never looked up by a computed key). */
  id: 'inner' | 'asteroids' | 'jupiter' | 'saturn' | 'outer';
  members: PlanDestinationId[];
}

/**
 * Every destination /plan lists, in the five groups its destination `select` shows (UXD-042).
 * Within a group the planet comes first, its moons after (ADR-086). Ceres and Pluto sit with
 * the bodies they are listed beside (the asteroids, the outer system); Bennu with the asteroids.
 */
export const PLAN_DESTINATION_GROUPS: PlanDestinationGroup[] = [
  { id: 'inner', members: ['moon', 'mercury', 'venus', 'mars', 'phobos', 'deimos'] },
  { id: 'asteroids', members: ['vesta', 'ceres', 'psyche', 'bennu'] },
  { id: 'jupiter', members: ['jupiter', 'io', 'europa', 'ganymede', 'callisto'] },
  { id: 'saturn', members: ['saturn', 'titan', 'enceladus'] },
  { id: 'outer', members: ['uranus', 'neptune', 'triton', 'pluto'] },
];

/** The flat list of every destination, in group order. A body panel's "Plan mission" chip reads it. */
export const PLAN_DESTINATION_IDS: PlanDestinationId[] = PLAN_DESTINATION_GROUPS.flatMap(
  (g) => g.members,
);

/** Whether /plan can plot a mission to this body (`?dest=<id>`). */
export function isPlanDestination(id: string): boolean {
  return (PLAN_DESTINATION_IDS as string[]).includes(id);
}
