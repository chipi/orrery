import * as m from '$lib/paraglide/messages';
import type { ScienceTabId } from '$types/science';

// Explicit table, not m[`science_tab_${tab}`]: a computed key makes the bundler
// keep every message in the catalogue (a 3 MB chunk on /science).
const TAB_MSG: Record<ScienceTabId, () => string> = {
  cosmology: m.science_tab_cosmology,
  exoplanets: m.science_tab_exoplanets,
  glossary: m.science_tab_glossary,
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

// The tab labels are set in capitals for the tab bar; a page <title> needs the
// normal-case form, which no casing rule can derive (de "Leben im All").
const TAB_TITLE_MSG: Partial<Record<ScienceTabId, () => string>> = {
  cosmology: m.science_tab_cosmology_title,
  exoplanets: m.science_tab_exoplanets_title,
  history: m.science_tab_history_title,
  'life-in-space': m.science_tab_life_in_space_title,
  'mission-phases': m.science_tab_mission_phases_title,
  observation: m.science_tab_observation_title,
  orbits: m.science_tab_orbits_title,
  planets: m.science_tab_planets_title,
  porkchop: m.science_tab_porkchop_title,
  propulsion: m.science_tab_propulsion_title,
  'reading-list': m.reading_list_title,
  'watch-list': m.watch_list_title,
  'scales-time': m.science_tab_scales_time_title,
  'space-stations': m.science_tab_space_stations_title,
  transfers: m.science_tab_transfers_title,
};

/** Normal-case tab name for a page title; falls back to the tab label. */
export function scienceTabTitle(tab: string): string {
  const fn = TAB_TITLE_MSG[tab as ScienceTabId];
  return fn ? fn() : scienceTabLabel(tab);
}
