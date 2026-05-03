import type { LinkTier, DataQuality } from './mission';

export type RocketSector = 'gov' | 'private';
export type RocketStatus = 'ACTIVE' | 'RETIRED' | 'PLANNED';
export type PayloadDefinition = 'tmi' | 'mars_orbit' | 'mars_surface';

export interface Rocket {
  id: string;
  agency: string;
  agency_full: string;
  sector: RocketSector;
  status: RocketStatus;
  color: string;
  first_flight?: number;
  payload_to_leo_kg: number;
  payload_to_mars_kg: number;
  payload_to_mars_definition: PayloadDefinition;
  delta_v_capability_km_s: number;
  isp_s: number;
  data_quality: DataQuality;
  credit: string;
  links: Array<{ l: string; u: string; t: LinkTier }>;
  /** Default launch facility — shown next to the rocket in /plan so
   *  users can see where the vehicle physically lifts off from.  */
  launch_site?: string;
  /** Editorial overlay fields merged at fetch time */
  name?: string;
  type?: string;
  first?: string;
  description?: string;
}
