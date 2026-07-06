/**
 * Shared types for the launches data pipeline (PRD-020 / RFC-023).
 *
 * `RawLaunchEntry` is the normalised intermediate shape every `LaunchSource`
 * returns from `fetchWindow`. The orchestrator (S3) merges these into the
 * final `ManifestEntry` shape that lands in `static/data/launches.json` +
 * the per-decade historic files.
 */

export type LaunchStatusCode =
  'GO' | 'TBD' | 'SUCCESS' | 'FAILURE' | 'PARTIAL' | 'HOLD' | 'IN_FLIGHT';

export type LaunchStatus = {
  code: LaunchStatusCode;
  label: string;
};

export type LaunchNetPrecision = 'second' | 'minute' | 'hour' | 'day' | 'month' | 'year';

export type LaunchProvenanceRole =
  'primary' | 'confirmed-via' | 'augmented-with' | 'fallback-primary';

/**
 * Provenance chain entry recorded per (source, launch) contribution.
 * The orchestrator builds these from each source's `defaultRole` (mostly
 * `primary` for agency-direct + GCAT, `fallback-primary` for LL2) and
 * the merge order.
 */
export type LaunchProvenanceLink = {
  source: string;
  source_url?: string;
  fetched_at: string;
  role: LaunchProvenanceRole;
};

/**
 * Normalised launch entry as returned by `LaunchSource.fetchWindow`.
 * The orchestrator may further enrich (e.g. tier assignment) before
 * the entry lands in the manifest.
 */
export type RawLaunchEntry = {
  /** Stable Orrery-internal id: `{YYYY-MM-DD}-{rocket-family-slug}-{mission-slug}`. */
  id: string;
  net: string;
  net_precision: LaunchNetPrecision;
  window_start?: string;
  window_end?: string;
  status: LaunchStatus;
  name: string;
  mission_name?: string;
  mission_type?: string;
  orbit_abbrev?: string;
  orbit_name?: string;
  agency_id?: string;
  agency_name: string;
  agency_type?: 'Government' | 'Commercial' | 'Educational' | 'Multinational' | 'Unknown';
  country?: string;
  rocket_config_id?: string;
  rocket_config_name: string;
  rocket_family: string;
  pad_name?: string;
  pad_location?: string;
  image_url?: string;
  image_credit?: string;
  webcast_live?: boolean;
  /** When this source first observed the entry. */
  source_observed_at: string;
  /** Provider name (e.g. 'gcat', 'll2', 'nasa-direct'). */
  source_name: string;
  /** Canonical URL on the source side (e.g. LL2 launch URL, GCAT release page). */
  source_url?: string;
};
