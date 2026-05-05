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
