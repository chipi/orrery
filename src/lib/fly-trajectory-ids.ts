/**
 * Which trajectory file /fly flies for a mission. Pure (no `$app/paths`), so Node/tsx scripts
 * (the audit, the mission thumbnail generator) pick the same file the app does.
 * `src/lib/data/interstellar.ts` re-exports everything here.
 */

/** Missions that ship `static/data/trajectories/<id>.json` (the orbiter `-tour`
 *  files are extra layers of these and not listed). Callers check it before
 *  fetching: /fly used to request the file for every mission and got a 404 for
 *  each one without it. interstellar.test.ts keeps it equal to the files. */
export const TRAJECTORY_IDS = [
  'voyager-1',
  'voyager-2',
  'pioneer-10',
  'pioneer-11',
  'new-horizons',
  'galileo',
  'juno',
  'cassini',
  'dawn',
  'rosetta',
  'vega-1',
  'vega-2',
  'venera-13',
  'giotto',
  'hayabusa2',
  'juice',
  'bepicolombo',
  'ulysses',
] as const;
const TRAJECTORY_ID_SET: ReadonlySet<string> = new Set(TRAJECTORY_IDS);
export const hasTrajectory = (id: string): boolean => TRAJECTORY_ID_SET.has(id);

/** /fly-only trajectories, generated from the mission's events
 *  (scripts/generate-fly-trajectory.ts → static/data/fly-trajectories/). They win over the
 *  /explore file: /explore's cruise points are a stylised layout (most sit near longitude 0°
 *  whatever the date), and /fly's spline through them looped BepiColombo through the Sun. */
export const FLY_TRAJECTORY_IDS = [
  'messenger',
  'osiris-rex',
  'hera',
  'lucy',
  'hayabusa1',
  'europa-clipper',
  'psyche-mission',
  'mariner10',
  'bepicolombo',
  'cassini',
  'dawn',
  'galileo',
  'juice',
  'juno',
  'new-horizons',
  'rosetta',
  'giotto',
  'pioneer-11',
  'ulysses',
  'voyager-1',
  'voyager-2',
  'hayabusa2',
  'near-shoemaker',
  'parker-solar-probe',
  'solar-orbiter',
] as const;
const FLY_TRAJECTORY_ID_SET: ReadonlySet<string> = new Set(FLY_TRAJECTORY_IDS);
/** Missions that fly another's path (Huygens rode Cassini). */
const FLY_TRAJECTORY_ALIAS: Record<string, string> = { huygens: 'cassini' };
/** Direct transfers with an /explore file: /fly flies its transfer ellipse instead of the
 *  stylised cruise points. */
const FLY_DIRECT_IDS: ReadonlySet<string> = new Set([
  'pioneer-10',
  'vega-1',
  'vega-2',
  'venera-13',
]);

/** The data path of the trajectory /fly flies for a mission, or null (the ellipse fallback). */
export function flyTrajectoryPath(id: string): string | null {
  const own = FLY_TRAJECTORY_ALIAS[id] ?? id;
  if (FLY_TRAJECTORY_ID_SET.has(own)) return `fly-trajectories/${own}.json`;
  if (FLY_DIRECT_IDS.has(own)) return null;
  if (TRAJECTORY_ID_SET.has(own)) return `trajectories/${own}.json`;
  return null;
}
