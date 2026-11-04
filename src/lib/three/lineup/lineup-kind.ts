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

/** Line-ups shown on /fleet (a kind can be held back here while its models are not ready). */
export const LINEUP_LIVE: readonly LineupKind[] = ['launchers', 'spacecraft'];

export function lineupKindFor(category: FleetCategory | 'ALL'): LineupKind | null {
  if (category === 'launcher') return 'launchers';
  if (category === 'crewed-spacecraft' || category === 'cargo-spacecraft') return 'spacecraft';
  return null;
}
