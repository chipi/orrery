/**
 * Porkchop rendering primitives for the /plan screen.
 *
 * Pure functions only — they're trivially testable and have no DOM
 * dependencies. The route file owns canvas + worker plumbing.
 */

const DV_MIN_KMS = 3.2;
const DV_MAX_KMS = 16.2; // 3.2 + 13 (matches the 0..1 normalisation in dvToRGB)

/** Colour stops for the delta-v heatmap. Cheap (deep blue) → expensive (red). */
const STOPS: Array<[number, [number, number, number]]> = [
  [0.0, [8, 14, 90]],
  [0.12, [16, 60, 180]],
  [0.28, [20, 160, 210]],
  [0.42, [24, 200, 120]],
  [0.56, [200, 220, 30]],
  [0.7, [240, 130, 20]],
  [0.84, [220, 40, 20]],
  [1.0, [120, 10, 10]],
];

/** Map a Δv value (km/s) to RGB triple in 0..255. */
export function dvToRGB(dv: number): [number, number, number] {
  const t = Math.max(0, Math.min(1, (dv - DV_MIN_KMS) / (DV_MAX_KMS - DV_MIN_KMS)));
  for (let i = 0; i < STOPS.length - 1; i++) {
    const [t0, c0] = STOPS[i];
    const [t1, c1] = STOPS[i + 1];
    if (t >= t0 && t <= t1) {
      const f = (t - t0) / (t1 - t0);
      return [
        c0[0] + f * (c1[0] - c0[0]),
        c0[1] + f * (c1[1] - c0[1]),
        c0[2] + f * (c1[2] - c0[2]),
      ];
    }
  }
  return [120, 10, 10];
}

/** CSS colour string for a Δv value (km/s). */
export function dvToCss(dv: number): string {
  const [r, g, b] = dvToRGB(dv);
  return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
}

/**
 * Convert "days since epoch start" to a Date object. Epoch defaults to
 * Jan 1, 2026 — matching the Lambert worker's heliocentric model.
 */
export function dayToDate(day: number, epochYear = 2026): Date {
  const d = new Date(epochYear, 0, 1);
  d.setDate(d.getDate() + Math.round(day));
  return d;
}

/** Long form: "Jan 1, 2026". */
export function dayToLongDate(day: number, epochYear = 2026): string {
  return dayToDate(day, epochYear).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/** Short form for axis ticks: "Jan '26". */
export function dayToShortDate(day: number, epochYear = 2026): string {
  return dayToDate(day, epochYear).toLocaleDateString('en-US', {
    year: '2-digit',
    month: 'short',
  });
}
