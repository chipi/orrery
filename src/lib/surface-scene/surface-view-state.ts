/**
 * Pure view-state rules for the surface scene's close-range modes (panorama
 * "Stand here", flat-patch "Zoom in", route view). Kept out of
 * SurfaceScene.svelte so the rules are unit-testable.
 */

/** Closest camera distance the 3D band can still fly in from; flat-patch opens below 30.1. */
export const DETAIL_FLY_TARGET_R = 30.08;

/**
 * "Zoom in" flies the camera to DETAIL_FLY_TARGET_R. It is a no-op only when the
 * camera is already there. It used to bail below camR 32, which made the button
 * dead for a route view framed at 31-32 (Spirit's drive frames at 31.6).
 */
export function shouldFlyToDetail(camR: number): boolean {
  return camR > DETAIL_FLY_TARGET_R + 0.05;
}

export interface NationFilterVisibilityInput {
  view: '2d' | '3d';
  tagStageOn: boolean;
  altitudeKm: number;
  radiusKm: number;
  routeViewActive: boolean;
  flatPatchActive: boolean;
}

/**
 * Whether the nations filter strip is faded away. The 2D map always shows it;
 * the 3D globe shows it only once site icons are out, and never in the close
 * modes: route view and flat-patch frame imagery the strip would cover
 * (panorama unmounts it outright).
 */
export function nationFilterAway(i: NationFilterVisibilityInput): boolean {
  if (i.view === '2d') return false;
  if (i.routeViewActive || i.flatPatchActive) return true;
  return !(i.tagStageOn && i.altitudeKm >= i.radiusKm * 0.044);
}

/** The mobile Nations tab lives in the drawer group, hidden in the same modes. */
export function mobileDrawerHidden(i: {
  routeViewActive: boolean;
  flatPatchActive: boolean;
}): boolean {
  return i.routeViewActive || i.flatPatchActive;
}
