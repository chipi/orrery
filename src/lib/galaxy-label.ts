import * as m from '$lib/paraglide/messages';

// Explicit table, not m[`galaxy_name_${id}`]: a computed key makes the bundler
// keep every message in the catalogue (a 3 MB chunk on /explore).
const GALAXY_MSG: Record<string, () => string> = {
  andromeda: m.galaxy_name_andromeda,
  triangulum: m.galaxy_name_triangulum,
  lmc: m.galaxy_name_lmc,
  smc: m.galaxy_name_smc,
  'sagittarius-dwarf': m.galaxy_name_sagittarius_dwarf,
  'sculptor-dwarf': m.galaxy_name_sculptor_dwarf,
  'fornax-dwarf': m.galaxy_name_fornax_dwarf,
  'draco-dwarf': m.galaxy_name_draco_dwarf,
  'ursa-minor-dwarf': m.galaxy_name_ursa_minor_dwarf,
  'leo-i': m.galaxy_name_leo_i,
  'leo-ii': m.galaxy_name_leo_ii,
  'sextans-dwarf': m.galaxy_name_sextans_dwarf,
  'ngc-6822': m.galaxy_name_ngc_6822,
  'ic-1613': m.galaxy_name_ic_1613,
  wlm: m.galaxy_name_wlm,
};

/** Localised Local Group galaxy label (galaxy_name_<id> message), or the data's
 *  English name when a galaxy has no message. Proper names stay as written, the
 *  generic word ("Galaxy", "Dwarf", "Cloud") is translated. */
export function galaxyLabel(g: { id: string; name: string }): string {
  const fn = GALAXY_MSG[g.id];
  return fn ? fn() : g.name;
}
