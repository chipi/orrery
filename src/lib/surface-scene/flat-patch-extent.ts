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
