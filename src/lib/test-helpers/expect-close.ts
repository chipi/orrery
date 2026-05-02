/**
 * Numerical-tolerance test helpers (v0.2.0 / Phase 4).
 *
 * vitest's built-in `toBeCloseTo(expected, digits)` uses decimal-place
 * tolerance which couples too tightly to the magnitude of the value.
 * For physics validation we want explicit ±tolerance bounds, so a
 * reading of 33.4 km/s passes against a golden 33.5 km/s with a
 * 0.5-km/s tolerance regardless of the digits the value happens to
 * have.
 *
 * These helpers throw with descriptive messages on mismatch so the
 * vitest output makes clear which mission + which value diverged.
 */

/**
 * Assert that `computed` is within ±tolerance of `golden`.
 * Throws with a descriptive error on mismatch.
 *
 * @example
 *   expectCloseTo(maxSpeed, 33.4, 0.5, 'Curiosity peak heliocentric speed');
 */
export function expectCloseTo(
  computed: number,
  golden: number,
  tolerance: number,
  description: string,
): void {
  const delta = Math.abs(computed - golden);
  if (delta > tolerance) {
    throw new Error(
      `${description}: computed ${computed.toFixed(3)} vs golden ${golden.toFixed(3)} ` +
        `(Δ=${delta.toFixed(3)}, tolerance=${tolerance})`,
    );
  }
}

/**
 * Assert that `computed` falls within the inclusive `[min, max]`
 * range. Throws with a descriptive error on mismatch.
 */
export function expectInRange(
  computed: number,
  min: number,
  max: number,
  description: string,
): void {
  if (computed < min || computed > max) {
    throw new Error(`${description}: computed ${computed.toFixed(3)} outside [${min}, ${max}]`);
  }
}
