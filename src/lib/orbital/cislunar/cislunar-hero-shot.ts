/**
 * Cislunar hero-shot composition — the Moon-mission counterpart to
 * `planFlybyShot` from `$lib/orbital/flyby-camera-plan`.
 *
 * /fly's heliocentric scene gets the iconic-shot framing for free
 * because PLANET_COMPOSITION + planFlybyShot are universally keyed
 * on planet, and every helio mission with a `flyby` / `edl_or_oi`
 * event triggers it via `findActiveFlybyMet`. Cislunar missions
 * (Apollo, Luna, Chang'e, Chandrayaan, Artemis, SLIM, …) use a
 * different scene + a different auto-zoom (wide framing vs Moon
 * close-up) — without this module they never see the
 * Cassini-mission-art hero composition.
 *
 * Design follows planFlybyShot's principles exactly:
 *   - MOON_COMPOSITION holds the per-body tuning (today, one entry —
 *     the Moon. Future moons of other planets can extend the record).
 *   - planCislunarHeroShot is a pure function: input Moon position +
 *     ship-pos-at-met callback + peak MET + event type, output camera
 *     position + lookAt target.
 *   - Per-event-type lead-days bias so each beat composes at its
 *     natural narrative moment:
 *       loi          — capture into lunar orbit; hero MOMENT is at
 *                      peakMET − 0 d (right at the burn for the
 *                      Apollo-8 "earthrise" feel)
 *       descent_start — powered descent to surface; hero MOMENT is
 *                       peakMET − 0.1 d so the camera composes just
 *                       above the surface as the ship descends
 *       ascent       — liftoff from surface; hero MOMENT is at
 *                      peakMET + 0.1 d so the camera composes just
 *                      after liftoff
 *       tei          — trans-Earth injection; hero MOMENT is at
 *                      peakMET − 0 d (burn moment, Moon recedes)
 *
 * Coordinate convention: ECI km (Earth-Centred Inertial). Same
 * convention as `sampleCislunarSpacecraftPos` and the cislunar
 * camera target. No SCALE_3D / SCALE_CISLUNAR involvement — the
 * caller applies scene-space scaling.
 */

import type { Vec3 } from '$lib/orbital/flyby-camera-plan';
import { R_MOON_KM } from '$lib/orbital/cislunar/cislunar-geometry';

export interface MoonComposition {
  /** Camera distance from the Moon centre, as a multiple of the
   *  Moon's render radius. The default 4.0 matches the helio
   *  PLANET_COMPOSITION.mars / .venus tier — far enough that the
   *  ship has room to compose, close enough that the Moon dominates
   *  frame the way Saturn's lit disc does in Cassini's hero shots. */
  camRMultiplier: number;
  /** Lateral rotation off the "directly-behind-ship-approach" axis
   *  around the Moon. Same convention as PlanetComposition.sideAngleRad
   *  — π/3 (60°) = camera 60° off to one side; 85° = near-perpendicular
   *  to the ship-approach axis (the inner-planet hero default). */
  sideAngleRad: number;
  /** Camera elevation above the Earth-Moon orbital plane. 0 = camera
   *  at Moon's altitude looking horizontally; π/2 = directly above.
   *  Apollo 8's earthrise frame is at low pitch (~15°) — the horizon
   *  arcs across the lower third of the frame, Earth rises above. */
  pitchRad: number;
  /** Where the camera LOOKS, as a lerp from Moon→ship. 0 = look at
   *  Moon centre (Moon dominates frame, ship reads as off-centre
   *  accent — earthrise-style); 1 = look at ship (ship at frame
   *  centre). 0 is the right default for the hero shot. */
  targetBias: number;
}

/**
 * Single-body composition table (the Moon today). Future hero shots
 * for Mars's Phobos + Deimos, Jupiter's Galilean moons, etc. can
 * extend this record with the same shape.
 */
