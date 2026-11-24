/**
 * Return profiles: the sourced timeline of a crewed lunar mission's way home (LM liftoff, orbit
 * insertion, the rendezvous burns, docking, LM jettison, trans-Earth injection), one JSON per
 * mission under static/data/return-profiles/<missionId>.json. `/fly` offers "Continue: the way
 * home" at the end of a Moon landing when the mission has one, and `fly-return-scene.ts` plays it.
 *
 * Data-driven: a mission has a profile exactly when its file exists (the id set comes from the
 * directory listing), so Apollo 12 and 14-17 are added by a data file alone.
 *
 * Times are Ground Elapsed Time (GET) strings "H:MM:SS.s" from range zero (`launchZeroUtc`),
 * as the mission report prints them. Anything not in a source is named in `estimatedFields`.
 */

/** One burn of the rendezvous, in flight order. Apollo 11 and 12 flew csi, cdh, tpi, tpf; Apollo 14's
 *  direct one-revolution rendezvous flew vernier, tpi, tpf. */
export interface RendezvousBurn {
  id: 'vernier' | 'csi' | 'cdh' | 'tpi' | 'tpf';
  get: string;
  burnS: number;
  dvFts: number;
  /** The LM burns the ascent engine (Apollo 14's TPI) rather than its RCS. */
  engine?: 'aps';
}

/** Per-mission camera style: the shot each beat cuts to, over the scene's default table
 *  (fly-return-scene.ts BEAT_SHOT). Names the scene does not know are ignored. */
export interface ReturnCameraStyle {
  shots?: Record<string, string>;
}

export interface ReturnProfileRaw {
  missionId: string;
  siteId: string;
  launchZeroUtc: string;
  liftoff: string;
  verticalRiseS: number;
  ascentBurnS: number;
  ascentDvFts: number;
  insertion: {
    get: string;
    orbitNmi: [number, number];
    altitudeFt: number;
    radialFts: number;
    downrangeFts: number;
  };
  rendezvous: RendezvousBurn[];
  csmOrbitNmi: [number, number];
  docking: string;
  jettison: string;
  jettisonAltitudeNmi: number;
  tei: { get: string; burnS: number; dvFts: number };
  camera?: ReturnCameraStyle;
  /** File id under static/data/descent-profiles/ of the Earth entry and splashdown the cruise
   *  plays at the Earth return; absent: the way home ends at arrival, as before. */
  splashdownProfile?: string;
  source_tier: string;
  estimatedFields: string[];
  provenance: { l: string; u: string }[];
}

/** A profile with every GET parsed to seconds since range zero. */
export interface ReturnProfile extends ReturnProfileRaw {
  liftoffS: number;
  insertionS: number;
  dockingS: number;
  jettisonS: number;
  teiS: number;
  rendezvousS: Partial<Record<RendezvousBurn['id'], number>>;
  /** TEI as mission-elapsed days: where the cruise resumes (dep_day + this). */
  teiMetDays: number;
}

const GET_RE = /^(\d{1,3}):([0-5]\d):([0-5]\d(?:\.\d+)?)$/;

/** "124:22:00.8" to seconds; null when it is not a GET. */
export function parseGet(s: unknown): number | null {
  if (typeof s !== 'string') return null;
  const m = GET_RE.exec(s);
  return m ? Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]) : null;
}

/** Seconds to "H:MM:SS.s" (the HUD clock). */
export function formatGet(sec: number): string {
  const tenths = Math.max(0, Math.floor(sec * 10 + 1e-6));
  const h = Math.floor(tenths / 36000);
  const m = Math.floor((tenths % 36000) / 600);
  const s = (tenths % 600) / 10;
  return `${h}:${String(m).padStart(2, '0')}:${s < 10 ? '0' : ''}${s.toFixed(1)}`;
}

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v > 0;
const isPair = (v: unknown): boolean => Array.isArray(v) && v.length === 2 && v.every(isNum);
/** The rendezvous sequences flown: the coelliptic one and the direct one. */
const REND_SEQUENCES = [
  ['csi', 'cdh', 'tpi', 'tpf'],
  ['vernier', 'tpi', 'tpf'],
];

