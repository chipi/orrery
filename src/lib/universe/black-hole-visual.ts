/**
 * Pure GR / rendering math for the /explore v2 black-hole lensing scene (Slice 6).
 *
 * The WebGL builder (`black-hole-scene.ts`, coverage-excluded) consumes these.
 * Keeping the physics here makes it unit-testable without a GPU. The scene itself
 * ray-traces the Schwarzschild null geodesic (a = −1.5·h²·r̂/r⁵) in the shader;
 * these helpers cover the scalar physics + the shader's tuning inputs.
 */

/** Speed of light, km/s. */
export const C_KM_S = 299792.458;
/** Gravitational constant × solar mass, in km³/s² (GM☉). */
export const GM_SUN_KM3_S2 = 1.32712440018e11;

/** Schwarzschild radius (km) for a mass in solar masses: rs = 2GM/c². */
export function schwarzschildRadiusKm(massSolar: number): number {
  return (2 * GM_SUN_KM3_S2 * massSolar) / (C_KM_S * C_KM_S);
}

/** Photon-sphere radius = 1.5 · rs (where light can orbit the hole). */
export function photonSphereRadiusKm(rsKm: number): number {
  return 1.5 * rsKm;
}

/** Apparent shadow radius = √27/2 · rs ≈ 2.598 · rs (the lensed silhouette a
 *  distant observer sees, larger than the horizon). */
export function shadowRadiusKm(rsKm: number): number {
  return (Math.sqrt(27) / 2) * rsKm;
}

/** Gravitational time-dilation factor √(1 − rs/r) at radius r (km) outside the
 *  horizon. Clock at r ticks this fraction of a far-away clock. r ≤ rs → 0. */
export function timeDilationFactor(rKm: number, rsKm: number): number {
  if (rKm <= rsKm) return 0;
  return Math.sqrt(1 - rsKm / rKm);
}

/** Disk temperature colour ramp position → RGB (0..1), the creamy pale-gold
 *  Interstellar palette: near-white hot inner → soft amber outer. `t` in [0,1]. */
export function diskColor(t: number): [number, number, number] {
  const c = Math.min(1, Math.max(0, t));
  const hot: [number, number, number] = [1.0, 0.99, 0.96];
  const mid: [number, number, number] = [1.0, 0.9, 0.72];
  const cool: [number, number, number] = [1.0, 0.72, 0.44];
  const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
  if (c < 0.4) {
    const k = c / 0.4;
    return [lerp(hot[0], mid[0], k), lerp(hot[1], mid[1], k), lerp(hot[2], mid[2], k)];
  }
  const k = (c - 0.4) / 0.6;
  return [lerp(mid[0], cool[0], k), lerp(mid[1], cool[1], k), lerp(mid[2], cool[2], k)];
}

/** Responsive render framing — on narrow screens pull the view back (bigger
 *  SCALE = smaller hole) and shift it up (negative YOFF) so the whole black hole
 *  fits above a bottom-sheet panel. Matches the approved Slice-0 mock. */
export interface BlackHoleFraming {
  scale: number;
  yOffset: number;
}
export function framingFor(viewportWidth: number): BlackHoleFraming {
  if (viewportWidth < 700) return { scale: 2.15, yOffset: -0.55 };
  return { scale: 1.0, yOffset: 0.0 };
}
