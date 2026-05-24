/**
 * Zoom taper for tier 0/1 markers on /moon + /mars (#42).
 *
 * As the user zooms in onto the LROC / HiRISE patch, the lander
 * model + tier-0 marker shrink so they don't visually dominate the
 * disc underneath.
 *
 *   camR ≥ 60   → 1.0 (overview)
 *   camR ≤ 30.6 → 0.2 (closest zoom)
 *   between     → linear interpolation
 */
export function computeTierScale(camR: number): number {
  const minR = 30.6;
  const maxR = 60;
  const minScale = 0.2;
  if (camR >= maxR) return 1;
  if (camR <= minR) return minScale;
  return minScale + (1 - minScale) * ((camR - minR) / (maxR - minR));
}
