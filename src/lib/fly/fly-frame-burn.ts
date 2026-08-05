import type { FlightTimelineEvent } from '$types/mission';

/**
 * Pure per-frame engine-plume burn logic for /fly (RFC-036 WS-B/B4).
 *
 * The `onFrame` body shows a directed exhaust plume around burn events. Two pieces
 * are pure: selecting the closest in-window burn from the mission's event roster,
 * and computing the exhaust direction from the burn mode + the spacecraft's
 * velocity/position. Those move here (testable); the frame body keeps the THREE
 * plume-mesh application (position / lookAt / scale / opacity). Byte-identical to
 * the inline logic — same burn table, same window rule, same direction math.
 */

/** How a burn's exhaust points: toward Earth (inward thrust), retrograde
 *  (prograde accel), or prograde (retrograde decel). */
export type BurnMode = 'inward' | 'retro' | 'pro';

export interface BurnConfig {
  scale: number;
  mode: BurnMode;
  /** Optional per-type window override (launch holds longer for drama). */
  windowDays?: number;
}

/** Default ± window (days) a burn's plume is visible around its MET. */
export const BURN_WINDOW_DAYS_DEFAULT = 2;

/** Per-event-type plume config. Launch gets a wider window because it's the
 *  mission's hero moment — a sustained plume, not a 2-day blink. */
export const BURN_TABLE: Record<string, BurnConfig> = {
  launch: { scale: 2.6, mode: 'inward', windowDays: 5 },
  tli_or_tmi: { scale: 1.6, mode: 'retro' },
  tcm: { scale: 0.6, mode: 'retro' },
  edl_or_oi: { scale: 1.8, mode: 'pro' },
};

/** The selected active burn for this frame. */
export interface ActiveBurn {
  type: string;
  met_days: number;
  daysFromEvent: number;
}

/**
 * Find the closest in-window burn event at mission-elapsed time `simMet`. Only
 * event types present in {@link BURN_TABLE} count; each type's window is its
 * `windowDays` override or `defaultWindowDays`. Returns the nearest in-window burn,
 * or null. Byte-identical to the inline selection.
 */
export function findActiveBurn(
  events: readonly FlightTimelineEvent[],
  simMet: number,
  defaultWindowDays: number = BURN_WINDOW_DAYS_DEFAULT,
  table: Record<string, BurnConfig> = BURN_TABLE,
): ActiveBurn | null {
  let activeBurn: ActiveBurn | null = null;
  for (const evt of events) {
    if (!(evt.type in table) || evt.met_days == null) continue;
    const daysFromEvent = Math.abs(simMet - evt.met_days);
    const win = table[evt.type].windowDays ?? defaultWindowDays;
    if (daysFromEvent > win) continue;
    if (!activeBurn || daysFromEvent < activeBurn.daysFromEvent) {
      activeBurn = { type: evt.type, met_days: evt.met_days, daysFromEvent };
    }
  }
  return activeBurn;
}

/** A planar (XZ) point/vector. */
export interface XZ {
  x: number;
  z: number;
}

/**
 * Compute the unit exhaust direction (XZ) the plume cone tip points at, from the
 * burn mode + the spacecraft's frame velocity `(vx, vz)` and world positions.
 * `inward` points from the spacecraft toward Earth; `retro`/`pro` point against/
 * along velocity (falling back to zero when velocity is ~0). Byte-identical.
 */
export function burnExhaustDir(
  mode: BurnMode,
  vx: number,
  vz: number,
  earthWorld: XZ,
  scWorld: XZ,
): { exDx: number; exDz: number } {
  const vMag = Math.hypot(vx, vz);
  if (mode === 'inward') {
    const idx = earthWorld.x - scWorld.x;
    const idz = earthWorld.z - scWorld.z;
    const idm = Math.hypot(idx, idz) || 1;
    return { exDx: idx / idm, exDz: idz / idm };
  }
  if (mode === 'retro' && vMag > 0.0001) {
    return { exDx: -vx / vMag, exDz: -vz / vMag };
  }
  if (mode === 'pro' && vMag > 0.0001) {
    return { exDx: vx / vMag, exDz: vz / vMag };
  }
  return { exDx: 0, exDz: 0 };
}
