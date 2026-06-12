/**
 * Interplanetary trajectory geometry (#107 Step 6d) — parallels
 * cislunar-geometry.ts for Mars + outer-system missions.
 *
 * Coordinate system: heliocentric ecliptic J2000. Distances in AU.
 * Three.js convention: x/z span the ecliptic plane (y=0 for in-plane
 * transfers). Time in days from mission epoch (MET).
 *
 * Renderer dispatch (parallels cislunar):
 *  - waypoints_helio_au present → buildFromHelioWaypoints (Tier 1.5 / 2)
 *  - otherwise → parametric path via mission-arc.ts primitives (Tier 1)
 *
 * Generator: scripts/cislunar/generate-helio-hybrid-waypoints.ts reads
 * each Mars/outer-system mission JSON's interplanetary_profile +
 * flight.events[] METs, builds the parametric path, resamples to 100
 * MET-evenly-spaced waypoints, pins event-MET anchors, writes back as
 * tier_1_5_hybrid.
 */

import {
  earthPos,
  marsPos,
  destinationPos,
  transferEllipse,
  type Vec2,
} from './orbital/mission-arc';
import type { DestinationId } from './lambert-grid.constants';

/** Heliocentric position in AU. y is ecliptic-out-of-plane (0 for the
 *  default in-plane transfers we support today). */
export type Vec3Au = { x: number; y: number; z: number };

export type InterplanetaryPhaseType =
  | 'parking_earth'
  | 'tmi_coast' // trans-Mars/destination injection coast (helio)
  | 'helio_cruise' // interplanetary cruise main phase
  | 'mid_course' // TCM-cluster region (collapsed when no TCMs)
  | 'arrival_approach' // final approach into SOI
  | 'arrival_orbit' // captured orbit around target body
  | 'mars_descent' // EDL — collapses to single segment in heliocentric view
  | 'mars_surface' // surface ops — spacecraft stays at target body pos
  | 'mars_ascent' // ascent vehicle separation (sample return)
  | 'tei_helio' // trans-Earth helio cruise (return leg)
  | 'earth_return_helio';

export interface InterplanetaryPhase {
  type: InterplanetaryPhaseType;
  start_met_days: number;
  end_met_days: number;
  points: Vec3Au[];
}

export interface InterplanetaryTrajectory {
  phases: InterplanetaryPhase[];
  arrival_track: Vec3Au[]; // target body trajectory (for context rendering)
  closest_approach_au: number;
}

export type InterplanetarySourceTier = 'tier_1_analytic' | 'tier_1_5_hybrid' | 'tier_2_published';

export type TransferType = 'hohmann' | 'type1_lambert' | 'type2_lambert';

export interface InterplanetaryProfile {
  source_tier?: InterplanetarySourceTier;
  reference_frame?: 'heliocentric_ecliptic_J2000';
  departure_body?: 'earth';
  arrival_body?: DestinationId;
  transfer_type?: TransferType;
  tcm_count?: number;
  waypoints_helio_au?: Array<[number, number, number, number]>;
}

export interface BuildInterplanetaryOptions {
  /** Sim day (in days from app epoch) when the mission departs Earth.
   *  Used to seed earthPos / arrival-body position at the right phase
   *  angles. */
  dep_day_sim: number;
  /** Trajectory duration outbound, in days (MET). Used to size the
   *  helio_cruise phase and place the arrival body. */
  transit_days: number;
  /** Whether the mission includes a return leg (sample-return etc.).
   *  When true the trajectory adds tei_helio + earth_return_helio. */
  is_return_trip?: boolean;
  /** Optional V∞ (km/s) at arrival — passed to transferEllipse so the
   *  shape bends per ADR-027. */
  arrival_vinf_kms?: number | null;
}

/** Map Vec2 (mission-arc ecliptic-plane) → Vec3Au (Three.js xz-plane,
 *  y=0). Pure projection — no scaling. */
function vec2ToVec3(p: Vec2): Vec3Au {
  return { x: p.x, y: 0, z: p.z };
}

/**
 * Build a Tier 1 (analytic) interplanetary trajectory from the
 * parametric profile + dep_day_sim + transit_days. Mirrors
 * `buildCislunarTrajectory()` from cislunar-geometry.ts.
 *
 * When `profile.waypoints_helio_au` is present (Tier 1.5 / Tier 2)
 * the analytic path is bypassed and the waypoint array is replayed
 * in a single helio_cruise phase (renderer-side parity with the
 * cislunar `buildFromWaypoints` dispatch).
 */
