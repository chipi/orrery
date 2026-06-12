/**
 * Compute the heliocentric camera frame for non-flyby sub-phases.
 *
 * /fly's heliocentric camera dispatches on `sc.phase`
 * ('pre-launch' | 'outbound' | 'return' | 'arrived') + a few sub-conditions
 * (epilogue active, opening still showing, mission ends at Earth vs at
 * destination, etc.) and picks a sub-phase string + camTarget/camR/camP
 * for the auto-zoom lerp.
 *
 * Lifted from `updateHelioAutoZoomTargets`. Pure compute — caller still
 * owns the actual `helioAutoZoomTargetR / Center / P` mutations and the
 * sub-phase transition detection.
 *
 * Constants live here so they're the single source of truth for the
 * framing decisions and so /fly's body shrinks.
 */

/** Camera distance for the destination-arrival close-up. */
export const HELIO_CLOSEUP_R = 40;
/** Camera distance for the Earth-arrival close-up (slightly wider so
 *  Earth + Moon fit in frame on round-trip missions). */
export const HELIO_EARTH_CLOSEUP_R = 50;
/** Default cruise pitch (rad from +y) — slight oblique. */
export const HELIO_CRUISE_P = 1.05;
/** Approach pitch — more top-down so the planet's disc dominates. */
export const HELIO_APPROACH_P = 0.85;
/** Multiplier on flyby body's radius for the arrived close-up framing
 *  on one-way missions (Cassini at Saturn, etc.). */
export const FLYBY_BODY_R_MULTIPLIER = 5.0;

export type SpacecraftPhase = 'pre-launch' | 'outbound' | 'return' | 'arrived';

export interface HelioNonFlybyInputs {
  /** sc.phase from spacecraftPos's return. */
  phase: SpacecraftPhase;
  /** sc.progress (0..1). */
  progress: number;
  /** Spacecraft scene-space position. */
  scScene: { x: number; z: number };
  /** Destination body scene-space position. */
  destScene: { x: number; z: number };
  /** Earth scene-space position. */
  earthScene: { x: number; z: number };
  /** True once the post-arrival epilogue tableau is engaged. */
  epilogueActive: boolean;
  /** True for round-trip missions (the audience ends on Earth, not the
   *  destination body). */
  endAtEarth: boolean;
  /** Scene-space render radius for the destination body — drives the
   *  body-anchored arrived framing on one-way missions. 0 when the
   *  destination isn't in PLANET_SIZES. */
  destSize: number;
  /** Whether the W3 opening sequence is currently locking the wide
   *  Sun-centred tableau (only relevant when phase === 'pre-launch'). */
  inOpeningWide: boolean;
  /** Earth's heliocentric semi-major axis in AU (R_EARTH_AU). Used to
   *  size the cruise-back targetR margin in scene units. */
  rEarthAu: number;
  /** /fly's SCALE_3D constant. */
  scale3d: number;
}

export interface HelioNonFlybyFrame {
  /** Sub-phase string ('prelaunch' / 'cruise-out' / 'approach' / 'depart' /
   *  'arrived' / 'epilogue' / 'opening' / 'cruise-back' / 'depart-return' /
   *  'approach-earth'). */
  sub: string;
  centerX: number;
  centerZ: number;
  targetR: number;
  targetP: number;
}

