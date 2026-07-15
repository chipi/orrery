/**
 * LOD-bloom math for the /explore v2 deep-sky approach (Slice 4, Part 3).
 *
 * As you warp toward a deep-sky object, a normalised `approach` value ramps
 * 0 → 1 (0 = ambient glint in the neighborhood, 1 = full-frame immersion). This
 * module maps that ramp to (a) how much the focused glint blooms in 3D, (b)
 * which image rung to request — none → thumbnail → full-res — with hysteresis so
 * a wobbling approach doesn't thrash the network, and (c) how opaque the
 * full-frame immersive photo is. Same camera-distance-ratio + hysteresis shape
 * as the surface-route LOD dispatcher, expressed on the approach axis.
 *
 * Pure + unit-tested (deep-sky-lod.test.ts); the WebGL/DOM consumers just apply
 * the numbers.
 */

export type DeepSkyRung = 'none' | 'thumb' | 'full';

/** Below this approach, no photo is requested — the object is just a glint. */
export const DEEP_SKY_PHOTO_IN = 0.12;
/** Hysteresis: once a photo is shown, keep it until approach falls below this. */
export const DEEP_SKY_PHOTO_OUT = 0.06;
/** At/above this approach, upgrade the request to the full-resolution photo. */
export const DEEP_SKY_FULL_IN = 0.55;
/** Hysteresis: once full-res, drop back to the thumbnail only below this. */
export const DEEP_SKY_FULL_OUT = 0.4;

function clamp01(x: number): number {
  return Math.min(1, Math.max(0, x));
}

/** Smoothstep on [edge0, edge1]. */
export function smoothstep(edge0: number, edge1: number, x: number): number {
  if (edge0 === edge1) return x < edge0 ? 0 : 1;
  const t = clamp01((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

/** Focused-glint bloom multiplier (scale + opacity) as the approach ramps. A
 *  gentle grow from 1× (ambient) toward ~3× so the target reads as "coming
 *  closer" before the immersive photo takes over. */
export function deepSkyGlintBloom(approach: number): number {
  return 1 + 2 * clamp01(approach);
}

/** Full-frame immersive-photo opacity. Stays 0 through most of the approach,
 *  then fades in over the final stretch so the 3D field is still visible while
 *  you "fly in", and the photo only fills the frame at the end. */
export function deepSkyImmersionOpacity(approach: number): number {
  return smoothstep(DEEP_SKY_FULL_OUT, 1, approach);
}

/** Which image rung to request for the given approach, given the rung currently
 *  loaded (hysteresis). Never downgrades within a band — only crosses the OUT
 *  thresholds. */
export function deepSkyRung(approach: number, prev: DeepSkyRung = 'none'): DeepSkyRung {
  const a = clamp01(approach);
  // Full-res band (with hysteresis).
  if (prev === 'full') {
    if (a >= DEEP_SKY_FULL_OUT) return 'full';
  } else if (a >= DEEP_SKY_FULL_IN) {
    return 'full';
  }
  // Photo-shown band (thumb or full) with hysteresis.
  const photoShown = prev === 'thumb' || prev === 'full';
  if (photoShown) {
    if (a >= DEEP_SKY_PHOTO_OUT) return 'thumb';
  } else if (a >= DEEP_SKY_PHOTO_IN) {
    return 'thumb';
  }
  return 'none';
}
