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
  /** 'wp0', 'wp1', 'wp2' (Dragon), 'parking' (Shenzhou): also the beat's label key. */
  id: string;
  rangeM: number;
  from: HoldFrom;
  /** The craft stops here (Dragon's Waypoint 2, Shenzhou's parking point). */
  hold?: boolean;
  /** The stop is the go/no-go poll for docking (its own beat). */
  goNoGo?: boolean;
  /** The craft passes ahead of the station and turns round before it reaches this point
   *  (Shenzhou 12 to Tianhe's forward port). */
  uTurn?: boolean;
  /** When it arrives: a sourced MET, or minutes before the capture (an estimate). One of the two. */
  met?: string;
  minBeforeCapture?: number;
  /** With `hold`: the stop ends this many minutes before the capture (an estimate). */
  holdUntilMinBeforeCapture?: number;
}

/** The stations, their docking ports, and the ports their neighbours sit on. */
export const TARGET_PORTS = {
  iss: ['harmony-forward', 'zvezda-aft'],
  tiangong: ['tianhe-forward'],
} as const;
export type DockingTarget = keyof typeof TARGET_PORTS;

/** The ship kinds and the ports they can sit on. */
export const NEIGHBOUR_PORTS = {
  htv: ['harmony-nadir'],
  tianzhou: ['tianhe-aft'],
  'soyuz-ms': ['poisk-zenith', 'pirs-nadir', 'zvezda-aft', 'rassvet-nadir'],
  'progress-ms': ['poisk-zenith', 'pirs-nadir', 'zvezda-aft', 'rassvet-nadir'],
} as const;
export type NeighbourId = keyof typeof NEIGHBOUR_PORTS;
export type NeighbourPort = (typeof NEIGHBOUR_PORTS)[NeighbourId][number];
export interface DockingNeighbour {
  id: NeighbourId;
  port: NeighbourPort;
  /** The flight's name, for the record ('Soyuz MS-16'). */
  name?: string;
}

export interface DockingProfileRaw {
  missionId: string;
  /** The flight's short name, e.g. "Demo-2". */
  flight: string;
  /** The chaser's showcase model id ('crew-dragon'). */
  chaser: string;
  /** The station, and the port on it. */
  target: DockingTarget;
  port: (typeof TARGET_PORTS)[DockingTarget][number];
  /** The station as it stood (its assembly is drawn as of this date). */
  stationDate: string;
  /** The docking mechanism: the soft-capture ring (IDSS), China's APAS-derived one (CDM), or
   *  the Soviet probe and drogue (SSVP). */
  mechanism: 'idss' | 'cdm' | 'ssvp';
  launchZeroUtc: string;
  altitudeKm: number;
  /** The last burn before the approach (Dragon's approach initiation), when a source times it. */
  lastBurn?: { id: string; met: string; burnS: number };
  holds: DockingHold[];
  /** Contact and capture (soft capture on a ring). */
  captureMet: string;
  /** The hooks or latches closed (hard capture), when a source times it apart from contact. */
  hardDockMet?: string;
  /** The ships already docked on the date, by port (HTV-9 drawn at its real size; the Soyuz and
   *  Progress are the /iss diagram models). */
  neighbours: DockingNeighbour[];
  source_tier: string;
  estimatedFields: string[];
  provenance: { l: string; u: string }[];
}

export interface DockingProfile extends DockingProfileRaw {
  kind: 'docking';
  lastBurnS: number | null;
  captureS: number;
  hardDockS: number | null;
}

export const isDockingProfile = (p: object): p is DockingProfile =>
  (p as { kind?: string }).kind === 'docking';

const isPos = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v > 0;

/** Fail-closed shape check: the port is the station's, the holds close in toward the port and
 *  come in time order after the burn and before the capture, the hard dock after the capture. */
export function isValidDockingProfile(d: unknown): d is DockingProfileRaw {
  if (!d || typeof d !== 'object') return false;
  const p = d as Record<string, unknown>;
  for (const k of ['missionId', 'flight', 'chaser', 'source_tier'])
    if (typeof p[k] !== 'string' || !p[k]) return false;
  const ports = TARGET_PORTS[p.target as DockingTarget] as readonly string[] | undefined;
  if (!ports || !ports.includes(p.port as string)) return false;
  if (!['idss', 'cdm', 'ssvp'].includes(p.mechanism as string)) return false;
  for (const k of ['launchZeroUtc', 'stationDate'])
    if (typeof p[k] !== 'string' || Number.isNaN(Date.parse(p[k] as string))) return false;
  if (!isPos(p.altitudeKm)) return false;
  const capture = parseGet(p.captureMet);
  if (capture == null) return false;
  if (p.hardDockMet !== undefined) {
    const hard = parseGet(p.hardDockMet);
    if (hard == null || !(capture < hard)) return false;
  }
  let after = -Infinity;
  if (p.lastBurn !== undefined) {
    const burn = p.lastBurn as Record<string, unknown> | null;
    const burnAt = parseGet(burn?.met);
    if (!burn || typeof burn.id !== 'string' || burnAt == null || !isPos(burn.burnS)) return false;
    after = burnAt + (burn.burnS as number);
    if (!(after < capture)) return false;
  }
  if (!Array.isArray(p.holds) || p.holds.length < 1) return false;
  let prev = Infinity;
  for (const h of p.holds as Record<string, unknown>[]) {
    if (typeof h?.id !== 'string' || !isPos(h.rangeM) || (h.rangeM as number) >= prev) return false;
    if (h.from !== 'below' && h.from !== 'axis') return false;
    for (const k of ['hold', 'goNoGo', 'uTurn'])
      if (h[k] !== undefined && typeof h[k] !== 'boolean') return false;
    // the arrival: one of a sourced MET or an estimate before the capture, after the burn
    const at =
      h.met !== undefined
        ? parseGet(h.met)
        : isPos(h.minBeforeCapture)
          ? capture - (h.minBeforeCapture as number) * 60
          : null;
    if (at == null || (h.met !== undefined && h.minBeforeCapture !== undefined)) return false;
    if (!(at > after && at < capture)) return false;
    after = at;
    if (h.hold) {
      if (!isPos(h.holdUntilMinBeforeCapture)) return false;
      const until = capture - (h.holdUntilMinBeforeCapture as number) * 60;
      if (!(until > at)) return false;
      after = until;
    } else if (h.goNoGo || h.holdUntilMinBeforeCapture !== undefined) return false;
    prev = h.rangeM as number;
  }
  if (!Array.isArray(p.neighbours)) return false;
  const taken = new Set<string>();
  for (const n of p.neighbours as Record<string, unknown>[]) {
    const allowed = NEIGHBOUR_PORTS[n?.id as NeighbourId] as readonly string[] | undefined;
    // one ship a port, and none on the port the chaser docks to
    if (!allowed || !allowed.includes(n.port as string) || taken.has(n.port as string))
      return false;
    if (n.port === p.port) return false;
    if (n.name !== undefined && typeof n.name !== 'string') return false;
    taken.add(n.port as string);
  }
  return Array.isArray(p.estimatedFields) && Array.isArray(p.provenance);
}

export function expandDockingProfile(raw: DockingProfileRaw): DockingProfile {
  return {
    ...raw,
    kind: 'docking',
    lastBurnS: raw.lastBurn ? parseGet(raw.lastBurn.met)! : null,
    captureS: parseGet(raw.captureMet)!,
    hardDockS: raw.hardDockMet ? parseGet(raw.hardDockMet)! : null,
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
