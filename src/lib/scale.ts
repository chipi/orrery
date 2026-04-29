/**
 * Rendering scale functions for the 2D solar-system view (AU → pixels) and
 * the Earth-orbit log scale (km altitude → pixels).
 *
 * These are visual-mapping functions — they do not represent physical truth.
 * Both are documented in CLAUDE.md §physics and TA.md §components/scale-library.
 */

/** AU → visual radius lookup (px from solar-system centre).
 *  Compressed log-linear scale: inner planets are spread, outer planets compressed.
 *  Verified against P01 prototype. */
const AU_PX: ReadonlyArray<readonly [number, number]> = [
  [0, 15],
  [0.387, 52],
  [0.723, 83],
  [1.0, 113],
  [1.524, 155],
  [2.2, 192],
  [3.2, 237],
  [5.2, 248],
  [9.54, 320],
  [19.2, 378],
  [30.07, 430],
  [39.5, 448],
  [50, 470],
  [80, 498],
  [150, 512],
];

/**
 * Map a heliocentric distance (AU) to a visual radius (px) for the 2D
 * solar-system view. Linear interpolation between 15 reference points;
 * clamps to 512 px past Planet Nine territory.
 */
export function auToPx(au: number): number {
  for (let i = 0; i < AU_PX.length - 1; i++) {
    const [a0, p0] = AU_PX[i];
    const [a1, p1] = AU_PX[i + 1];
    if (au >= a0 && au <= a1) return p0 + ((au - a0) / (a1 - a0)) * (p1 - p0);
  }
  return 512;
}

/**
 * Earth-orbit log scale: altitude (km) → vertical px from Earth's surface.
 * Ranges from ISS (408 km) to JWST at L2 (1.5M km) on a single legible axis.
 *
 * Formula: 38 + 54 * log10(1 + alt_km / 100)
 *  - 38 px baseline ensures objects above ground render visibly
 *  - 54 px per decade of altitude
 *  - Verified against P05 prototype.
 */
export function altToVis(altKm: number): number {
  return 38 + 54 * Math.log10(1 + altKm / 100);
}
