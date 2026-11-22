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

/** Scene radius of the globe surface; camR is measured from the centre. */
export const SURFACE_R = 30;

/**
 * A pinch scales the altitude, so the fingers' ratio is the zoom at every height. Scaling
 * camR itself made a 20 % spread at altitude 7 land 8x closer and skip the imagery bands.
 */
export function pinchCamR(
  camR: number,
  prevDist: number,
  dist: number,
  lim: { floor: number; max: number },
): number {
  const r = SURFACE_R + (camR - SURFACE_R) * (prevDist / dist);
  return Math.max(lim.floor, Math.min(lim.max, r));
}

export interface NationFilterVisibilityInput {
  view: '2d' | '3d';
  tagStageOn: boolean;
  altitudeKm: number;
  radiusKm: number;
  routeViewActive: boolean;
  flatPatchActive: boolean;
  /** Zoom-in fly in progress (altitude still high until the patch opens). */
  detailFlying?: boolean;
}

/**
 * Whether the nations filter strip is faded away. The 2D map always shows it;
 * the 3D globe shows it only once site icons are out, and never in the close
 * modes: route view and flat-patch frame imagery the strip would cover
 * (panorama unmounts it outright).
 */
export function nationFilterAway(i: NationFilterVisibilityInput): boolean {
  if (i.view === '2d') return false;
  if (i.routeViewActive || i.flatPatchActive || i.detailFlying) return true;
  return !(i.tagStageOn && i.altitudeKm >= i.radiusKm * 0.044);
}

/** The mobile Nations tab lives in the drawer group, hidden in the same modes. */
export function mobileDrawerHidden(i: {
  routeViewActive: boolean;
  flatPatchActive: boolean;
  /** Zoom-in fly in progress (altitude still high until the patch opens). */
  detailFlying?: boolean;
}): boolean {
  return i.routeViewActive || i.flatPatchActive || !!i.detailFlying;
}

/**
 * The camera's height above the surface, in body radii, under which the orbits have scrolled off
 * and the planet fills the view. Radius-relative, so it is right for every body.
 */
export const ORBIT_RULER_HIDE_RADII = 1.0;

/** Re-show band above the hide threshold, so parking at the edge cannot flicker. */
const ORBIT_RULER_SHOW_BAND = 1.12;

/**
 * Whether the orbits (dots, rings, ruler) are in view. Under one body radius they hide for a clean
 * single-body view, with a 12 % hysteresis band; while an orbiter is the focus they stay, because
 * the fly-in to an orbiter lands under one radius and would otherwise hide the thing just picked.
 */
export function orbitsInViewNext(i: {
  altitudeKm: number;
  radiusKm: number;
  wasInView: boolean;
  focusOnOrbiter: boolean;
}): boolean {
  if (i.focusOnOrbiter) return true;
  const hideKm = i.radiusKm * ORBIT_RULER_HIDE_RADII;
  if (i.wasInView) return !(i.altitudeKm < hideKm);
  return i.altitudeKm > hideKm * ORBIT_RULER_SHOW_BAND;
}
