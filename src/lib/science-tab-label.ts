import * as m from '$lib/paraglide/messages';
import type { ScienceTabId } from '$types/science';

// Explicit table, not m[`science_tab_${tab}`]: a computed key makes the bundler
// keep every message in the catalogue (a 3 MB chunk on /science).
const TAB_MSG: Record<ScienceTabId, () => string> = {
  cosmology: m.science_tab_cosmology,
  exoplanets: m.science_tab_exoplanets,
  history: m.science_tab_history,
  'life-in-space': m.science_tab_life_in_space,
  'mission-phases': m.science_tab_mission_phases,
  observation: m.science_tab_observation,
  orbits: m.science_tab_orbits,
  planets: m.science_tab_planets,
  porkchop: m.science_tab_porkchop,
  propulsion: m.science_tab_propulsion,
  'reading-list': m.science_tab_reading_list,
  'scales-time': m.science_tab_scales_time,
  'space-stations': m.science_tab_space_stations,
  transfers: m.science_tab_transfers,
  'watch-list': m.science_tab_watch_list,
};

/** Localised /science tab name; title-cased slug for an unknown tab. */
export function scienceTabLabel(tab: string): string {
  const fn = TAB_MSG[tab as ScienceTabId];
  return fn ? fn() : tab.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}
