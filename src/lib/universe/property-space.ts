/**
 * Property-space projection math for /explore v2 Slice 7 — the Hertzsprung–Russell
 * diagram. Re-projects the real neighbourhood stars from spatial XYZ onto physical
 * axes: temperature (from the B–V colour index) vs luminosity (from absolute
 * magnitude). Pure + unit-tested; the HR overlay + exoplanet mass–period plot
 * consume these. Reuses `bvToKelvin` (bv-to-rgb.ts) for the temperature.
 */
import { bvToKelvin } from './bv-to-rgb';

/** Absolute (visual) magnitude from apparent magnitude + distance (parsecs):
 *  M = m − 5·(log₁₀ d − 1). Distance ≤ 0 is treated as 10 pc (M = m). */
export function absoluteMagnitude(appMag: number, distPc: number): number {
  if (distPc <= 0) return appMag;
  return appMag - 5 * (Math.log10(distPc) - 1);
}

/** HR-plane x from B–V colour index → [0,1] (0 = hot/blue left, 1 = cool/red
 *  right, the conventional temperature axis). Clamped to the plotted range. */
export const BV_MIN = -0.35;
export const BV_MAX = 1.7;
export function hrX(bv: number): number {
  return clamp01((bv - BV_MIN) / (BV_MAX - BV_MIN));
}

/** HR-plane y from absolute magnitude → [0,1] (0 = luminous top, 1 = faint
 *  bottom). Absolute magnitude runs "backwards" — brighter is a smaller number. */
export const ABSMAG_MIN = -7; // luminous (top)
export const ABSMAG_MAX = 16; // faint (bottom)
export function hrY(absMag: number): number {
  return clamp01((absMag - ABSMAG_MIN) / (ABSMAG_MAX - ABSMAG_MIN));
}

/** Spectral-class boundaries along the temperature axis, for the HR axis ticks.
 *  Each { label, bv } sits at a representative B–V for that class. */
export const SPECTRAL_CLASSES: Array<{ label: string; bv: number }> = [
  { label: 'O', bv: -0.3 },
  { label: 'B', bv: -0.15 },
  { label: 'A', bv: 0.15 },
  { label: 'F', bv: 0.45 },
  { label: 'G', bv: 0.65 },
  { label: 'K', bv: 1.0 },
  { label: 'M', bv: 1.45 },
];

/** The Sun's reference point on the HR plane (G2V: B–V ≈ 0.65, Mᵥ ≈ 4.83). */
export const SUN_BV = 0.65;
export const SUN_ABSMAG = 4.83;

/** Effective temperature (K) from B–V — thin re-export of the shared helper so
 *  callers importing property-space get the whole HR toolkit from one module. */
export function tempKelvin(bv: number): number {
  return bvToKelvin(bv);
}

// ── Exoplanet mass–period property space (Slice 7, Part 4) ──────────────────
// The sibling re-projection: known exoplanets onto a log–log mass (y) vs orbital
// period (x) plane — the classic discovery-space plot where hot Jupiters, the
// sub-Neptune "radius valley", and the RV/transit selection edges all show up.

/** Plotted orbital-period range (log₁₀ days): ~0.3 d … ~31 600 d. */
export const MP_PERIOD_LOG_MIN = -0.5;
export const MP_PERIOD_LOG_MAX = 4.5;
/** Plotted mass range (log₁₀ Earth masses): ~0.03 M⊕ … 10 000 M⊕. */
export const MP_MASS_LOG_MIN = -1.5;
export const MP_MASS_LOG_MAX = 4;

/** Mass–period x from orbital period (days) → [0,1], log-scaled (short-period left). */
export function mpX(periodDays: number): number {
  const l = Math.log10(Math.max(1e-6, periodDays));
  return clamp01((l - MP_PERIOD_LOG_MIN) / (MP_PERIOD_LOG_MAX - MP_PERIOD_LOG_MIN));
}

/** Mass–period y from mass (Earth masses) → [0,1], log-scaled + inverted
 *  (massive top, light bottom — the conventional orientation). */
export function mpY(massEarth: number): number {
  const l = Math.log10(Math.max(1e-6, massEarth));
  return clamp01(1 - (l - MP_MASS_LOG_MIN) / (MP_MASS_LOG_MAX - MP_MASS_LOG_MIN));
}

/** Solar-system anchors plotted for scale ("where do our own planets sit?"). */
export const SOLAR_REFERENCES: Array<{ label: string; periodDays: number; massEarth: number }> = [
  { label: 'Earth', periodDays: 365.25, massEarth: 1 },
  { label: 'Jupiter', periodDays: 4332.6, massEarth: 317.8 },
  { label: 'Saturn', periodDays: 10759, massEarth: 95.2 },
];

function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v));
}
