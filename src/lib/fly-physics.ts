/**
 * /fly trajectory math, isolated as pure functions for unit-testing
 * + per-mission validation harness (v0.2.0 / ADR-030 / Phase 4).
 *
 * Until v0.2.0 these formulas were inline in `src/routes/fly/+page.svelte`
 * — visible to the renderer but invisible to vitest. This module is
 * the authoritative source; the .svelte file is the consumer.
 *
 * Coordinate system: heliocentric ecliptic plane. AU for distance,
 * days for time, km/s for speed unless suffixed otherwise.
 */

import type { Vec2 } from './mission-arc';
import {
  AU_PER_YR_TO_KMS,
  AU_TO_KM,
  C_LIGHT_KM_S,
  MOON_BEZIER_CTRL_OFFSET,
  MOON_ORBITAL_PERIOD_DAYS,
  MOON_VISUAL_DISTANCE,
  MU_SUN_AU3_YR2,
} from './fly-physics-constants';

// ─── Heliocentric speed ─────────────────────────────────────────────

/**
 * Spacecraft speed (km/s) on a Hohmann transfer ellipse via vis-viva.
 *
 *   v = √(µ · (2/r − 1/a)) · AU/yr→km/s
 *
 * Where r is the current heliocentric distance (AU) and a is the
 * transfer-ellipse semi-major axis (AU). For an Earth→Mars Hohmann
 * a ≈ 1.262, so at r = 1.0 AU the speed is ~32.7 km/s.
 *
 * @param rAu — current heliocentric distance (AU)
 * @param aTransferAu — transfer-ellipse semi-major axis (AU)
 * @returns speed in km/s
 */
export function heliocentricSpeed(rAu: number, aTransferAu: number): number {
  return Math.sqrt(MU_SUN_AU3_YR2 * (2 / rAu - 1 / aTransferAu)) * AU_PER_YR_TO_KMS;
}

// ─── Distance helpers ───────────────────────────────────────────────

/** Euclidean distance between two heliocentric positions (AU). */
export function distanceBetween(a: Vec2, b: Vec2): number {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

/** AU → km. */
export function auToKm(au: number): number {
  return au * AU_TO_KM;
}

/** AU → millions of km. Convenient unit for the /fly HUD. */
export function auToMkm(au: number): number {
  return (au * AU_TO_KM) / 1_000_000;
}

// ─── Signal delay ───────────────────────────────────────────────────

/**
 * One-way signal-delay (light-minutes) at a given heliocentric
 * distance. Earth-distance distAu × AU_TO_KM ÷ c ÷ 60.
 */
export function signalDelayMin(distAu: number): number {
  return (distAu * AU_TO_KM) / C_LIGHT_KM_S / 60;
}

// ─── Mission elapsed time ──────────────────────────────────────────

/**
 * Linear-interpolate the spacecraft's mission-elapsed-time from the
 * sim-day along the arc.
 *
 *   met = ((simDay − depDay) / (arrDay − depDay)) × totalMissionDays
 *
 * Clamps to [0, totalMissionDays] so pre-launch shows MET=0 and
 * post-arrival shows MET=totalMissionDays.
 */
export function missionElapsedDays(
  simDay: number,
  depDay: number,
  arrDay: number,
  totalMissionDays: number,
): number {
  const arcSpan = arrDay - depDay;
  if (arcSpan <= 0) return 0;
  const t = (simDay - depDay) / arcSpan;
  return Math.max(0, Math.min(totalMissionDays, t * totalMissionDays));
}

// ─── ∆v ledger ─────────────────────────────────────────────────────

/** Remaining ∆v (km/s) for the loaded mission, clamped to ≥ 0. */
export function dvRemaining(total: number, used: number): number {
  return Math.max(0, total - used);
}

// ─── Moon-mode arcs ────────────────────────────────────────────────

/**
 * Moon position at a given MET (days), in /fly Moon-mode scene
 * coordinates. Earth sits at origin; the Moon orbits at
 * MOON_VISUAL_DISTANCE units, sweeping CCW with sidereal period.
 */
export function moonPositionAtMet(metDays: number): Vec2 {
  const angle = ((metDays % MOON_ORBITAL_PERIOD_DAYS) / MOON_ORBITAL_PERIOD_DAYS) * Math.PI * 2;
  return {
    x: Math.cos(angle) * MOON_VISUAL_DISTANCE,
    z: Math.sin(angle) * MOON_VISUAL_DISTANCE,
  };
}

/**
 * Outbound quadratic-Bezier arc from Earth (origin) to a Moon
 * position. The control point is offset perpendicular to the
 * Earth→Moon line by MOON_BEZIER_CTRL_OFFSET × |moon|.
 *
 * Returns `steps + 1` points sampled along the curve.
 */
export function moonOutboundArc(moonPos: Vec2, steps = 200): Vec2[] {
  const ctrlX = moonPos.x * 0.5 + -moonPos.z * MOON_BEZIER_CTRL_OFFSET;
  const ctrlZ = moonPos.z * 0.5 + moonPos.x * MOON_BEZIER_CTRL_OFFSET;
  const pts: Vec2[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const u = 1 - t;
    pts.push({
      x: u * u * 0 + 2 * u * t * ctrlX + t * t * moonPos.x,
      z: u * u * 0 + 2 * u * t * ctrlZ + t * t * moonPos.z,
    });
  }
  return pts;
}

/**
 * Return arc for Moon round-trip missions — mirrored Bezier back to
 * Earth, opposite control-point offset so the path doesn't overlap
 * the outbound curve.
 */
export function moonReturnArc(moonPos: Vec2, steps = 200): Vec2[] {
  const ctrlX = moonPos.x * 0.5 + moonPos.z * MOON_BEZIER_CTRL_OFFSET;
  const ctrlZ = moonPos.z * 0.5 + -moonPos.x * MOON_BEZIER_CTRL_OFFSET;
  const pts: Vec2[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const u = 1 - t;
    pts.push({
      x: u * u * moonPos.x + 2 * u * t * ctrlX + t * t * 0,
      z: u * u * moonPos.z + 2 * u * t * ctrlZ + t * t * 0,
    });
  }
  return pts;
}

// Re-exports for callers (saves a second import line).
export { AU_PER_YR_TO_KMS, AU_TO_KM, C_LIGHT_KM_S, MU_SUN_AU3_YR2 };
