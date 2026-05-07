/** Tiangong module base record (language-neutral) — static/data/tiangong-modules.json */
export interface TiangongModuleLink {
  l: string;
  u: string;
  t: 'intro' | 'core' | 'deep';
}

export interface TiangongModuleBase {
  id: string;
  builder: string;
  builder_country: string;
  agency: string;
  launch_vehicle: string;
  launch_date: string;
  flight_designation: string;
  mass_kg: number;
  length_m: number;
  year_first_of?: string;
  status: 'ACTIVE' | 'RETIRED';
  credit: string;
  links: TiangongModuleLink[];
}

/** Overlay fields merged at fetch time */
export interface TiangongModuleOverlay {
  name: string;
  description: string;
  function_detail: string;
}

export type TiangongModule = TiangongModuleBase & TiangongModuleOverlay;
