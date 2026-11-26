/**
 * Deploy profiles (W10): the sourced timeline of a payload leaving the Space Shuttle's bay, one
 * JSON per mission under static/data/deploy-profiles/<missionId>.json. `/fly` plays the deploy
 * between the launch and the cruise when the mission has one (`fly-deploy-scene.ts`).
 *
 * Data-driven like return profiles: a mission has a profile exactly when its file exists.
 *
 * Times are Mission Elapsed Time strings "H:MM:SS.s" from liftoff (`launchZeroUtc`), computed
 * from the post-flight mission reports' GMT event times. Anything not in a source is named in
 * `estimatedFields`. Only the IUS tilt-table release (`ius-tilt`) is built; `rms` is reserved
 * for the arm-released observatories (Hubble, Compton).
 */
import { parseGet } from './return-profile';

export interface DeployBurn {
  /** The orbiter's separation burn: OMS-3 (STS-30, STS-34) or an RCS burn (STS-41). */
  id: 'oms3' | 'rcs';
  met: string;
  burnS: number;
  /** Absent where the report prints no figure. */
  dvFts?: number;
}

export interface UpperStageBurn {
  met: string;
  burnS: number;
}

export interface DeployProfileRaw {
  missionId: string;
  /** The Shuttle flight, e.g. "STS-34". */
  flight: string;
  orbiter: 'atlantis' | 'discovery' | 'columbia' | 'challenger' | 'endeavour';
  launchZeroUtc: string;
  method: 'ius-tilt' | 'rms';
  orbit: { nmi: [number, number]; incDeg?: number; basis: 'plan' | 'actual' };
  /** The tilt table's stops in order: checkout (29 deg), then the deployment angle. */
  tilt: { deg: number }[];
  releaseMet: string;
  /** Spring ejection speed (m/s). */
  springMs: number;
  /** Where the table is lowered to after release (deg). */
  tableLowerDeg: number;
  sepBurns: DeployBurn[];
  upperStage: {
    stage1: UpperStageBurn;
    stage2: UpperStageBurn;
    /** Ulysses' third stage: spun up, then fired. */
    pamS?: UpperStageBurn & { spinRpm: number };
  };
  source_tier: string;
  estimatedFields: string[];
  provenance: { l: string; u: string }[];
}

/** A profile with every MET parsed to seconds since liftoff. */
export interface DeployProfile extends DeployProfileRaw {
  releaseS: number;
  sepBurnsS: number[];
  stage1S: number;
  stage2S: number;
  pamSS?: number;
}

const isPos = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v > 0;
const isNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const ORBITERS = ['atlantis', 'discovery', 'columbia', 'challenger', 'endeavour'];

function isBurn(b: unknown): b is UpperStageBurn {
  const r = b as Record<string, unknown> | undefined;
  return !!r && typeof r === 'object' && parseGet(r.met) != null && isPos(r.burnS);
}

/** Fail-closed shape check: every MET parses and rises in flight order, each burn after the last
 *  one ended. */
export function isValidDeployProfile(d: unknown): d is DeployProfileRaw {
  if (!d || typeof d !== 'object') return false;
  const p = d as Record<string, unknown>;
  if (typeof p.missionId !== 'string' || typeof p.flight !== 'string') return false;
  if (!ORBITERS.includes(p.orbiter as string)) return false;
  if (typeof p.launchZeroUtc !== 'string' || Number.isNaN(Date.parse(p.launchZeroUtc))) {
    return false;
  }
  if (p.method !== 'ius-tilt') return false;
  const orbit = p.orbit as Record<string, unknown> | undefined;
  if (!orbit || !Array.isArray(orbit.nmi) || orbit.nmi.length !== 2) return false;
  if (!orbit.nmi.every(isPos) || !['plan', 'actual'].includes(orbit.basis as string)) return false;
  if (orbit.incDeg !== undefined && !isPos(orbit.incDeg)) return false;
  if (!Array.isArray(p.tilt) || p.tilt.length < 1) return false;
  const degs = (p.tilt as Record<string, unknown>[]).map((t) => t?.deg);
  if (!degs.every((x) => isPos(x) && x < 90)) return false;
  for (let i = 1; i < degs.length; i++)
    if ((degs[i] as number) <= (degs[i - 1] as number)) return false;
  if (!isPos(p.springMs) || !isNumber(p.tableLowerDeg) || p.tableLowerDeg > 0) return false;
  if (!Array.isArray(p.sepBurns) || p.sepBurns.length < 1) return false;
  const sep = p.sepBurns as Record<string, unknown>[];
  if (!sep.every((b) => (b.id === 'oms3' || b.id === 'rcs') && isBurn(b))) return false;
  if (!sep.every((b) => b.dvFts === undefined || isPos(b.dvFts))) return false;
  const us = p.upperStage as Record<string, unknown> | undefined;
  if (!us || !isBurn(us.stage1) || !isBurn(us.stage2)) return false;
  const pam = us.pamS as Record<string, unknown> | undefined;
  if (pam !== undefined && (!isBurn(pam) || !isPos(pam.spinRpm))) return false;

  const release = parseGet(p.releaseMet);
  if (release == null) return false;
  const seq: [number, number][] = [
    [release, 0],
    ...sep.map((b) => [parseGet(b.met)!, b.burnS as number] as [number, number]),
    ...[us.stage1, us.stage2, ...(pam ? [pam] : [])].map((b) => {
      const r = b as unknown as Record<string, unknown>;
      return [parseGet(r.met)!, r.burnS as number] as [number, number];
    }),
  ];
  for (let i = 1; i < seq.length; i++) if (seq[i][0] < seq[i - 1][0] + seq[i - 1][1]) return false;
  return (
    typeof p.source_tier === 'string' &&
    Array.isArray(p.estimatedFields) &&
    Array.isArray(p.provenance)
  );
}

export function expandDeployProfile(raw: DeployProfileRaw): DeployProfile {
  const g = (s: string): number => parseGet(s)!;
  return {
    ...raw,
    releaseS: g(raw.releaseMet),
    sepBurnsS: raw.sepBurns.map((b) => g(b.met)),
    stage1S: g(raw.upperStage.stage1.met),
    stage2S: g(raw.upperStage.stage2.met),
    pamSS: raw.upperStage.pamS ? g(raw.upperStage.pamS.met) : undefined,
  };
}

/** Mission ids with a profile file: the directory listing, so a new file is a new mission. */
const FILES = import.meta.glob('/static/data/deploy-profiles/*.json', {
  query: '?url',
  import: 'default',
});
export const DEPLOY_MISSION_IDS: ReadonlySet<string> = new Set(
  Object.keys(FILES).map((p) => p.slice(p.lastIndexOf('/') + 1, -'.json'.length)),
);

export function hasDeployProfile(missionId: string | undefined | null): boolean {
  return missionId != null && DEPLOY_MISSION_IDS.has(missionId);
}

/** Fetch the profile; null when the mission has none, the fetch fails or the JSON is malformed. */
export async function loadDeployProfile(
  missionId: string | undefined | null,
  fetchFn: typeof fetch = fetch,
  baseUrl = '',
): Promise<DeployProfile | null> {
  if (!hasDeployProfile(missionId)) return null;
  try {
    const res = await fetchFn(`${baseUrl}/data/deploy-profiles/${missionId}.json`);
    if (!res.ok) return null;
    const data: unknown = await res.json();
    return isValidDeployProfile(data) ? expandDeployProfile(data) : null;
  } catch {
    return null;
  }
}
