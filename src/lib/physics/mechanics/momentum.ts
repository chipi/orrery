/**
 * Linear momentum (S2b · RFC-037 M1). Pure SI.
 */

/**
 * Linear momentum p = m·v.
 * @param massKg  Mass in kilograms
 * @param velMs   Speed in m/s
 * @returns       Momentum in kg·m/s
 */
export function momentum(massKg: number, velMs: number): number {
  return massKg * velMs;
}
