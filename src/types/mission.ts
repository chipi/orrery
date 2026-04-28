export type Destination = 'MARS' | 'MOON';
export type MissionStatus = 'ACTIVE' | 'FLOWN' | 'PLANNED';
export type Sector = 'gov' | 'private';
export type DataQuality = 'good' | 'partial' | 'reconstructed';
export type LinkTier = 'intro' | 'core' | 'deep';
export type EventType = 'nominal' | 'info' | 'warning';

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
}
