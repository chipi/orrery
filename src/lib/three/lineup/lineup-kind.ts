/**
 * The /fleet line-up kinds and which fleet categories each draws. Kept free of three.js so the
 * /fleet page can import it without pulling the 3D stack into its bundle.
 */
import type { FleetCategory } from '$types/fleet';

export type LineupKind = 'launchers' | 'spacecraft';

export const LINEUP_CATEGORIES: Record<LineupKind, FleetCategory[]> = {
  launchers: ['launcher'],
  spacecraft: ['crewed-spacecraft', 'cargo-spacecraft'],
};

/**
 * Line-ups shown on /fleet. The capsule and spacecraft line-up waits until the station visitors
 * (Soyuz MS, Progress, Dragon, Cygnus, HTV-X, Starliner, Shenzhou, Tianzhou) have showcase models;
 * their station stand-ins are too plain at true scale next to the capsules (operator, 2026-11-03).
 */
export const LINEUP_LIVE: readonly LineupKind[] = ['launchers'];

export function lineupKindFor(category: FleetCategory | 'ALL'): LineupKind | null {
  if (category === 'launcher') return 'launchers';
  if (category === 'crewed-spacecraft' || category === 'cargo-spacecraft') return 'spacecraft';
  return null;
}
