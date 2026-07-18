/**
 * Physics + unit constants for the powered-descent engine — the inverse
 * of ascent-physics-constants.ts (RFC-034 §9: Entry, Descent & Landing).
 *
 * Where ascent is Earth-only, descent lands on three destination bodies —
 * the Moon (vacuum), Mars (thin CO₂) and Venus (dense CO₂) — so the μ / R /
 * atmosphere constants are keyed per body. The engine works in SI
 * internally (m, s, kg, N, Pa); readouts convert at the summary boundary.
 *
 * Sources:
 *   - G0: CGPM 1901 standard gravity (defines Isp; also the felt-g unit).
 *   - μ (GM): IAU/JPL body gravitational parameters.
 *   - R: IAU mean (volumetric) radii.
 *   - Mars atmosphere: ~0.020 kg·m⁻³ near the MOLA datum, ~11 km scale
 *     height (Mars-GRAM / Viking-era single-exponential fit).
 *   - Venus atmosphere: ~65 kg·m⁻³ at the surface, ~15.9 km scale height
 *     (VIRA reference below the cloud deck).
 *   - Speed of sound: representative near-surface values (Mars cold CO₂
 *     ~240 m·s⁻¹; Venus hot CO₂ ~410 m·s⁻¹); the Moon has none.
 */

import type { DescentBody } from './descent-physics';

/** Standard gravity (m·s⁻²) — the g₀ in Isp·g₀, and the unit for felt-g decel. */
export const G0 = 9.80665;

/** Newtons per kilonewton — profiles quote retro thrust in kN. */
export const N_PER_KN = 1_000;

/** Body gravitational parameter μ = GM (m³·s⁻²). */
export const MU_BODY_M3_S2: Record<DescentBody, number> = {
  moon: 4.9048695e12,
  mars: 4.2828374e13,
  venus: 3.24858592e14,
};

/** Body mean (volumetric) radius (m). */
export const R_BODY_M: Record<DescentBody, number> = {
  moon: 1_737_400,
  mars: 3_389_500,
  venus: 6_051_800,
};

/** Sea-level (datum/surface) atmospheric density (kg·m⁻³). Moon = vacuum. */
export const SURFACE_DENSITY_KGM3: Record<DescentBody, number> = {
  moon: 0,
  mars: 0.02,
  venus: 65,
};

/** Atmospheric scale height (m) for the single-exponential ρ(h)=ρ₀·exp(−h/H). */
export const ATM_SCALE_HEIGHT_M: Record<DescentBody, number> = {
  moon: 1, // unused (density 0); kept non-zero to avoid /0 in exp
  mars: 11_000,
  venus: 15_900,
};

/** Representative near-surface speed of sound (m·s⁻¹) for the Mach readout.
 *  Moon = 0 → Mach is meaningless in vacuum and reported as 0. */
export const SOUND_SPEED_MS: Record<DescentBody, number> = {
  moon: 0,
  mars: 240,
  venus: 410,
};

/** Human labels for the destination bodies (HUD dossier). */
export const BODY_LABEL: Record<DescentBody, string> = {
  moon: 'Moon',
  mars: 'Mars',
  venus: 'Venus',
};
