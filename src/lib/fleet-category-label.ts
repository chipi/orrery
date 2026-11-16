/**
 * Localized labels for the fleet categories in the data (`crewed-spacecraft`,
 * `launcher`, …). The id stays the data value (filters, URLs, CSS); only the
 * visible text goes through this. Shared by /fleet, /fleet/<id> and the fleet
 * panel so no surface prints the raw id.
 */
import * as m from '$lib/paraglide/messages';
import type { FleetCategory } from '$types/fleet';

const CATEGORY: Record<FleetCategory, () => string> = {
  launcher: m.fleet_cat_launcher,
  'crewed-spacecraft': m.fleet_cat_crewed,
  'cargo-spacecraft': m.fleet_cat_cargo,
  station: m.fleet_cat_station,
  rover: m.fleet_cat_rover,
  lander: m.fleet_cat_lander,
  orbiter: m.fleet_cat_orbiter,
  observatory: m.fleet_cat_observatory,
  'space-suit': m.fleet_cat_suit,
  constellation: m.fleet_cat_constellation,
  'launch-site': m.fleet_cat_launch_site,
  engine: m.fleet_cat_engine,
};

export function fleetCategoryLabel(category: string): string {
  return CATEGORY[category as FleetCategory]?.() ?? category;
}
