/**
 * Generic surface-site type for /moon and /mars (PRD-009 / RFC-012).
 *
 * A site is either:
 *   - kind: 'surface'  — lander, rover, crashed-but-located vehicle. Requires lat/lon.
 *   - kind: 'orbiter'  — circling spacecraft. Requires altitude_km + inclination_deg.
 *
 * The `agency` enum is the operating org (drives branding + logo); the `nation`
 * enum is the country/continent of origin (drives the legend's nation grouping —
 * Soviet missions are ROSCOSMOS-attributed for branding continuity but
 * USSR-attributed for the historical narrative).
 */

import type { LinkTier, DataQuality } from './mission';

export type SurfaceAgency = 'NASA' | 'ROSCOSMOS' | 'CNSA' | 'ISRO' | 'JAXA' | 'ESA' | 'UAESA';
export type SurfaceNation =
  | 'USA'
  | 'USSR'
  | 'Russia'
  | 'China'
  | 'India'
  | 'Japan'
  | 'Europe'
  | 'UAE';
export type SurfaceStatus = 'completed' | 'ongoing' | 'planned';
export type SiteKind = 'surface' | 'orbiter';
export type SiteStatus = 'FLOWN' | 'PLANNED' | 'ACTIVE' | 'ENDED' | 'CRASHED' | 'LOST';

export interface SurfaceSite {
  id: string;
  kind: SiteKind;
  agency: SurfaceAgency;
  nation: SurfaceNation;
  year: number;
  landing_date?: string;
  /** Surface coordinates — required when kind === 'surface'. */
  lat?: number;
  lon?: number;
  /** Orbital parameters — required when kind === 'orbiter'. */
  altitude_km?: number;
  inclination_deg?: number;
  eccentricity?: number;
  crewed?: boolean;
  status: SiteStatus;
  surface_status: SurfaceStatus;
  surface_duration_days?: number;
  eva_duration_hours?: number;
  samples_kg?: number;
  data_quality: DataQuality;
  credit: string;
  mission_id?: string;
  links: Array<{ l: string; u: string; t: LinkTier }>;
  /** Editorial overlay fields merged at fetch time */
  name?: string;
  mission_type?: string;
  site_name?: string;
  crew?: string[];
  left?: string;
  fact?: string;
  capability?: string;
  /** ── Surface Hotspots v0.7 (PRD-014 / RFC-017) ──
   * Optional progressive-disclosure metadata. Sites without these
   * fields render as Tier 0 silhouettes only (backward compatible).
   * Set hotspot_tier_max to enable Tier 1+ rendering for this site.
   */
  hotspot_tier_max?: 0 | 1 | 2 | 3;
  hotspot_model?: string;
  hotspot_annotations?: HotspotAnnotation[];
  location_uncertainty_m?: number;
  /**
   * Path (provenance-style, e.g. /images/hotspots/moon/apollo11/tier2-lroc.jpg)
   * to the source LROC NAC / HiRISE patch for this site. Frontend
   * joins this to image-vision.json (#148 manifest) to find the
   * 1:1 pre-cropped variant URL.
   */
  hotspot_tier2_source?: string;
  /**
   * Path to the equirectangular Tier 3 ground-view panorama for
   * this site (V2 / #118, ADR-061). PD-NASA: Apollo Lunar Surface
   * Journal panoramas for Moon, NASA/JPL-Caltech/MSSS Mastcam-Z
   * for Mars. Only Showcase sites carry this in v0.7.
   */
  hotspot_tier3_panorama?: string;
  /** Showcase tier flag — 4-6 annotations, polished treatment. */
  showcase?: boolean;
  /** Marker rendering hint for failed-landing sites (V3c). */
  crashed?: boolean;
}

/**
 * Annotation marker inside a Tier 2 surface patch. lat_offset_m /
 * lon_offset_m are metres from the site's published lat/lon.
 */
export interface HotspotAnnotation {
  id: string;
  label: string;
  lat_offset_m: number;
  lon_offset_m: number;
  gallery_image?: string;
}

/**
 * Rover-traverse polyline (PRD-009 §what-comes-after, RFC-012 OQ-6).
 * Vendored as a static snapshot; no live refresh in V1.
 */
export interface Traverse {
  rover_id: string;
  agency: SurfaceAgency;
  status: 'ACTIVE' | 'ENDED';
  snapshot_date: string;
  credit: string;
  /** Polyline vertices: [lat, lon] pairs in degrees. */
  points: Array<[number, number]>;
}
