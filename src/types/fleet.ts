/**
 * Fleet entry types — static/data/fleet/index.json + per-entry detail
 * files at static/data/fleet/{category}/{id}.json. PRD-012 v0.2 / RFC-016 v0.2.
 */

export type FleetCategory =
  | 'launcher'
  | 'crewed-spacecraft'
  | 'cargo-spacecraft'
  | 'station'
  | 'rover'
  | 'lander'
  | 'orbiter'
  | 'observatory';

export type FleetStatus = 'FLOWN' | 'ACTIVE' | 'RETIRED' | 'FAILED' | 'PLANNED';

export type FleetEra = '1957-1969' | '1969-1981' | '1981-2011' | '2011-now' | 'planned';

export type FleetEpoch =
  | 'first-steps'
  | 'space-race'
  | 'lunar-era'
  | 'first-stations'
  | 'shuttle-and-mir'
  | 'iss-assembly'
  | 'commercial-era'
  | 'lunar-return'
  | 'mars-era';

export interface FleetLink {
  l: string;
  u: string;
  t: 'intro' | 'core' | 'deep';
}

export interface FleetIndexEntry {
  id: string;
  name: string;
  category: FleetCategory;
  agency: string;
  country: string;
  era: FleetEra;
  epoch: FleetEpoch;
  status: FleetStatus;
  first_flight: string;
  hero_path?: string;
  tagline: string;
}

export interface FleetCrewMember {
  name: string;
  role: string;
  agency?: string;
  country?: string;
  portrait_path?: string;
}

export interface FleetFlight {
  mission_id: string;
  flight_designation: string;
  patch_path?: string;
  crew?: FleetCrewMember[];
}

export interface FleetSiteLink {
  type: 'moon' | 'mars' | 'earth-object';
  site_id: string;
}

/** Per-entry detail record at static/data/fleet/{category}/{id}.json. */
export interface FleetEntryBase {
  id: string;
  name: string;
  category: FleetCategory;
  agency: string;
  country: string;
  manufacturer: string;
  first_flight: string;
  last_flight?: string;
  status: FleetStatus;
  era: FleetEra;
  epoch: FleetEpoch;
  best_known_for?: string;
  specs?: Record<string, number | string | boolean>;
  linked_missions?: string[];
  linked_sites?: FleetSiteLink[];
  flights?: FleetFlight[];
  /** Optional route to dedicated explorer (e.g. /iss, /tiangong). */
  explorer_route?: string;
  credit: string;
  links: FleetLink[];
}

/** Locale overlay fields merged at fetch time (Phase G). */
export interface FleetEntryOverlay {
  name: string;
  tagline: string;
  description: string;
  best_known_for?: string;
}

export type FleetEntry = FleetEntryBase & Partial<FleetEntryOverlay>;
