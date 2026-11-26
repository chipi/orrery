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

/** One burn of the rendezvous, in flight order. Apollo 11 and 12 flew csi, cdh, tpi, tpf; the direct
 *  one-revolution rendezvous of Apollo 14 flew vernier, tpi, tpf, Apollo 15 tpi, tpf. The CSM's own
 *  burns before the LM left the Moon come first (`trim`, `plane`; Apollo 17: the orbital trim and
 *  the plane change, hours before liftoff): recorded, not played. */
export interface RendezvousBurn {
  id: 'trim' | 'plane' | 'vernier' | 'csi' | 'cdh' | 'tpi' | 'tpf';
  get: string;
  burnS: number;
  /** Absent where the sources print no figure (Apollo 17's plane change). */
  dvFts?: number;
  /** The burn's engine where it is not the RCS: the LM's ascent engine (TPI on Apollo 14-17) or the SPS. */
  engine?: 'aps' | 'sps';
}

/** Per-mission camera style: the shot each beat cuts to, over the scene's default table
 *  (fly-return-scene.ts BEAT_SHOT). Names the scene does not know are ignored. */
export interface ReturnCameraStyle {
  shots?: Record<string, string>;
}

/** What the J missions (Apollo 15-17) show that Apollo 11-14 do not. */
export interface JMissionHardware {
  mission: 15 | 16 | 17;
  /** The rover's distance east of the LM (m): an ESTIMATE, the sources give none. */
  lrvEastM: number;
  /** What the rover's TV camera did at liftoff: held (Apollo 15), tracked then lost (16), tracked (17). */
  tv: 'fixed' | 'lost' | 'tracked';
  /** The PFS subsatellite sat in the SIM bay until this GET (Apollo 15, 16). */
  subsatellite?: string;
  /** The ascent stage lost attitude control at jettison and tumbled (Apollo 16). */
  jettisonTumble?: boolean;
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
  jMission?: JMissionHardware;
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
  /** Subsatellite release (s), when the profile has one. */
  subsatS?: number;
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
/** The CSM's own burns before the LM lifted off, in flight order (zero, one or both). */
const REND_PRIOR = ['trim', 'plane'];
/** The LM-side sequences flown: the coelliptic one, the direct one with a vernier, the bare direct one. */
const REND_SEQUENCES = [
  ['csi', 'cdh', 'tpi', 'tpf'],
  ['vernier', 'tpi', 'tpf'],
  ['tpi', 'tpf'],
];

/** True when the ids are an optional prefix of REND_PRIOR (in order) and then one REND_SEQUENCES. */
function isRendezvousSequence(ids: unknown[]): boolean {
  let i = 0;
  for (const k of REND_PRIOR) if (ids[i] === k) i++;
  const rest = ids.slice(i).join();
  return REND_SEQUENCES.some((q) => q.join() === rest);
}

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
  if (!isRendezvousSequence(rend.map((r) => r.id))) return false;
  if (!rend.every((r) => parseGet(r.get) != null && isNum(r.burnS))) return false;
  if (!rend.every((r) => r.dvFts === undefined || isNum(r.dvFts))) return false;
  if (!rend.every((r) => r.engine === undefined || r.engine === 'aps' || r.engine === 'sps'))
    return false;
  const cam = p.camera as Record<string, unknown> | undefined;
  if (cam !== undefined) {
    const shots = cam?.shots as Record<string, unknown> | undefined;
    if (typeof cam !== 'object' || cam === null) return false;
    if (shots !== undefined && (typeof shots !== 'object' || shots === null)) return false;
    if (shots && !Object.values(shots).every((v) => typeof v === 'string')) return false;
  }
  const jm = p.jMission as Record<string, unknown> | undefined;
  if (jm !== undefined) {
    if (typeof jm !== 'object' || jm === null) return false;
    if (![15, 16, 17].includes(jm.mission as number) || !isNum(jm.lrvEastM)) return false;
    if (!['fixed', 'lost', 'tracked'].includes(jm.tv as string)) return false;
    if (jm.subsatellite !== undefined && parseGet(jm.subsatellite) == null) return false;
  }
  // The CSM's own burns precede liftoff; the rest follow the insertion.
  const prior = rend.filter((r) => REND_PRIOR.includes(r.id as string));
  const lm = rend.filter((r) => !REND_PRIOR.includes(r.id as string));
  const order = [
    ...prior.map((r) => parseGet(r.get)),
    parseGet(p.liftoff),
    parseGet(ins.get),
    ...lm.map((r) => parseGet(r.get)),
    parseGet(p.docking),
    parseGet(p.jettison),
    ...(typeof jm?.subsatellite === 'string' ? [parseGet(jm.subsatellite)] : []),
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
    subsatS: raw.jMission?.subsatellite ? g(raw.jMission.subsatellite) : undefined,
    rendezvousS: Object.fromEntries(
      raw.rendezvous.map((r) => [r.id, g(r.get)]),
    ) as ReturnProfile['rendezvousS'],
    teiMetDays: teiS / 86400,
  };
}

/** Mission ids with a profile file: the directory listing, so a new file is a new mission. Only
 *  the keys are used (the loader fetches the file). `no-inline`: a plain `?url` inlined each JSON
 *  as a data URL in its own lazy chunk (~2 KB each in /fly's lazy budget); now each chunk is a
 *  path string, and lazy keeps them out of the page's static closure. */
const FILES = import.meta.glob('/static/data/return-profiles/*.json', {
  query: '?url&no-inline',
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
