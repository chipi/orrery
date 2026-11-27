/**
 * Docking profiles (W9): the sourced timeline of a crewed craft's last approach to a station, one
 * JSON per mission under static/data/docking-profiles/<missionId>.json. `/fly` plays the docking
 * after the launch, before the Earth-orbit coast, in the deploy's slot (`fly-docking-scene.ts`).
 *
 * Data-driven like the deploy profiles: a mission has a profile exactly when its file exists.
 * Times are Mission Elapsed Time strings "H:MM:SS.s" from liftoff (`launchZeroUtc`). Anything not
 * in a source is named in `estimatedFields`; the scene marks the clock "~" between sourced times.
 */
import { parseGet } from './return-profile';

/** Where a hold point sits from the target port: below the station (on the R-bar), or out along
 *  the port's own axis. */
export type HoldFrom = 'below' | 'axis';

export interface DockingHold {
  /** 'wp0', 'wp1', 'wp2' (Dragon), or a range name. */
  id: string;
  rangeM: number;
  from: HoldFrom;
  /** A go/no-go hold at this point (Dragon's Waypoint 2). */
  hold?: boolean;
}

export interface DockingProfileRaw {
  missionId: string;
  /** The flight's short name, e.g. "Demo-2". */
  flight: string;
  /** The chaser's showcase model id ('crew-dragon'). */
  chaser: string;
  /** The station, and the port on it. */
  target: 'iss';
  port: 'harmony-forward';
  /** The station as it stood (its assembly is drawn as of this date). */
  stationDate: string;
  /** The docking mechanism: the soft-capture ring (IDSS), probe and drogue, or APAS. */
  mechanism: 'idss';
  launchZeroUtc: string;
  altitudeKm: number;
  /** The last burn before the approach (Dragon's approach initiation). */
  lastBurn: { id: string; met: string; burnS: number };
  holds: DockingHold[];
  /** Contact and capture (soft capture on a ring). */
  captureMet: string;
  /** The hooks or latches closed (hard capture). */
  hardDockMet: string;
  /** Ships already docked that sit near the port (drawn at the port end), by port. */
  neighbours: { id: 'htv'; port: 'harmony-nadir' }[];
  source_tier: string;
  estimatedFields: string[];
  provenance: { l: string; u: string }[];
}

export interface DockingProfile extends DockingProfileRaw {
  kind: 'docking';
  lastBurnS: number;
  captureS: number;
  hardDockS: number;
}

export const isDockingProfile = (p: object): p is DockingProfile =>
  (p as { kind?: string }).kind === 'docking';

const isPos = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v > 0;

/** Fail-closed shape check: the burn ends before the capture, the capture comes before the hard
 *  dock, and the holds close in toward the port. */
export function isValidDockingProfile(d: unknown): d is DockingProfileRaw {
  if (!d || typeof d !== 'object') return false;
  const p = d as Record<string, unknown>;
  for (const k of ['missionId', 'flight', 'chaser', 'source_tier'])
    if (typeof p[k] !== 'string' || !p[k]) return false;
  if (p.target !== 'iss' || p.port !== 'harmony-forward' || p.mechanism !== 'idss') return false;
  for (const k of ['launchZeroUtc', 'stationDate'])
    if (typeof p[k] !== 'string' || Number.isNaN(Date.parse(p[k] as string))) return false;
  if (!isPos(p.altitudeKm)) return false;
  const burn = p.lastBurn as Record<string, unknown> | undefined;
  const burnAt = parseGet(burn?.met);
  if (!burn || typeof burn.id !== 'string' || burnAt == null || !isPos(burn.burnS)) return false;
  const capture = parseGet(p.captureMet);
  const hard = parseGet(p.hardDockMet);
  if (capture == null || hard == null) return false;
  if (!(burnAt + (burn.burnS as number) < capture && capture < hard)) return false;
  if (!Array.isArray(p.holds) || p.holds.length < 1) return false;
  let prev = Infinity;
  for (const h of p.holds as Record<string, unknown>[]) {
    if (typeof h?.id !== 'string' || !isPos(h.rangeM) || (h.rangeM as number) >= prev) return false;
    if (h.from !== 'below' && h.from !== 'axis') return false;
    if (h.hold !== undefined && typeof h.hold !== 'boolean') return false;
    prev = h.rangeM as number;
  }
  if (!Array.isArray(p.neighbours)) return false;
  if (
    !(p.neighbours as Record<string, unknown>[]).every(
      (n) => n?.id === 'htv' && n.port === 'harmony-nadir',
    )
  )
    return false;
  return Array.isArray(p.estimatedFields) && Array.isArray(p.provenance);
}

export function expandDockingProfile(raw: DockingProfileRaw): DockingProfile {
  return {
    ...raw,
    kind: 'docking',
    lastBurnS: parseGet(raw.lastBurn.met)!,
    captureS: parseGet(raw.captureMet)!,
    hardDockS: parseGet(raw.hardDockMet)!,
  };
}

/** Mission ids with a profile file (only the keys are used; see deploy-profile.ts). */
const FILES = import.meta.glob('/static/data/docking-profiles/*.json', {
  query: '?url&no-inline',
  import: 'default',
});
export const DOCKING_MISSION_IDS: ReadonlySet<string> = new Set(
  Object.keys(FILES).map((p) => p.slice(p.lastIndexOf('/') + 1, -'.json'.length)),
);

export function hasDockingProfile(missionId: string | undefined | null): boolean {
  return missionId != null && DOCKING_MISSION_IDS.has(missionId);
}

/** Fetch the profile; null when the mission has none, the fetch fails or the JSON is malformed. */
export async function loadDockingProfile(
  missionId: string | undefined | null,
  fetchFn: typeof fetch = fetch,
  baseUrl = '',
): Promise<DockingProfile | null> {
  if (!hasDockingProfile(missionId)) return null;
  try {
    const res = await fetchFn(`${baseUrl}/data/docking-profiles/${missionId}.json`);
    if (!res.ok) return null;
    const data: unknown = await res.json();
    return isValidDockingProfile(data) ? expandDockingProfile(data) : null;
  } catch {
    return null;
  }
}
