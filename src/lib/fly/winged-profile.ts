/**
 * Winged-return profiles (W12): the sourced waypoints of a runway landing from orbit (Shuttle,
 * later X-37B and Buran), one JSON per mission under static/data/winged-profiles/<missionId>.json.
 * `/fly` plays it after the Earth-orbit coast when the mission has one (`fly-winged-return-scene.ts`).
 *
 * A scripted profile, not a descent archetype: the sources are waypoints (the guidance workbook's
 * Mach / altitude / range table, the roll reversals, the final-approach table, the post-flight
 * runway distances) and give no L/D. Times are MET strings "H:MM:SS.s"; the anchor is the flown
 * main-gear touchdown, and the earlier events are the plan's offsets from its own landing, marked in
 * `estimatedFields`. Distances along the runway are feet from the threshold.
 */
import { parseGet } from './return-profile';

export interface WingedRunway {
  id: string;
  name: string;
  surface: 'lakebed' | 'concrete';
  /** Drawn length and width (m); `estimatedFields` says when they are not sourced. */
  lengthM: number;
  widthM: number;
  /** Magnetic heading of the landing direction (deg), from the runway number. */
  headingDeg: number;
}

export interface WingedProfileRaw {
  missionId: string;
  flight: string;
  vehicle: 'orbiter' | 'x37b' | 'buran';
  orbiter?: 'columbia' | 'challenger' | 'discovery' | 'atlantis' | 'endeavour';
  runway: WingedRunway;
  deorbit: { met: string; burnS: number; dvFts?: number };
  entry: {
    met: string;
    altFt: number;
    /** Mach numbers of the roll reversals, in order. */
    reversalsMach: number[];
    /** Radio blackout length (min). */
    blackoutMin?: number;
  };
  taem: { met: string; mach: number; altFt: number; rangeNmi: number };
  approach: {
    outerGlideDeg: number;
    innerGlideDeg: number;
    preflareFt: number;
    gearDownFt: number;
  };
  touchdown: {
    met: string;
    keas: number;
    /** Main-gear touchdown, feet past the threshold. */
    mainFt: number;
    /** Nose gear down this many feet after the mains. */
    noseAfterMainFt: number;
    noseSinkFps?: number;
  };
  rollout: {
    brakeAfterMainFt: number;
    /** Wheels stopped this many feet past the threshold. */
    stopFt: number;
    chute: boolean;
  };
  source_tier: string;
  estimatedFields: string[];
  provenance: { l: string; u: string }[];
}

export interface WingedProfile extends WingedProfileRaw {
  deorbitS: number;
  entryS: number;
  taemS: number;
  touchdownS: number;
  /** Feet rolled from the main-gear touchdown to the stop. */
  rollFt: number;
}

const isPos = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v > 0;
const VEHICLES = ['orbiter', 'x37b', 'buran'];

