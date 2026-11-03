import * as m from '$lib/paraglide/messages';

// Its own module, not destination-label.ts: that one is shared with /plan and /fly and
// would bring every /plan destination message onto /missions.
const MISSION_DEST: Record<string, () => string> = {
  ASTEROID: m.lib_filter_dest_asteroid,
  CERES: m.lib_filter_dest_ceres,
  COMET: m.lib_filter_dest_comet,
  EARTH: m.lib_filter_dest_earth,
  JUPITER: m.lib_filter_dest_jupiter,
  MARS: m.lib_filter_dest_mars,
  MOON: m.lib_filter_dest_moon,
  NEPTUNE: m.lib_filter_dest_neptune,
  PLUTO: m.lib_filter_dest_pluto,
  SUN: m.lib_filter_dest_sun,
};
const MISSION_DEST_PLAN: Record<string, () => string> = {
  MERCURY: m.plan_destination_mercury,
  VENUS: m.plan_destination_venus,
  SATURN: m.plan_destination_saturn,
  URANUS: m.plan_destination_uranus,
  PSYCHE: m.plan_destination_psyche,
  BENNU: m.plan_destination_bennu,
  ITOKAWA: m.plan_destination_itokawa,
  DIDYMOS: m.plan_destination_didymos,
  DIMORPHOS: m.plan_destination_dimorphos,
  EURYBATES: m.plan_destination_eurybates,
};

/** A mission's `dest` code (MARS, DIDYMOS …) as the viewer's language writes it, upper-cased. */
export function missionDestLabel(dest: string): string {
  const filter = MISSION_DEST[dest];
  if (filter) return filter();
  const plan = MISSION_DEST_PLAN[dest];
  if (plan) return plan().toLocaleUpperCase();
  return dest;
}