const HERO_SIDE = (85 * Math.PI) / 180;
const HERO_PITCH_LOW = (15 * Math.PI) / 180; // earthrise feel
export const MOON_COMPOSITION: MoonComposition = {
  camRMultiplier: 4.0,
  sideAngleRad: HERO_SIDE,
  pitchRad: HERO_PITCH_LOW,
  targetBias: 0,
};

/** Apollo-8-earthrise composition for a free-return swing-by. The
 *  ship arcs above the lunar limb on a hyperbolic free-return; the
 *  camera composes from above-and-behind so the Moon limb fills the
 *  lower-third and Earth (out of frame) is implied by the limb's
 *  curvature direction. Higher pitch (35°) lifts camera off the
 *  orbital plane; 60° side angle keeps the ship visible against the
 *  limb instead of dead-behind. targetBias 0.4 — the ship sits ~40 %
 *  of the way from Moon to its own position, so neither dominates. */
const HERO_FLYBY_SIDE = (60 * Math.PI) / 180;
const HERO_FLYBY_PITCH = (35 * Math.PI) / 180;
export const MOON_COMPOSITION_FLYBY: MoonComposition = {
  camRMultiplier: 5.0,
  sideAngleRad: HERO_FLYBY_SIDE,
  pitchRad: HERO_FLYBY_PITCH,
  targetBias: 0.4,
};

/** Direct-impact / powered-descent composition. Luna 9, Luna 16
 *  descent, Chandrayaan-3 descent. Camera pulled closer (camR 3) so
 *  the surface fills more of the frame; lower pitch (10°) and
 *  smaller side angle (45°) put the camera near the descent vector
 *  so the audience reads the geometry as "ship coming in toward
 *  surface." targetBias 0.5 keeps both ship + landing spot visible. */
const HERO_IMPACT_SIDE = (45 * Math.PI) / 180;
const HERO_IMPACT_PITCH = (10 * Math.PI) / 180;
export const MOON_COMPOSITION_IMPACT: MoonComposition = {
  camRMultiplier: 3.0,
  sideAngleRad: HERO_IMPACT_SIDE,
  pitchRad: HERO_IMPACT_PITCH,
  targetBias: 0.5,
};

/** Cislunar event types that trigger the hero shot. Apollo-style
 *  missions use loi/tei/descent_start/ascent (the original four).
 *  Free-return missions (Apollo 13) use flyby. Direct landers
 *  (Luna 9) + powered-descent landers (Luna 16, Chandrayaan-3) use
 *  edl_or_oi. SLIM + Chandrayaan-1 use the generic arrival type for
 *  their LOI moment — same composition as the original loi. */
export type CislunarHeroEventType =
  | 'loi'
  | 'tei'
  | 'descent_start'
  | 'ascent'
  | 'flyby'
  | 'edl_or_oi'
  | 'arrival';

/** How many sim-days BEFORE the peak MET to compose the iconic
 *  frame. Mirrors PlanetComposition.iconicLeadDays. Per-event so
 *  each beat composes at its narrative moment (see module header). */
export const CISLUNAR_HERO_LEAD_DAYS: Record<CislunarHeroEventType, number> = {
  loi: 0, // burn-moment composition
  tei: 0,
  descent_start: 0.1, // just above the surface as ship descends
  ascent: -0.1, // just after liftoff (negative = sample AFTER peak)
  flyby: 0, // Apollo 13 free-return apogee — capture the lunar limb at peak
  edl_or_oi: 0.05, // Luna 9 impact / Luna 16 descent — moment before contact
  arrival: 0, // SLIM / Chandrayaan-1 LOI — same as loi
};

/** Per-event composition pick. Returns the MoonComposition variant
 *  best matched to each event's narrative beat. */
export const CISLUNAR_HERO_COMPOSITION: Record<CislunarHeroEventType, MoonComposition> = {
  loi: MOON_COMPOSITION,
  tei: MOON_COMPOSITION,
  descent_start: MOON_COMPOSITION,
  ascent: MOON_COMPOSITION,
  flyby: MOON_COMPOSITION_FLYBY,
  edl_or_oi: MOON_COMPOSITION_IMPACT,
  arrival: MOON_COMPOSITION,
};

