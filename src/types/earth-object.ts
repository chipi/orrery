import type { LinkTier } from './mission';

export type Body = 'EARTH' | 'MOON' | 'SUN_EARTH_L2';
export type Regime = 'LEO' | 'MEO' | 'GEO' | 'HEO' | 'MOON' | 'L2';
export type ObjectStatus = 'ACTIVE' | 'RETIRED' | 'PLANNED';

export interface EarthObject {
  id: string;
  body: Body;
  regime: Regime;
  earth_distance_km: number;
  altitude_km?: number;
  perigee_altitude_km?: number;
  apogee_altitude_km?: number;
  ecc?: number;
  elliptical?: boolean;
  period_min?: number;
  inclination?: number;
  count: number;
  color: string;
  agencies: string[];
  launched: number;
  status: ObjectStatus;
  crew: number;
  credit: string;
  links: Array<{ l: string; u: string; t: LinkTier }>;
  /** Editorial overlay fields merged at fetch time */
  name?: string;
  short?: string;
  description?: string;
  scale_fact?: string;
}
