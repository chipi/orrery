/**
 * Published (tier_2_published) cislunar trajectories onto /fly's schematic Earth-Moon frame.
 *
 * /fly draws a schematic Moon: a circle of radius A_MOON_KM in the x-z plane, at angle
 * 2·pi·MET/T_MOON_DAYS in the waypoint data's own frame (buildFromWaypoints turns the data by
 * the departure day's phase). A real ephemeris (JPL Horizons) has the real Moon somewhere else:
 * elliptical, inclined, at a different phase. Drawn as-is, the path would orbit empty space.
 *
 * The mapping keeps what matters about a cislunar path, its geometry relative to the Earth and
 * the Moon: each sample is expressed in the real Earth-Moon rotating frame (x towards the Moon,
 * z along the Moon's orbital angular momentum), scaled so the real Moon distance becomes
 * A_MOON_KM, and placed in the same rotating frame of the schematic Moon at that MET. The real
 * Moon lands on the drawn Moon at every sample; a distant retrograde orbit keeps its shape and
 * sense; flyby distances keep their ratio to the Earth-Moon distance.
 */
import { A_MOON_KM, T_MOON_DAYS } from '../../src/lib/orbital/cislunar/cislunar-geometry';

export type V3 = { x: number; y: number; z: number };

const sub = (a: V3, b: V3): V3 => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
const dot = (a: V3, b: V3) => a.x * b.x + a.y * b.y + a.z * b.z;
const cross = (a: V3, b: V3): V3 => ({
  x: a.y * b.z - a.z * b.y,
  y: a.z * b.x - a.x * b.z,
  z: a.x * b.y - a.y * b.x,
});
const norm = (a: V3) => Math.hypot(a.x, a.y, a.z);
const unit = (a: V3): V3 => {
  const n = norm(a);
  return { x: a.x / n, y: a.y / n, z: a.z / n };
};

/** The schematic Moon of the waypoint data frame at `metDays` (dep_day_sim taken as 0). */
export function schematicMoon(metDays: number): V3 {
  const th = (2 * Math.PI * metDays) / T_MOON_DAYS;
  return { x: Math.cos(th) * A_MOON_KM, y: 0, z: Math.sin(th) * A_MOON_KM };
}

/**
 * One geocentric sample (craft position `craft`, Moon position `moon` and velocity `moonVel`,
 * same epoch, any inertial frame, km and km/s) to the waypoint data frame at `metDays`.
 */
export function toSchematicFrame(craft: V3, moon: V3, moonVel: V3, metDays: number): V3 {
  const xr = unit(moon);
  const zr = unit(cross(moon, moonVel));
  const yr = cross(zr, xr);
  const a = dot(craft, xr);
  const b = dot(craft, yr);
  const c = dot(craft, zr);
  const s = A_MOON_KM / norm(moon);
  const th = (2 * Math.PI * metDays) / T_MOON_DAYS;
  // Schematic rotating frame: x towards the Moon, y along its motion, z = x × y (= −y_scene).
  const xs: V3 = { x: Math.cos(th), y: 0, z: Math.sin(th) };
  const ys: V3 = { x: -Math.sin(th), y: 0, z: Math.cos(th) };
  const zs = cross(xs, ys);
  return {
    x: s * (a * xs.x + b * ys.x + c * zs.x),
    y: s * (a * xs.y + b * ys.y + c * zs.y),
    z: s * (a * xs.z + b * ys.z + c * zs.z),
  };
}

/** Distance from the craft to the real Moon, scaled the way toSchematicFrame scales it. */
export function scaledMoonDistance(craft: V3, moon: V3): number {
  return (norm(sub(craft, moon)) * A_MOON_KM) / norm(moon);
}