export interface CislunarHeroContext {
  /** Event type that armed the hero shot. */
  eventType: CislunarHeroEventType;
  /** Moon's ECI km position at peak MET. */
  moonPos: Vec3;
  /** Ship's predicted ECI km position at a given MET. The math
   *  layer calls this to sample positions; the caller provides the
   *  interpolation strategy (linear, spline, etc.). */
  shipPosAtMet: (met: number) => Vec3 | null;
  /** Peak MET (event MET) in mission-elapsed time. */
  peakMet: number;
  /** Optional override for the composition. Useful for testing
   *  tuning changes without editing MOON_COMPOSITION. */
  composition?: MoonComposition;
}

export interface CislunarHeroShotPlan {
  /** MET we frame the iconic moment at (peakMet − iconicLeadDays). */
  iconicMet: number;
  /** Ship's predicted ECI km position at the iconic moment. */
  shipPos: Vec3;
  /** Ship's velocity direction in the orbital (xz) plane (unit
   *  vector). The camera is positioned at a rotation off the REVERSE
   *  of this. */
  shipVelocityXZ: { x: number; z: number };
  /** Computed camera position in ECI km. */
  cameraPos: Vec3;
  /** Where the camera looks. For the iconic shot this is the Moon
   *  centre (composition.targetBias = 0) lerped toward the ship
   *  position by `targetBias`. */
  cameraTarget: Vec3;
  /** Effective composition used (defaults from MOON_COMPOSITION or
   *  the override). Returned so the viewer can label which values
   *  produced this frame. */
  composition: MoonComposition;
}

/**
 * Plan the iconic-shot camera state for a cislunar hero event.
 *
 * Algorithm mirrors planFlybyShot's Moon-centric version:
 *   1. Resolve composition (default MOON_COMPOSITION or override).
 *   2. Compute iconic moment = peakMet − iconicLeadDays for the event.
 *   3. Sample ship at iconic moment + 0.05 d earlier for approach direction.
 *   4. Build two basis vectors in the Earth-Moon orbital (xz) plane:
 *        approachUnit = unit vector of (ship − shipPrev), the ship's
 *                       direction of motion;
 *        perpUnit     = approachUnit rotated +90° in xz (CCW around +y).
 *   5. Camera distance = R_MOON_KM × camRMultiplier (from Moon centre).
 *   6. Camera position = moon + (−approachUnit · cos(pitch) · cos(side)
 *                                + perpUnit     · cos(pitch) · sin(side)
 *                                + worldUp      · sin(pitch)) · camDist.
 *      side = 0 → camera dead behind ship (worst case, collinear);
 *      side = 85° → camera near-perpendicular to ship-approach axis,
 *      planet dominates frame, ship sits off-centre at limb.
 *   7. Camera target = lerp(moon, ship, targetBias).
 *
 * Returns null when shipPosAtMet doesn't have data at the iconic
 * moment (rare — the caller should detect a missing trajectory
 * sample and skip the hero shot).
 */