export function buildInterplanetaryTrajectory(
  profile: InterplanetaryProfile | undefined | null,
  opts: BuildInterplanetaryOptions,
): InterplanetaryTrajectory {
  // Tier 1.5 / Tier 2: dispatch on waypoints presence.
  if (profile?.waypoints_helio_au && profile.waypoints_helio_au.length >= 2) {
    return buildFromHelioWaypoints(profile.waypoints_helio_au);
  }

  const arrivalId = (profile?.arrival_body ?? 'mars') as DestinationId;
  const transitDays = opts.transit_days;
  const depDay = opts.dep_day_sim;
  const arrDay = depDay + transitDays;

  const depPos = earthPos(depDay);
  const arrPos = arrivalId === 'mars' ? marsPos(arrDay) : destinationPos(arrDay, arrivalId);
  const cruisePts2D = transferEllipse(depPos, arrPos, 64, opts.arrival_vinf_kms ?? null);

  const phases: InterplanetaryPhase[] = [];

  // helio_cruise — the bulk of an interplanetary mission's timeline.
  phases.push({
    type: 'helio_cruise',
    start_met_days: 0,
    end_met_days: transitDays,
    points: cruisePts2D.map(vec2ToVec3),
  });

  // arrival_orbit phase — short window holding the spacecraft at the
  // target body for a few days of context. Real EDL / orbit insertion
  // is a single-point event in heliocentric view.
  const arrivalHoldDays = Math.min(0.5, transitDays * 0.05);
  const arrEnd = arrDay + arrivalHoldDays;
  const arrEndPos = arrivalId === 'mars' ? marsPos(arrEnd) : destinationPos(arrEnd, arrivalId);
  phases.push({
    type: 'arrival_orbit',
    start_met_days: transitDays,
    end_met_days: transitDays + arrivalHoldDays,
    points: [vec2ToVec3(arrPos), vec2ToVec3(arrEndPos)],
  });

  if (opts.is_return_trip) {
    // tei_helio — return leg ellipse, mirror of outbound. Crude approximation:
    // mirror cruise shape from arrPos back to earthPos at sim-day depDay + 2 × transit.
    const earthRetDay = depDay + transitDays * 2;
    const earthRetPos = earthPos(earthRetDay);
    const returnPts2D = transferEllipse(arrPos, earthRetPos, 64, null);
    phases.push({
      type: 'tei_helio',
      start_met_days: transitDays + arrivalHoldDays,
      end_met_days: transitDays * 2,
      points: returnPts2D.map(vec2ToVec3),
    });
    phases.push({
      type: 'earth_return_helio',
      start_met_days: transitDays * 2,
      end_met_days: transitDays * 2 + 0.05,
      points: [vec2ToVec3(earthRetPos), vec2ToVec3(earthRetPos)],
    });
  }

  // Arrival-body track: sample the target body's path across the same
  // sim-day range as the mission for context rendering.
  const arrivalTrack: Vec3Au[] = [];
  const arrSamples = 32;
  for (let i = 0; i <= arrSamples; i++) {
    const day = depDay + (transitDays * 2 * i) / arrSamples;
    const p = arrivalId === 'mars' ? marsPos(day) : destinationPos(day, arrivalId);
    arrivalTrack.push(vec2ToVec3(p));
  }

  // Closest approach: minimum distance between cruise samples and the
  // target body's contemporaneous position. Approximated using arrival
  // endpoint since the transfer is targeted on the arrival body.
  const closest_approach_au = 0;

  return {
    phases,
    arrival_track: arrivalTrack,
    closest_approach_au,
  };
}

/** Tier 1.5 / Tier 2 dispatch — collapse the entire mission into a
 *  single `helio_cruise` phase whose points are the stored waypoints
 *  (replays the recorded trajectory verbatim). Parallels
 *  cislunar-geometry's `buildFromWaypoints`. */
function buildFromHelioWaypoints(
  wp: Array<[number, number, number, number]>,
): InterplanetaryTrajectory {
  const points: Vec3Au[] = wp.map(([, x, y, z]) => ({ x, y, z }));
  const start_met_days = wp[0][0];
  const end_met_days = wp[wp.length - 1][0];
  return {
    phases: [
      {
        type: 'helio_cruise',
        start_met_days,
        end_met_days,
        points,
      },
    ],
    arrival_track: [],
    closest_approach_au: 0,
  };
}

/**
 * Linear interpolation at MET across an InterplanetaryTrajectory's
 * phases. Mirrors `eciKmAtMet` from cislunar-events.ts but for AU.
 *
 * Returns null when the trajectory is empty. Clamps to first/last
 * sample when MET is outside the trajectory range.
 */
export function helioAuAtMet(met: number, traj: InterplanetaryTrajectory): Vec3Au | null {
  if (!traj || traj.phases.length === 0) return null;
  // Find phase containing met. Phases are sorted by start_met_days.
  for (let i = 0; i < traj.phases.length; i++) {
    const phase = traj.phases[i];
    if (met < phase.start_met_days) {
      // Before this phase — if it's the first, clamp to its first point.
      if (i === 0) return phase.points[0] ?? null;
      // Otherwise pick the previous phase's last point.
      const prev = traj.phases[i - 1];
      return prev.points[prev.points.length - 1] ?? null;
    }
    if (met <= phase.end_met_days) {
      // Inside this phase — interpolate across its samples.
      const span = phase.end_met_days - phase.start_met_days;
      if (span <= 0 || phase.points.length === 0) {
        return phase.points[0] ?? null;
      }
      const tFrac = (met - phase.start_met_days) / span;
      const idxF = tFrac * (phase.points.length - 1);
      const i0 = Math.floor(idxF);
      const i1 = Math.min(phase.points.length - 1, i0 + 1);
      const f = idxF - i0;
      const a = phase.points[i0];
      const b = phase.points[i1];
      return {
        x: a.x + (b.x - a.x) * f,
        y: a.y + (b.y - a.y) * f,
        z: a.z + (b.z - a.z) * f,
      };
    }
  }
  // Past the trajectory end — clamp to last sample.
  const last = traj.phases[traj.phases.length - 1];
  return last.points[last.points.length - 1] ?? null;
}
