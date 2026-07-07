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

export type SurfaceAgency =
  | 'NASA'
  | 'ROSCOSMOS'
  | 'CNSA'
  | 'ISRO'
  | 'JAXA'
  | 'ESA'
  | 'UAESA'
  | 'SpaceIL'
  | 'ESA-UK'
  | 'SpaceX'
  | 'Arianespace';
export type SurfaceNation =
  'USA' | 'USSR' | 'Russia' | 'China' | 'India' | 'Japan' | 'Europe' | 'UAE' | 'Israel' | 'UK';
export type SurfaceStatus = 'completed' | 'ongoing' | 'planned';
export type SiteKind = 'surface' | 'orbiter';
export type SiteStatus = 'FLOWN' | 'PLANNED' | 'ACTIVE' | 'ENDED' | 'CRASHED' | 'LOST';

/**
 * Axis-aligned bounding box for a surface site's geographic extent.
 * Source of truth for the rectangular region polygon rendered on /moon and
 * /mars (replaces the legacy circular disc — ADR-061, issue #283 Slice 1).
 */
export interface RegionBounds {
  lat_min: number;
  lat_max: number;
  lon_min: number;
  lon_max: number;
}

export type RegionKind = 'landing_ellipse' | 'traverse_bbox' | 'roi_quad' | 'image_swath';

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
  /**
   * Axis-aligned (lat, lon) bounding box for the site's geographic extent.
   * When set, /moon and /mars render the site as a rectangular region polygon
   * instead of the legacy circular disc (ADR-061, issue #283). Only valid
   * for kind === 'surface'.
   */
  region_bounds?: RegionBounds;
  /** Drives visual treatment of region_bounds. */
  region_kind?: RegionKind;
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
  /**
   * Multiple missions associated with this site (#285 Phase 2 B4).
   * For Earth launch-sites: every mission that launched from this
   * pad — drives the "Launches from here" chip list in the panel.
   * Complements `mission_id` (1:1) for the 1:N case. Optional;
   * /moon and /mars sites currently don't populate this.
   */
  linked_missions?: string[];
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
   * Path to the Tier 2a regional context patch — Murray Lab CTX
   * mosaic at 5 m/px (Mars) / LROC WAC for Moon (future). Wider
   * landing-zone view that sits BELOW the detail tier-2 patch.
   * Optional — sites without this render only the detail layer.
   */
  hotspot_tier2_regional_source?: string;
  /**
   * True ground width of the detail (HiRISE/LROC NAC) crop in metres
   * — 2048 px × source resolution (≈512 m at 0.25 m/px). Written by the
   * fetch pipeline. Pairs with `hotspot_tier2_regional_ground_m` to let
   * the surface-patch builder co-scale the detail patch LITERALLY against
   * the regional patch (#309) so overlapping content matches at the seam.
   */
  hotspot_tier2_ground_m?: number;
  /**
   * True ground width of the regional (CTX/WAC) crop in metres — 3072 px
   * × 5 m/px (≈15360 m for the Murray Lab CTX mosaic). Written by the
   * fetch pipeline. See `hotspot_tier2_ground_m`.
   */
  hotspot_tier2_regional_ground_m?: number;
  /**
   * Operator override for the auto-pick HiRISE product. When set,
   * the fetch pipeline skips the catalog candidate ranking and
   * pulls this specific product ID. Also surfaced in the info card
   * as the source attribution string ("HiRISE ESP_030313_1755").
   * Format: UAhirise product ID (e.g. ESP_030313_1755).
   */
  hotspot_tier2_force_product_id?: string;
  /**
   * Path to the equirectangular Tier 3 ground-view panorama for
   * this site (V2 / #118). PD-NASA: Apollo Lunar Surface Journal
   * panoramas for Moon, NASA/JPL-Caltech/MSSS Mastcam-Z for Mars.
   * Only Showcase sites carry this in v0.7.
   */
  hotspot_tier3_panorama?: string;
  /** Showcase tier flag — 4-6 annotations, polished treatment. */
  showcase?: boolean;
  /** Marker rendering hint for failed-landing sites (V3c). */
  crashed?: boolean;
  /** ── Panorama schema v2 (PRD-022 / ADR-074, #286) ────────────
   * Optional sidecar fields layered on `hotspot_tier3_panorama`.
   * All optional — sites without these render with a generic caption
   * and no annotations. See ADR-074 §"Schema — sidecar fields" for
   * the deterministic resolution rule when both single-pano and set
   * are present.
   */
  panorama_metadata?: PanoramaMetadata;
  panorama_annotations?: PanoramaAnnotation[];
  panorama_set?: PanoramaSetEntry[];
  traverse_stop_link?: string;
}

/**
 * Panorama metadata (PRD-022 / ADR-074). Drives the caption overlay
 * (sol / date / instrument / caption / credit) and the honest-sky
 * pitch microcopy via `synthetic_regions`. All fields optional —
 * sites without metadata render a generic caption from the credit
 * field of the existing image-provenance entry.
 */