export function planCislunarHeroShot(ctx: CislunarHeroContext): CislunarHeroShotPlan | null {
  // Composition pick: explicit override > per-event-type default >
  // generic MOON_COMPOSITION fallback. The per-type lookup matches
  // each event's narrative beat — free-return flyby gets the limb
  // arc, impact gets the descent-toward-surface tightness, loi/tei/
  // descent_start/ascent stay on the Apollo-8 earthrise default.
  const composition =
    ctx.composition ?? CISLUNAR_HERO_COMPOSITION[ctx.eventType] ?? MOON_COMPOSITION;
  const leadDays = CISLUNAR_HERO_LEAD_DAYS[ctx.eventType];
  const iconicMet = ctx.peakMet - leadDays;

  const shipPos = ctx.shipPosAtMet(iconicMet);
  if (!shipPos) return null;
  // Sample 0.05 d earlier for approach direction. At lunar-orbit
  // speeds (~1.6 km/s) this is ~7000 km of motion — plenty to
  // resolve a stable unit vector.
  const shipPrev = ctx.shipPosAtMet(iconicMet - 0.05);
  if (!shipPrev) return null;

  const dx = shipPos.x - shipPrev.x;
  const dz = shipPos.z - shipPrev.z;
  const mag = Math.hypot(dx, dz);
  // Degenerate case — ship hasn't moved enough in xz. Fall back to a
  // canonical "approach from -z" so the camera still composes.
  const approachUnit = mag > 1e-6 ? { x: dx / mag, z: dz / mag } : { x: 0, z: 1 };
  // Perpendicular in xz, CCW around +y.
  const perpUnit = { x: -approachUnit.z, z: approachUnit.x };

  const camDist = R_MOON_KM * composition.camRMultiplier;
  const cosP = Math.cos(composition.pitchRad);
  const sinP = Math.sin(composition.pitchRad);
  const cosS = Math.cos(composition.sideAngleRad);
  const sinS = Math.sin(composition.sideAngleRad);

  const cameraPos: Vec3 = {
    x: ctx.moonPos.x + (-approachUnit.x * cosP * cosS + perpUnit.x * cosP * sinS) * camDist,
    y: ctx.moonPos.y + sinP * camDist,
    z: ctx.moonPos.z + (-approachUnit.z * cosP * cosS + perpUnit.z * cosP * sinS) * camDist,
  };

  const t = composition.targetBias;
  const cameraTarget: Vec3 = {
    x: ctx.moonPos.x + (shipPos.x - ctx.moonPos.x) * t,
    y: ctx.moonPos.y + (shipPos.y - ctx.moonPos.y) * t,
    z: ctx.moonPos.z + (shipPos.z - ctx.moonPos.z) * t,
  };

  return {
    iconicMet,
    shipPos,
    shipVelocityXZ: approachUnit,
    cameraPos,
    cameraTarget,
    composition,
  };
}

/**
 * Detect whether a cislunar mission has a hero event "active" at the
 * current sim-day, and if so, return its MET + type. Parallel to
 * `findActiveFlybyMet` from `$lib/orbital/find-active-flyby` but for
 * the cislunar hero-shot beats (loi / tei / descent_start / ascent).
 */
export const HERO_APPROACH_DAYS = 0.5; // smaller window — cislunar timescales are days, not months
export const HERO_DEPART_DAYS = 0.3;

export interface HeroEventLite {
  met_days?: number | null;
  type?: string | null;
}

export interface ActiveCislunarHero {
  met: number;
  type: CislunarHeroEventType;
}

export function findActiveCislunarHero(
  events: ReadonlyArray<HeroEventLite>,
  simDay: number,
  depDay: number,
): ActiveCislunarHero | null {
  for (const e of events) {
    const t = e.type;
    // Widened from the original four (loi/tei/descent_start/ascent)
    // to also cover free-return swing-bys (Apollo 13: type=flyby),
    // impact / powered-descent landers (Luna 9, Luna 16, Chandrayaan-3:
    // type=edl_or_oi), and missions that use the generic 'arrival'
    // type for their lunar-orbit moment (SLIM, Chandrayaan-1).
    if (
      t !== 'loi' &&
      t !== 'tei' &&
      t !== 'descent_start' &&
      t !== 'ascent' &&
      t !== 'flyby' &&
      t !== 'edl_or_oi' &&
      t !== 'arrival'
    )
      continue;
    if (e.met_days == null) continue;
    const eventSimDay = depDay + e.met_days;
    const delta = simDay - eventSimDay;
    if (delta >= -HERO_APPROACH_DAYS && delta <= HERO_DEPART_DAYS) {
      return { met: e.met_days, type: t as CislunarHeroEventType };
    }
  }
  return null;
}
