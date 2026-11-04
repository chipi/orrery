// No imports: fetch-context-layer.ts runs this under tsx, outside SvelteKit.
export interface ContextBounds {
  lat_min: number;
  lat_max: number;
  lon_min: number;
  lon_max: number;
}

/**
 * The lat/lon box of true ground `km` wide centred on a site: ±km/2 north–south,
 * and wider in longitude by 1/cos(lat) so it is `km` east–west on the ground.
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
  const dLon = dLat / Math.max(0.05, Math.cos((lat * Math.PI) / 180));
  return {
    lat_min: round(Math.max(-90, lat - dLat)),
    lat_max: round(Math.min(90, lat + dLat)),
    lon_min: round(lon - dLon),
    lon_max: round(lon + dLon),
  };
}
