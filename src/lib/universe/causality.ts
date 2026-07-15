/**
 * Causality-lens math for /explore v2 Slice 7 — the light-cone shells.
 *
 * Each shell is the sphere light emitted from the Sun in a past epoch has
 * reached by now: radius = (now − epoch) light-years, converted to the
 * neighbourhood's parsec scene units. Nothing outside a shell can yet know we
 * are here. Pure + unit-tested; the WebGL layer draws wireframe spheres at these
 * radii and labels them by epoch.
 */

/** Light-years per parsec (1 pc ≈ 3.2615638 ly). Named `LY_PER_PC` = "ly per pc". */
export const LY_PER_PC = 3.2615638;

/** Epochs the causality lens draws a light-cone shell for — each a moment whose
 *  radio-era light front is still crossing the neighbourhood. Ordered newest→oldest;
 *  1970 ≈ the dawn of routine deep-space telemetry, 1750 ≈ pre-industrial. */
export const CAUSALITY_EPOCHS = [1970, 1920, 1850, 1750];

/** The "now" the shells are measured from (kept fixed so the lens is deterministic). */
export const CAUSALITY_NOW = 2026;

/** Light-years → neighbourhood scene units (parsecs; 1 pc = 1 unit). */
export function lyToScene(ly: number): number {
  return ly / LY_PER_PC;
}

export interface LightShell {
  /** The emission year. */
  epoch: number;
  /** Light-travel distance now, in light-years. */
  ly: number;
  /** Radius in scene units (parsecs). */
  radius: number;
}

/** Build the light-cone shells for a set of epochs, given "now". Shells whose
 *  radius exceeds `maxScene` (the neighbourhood extent) are dropped so they stay
 *  inside the rendered field. Sorted inner→outer. */
export function lightShells(
  epochs: number[],
  nowYear: number,
  maxScene = Number.POSITIVE_INFINITY,
): LightShell[] {
  return epochs
    .map((epoch) => {
      const ly = Math.max(0, nowYear - epoch);
      return { epoch, ly, radius: lyToScene(ly) };
    })
    .filter((s) => s.radius > 0 && s.radius <= maxScene)
    .sort((a, b) => a.radius - b.radius);
}
