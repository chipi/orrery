/**
 * Pure projections for the /moon screen.
 *
 * The Moon Map renders sites in two views:
 *   - 3D — markers anchored on a sphere via lat/lon → cartesian.
 *   - 2D — equirectangular flat map, lat/lon → pixel coords inside a
 *          rectangular drawing region.
 *
 * Both projections are pure: extracting them lets us test the math
 * without spinning up Three.js or a 2D canvas.
 */

/**
 * Lat/lon (degrees) → cartesian on a unit sphere.
 *
 * Convention matches the renderer:
 *   +Y is north pole; longitude 0 sits on +X; +lon goes east, which
 *   means -Z (right-handed Three.js coords with the moon-map texture
 *   facing the camera at lon=0).
 */
export function latLonToUnitSphere(
  latDeg: number,
  lonDeg: number,
): { x: number; y: number; z: number } {
  const lat = (latDeg * Math.PI) / 180;
  const lon = (lonDeg * Math.PI) / 180;
  return {
    x: Math.cos(lat) * Math.cos(lon),
    y: Math.sin(lat),
    z: -Math.cos(lat) * Math.sin(lon),
  };
}

/**
 * Equirectangular projection — lat/lon (degrees) → pixel coords inside
 * a rectangular drawing region of size (mapW × mapH) anchored at (x0, y0).
 *
 * Longitude maps left→right over [-180°, 180°]; latitude maps top→bottom
 * over [+90°, -90°] (canvas Y grows downward, so north is at the top).
 */
export function latLonToEquirect(
  latDeg: number,
  lonDeg: number,
  region: { x0: number; y0: number; mapW: number; mapH: number },
): { x: number; y: number } {
  return {
    x: region.x0 + ((lonDeg + 180) / 360) * region.mapW,
    y: region.y0 + ((90 - latDeg) / 180) * region.mapH,
  };
}
