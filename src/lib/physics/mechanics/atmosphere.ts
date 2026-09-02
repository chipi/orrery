/**
 * Atmospheric descent — terminal velocity + drag (M5 "land on Mars").
 *
 * The Moon had no air, so you fell forever unless you burned (M3). A body WITH an
 * atmosphere slows a falling craft by drag until it reaches terminal velocity — the
 * speed where drag exactly balances weight:
 *   v_t = √( 2·m·g / (ρ·A·C_d) )
 * The lesson Mars teaches: its air is ~1/60 of Earth's, so terminal velocity there is
 * still hundreds of m/s — too thin to land you on a parachute alone, thick enough to
 * cook you on entry. That's why Mars landings are the "seven minutes of terror".
 *
 * Pure; g + density are passed in. Airless bodies (ρ = 0) → no terminal velocity
 * (drag can't slow you); the caller fails honest.
 */

/** Surface atmospheric density (kg/m³) — 0 for airless bodies.
 *  KNOWN D10 DRIFT (flagged on #524): descent/descent-physics-constants.ts
 *  carries a second, DescentBody-exhaustive copy of these values — the two
 *  must agree until the planned dedup lands. Keep edits mirrored. */
export const SURFACE_DENSITY_KGM3: Record<string, number> = {
  venus: 65.0,
  earth: 1.225,
  mars: 0.02,
  titan: 5.3, // dense cold N₂ at the surface (~1.5 bar, 94 K) — P3 · #527
  jupiter: 0.16, // 1-bar datum
  saturn: 0.19, // 1-bar datum
  mercury: 0,
  moon: 0,
};

/**
 * Terminal velocity in a uniform atmosphere (m/s): v_t = √(2·m·g / (ρ·A·C_d)).
 * Returns Infinity for a vacuum (ρ ≤ 0) — drag can't slow you at all.
 * @param massKg       falling mass (kg)
 * @param gMs2         surface gravity (m/s²)
 * @param densityKgM3  atmospheric density (kg/m³)
 * @param areaM2       drag reference area (m²)
 * @param cd           drag coefficient (dimensionless, ~1–2 for capsules/chutes)
 */
export function terminalVelocityMs(
  massKg: number,
  gMs2: number,
  densityKgM3: number,
  areaM2: number,
  cd: number,
): number {
  if (densityKgM3 <= 0 || areaM2 <= 0 || cd <= 0) return Infinity;
  return Math.sqrt((2 * massKg * gMs2) / (densityKgM3 * areaM2 * cd));
}