export interface PanoramaMetadata {
  /** Mars sol or Moon EVA day number, when applicable. */
  sol?: number;
  /** ISO date (YYYY-MM-DD) of the image capture. */
  date?: string;
  /** Instrument that captured the panorama (e.g. "Mastcam-Z"). */
  instrument?: string;
  /** 1-3 sentence caption explaining what the user is looking at. */
  caption?: string;
  /** Imaging-team credit ("NASA/JPL-Caltech/ASU"). */
  credit_team?: string;
  /** NASA PIA / press-release id, when applicable. */
  nasa_id?: string;
  /**
   * Percentage of the vertical extent of the equirectangular panorama
   * that contains real photographic data. 100 = fully real; 30 = ~70%
   * synthetic. Drives honest-provenance microcopy.
   */
  real_extent_pct_vertical?: number;
  /**
   * Declared synthetic-region pitch ranges. When the camera's pitch
   * falls inside one of these, the renderer overlays a
   * "this region was not photographed" microcopy. Pitch in degrees,
   * +90 = zenith, -90 = nadir, 0 = horizon.
   */
  synthetic_regions?: Array<{
    pitch_min_deg: number;
    pitch_max_deg: number;
    kind: 'synthetic_sky' | 'synthetic_nadir' | 'no_data';
  }>;
  /**
   * The panorama's 0° yaw direction in real-world terms (e.g.
   * "rover forward"). Drives the compass-rose N-arrow when set;
   * hidden when absent (no false orientation claim).
   */
  compass_zero_direction?: string;
}

/**
 * Annotation marker in panorama yaw/pitch space (PRD-022 / ADR-074).
 * Rendered as a 3D Sprite on the interior of the inverted-sphere
 * skybox at the yaw/pitch direction. Click opens a caption card.
 *
 * Distinct from HotspotAnnotation (which is surface lat/lon offset
 * space, rendered on Tier-2 patches).
 */
export interface PanoramaAnnotation {
  /** Stable id for cross-link + i18n overlay keys. */
  id: string;
  /** Yaw direction in degrees, 0 = panorama centre / forward. */
  yaw_deg: number;
  /** Pitch in degrees, +90 = zenith, -90 = nadir, 0 = horizon. */
  pitch_deg: number;
  /** Short display label (≤ ~30 chars). */
  label: string;
  /** Optional 1-2 sentence body shown in the caption card. */
  body?: string;
}

/**
 * Multi-panorama set entry (PRD-022 / ADR-074). When `panorama_set`
 * is non-empty, the cycler UI shows arrows + counter; the entry with
 * `default: true` is the initial view. Each entry's `metadata` and
 * `annotations` override the entry-root values when active.
 */
export interface PanoramaSetEntry {
  id: string;
  url: string;
  metadata?: PanoramaMetadata;
  annotations?: PanoramaAnnotation[];
  default?: boolean;
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
 * A single notable waypoint along a rover traverse (sample-collection
 * site, drill site, panorama site, etc.). Per ADR-072 §"curated traverse
 * stops" — surfaces beyond just start + end on the flat-patch view + on
 * the 3D sphere traverse. Authored sparingly: 4-10 stops per rover is
 * the right density (one per major mission phase / discovery), not
 * every sol.
 */
export interface TraverseStop {
  /**
   * Stable identifier for deep-link routing — convention is
   * `sol-<N>` (each rover's sols are unique within that rover, so
   * sol is naturally sufficient when combined with the rover the
   * stop belongs to). Added 2026-06-01 to power the panorama
   * cross-link chip's `?traverse_stop=` URL handler.
   */
  id: string;
  /** Mars sol or Moon EVA day, for label rendering. */
  sol: number;
  /** Stop location in decimal degrees. */
  lat: number;
  lon: number;
  /** Display label, ≤ ~30 chars (e.g. "John Klein drill", "Sample 7"). */
  label: string;
  /** Kind drives marker glyph + tint. */
  kind: 'sample' | 'drill' | 'panorama' | 'helicopter' | 'feature';
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
  /** Curated notable stops along the traverse. Optional. */
  stops?: TraverseStop[];
  /**
   * HiRISE detail crops sampled ALONG the route (#360) so there's zoom
   * capability anywhere the rover drove, not just at the landing site.
   * Loaded from `<rover>.route-patches.json` by getMarsTraverse. Each is
   * rendered as a detail patch on the magnified traverse.
   */
  route_patches?: RouteHirisePatch[];
}

/** One along-route HiRISE detail crop (#360). */
export interface RouteHirisePatch {
  /** Stop id (`sol-<N>`) or interval id (`km-<NN>`). */
  id: string;
  lat: number;
  lon: number;
  /** Stop kind, or `route` for interval-fill samples. */
  kind: string;
  /** Provenance-style image path (/images/hotspots/mars/<rover>/traverse/<id>.jpg). */
  image: string;
  /** Source product the crop came from (HiRISE / LROC NAC / Kaguya TC id). */
  product_id: string;
  /**
   * Instrument the crop came from — drives the honest per-patch source credit
   * on the /moon traverse (#361: LROC NAC where it exists, Kaguya TC fallback).
   * Absent on older Mars manifests (implicitly HiRISE).
   */
  instrument?: 'LROC NAC' | 'Kaguya TC' | 'HiRISE';
  resolution_m_per_px: number;
  /** True ground width (m) of the crop — drives literal co-scale. */
  ground_m: number;
}
