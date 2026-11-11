import type { SurfaceSite } from '$types/surface-site';

/**
 * Ground width (km) the flat-patch DETAIL image is drawn across. The image's
 * own recorded width wins: drawing an 819 m LROC crop across a fixed 1 km
 * stretches it ~22 % about the site, so the true-scale traverse no longer
 * lies on the tracks it imaged. The per-planet default is only for sites
 * that record no extent.
 */
export function detailGroundKm(
  site: Pick<SurfaceSite, 'hotspot_tier2_ground_m'>,
  planet: string,
): number {
  if (site.hotspot_tier2_ground_m) return site.hotspot_tier2_ground_m / 1000;
  return planet === 'mars' ? 1.5 : planet === 'earth' ? 0.5 : 1.0;
}

interface FlatRoutePatch {
  id: string;
  lat: number;
  lon: number;
  image: string;
  ground_m: number;
  resolution_m_per_px: number;
}

/** Detail crops (Apollo tier-2, HiRISE) are 2048 px wide. */
const DETAIL_PX = 2048;

/**
 * What the flat patch opens for the nearest route tile. A tile that lies
 * inside the landing's own detail footprint and is no sharper than it gives
 * way to the landing detail (null): the 2 m/px Apollo "start" tile used to
 * hide the 0.4 m/px LROC close-up. Otherwise the tile, at its OWN ground width.
 */
export function routePatchFlatTarget(
  selected: SurfaceSite,
  rp: FlatRoutePatch,
  radiusKm: number,
): SurfaceSite | null {
  const ground = selected.hotspot_tier2_ground_m;
  if (ground && selected.lat != null && selected.lon != null) {
    const mPerDeg = (Math.PI / 180) * radiusKm * 1000;
    const dN = (rp.lat - selected.lat) * mPerDeg;
    const dE = (rp.lon - selected.lon) * mPerDeg * Math.cos((selected.lat * Math.PI) / 180);
    const covers = Math.max(Math.abs(dN), Math.abs(dE)) < ground / 2;
    if (covers && rp.resolution_m_per_px >= ground / DETAIL_PX) return null;
  }
  return {
    ...selected,
    lat: rp.lat,
    lon: rp.lon,
    hotspot_tier2_source: rp.image,
    hotspot_tier2_ground_m: rp.ground_m,
    name: `${selected.name ?? selected.id} · ${rp.id}`,
  };
}
