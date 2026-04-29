export type Destination = 'MARS' | 'MOON';
export type MissionStatus = 'ACTIVE' | 'FLOWN' | 'PLANNED';
export type Sector = 'gov' | 'private';
export type DataQuality = 'good' | 'partial' | 'reconstructed';
export type LinkTier = 'intro' | 'core' | 'deep';
export type EventType = 'nominal' | 'info' | 'warning';

// ─── Flight params (ADR-027, v0.1.7) ──────────────────────────────
// Honesty flag for the mission's flight-data record. Drives the UI's
// caveat banner + the rendering convention for missing values.
export type FlightDataQuality = 'measured' | 'reconstructed' | 'sparse' | 'unknown';

// MET-stamped event types. Editorial notes for events live in the
// i18n overlay under events[].note (per ADR-017); this base-file
// enum is language-neutral so a typo fails ajv at PR.
export type FlightEventType =
  | 'launch'
  | 'tli_or_tmi'
  | 'tcm'
  | 'arrival'
  | 'edl_or_oi'
  | 'flyby'
  | 'earth_return'
  | 'anomaly';

export interface FlightLaunch {
  vehicle_stage?: string;
  c3_km2_s2?: number;
  declination_deg?: number;
  mass_at_tli_kg?: number;
  source?: string;
}

export interface FlightCruise {
  tcm_count?: number;
  peak_heliocentric_speed_km_s?: number;
  source?: string;
}

export interface FlightArrival {
  v_infinity_km_s?: number;
  entry_velocity_km_s?: number;
  /** Landers: null. Orbiters: target periapsis altitude in km. */
  periapsis_km?: number | null;
  inclination_deg?: number | null;
  /** Landers: null. Orbiters: orbit-insertion ∆v in km/s. */
  orbit_insertion_dv_km_s?: number | null;
  source?: string;
}

export interface FlightTotals {
  total_dv_km_s?: number;
  tli_or_tmi_dv_km_s?: number;
  source?: string;
}

export interface FlightTimelineEvent {
  met_days: number;
  type: FlightEventType;
}

export interface FlightParams {
  launch?: FlightLaunch;
  cruise?: FlightCruise;
  arrival?: FlightArrival;
  totals?: FlightTotals;
  events?: FlightTimelineEvent[];
}

export interface MissionIndex {
  id: string;
  agency: string;
  dest: Destination;
  status: MissionStatus;
  year: number;
  sector: Sector;
  color: string;
}

export interface MissionLink {
  l: string;
  u: string;
  t: LinkTier;
}

export interface MissionEvent {
  met: number;
  label: string;
  note: string;
  type: EventType;
}

export interface Mission extends MissionIndex {
  agency_full: string;
  departure_date: string;
  arrival_date: string;
  transit_days: number;
  vehicle: string;
  payload: string;
  delta_v: string;
  data_quality: DataQuality;
  credit: string;
  links: MissionLink[];
  /** Editorial fields merged from locale overlay at fetch time (per ADR-017). */
  name?: string;
  type?: string;
  first?: string;
  description?: string;
  events?: MissionEvent[];
  /** Flight params (ADR-027). Optional; missing = unknown. */
  flight_data_quality?: FlightDataQuality;
  flight?: FlightParams;
}
