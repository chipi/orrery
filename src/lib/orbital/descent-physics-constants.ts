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
  titan: 8.978e12,
  earth: 3.986004418e14,
  jupiter: 1.26686534e17,
  comet_67p: 6.662e2, // 67P/Churyumov–Gerasimenko, M≈9.98e12 kg
  itokawa: 2.342, // M≈3.51e10 kg
  ryugu: 30.03, // M≈4.50e11 kg
  bennu: 4.892, // M≈7.33e10 kg
  eros: 4.463e5, // 433 Eros, M≈6.687e15 kg
};

/** Body mean (volumetric) radius (m). */
export const R_BODY_M: Record<DescentBody, number> = {
  moon: 1_737_400,
  mars: 3_389_500,
  venus: 6_051_800,
  titan: 2_574_700,
  earth: 6_371_000,
  jupiter: 69_911_000, // 1-bar volumetric radius (the "datum"; probe descends below)
  comet_67p: 1_720, // mean radius of the bilobed nucleus
  itokawa: 165, // mean radius of the 535×294×209 m body
  ryugu: 448,
  bennu: 245,
  eros: 8_420, // equivalent radius from volume (34×11×11 km)
};

/** Sea-level (datum/surface) atmospheric density (kg·m⁻³). Moon = vacuum. */
export const SURFACE_DENSITY_KGM3: Record<DescentBody, number> = {
  moon: 0,
  mars: 0.02,
  venus: 65,
  titan: 5.3, // dense cold N₂ at the surface (~1.5 bar, 94 K)
  earth: 1.225, // ISA sea-level density (1013 hPa, 15 °C)
  jupiter: 0.16, // at the 1-bar datum; ρ(h)=ρ₀·exp(−h/H) rises as the probe sinks below
  comet_67p: 0, // airless
  itokawa: 0,
  ryugu: 0,
  bennu: 0,
  eros: 0,
};

/** Atmospheric scale height (m) for the single-exponential ρ(h)=ρ₀·exp(−h/H). */
export const ATM_SCALE_HEIGHT_M: Record<DescentBody, number> = {
  moon: 1, // unused (density 0); kept non-zero to avoid /0 in exp
  mars: 11_000,
  venus: 15_900,
  titan: 40_000, // thick, cold, deep troposphere
  earth: 8_500, // ISA troposphere single-exponential fit
  jupiter: 27_000,
  comet_67p: 1, // airless (density 0)
  itokawa: 1,
  ryugu: 1,
  bennu: 1,
  eros: 1,
};

/** Representative near-surface speed of sound (m·s⁻¹) for the Mach readout.
 *  Moon = 0 → Mach is meaningless in vacuum and reported as 0. */
export const SOUND_SPEED_MS: Record<DescentBody, number> = {
  moon: 0,
  mars: 240,
  venus: 410,
  titan: 194, // cold N₂
  earth: 340, // dry air, 15 °C
  jupiter: 800, // H₂/He
  comet_67p: 0, // airless → Mach meaningless
  itokawa: 0,
  ryugu: 0,
  bennu: 0,
  eros: 0,
};

/** Human labels for the destination bodies (HUD dossier). */
export const BODY_LABEL: Record<DescentBody, string> = {
  moon: 'Moon',
  mars: 'Mars',
  venus: 'Venus',
  titan: 'Titan',
  earth: 'Earth',
  jupiter: 'Jupiter',
  comet_67p: '67P/C-G',
  itokawa: 'Itokawa',
  ryugu: 'Ryugu',
  bennu: 'Bennu',
  eros: 'Eros',
};