/** Fail-closed shape check of a loaded profile: every GET parses and rises in flight order. */
export function isValidReturnProfile(d: unknown): d is ReturnProfileRaw {
  if (!d || typeof d !== 'object') return false;
  const p = d as Record<string, unknown>;
  if (typeof p.missionId !== 'string' || typeof p.siteId !== 'string') return false;
  if (typeof p.launchZeroUtc !== 'string' || Number.isNaN(Date.parse(p.launchZeroUtc))) {
    return false;
  }
  if (!isNum(p.verticalRiseS) || !isNum(p.ascentBurnS) || !isNum(p.ascentDvFts)) return false;
  const ins = p.insertion as Record<string, unknown> | undefined;
  if (!ins || parseGet(ins.get) == null || !isPair(ins.orbitNmi) || !isNum(ins.altitudeFt)) {
    return false;
  }
  const tei = p.tei as Record<string, unknown> | undefined;
  if (!tei || parseGet(tei.get) == null || !isNum(tei.burnS) || !isNum(tei.dvFts)) return false;
  if (!isPair(p.csmOrbitNmi) || !isNum(p.jettisonAltitudeNmi)) return false;
  if (!Array.isArray(p.rendezvous)) return false;
  const rend = p.rendezvous as Record<string, unknown>[];
  const ids = rend.map((r) => r.id).join();
  if (!REND_SEQUENCES.some((q) => q.join() === ids)) return false;
  if (!rend.every((r) => parseGet(r.get) != null && isNum(r.burnS))) return false;
  if (!rend.every((r) => r.engine === undefined || r.engine === 'aps')) return false;
  const cam = p.camera as Record<string, unknown> | undefined;
  if (cam !== undefined) {
    const shots = cam?.shots as Record<string, unknown> | undefined;
    if (typeof cam !== 'object' || cam === null) return false;
    if (shots !== undefined && (typeof shots !== 'object' || shots === null)) return false;
    if (shots && !Object.values(shots).every((v) => typeof v === 'string')) return false;
  }
  const order = [
    parseGet(p.liftoff),
    parseGet(ins.get),
    ...rend.map((r) => parseGet(r.get)),
    parseGet(p.docking),
    parseGet(p.jettison),
    parseGet(tei.get),
  ];
  if (order.some((x) => x == null)) return false;
  for (let i = 1; i < order.length; i++) if (order[i]! <= order[i - 1]!) return false;
  if (p.splashdownProfile !== undefined && typeof p.splashdownProfile !== 'string') return false;
  return Array.isArray(p.estimatedFields) && Array.isArray(p.provenance);
}

export function expandReturnProfile(raw: ReturnProfileRaw): ReturnProfile {
  const g = (s: string): number => parseGet(s)!;
  const teiS = g(raw.tei.get);
  return {
    ...raw,
    liftoffS: g(raw.liftoff),
    insertionS: g(raw.insertion.get),
    dockingS: g(raw.docking),
    jettisonS: g(raw.jettison),
    teiS,
    rendezvousS: Object.fromEntries(
      raw.rendezvous.map((r) => [r.id, g(r.get)]),
    ) as ReturnProfile['rendezvousS'],
    teiMetDays: teiS / 86400,
  };
}

/** Mission ids with a profile file: the directory listing, so a new file is a new mission. */
const FILES = import.meta.glob('/static/data/return-profiles/*.json', {
  query: '?url',
  import: 'default',
});
export const RETURN_MISSION_IDS: ReadonlySet<string> = new Set(
  Object.keys(FILES).map((p) => p.slice(p.lastIndexOf('/') + 1, -'.json'.length)),
);

export function hasReturnProfile(missionId: string | undefined | null): boolean {
  return missionId != null && RETURN_MISSION_IDS.has(missionId);
}

/** Fetch the profile; null when the mission has none, the fetch fails or the JSON is malformed. */
export async function loadReturnProfile(
  missionId: string | undefined | null,
  fetchFn: typeof fetch = fetch,
  baseUrl = '',
): Promise<ReturnProfile | null> {
  if (!hasReturnProfile(missionId)) return null;
  try {
    const res = await fetchFn(`${baseUrl}/data/return-profiles/${missionId}.json`);
    if (!res.ok) return null;
    const data: unknown = await res.json();
    return isValidReturnProfile(data) ? expandReturnProfile(data) : null;
  } catch {
    return null;
  }
}

export type DescentDue = 'landing' | 'splashdown' | null;

/**
 * Which descent act the cruise has reached the gate of. A lunar landing fires at its landing day
 * (and re-arms when the sim day is scrubbed back to it after the way home); once the way home is
 * done, the Earth return fires the splashdown at the arrival day, if the mission has one.
 */
export function descentDue(a: {
  simDay: number;
  landingDay: number;
  arrDay: number;
  wayHomeDone: boolean;
  hasSplashdown: boolean;
}): DescentDue {
  if (a.simDay >= a.landingDay && (!a.wayHomeDone || a.simDay <= a.landingDay + 1e-6)) {
    return 'landing';
  }
  if (a.wayHomeDone && a.hasSplashdown && a.simDay >= a.arrDay) return 'splashdown';
  return null;
}
