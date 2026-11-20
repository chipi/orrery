/**
 * Launch coast warp (the Shuttle's direct insertion): between the tank separation and the
 * OMS-2 burn the orbiter coasts about 26 minutes to apogee. The launch act plays that coast
 * in `COAST_SCENE_S` of its clock, the way the injection beat stands for a parking-orbit coast
 * on other launchers, and keeps the real clock everywhere else. The HUD's MET stays the
 * honest mission time; only the play clock is warped.
 *
 * `toScene` / `toMission` are exact inverses — a piecewise-linear map with knees at the coast
 * window's ends — so the scene (which plays scene time) and /fly's master bar (which places
 * beats and seeks) share one source of truth, as with descent-timewarp.ts.
 */

/** Scene (play-clock) seconds the compressed coast lasts. */
export const COAST_SCENE_S = 15;
/** Real-clock seconds kept after the tank separates and before the burn lights. */
export const COAST_EDGE_S = 20;

export interface LaunchCoastWarp {
  /** Mission time the compression starts and ends. */
  coastStart: number;
  coastEnd: number;
  toScene(missionT: number): number;
  toMission(sceneT: number): number;
}

/**
 * The warp for an ascent with an `insertion_burn` event (a direct insertion), or null when
 * there is none or the coast is too short to compress (every other launch: identity).
 */
export function launchCoastWarp(
  events: ReadonlyArray<{ type: string; t: number }>,
): LaunchCoastWarp | null {
  const burn = events.find((e) => e.type === 'insertion_burn');
  if (!burn) return null;
  const sep = events.filter((e) => e.type === 'staging' && e.t < burn.t).at(-1);
  if (!sep) return null;
  const coastStart = sep.t + COAST_EDGE_S;
  const coastEnd = burn.t - COAST_EDGE_S;
  const span = coastEnd - coastStart;
  if (span <= COAST_SCENE_S) return null;
  const k = COAST_SCENE_S / span;
  return {
    coastStart,
    coastEnd,
    toScene: (t) =>
      t <= coastStart
        ? t
        : t >= coastEnd
          ? t - span + COAST_SCENE_S
          : coastStart + (t - coastStart) * k,
    toMission: (s) =>
      s <= coastStart
        ? s
        : s >= coastStart + COAST_SCENE_S
          ? s + span - COAST_SCENE_S
          : coastStart + (s - coastStart) / k,
  };
}

/** Mission time → scene time, identity without a warp. */
export function toSceneT(w: LaunchCoastWarp | null, missionT: number): number {
  return w ? w.toScene(missionT) : missionT;
}

/** Scene time → mission time, identity without a warp. */
export function toMissionT(w: LaunchCoastWarp | null, sceneT: number): number {
  return w ? w.toMission(sceneT) : sceneT;
}

/** Advance a mission-time clock by `sceneDt` of play-clock time, through the warp. */
export function advanceMissionT(
  w: LaunchCoastWarp | null,
  missionT: number,
  sceneDt: number,
): number {
  return toMissionT(w, toSceneT(w, missionT) + sceneDt);
}

/** The camera director's time inputs on the play clock: its shots are planned and looked up
 *  in scene time, so a compressed coast is one shot, not a whole plan cut through in 15 s. */
export function directorTimesOnPlayClock<E extends { t: number }>(
  w: LaunchCoastWarp | null,
  i: { events: E[]; maxQt: number; duration: number; payloadSepT?: number; endT?: number },
): { events: E[]; maxQt: number; duration: number; payloadSepT?: number; endT?: number } {
  if (!w) return i;
  return {
    events: i.events.map((e) => ({ ...e, t: w.toScene(e.t) })),
    maxQt: w.toScene(i.maxQt),
    duration: w.toScene(i.duration),
    payloadSepT: i.payloadSepT === undefined ? undefined : w.toScene(i.payloadSepT),
    endT: i.endT === undefined ? undefined : w.toScene(i.endT),
  };
}