export function computeHelioNonFlybyFrame(inputs: HelioNonFlybyInputs): HelioNonFlybyFrame {
  const {
    phase,
    progress,
    scScene,
    destScene,
    earthScene,
    epilogueActive,
    endAtEarth,
    destSize,
    inOpeningWide,
    rEarthAu,
    scale3d,
  } = inputs;

  if (phase === 'pre-launch') {
    if (inOpeningWide) {
      // #86 opening tableau — wide Sun-centered top-down system view.
      const destDistance = Math.hypot(destScene.x, destScene.z);
      return {
        sub: 'opening',
        centerX: 0,
        centerZ: 0,
        targetR: Math.max(800, destDistance * 1.4 + (destSize > 0 ? destSize * 8 : 0)),
        targetP: 0.35,
      };
    }
    // Earth close-up, matches the arrival composition for bookend feel.
    return {
      sub: 'prelaunch',
      centerX: earthScene.x,
      centerZ: earthScene.z,
      targetR: HELIO_EARTH_CLOSEUP_R,
      targetP: HELIO_CRUISE_P,
    };
  }

  if (phase === 'arrived') {
    if (epilogueActive) {
      // Bookend with the opening tableau — same multiplier, same
      // Sun-centered framing, same near-top-down tilt.
      const destDistance = Math.hypot(destScene.x, destScene.z);
      return {
        sub: 'epilogue',
        centerX: 0,
        centerZ: 0,
        targetR: Math.max(800, destDistance * 1.4 + (destSize > 0 ? destSize * 8 : 0)),
        targetP: 0.35,
      };
    }
    if (endAtEarth) {
      return {
        sub: 'arrived',
        centerX: earthScene.x,
        centerZ: earthScene.z,
        targetR: HELIO_EARTH_CLOSEUP_R,
        targetP: HELIO_APPROACH_P,
      };
    }
    // One-way arrival at the destination. Bias 65 % toward the ship +
    // size camR off the destination body radius so the composition
    // reads as "in orbit / docked" with the body filling half the frame.
    if (destSize > 0) {
      return {
        sub: 'arrived',
        centerX: destScene.x * 0.35 + scScene.x * 0.65,
        centerZ: destScene.z * 0.35 + scScene.z * 0.65,
        targetR: destSize * FLYBY_BODY_R_MULTIPLIER,
        targetP: HELIO_APPROACH_P,
      };
    }
    return {
      sub: 'arrived',
      centerX: destScene.x,
      centerZ: destScene.z,
      targetR: HELIO_CLOSEUP_R,
      targetP: HELIO_APPROACH_P,
    };
  }

  if (phase === 'outbound') {
    const t = progress * 2; // 0→1 across outbound
    if (t < 0.05) {
      return {
        sub: 'depart',
        centerX: scScene.x,
        centerZ: scScene.z,
        targetR: HELIO_EARTH_CLOSEUP_R,
        targetP: HELIO_CRUISE_P,
      };
    }
    if (t > 0.8) {
      // Approach. Ship-biased 70/30 framing held throughout the window —
      // flyby cinema (±90 days around peak) takes over for the iconic
      // closeup.
      const shipToDestDist = Math.hypot(scScene.x - destScene.x, scScene.z - destScene.z);
      return {
        sub: 'approach',
        centerX: scScene.x * 0.7 + destScene.x * 0.3,
        centerZ: scScene.z * 0.7 + destScene.z * 0.3,
        targetR: Math.max(140, shipToDestDist * 0.85 + (destSize > 0 ? destSize * 4 : 80)),
        targetP: HELIO_APPROACH_P,
      };
    }
    // Cruise-out — ship-biased 70/30 framing, camR sized to ship-to-dest
    // distance plus a body-radius margin.
    const shipToDestDist = Math.hypot(scScene.x - destScene.x, scScene.z - destScene.z);
    return {
      sub: 'cruise-out',
      centerX: scScene.x * 0.7 + destScene.x * 0.3,
      centerZ: scScene.z * 0.7 + destScene.z * 0.3,
      targetR: Math.max(140, shipToDestDist * 0.85 + (destSize > 0 ? destSize * 4 : 80)),
      targetP: HELIO_CRUISE_P,
    };
  }

  // phase === 'return'
  const t = (progress - 0.5) * 2; // 0→1 across return
  if (t < 0.05) {
    return {
      sub: 'depart-return',
      centerX: scScene.x,
      centerZ: scScene.z,
      targetR: HELIO_CLOSEUP_R,
      targetP: HELIO_CRUISE_P,
    };
  }
  if (t > 0.9) {
    return {
      sub: 'approach-earth',
      centerX: earthScene.x,
      centerZ: earthScene.z,
      targetR: HELIO_EARTH_CLOSEUP_R,
      targetP: HELIO_APPROACH_P,
    };
  }
  // Cruise-back — ship+Earth midpoint framing.
  const shipToEarthDist = Math.hypot(scScene.x - earthScene.x, scScene.z - earthScene.z);
  return {
    sub: 'cruise-back',
    centerX: (scScene.x + earthScene.x) * 0.5,
    centerZ: (scScene.z + earthScene.z) * 0.5,
    targetR: Math.max(140, shipToEarthDist * 0.6 + rEarthAu * scale3d * 4 + 30),
    targetP: HELIO_CRUISE_P,
  };
}
