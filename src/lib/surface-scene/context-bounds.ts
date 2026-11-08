// No imports: fetch-context-layer.ts runs this under tsx, outside SvelteKit.
export interface ContextBounds {
  lat_min: number;
  lat_max: number;
  lon_min: number;
  lon_max: number;
  /** Set when the box reaches a pole: the crop is then a square in polar
   *  stereographic projection centred on that pole, ±polar_half_km on each axis
   *  (south: x = ρ·sin λ, y = ρ·cos λ; north: y = −ρ·cos λ), and the lat/lon fields
   *  describe the cap that holds it. A lat/lon box there degenerates into a
   *  thin strip spanning every longitude (Artemis 4 at 89.5°S). */
  polar_half_km?: number;
}

/**
 * The lat/lon box of true ground `km` wide centred on a site: ±km/2 north–south,
 * and wider in longitude by 1/cos(lat) so it is `km` east–west on the ground.
 * A box that reaches a pole becomes a polar square instead (polar_half_km).
 * fetch-context-layer.ts crops the mosaics to it; the cap is built over it.
 */
export function contextBounds(
  lat: number,
  lon: number,
  km: number,
  radiusKm: number,
): ContextBounds {
  const round = (v: number) => Math.round(v * 1e4) / 1e4;
  const kmPerDeg = (radiusKm * Math.PI) / 180;
  const dLat = km / 2 / kmPerDeg;
  if (Math.abs(lat) + dLat >= 90) {
    // Square of half-width km/2 around the pole; its corners lie √2 × that away.
    const reach = (Math.SQRT2 * km) / 2 / kmPerDeg;
    const south = lat < 0;
    return {
      lat_min: south ? -90 : round(90 - reach),
      lat_max: south ? round(-90 + reach) : 90,
      lon_min: -180,
      lon_max: 180,
      polar_half_km: km / 2,
    };
  }
  const dLon = dLat / Math.max(0.05, Math.cos((lat * Math.PI) / 180));
  return {
    lat_min: round(Math.max(-90, lat - dLat)),
    lat_max: round(Math.min(90, lat + dLat)),
    lon_min: round(lon - dLon),
    lon_max: round(lon + dLon),
  };
}

/**
 * Polar stereographic (k = 1) inverse on a sphere of radius `radiusKm`: the
 * lat/lon of the point (x, y) km in the plane centred on the pole of `bounds`.
 */
export function polarToLatLon(
  x: number,
  y: number,
  radiusKm: number,
  south: boolean,
): { lat: number; lon: number } {
  const rho = Math.hypot(x, y);
  const c = (2 * Math.atan(rho / (2 * radiusKm)) * 180) / Math.PI;
  const lon = (Math.atan2(x, south ? y : -y) * 180) / Math.PI;
  return { lat: south ? -90 + c : 90 - c, lon };
}
