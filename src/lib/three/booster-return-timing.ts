/**
 * When a booster return plays, apart from the scene itself: LaunchScene needs these on every
 * launch, while booster-return-scene.ts (and its booster, ship and pad models) is imported only
 * when a flight has a full-frame return (route budget, scripts/route-budget.json).
 */
import { LANDING_HOLD_S } from '$lib/physics/ascent/ascent-physics';
import type { Landing } from './landing-inset';

export type ReturnLauncher = 'falcon-9' | 'new-glenn' | 'falcon-heavy';

/** The return scene for a launch profile, or null when it has none (the inset plays instead). */
export function returnLauncherFor(profileId: string): ReturnLauncher | null {
  return profileId === 'falcon-9' || profileId === 'new-glenn' || profileId === 'falcon-heavy'
    ? profileId
    : null;
}

export type BoosterReturnLanding = Landing & { entryBurnS: number };

/** Seconds the scene opens before the entry burn. */
export const RETURN_LEAD_S = 8;
export const RETURN_HOLD_S = LANDING_HOLD_S;

export function returnWindow(l: BoosterReturnLanding): [number, number] {
  return [l.entryBurnS - RETURN_LEAD_S, l.touchdownS + RETURN_HOLD_S];
}