/** Fail-closed shape check: the METs rise in flight order, the runway distances in roll order. */
export function isValidWingedProfile(d: unknown): d is WingedProfileRaw {
  if (!d || typeof d !== 'object') return false;
  const p = d as Record<string, unknown>;
  if (typeof p.missionId !== 'string' || typeof p.flight !== 'string') return false;
  if (!VEHICLES.includes(p.vehicle as string)) return false;
  const rw = p.runway as Record<string, unknown> | undefined;
  if (!rw || typeof rw.id !== 'string' || typeof rw.name !== 'string') return false;
  if (rw.surface !== 'lakebed' && rw.surface !== 'concrete') return false;
  if (!isPos(rw.lengthM) || !isPos(rw.widthM)) return false;
  if (typeof rw.headingDeg !== 'number' || rw.headingDeg < 0 || rw.headingDeg >= 360) return false;
  const de = p.deorbit as Record<string, unknown> | undefined;
  const en = p.entry as Record<string, unknown> | undefined;
  const ta = p.taem as Record<string, unknown> | undefined;
  const ap = p.approach as Record<string, unknown> | undefined;
  const td = p.touchdown as Record<string, unknown> | undefined;
  const ro = p.rollout as Record<string, unknown> | undefined;
  if (!de || !en || !ta || !ap || !td || !ro) return false;
  if (!isPos(de.burnS) || (de.dvFts !== undefined && !isPos(de.dvFts))) return false;
  if (!isPos(en.altFt) || !Array.isArray(en.reversalsMach)) return false;
  const rev = en.reversalsMach as unknown[];
  if (!rev.every(isPos)) return false;
  for (let i = 1; i < rev.length; i++)
    if ((rev[i] as number) >= (rev[i - 1] as number)) return false;
  if (!isPos(ta.mach) || !isPos(ta.altFt) || !isPos(ta.rangeNmi)) return false;
  if (!isPos(ap.outerGlideDeg) || !isPos(ap.innerGlideDeg) || !isPos(ap.preflareFt)) return false;
  if (!isPos(ap.gearDownFt) || (ap.gearDownFt as number) >= (ap.preflareFt as number)) return false;
  if (!isPos(td.keas) || !isPos(td.mainFt) || !isPos(td.noseAfterMainFt)) return false;
  if (!isPos(ro.brakeAfterMainFt) || !isPos(ro.stopFt) || typeof ro.chute !== 'boolean')
    return false;
  const main = td.mainFt as number;
  if (main + (td.noseAfterMainFt as number) >= (ro.stopFt as number)) return false;
  if (main + (ro.brakeAfterMainFt as number) >= (ro.stopFt as number)) return false;
  if ((ro.stopFt as number) * 0.3048 > (rw.lengthM as number)) return false;
  const mets = [de.met, en.met, ta.met, td.met].map(parseGet);
  if (mets.some((x) => x == null)) return false;
  if ((mets[0] as number) + (de.burnS as number) > (mets[1] as number)) return false;
  for (let i = 1; i < mets.length; i++)
    if ((mets[i] as number) <= (mets[i - 1] as number)) return false;
  return (
    typeof p.source_tier === 'string' &&
    Array.isArray(p.estimatedFields) &&
    Array.isArray(p.provenance)
  );
}

export function expandWingedProfile(raw: WingedProfileRaw): WingedProfile {
  const g = (s: string): number => parseGet(s)!;
  return {
    ...raw,
    deorbitS: g(raw.deorbit.met),
    entryS: g(raw.entry.met),
    taemS: g(raw.taem.met),
    touchdownS: g(raw.touchdown.met),
    rollFt: raw.rollout.stopFt - raw.touchdown.mainFt,
  };
}

/** Mission ids with a profile file: the directory listing, so a new file is a new mission. Only
 *  the keys are used (the loader fetches the file). `no-inline`: a plain `?url` inlined each JSON
 *  as a data URL in its own lazy chunk (~2 KB each in /fly's lazy budget); now each chunk is a
 *  path string, and lazy keeps them out of the page's static closure. */
const FILES = import.meta.glob('/static/data/winged-profiles/*.json', {
  query: '?url&no-inline',
  import: 'default',
});
export const WINGED_MISSION_IDS: ReadonlySet<string> = new Set(
  Object.keys(FILES).map((p) => p.slice(p.lastIndexOf('/') + 1, -'.json'.length)),
);

export function hasWingedProfile(missionId: string | undefined | null): boolean {
  return missionId != null && WINGED_MISSION_IDS.has(missionId);
}

/** Fetch the profile; null when the mission has none, the fetch fails or the JSON is malformed. */
export async function loadWingedProfile(
  missionId: string | undefined | null,
  fetchFn: typeof fetch = fetch,
  baseUrl = '',
): Promise<WingedProfile | null> {
  if (!hasWingedProfile(missionId)) return null;
  try {
    const res = await fetchFn(`${baseUrl}/data/winged-profiles/${missionId}.json`);
    if (!res.ok) return null;
    const data: unknown = await res.json();
    return isValidWingedProfile(data) ? expandWingedProfile(data) : null;
  } catch {
    return null;
  }
}
