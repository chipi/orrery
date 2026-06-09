export type Destination =
  | 'EARTH'
  | 'MARS'
  | 'MOON'
  | 'MERCURY'
  | 'VENUS'
  | 'JUPITER'
  | 'SATURN'
  | 'URANUS'
  | 'NEPTUNE'
  | 'PLUTO'
  | 'CERES'
  // Non-planetary targets — added 2026-06-07 to host the global
  // iconic-missions expansion (Rosetta + Giotto comets, Hayabusa
  // asteroid, Ulysses polar Sun). /explore PATHS layer renders their
  // heliocentric trajectories; /missions filter pills + MissionPanel
  // treat them as first-class destinations.
  | 'COMET'
  | 'ASTEROID'
  | 'SUN';
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
  | 'anomaly'
  | 'parking_orbit_exit'
  | 'loi'
  | 'tei'
  | 'descent_start'
  | 'ascent'
  | 'separation'
  | 'phasing';

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
  dv_km_s?: number;
  /** Optional human-readable milestone label (e.g. "Venus #1 — gravity assist",
   *  "Jupiter — closest approach", "Saturn orbit insertion"). When set, /fly
   *  renders a teal milestone chip at the event's arc position alongside the
   *  gold FD stage markers — distinct visual treatment because milestones are
   *  per-mission historical narrative beats, not the 7-stage cinematic cadence.
   *  Backfilled from /explore's labeled trajectory waypoints. Optional so
   *  non-iconic missions stay schema-compatible. */
  label?: string;
}

export type CislunarSourceTier = 'tier_1_analytic' | 'tier_1_5_hybrid' | 'tier_2_published';
export type TranslunarType = 'direct' | 'free_return' | 'hybrid_free_return' | 'spiral';
export type LunarArrivalType = 'impact' | 'orbit' | 'orbit_and_land' | 'flyby' | 'lor_orbit';
export type CislunarReturnType = 'none' | 'tei_direct' | 'tei_lor';

export interface CislunarProfile {
  source_tier?: CislunarSourceTier;
  parking_orbit?: { altitude_km?: number; inclination_deg?: number; revs?: number };
  tli?: { dv_kms?: number; c3_km2_s2?: number };
  translunar?: { type?: TranslunarType };
  lunar_arrival?: {
    type?: LunarArrivalType;
    altitude_km?: number;
    inclination_deg?: number;
    periselene_km?: number;
  };
  return?: { type?: CislunarReturnType; dv_kms?: number };
  waypoints_km?: Array<[number, number, number, number]>;
}

export interface FlightParams {
  launch?: FlightLaunch;
  cruise?: FlightCruise;
  arrival?: FlightArrival;
  totals?: FlightTotals;
  events?: FlightTimelineEvent[];
  /** Cislunar trajectory profile (ADR-058). Drives the Earth-centred
   *  cislunar view for Moon missions. Optional; if absent, defaults
   *  are inferred from flight.arrival + flight.totals. */
  cislunar_profile?: CislunarProfile;
  /** Heliocentric interplanetary trajectory profile (#107 Step 6d).
   *  Parallels cislunar_profile for Mars + outer-system missions.
   *  Optional; if absent, /fly's parametric path (transferEllipse) is
   *  used. Schema is intentionally loose at the TS level — fields are
   *  enforced by mission.schema.json. */
  interplanetary_profile?: {
    source_tier?: 'tier_1_analytic' | 'tier_1_5_hybrid' | 'tier_2_published';
    reference_frame?: 'heliocentric_ecliptic_J2000';
    departure_body?: 'earth';
    arrival_body?: 'mars' | 'ceres' | 'jupiter' | 'neptune' | 'pluto';
    transfer_type?: 'hohmann' | 'type1_lambert' | 'type2_lambert';
    tcm_count?: number;
    /** Optional return-leg semantics for sample-return missions
     *  (MMX, future Mars Sample Return). Field absent = one-way. */
    return?: { type?: 'none' | 'tei_helio_direct' | 'tei_helio_lor' };
    waypoints_helio_au?: Array<[number, number, number, number]>;
  };
}

export interface MissionIndex {
  id: string;
  agency: string;
  dest: Destination;
  status: MissionStatus;
  year: number;
  sector: Sector;
  color: string;
  /** True if any phase of the mission carried a crew. Derived offline
   *  from overlay.type containing 'CREWED' via scripts/backfill-crewed-flag.mjs. */
  crewed?: boolean;
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

/** Cross-link to a fleet entry (launcher / spacecraft / payload /
 *  launch-site) — wired during the missions audit (commits 1063dfd22 +
 *  1eecf1ef6 + 6a253e2e5). MissionPanel uses these to render vehicle +
 *  payload cells as anchors to /fleet?id=<entry>. */
export interface FleetRef {
  id: string;
  role: 'launcher' | 'spacecraft' | 'payload' | 'launch-site';
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
  /** Cross-link to fleet entries. Optional; missions older than the
   *  Phase 3 backfill (commits 1063dfd22 → 6a253e2e5) may not have it. */
  fleet_refs?: FleetRef[];
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
