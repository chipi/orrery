/**
 * Classical dynamics — Newton's second law, weight, and thrust-to-weight ratio
 * (S2b · RFC-037 M1 mechanics rungs). Pure SI; no imports beyond the kernel.
 */

/**
 * Net acceleration from a resultant force (F = ma solved for a).
 * @param forceN   Resultant force in newtons
 * @param massKg   Mass in kilograms
 * @returns        Acceleration in m/s²
 */
export function fMaAccel(forceN: number, massKg: number): number {
  return forceN / massKg;
}

/**
 * Weight force (gravitational force on a mass in a local gravity field).
 * @param massKg  Mass in kilograms
 * @param gMs2    Local surface gravitational acceleration in m/s²
 * @returns       Weight in newtons
 */
export function weightN(massKg: number, gMs2: number): number {
  return massKg * gMs2;
}

/**
 * Thrust-to-weight ratio (dimensionless).
 * @param thrustN  Engine thrust in newtons
 * @param massKg   Vehicle mass in kilograms
 * @param gMs2     Local surface gravity in m/s²
 */
export function twr(thrustN: number, massKg: number, gMs2: number): number {
  return thrustN / (massKg * gMs2);
}
