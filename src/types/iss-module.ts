/** ISS module base record (language-neutral) — static/data/iss-modules.json */
export interface IssModuleLink {
  l: string;
  u: string;
  t: 'intro' | 'core' | 'deep';
}

export interface IssModuleBase {
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
  links: IssModuleLink[];
}

/** Overlay fields merged at fetch time */
export interface IssModuleOverlay {
  name: string;
  description: string;
  function_detail: string;
}

export type IssModule = IssModuleBase & IssModuleOverlay;
