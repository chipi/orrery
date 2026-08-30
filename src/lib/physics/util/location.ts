/**
 * The launch-location model (operator 2026-08-30: "separate Earth from the physics").
 *
 * ONE body/location primitive the whole kernel resolves through — no formula
 * hardcodes Earth. Every field derives from the existing `PLANET_STATS` scan
 * (surface gravity, radius) + `SURFACE_BODY_KINEMATICS` (rotation), so the physics
 * runs on any body in that table (Earth, Moon, Mars, Venus, Mercury). This unifies
 * the two body-domain systems the M2 review flagged (`bodyGravityMs2` + the ad-hoc
 * ORBIT_BODIES map) into a single source.
 *
 * `µ = g·R²` for the general case (the honest first-order relation); Earth/Moon use
 * their measured µ so the precise orbital numbers hold. Rotation gives each location
 * an INITIAL eastward speed — the head-start a launch gets for free — which is how we
 * start removing the "launch from rest" assumption (north star: physics without
 * assumptions, more detail later).
 */
import { PLANET_STATS, SURFACE_BODY_KINEMATICS } from './planet-stats';
import { G0, MU_EARTH_KM3_S2, MU_MOON_KM3_S2 } from './constants';

export interface LocationModel {
  id: string;
  /** Surface gravity (m/s²). */
  gMs2: number;
  /** Mean radius (km). */
  rKm: number;
  /** Standard gravitational parameter µ = GM (km³/s²) — measured where known, else g·R². */
  muKm3s2: number;
  /** Sidereal rotation period (hours); 0 when unknown. */
  rotationHours: number;
  /** Eastward surface speed from rotation at the equator (km/s); 0 when rotation unknown. */
  equatorialRotationKms: number;
}

/** Measured µ overrides — Earth/Moon keep their canonical values (D10 home). */
const MU_OVERRIDE_KM3S2: Record<string, number> = {
  earth: MU_EARTH_KM3_S2,
  moon: MU_MOON_KM3_S2,
};

const ROTATION_HOURS = SURFACE_BODY_KINEMATICS as Record<string, { rotationHours: number }>;

/** Resolve a body id to its location model, or undefined if the body is unknown. */
export function locationModel(bodyId: string): LocationModel | undefined {
  const stats = PLANET_STATS[bodyId];
  if (!stats) return undefined;
  const gMs2 = stats.surfaceGravityG * G0;
  const rKm = stats.diameterKm / 2;
  const muKm3s2 = MU_OVERRIDE_KM3S2[bodyId] ?? (gMs2 * (rKm * 1000) ** 2) / 1e9;
  const rotationHours = ROTATION_HOURS[bodyId]?.rotationHours ?? 0;
  const equatorialRotationKms =
    rotationHours > 0 ? (2 * Math.PI * rKm) / (rotationHours * 3600) : 0;
  return { id: bodyId, gMs2, rKm, muKm3s2, rotationHours, equatorialRotationKms };
}

/**
 * Eastward surface speed from the body's rotation at a given latitude (km/s) — the
 * free "head start" a launch gets. Max at the equator, zero at the poles.
 */
export function rotationVelocityKms(loc: LocationModel, latitudeDeg: number): number {
  return loc.equatorialRotationKms * Math.cos((latitudeDeg * Math.PI) / 180);
}
