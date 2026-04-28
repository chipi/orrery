import type { LinkTier, DataQuality } from './mission';

export type MoonAgency = 'NASA' | 'ROSCOSMOS' | 'CNSA' | 'ISRO' | 'JAXA';
export type Nation = 'USA' | 'USSR' | 'Russia' | 'China' | 'India' | 'Japan';
export type SurfaceStatus = 'completed' | 'ongoing' | 'planned';

export interface MoonSite {
  id: string;
  agency: MoonAgency;
  nation: Nation;
  year: number;
  landing_date?: string;
  lat: number;
  lon: number;
  crewed: boolean;
  status: 'FLOWN' | 'PLANNED';
  surface_status: SurfaceStatus;
  surface_duration_days?: number;
  eva_duration_hours?: number;
  samples_kg: number;
  data_quality: DataQuality;
  credit: string;
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
