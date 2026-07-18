/**
 * Descent-profile registry (RFC-034 §9) — the inverse of
 * launch-profile-registry.ts. Resolves a landing mission → its EDL
 * DescentProfile. Mirrors the launch design: thin per-mission JSON ships under
 * static/data/descent-profiles/<missionId>.json and is fetched + expanded on
 * demand, with the heavy lifting done by six reusable EDL ARCHETYPES (embedded
 * TS phase-sequence templates) so each JSON only carries the mission-specific
 * numbers (entry state, masses, phase-trigger altitudes).
 *
 * The universal key is the MISSION id (always present); the JSON carries the
 * `siteId` used for the surface handoff (usually == missionId, but e.g.
 * viking1 → viking1-lander, tianwen1 → zhurong).
 */

import type { DescentBody, DescentProfile, EDLPhase } from './descent-physics';

// ─── Archetypes ─────────────────────────────────────────────────────

/** The six EDL archetypes covering all 37 Moon/Mars/Venus landers. */
export type ArchetypeName =
  | 'LUNAR_POWERED'
  | 'LUNA_DIRECT_IMPACT'
  | 'MARS_PARACHUTE_RETRO'
  | 'MARS_AIRBAG'
  | 'MARS_SKYCRANE'
  | 'VENUS_AEROSHELL';

/**
 * Per-mission knobs an archetype reads to build its phase sequence. Every field
 * is optional with a sensible per-archetype default, so a thin JSON overrides
 * only what differs from the class.
 */
export interface ArchetypeParams {
  /** Altitude (m) the drogue/main chute deploys (Mars/Venus). */
  chuteDeployAltM?: number;
  /** Altitude (m) the chute/backshell is cut and the terminal phase starts. */
  terminalHandoffAltM?: number;
  /** Altitude (m) the skycrane/airbag phase begins. */
  finalPhaseAltM?: number;
  /** Effective parachute drag area Cd·A (m²). */
  parachuteCdA?: number;
  /** Terminal-descent drag area Cd·A (m²) for the Venus aeroshell coast. */
  terminalCdA?: number;
  /** Retro specific impulse (s). */
  ispS?: number;
  /** Heat-shield mass jettisoned at chute deploy (kg). */
  heatshieldKg?: number;
  /** Backshell + chute mass jettisoned at the powered/skycrane handoff (kg). */
  backshellKg?: number;
  /** Controlled touchdown speed (m·s⁻¹) for the terminal powered/skycrane phase. */
  terminalVelocityMs?: number;
  /** Descent-rate guidance gain (s⁻¹) for the powered phase. */
  descentRateGain?: number;
  /** Airbag/impact speed (m·s⁻¹) the powered brake eases to before release. */
  airbagReleaseMs?: number;
}

type ArchetypeBuilder = (p: ArchetypeParams) => EDLPhase[];

const LUNAR_POWERED: ArchetypeBuilder = (p) => [
  {
    kind: 'powered_retro',
    endTrigger: { type: 'ground', value: 0 },
    ispS: p.ispS ?? 311,
    terminalVelocityMs: p.terminalVelocityMs ?? 1,
    descentRateGain: p.descentRateGain ?? 0.05,
    events: ['retro_ignition'],
  },
];

const LUNA_DIRECT_IMPACT: ArchetypeBuilder = (p) => [
  {
    kind: 'powered_retro',
    endTrigger: { type: 'velocity_ms', value: p.airbagReleaseMs ?? 15 },
    ispS: p.ispS ?? 287,
    terminalVelocityMs: p.airbagReleaseMs ?? 15,
    descentRateGain: p.descentRateGain ?? 0.4,
    events: ['retro_ignition'],
  },
  { kind: 'coast', endTrigger: { type: 'ground', value: 0 }, events: ['airbag_deploy'] },
];

const MARS_PARACHUTE_RETRO: ArchetypeBuilder = (p) => [
  { kind: 'ballistic_entry', endTrigger: { type: 'altitude_m', value: p.chuteDeployAltM ?? 8000 } },
  {
    kind: 'parachute',
    endTrigger: { type: 'altitude_m', value: p.terminalHandoffAltM ?? 1500 },
    cdA: p.parachuteCdA ?? 120,
    jettisonKg: p.heatshieldKg ?? 100,
    events: ['parachute_deploy', 'heatshield_sep'],
  },
  {
    kind: 'powered_retro',
    endTrigger: { type: 'ground', value: 0 },
    ispS: p.ispS ?? 225,
    jettisonKg: p.backshellKg ?? 200,
    terminalVelocityMs: p.terminalVelocityMs ?? 2.4,
    descentRateGain: p.descentRateGain ?? 0.08,
    events: ['backshell_sep', 'retro_ignition'],
  },
];

const MARS_AIRBAG: ArchetypeBuilder = (p) => [
  { kind: 'ballistic_entry', endTrigger: { type: 'altitude_m', value: p.chuteDeployAltM ?? 9000 } },
  {
    kind: 'parachute',
    endTrigger: { type: 'altitude_m', value: p.terminalHandoffAltM ?? 300 },
    cdA: p.parachuteCdA ?? 60,
    jettisonKg: p.heatshieldKg ?? 90,
    events: ['parachute_deploy', 'heatshield_sep'],
  },
  {
    kind: 'powered_retro',
    endTrigger: { type: 'altitude_m', value: p.finalPhaseAltM ?? 15 },
    ispS: p.ispS ?? 200,
    terminalVelocityMs: p.airbagReleaseMs ?? 12,
    descentRateGain: p.descentRateGain ?? 0.5,
    events: ['retro_ignition'],
  },
  { kind: 'airbag_bounce', endTrigger: { type: 'ground', value: 0 }, events: ['airbag_deploy'] },
];

const MARS_SKYCRANE: ArchetypeBuilder = (p) => [
  {
    kind: 'ballistic_entry',
    endTrigger: { type: 'altitude_m', value: p.chuteDeployAltM ?? 11000 },
  },
  {
    kind: 'parachute',
    endTrigger: { type: 'altitude_m', value: p.terminalHandoffAltM ?? 1800 },
    cdA: p.parachuteCdA ?? 200,
    jettisonKg: p.heatshieldKg ?? 380,
    events: ['parachute_deploy', 'heatshield_sep'],
  },
  {
    kind: 'powered_retro',
    endTrigger: { type: 'altitude_m', value: p.finalPhaseAltM ?? 21 },
    ispS: p.ispS ?? 225,
    jettisonKg: p.backshellKg ?? 630,
    descentRateGain: p.descentRateGain ?? 0.08,
    events: ['backshell_sep', 'retro_ignition'],
  },
  {
    kind: 'skycrane',
    endTrigger: { type: 'ground', value: 0 },
    ispS: p.ispS ?? 225,
    terminalVelocityMs: p.terminalVelocityMs ?? 0.75,
    events: ['skycrane_lower'],
  },
];

const VENUS_AEROSHELL: ArchetypeBuilder = (p) => [
  {
    kind: 'ballistic_entry',
    endTrigger: { type: 'altitude_m', value: p.chuteDeployAltM ?? 62000 },
  },
  {
    kind: 'parachute',
    endTrigger: { type: 'altitude_m', value: p.terminalHandoffAltM ?? 47000 },
    cdA: p.parachuteCdA ?? 24,
    events: ['parachute_deploy'],
  },
  {
    kind: 'aeroshell_descent',
    endTrigger: { type: 'ground', value: 0 },
    cdA: p.terminalCdA ?? 3.2,
    jettisonKg: p.backshellKg ?? 200,
    events: ['heatshield_sep'],
  },
];

const ARCHETYPES: Record<ArchetypeName, ArchetypeBuilder> = {
  LUNAR_POWERED,
  LUNA_DIRECT_IMPACT,
  MARS_PARACHUTE_RETRO,
  MARS_AIRBAG,
  MARS_SKYCRANE,
  VENUS_AEROSHELL,
};

/** The default survivable-touchdown limit (m·s⁻¹) per archetype. */
const ARCHETYPE_SURVIVABLE: Record<ArchetypeName, number> = {
  LUNAR_POWERED: 3,
  LUNA_DIRECT_IMPACT: 30,
  MARS_PARACHUTE_RETRO: 3,
  MARS_AIRBAG: 25,
  MARS_SKYCRANE: 3,
  VENUS_AEROSHELL: 15,
};

// ─── Thin JSON shape + expansion ────────────────────────────────────

/** The per-mission JSON that ships on disk — expanded via its archetype. */
export interface RawDescentProfile {
  missionId: string;
  /** Landing-site id for the surface handoff (moon-sites/mars-sites id). */
  siteId: string;
  body: DescentBody;
  landingSite: { lat: number; lon: number };
  entryState: { altitudeM: number; velocityMs: number; flightPathAngleDeg: number };
  entryMassKg: number;
  entryCdA: number;
  retroPropellantKg?: number;
  survivableTouchdownMs?: number;
  archetype: ArchetypeName;
  params?: ArchetypeParams;
  source_tier: 'flagship' | 'generic';
  provenance?: { l: string; u: string }[];
}

/** Expand a thin JSON profile into the full DescentProfile the engine runs. */
export function expandDescentProfile(raw: RawDescentProfile): DescentProfile {
  const build = ARCHETYPES[raw.archetype];
  if (!build) throw new Error(`Unknown descent archetype: ${raw.archetype}`);
  return {
    siteId: raw.siteId,
    missionId: raw.missionId,
    body: raw.body,
    landingSite: raw.landingSite,
    entryState: raw.entryState,
    entryMassKg: raw.entryMassKg,
    entryCdA: raw.entryCdA,
    retroPropellantKg: raw.retroPropellantKg,
    phases: build(raw.params ?? {}),
    survivableTouchdownMs: raw.survivableTouchdownMs ?? ARCHETYPE_SURVIVABLE[raw.archetype],
    source_tier: raw.source_tier,
    provenance: raw.provenance,
  };
}

// ─── Mission gate + loader ──────────────────────────────────────────

/** Every mission that ships a descent profile (the 37 Moon/Mars/Venus landers). */
export const DESCENT_MISSION_IDS = new Set<string>([
  // Moon (21)
  'apollo11',
  'apollo12',
  'apollo14',
  'apollo15',
  'apollo16',
  'apollo17',
  'luna9',
  'luna16',
  'luna17',
  'luna21',
  'luna24',
  'change3',
  'change4',
  'change5',
  'change6',
  'chandrayaan3',
  'slim',
  'beresheet',
  'artemis3',
  'artemis4',
  'blue-moon-mk1',
  // Mars (13)
  'viking1',
  'mars3',
  'mars-pathfinder',
  'spirit',
  'opportunity',
  'phoenix',
  'curiosity',
  'insight',
  'schiaparelli',
  'tianwen1',
  'perseverance',
  'starship-demo',
  'starship-mars-crew',
  // Venus (3)
  'venera-13',
  'vega-1',
  'vega-2',
]);

/** True when a mission plays a descent act (has a hand-authored profile). */
export function hasDescentProfile(missionId: string | undefined | null): boolean {
  return missionId != null && DESCENT_MISSION_IDS.has(missionId);
}

/** Minimal fail-closed shape check for a loaded thin profile. */
function isValidRaw(d: unknown): d is RawDescentProfile {
  if (!d || typeof d !== 'object') return false;
  const p = d as Record<string, unknown>;
  return (
    typeof p.missionId === 'string' &&
    typeof p.siteId === 'string' &&
    (p.body === 'moon' || p.body === 'mars' || p.body === 'venus') &&
    typeof p.entryMassKg === 'number' &&
    typeof p.entryCdA === 'number' &&
    typeof p.archetype === 'string' &&
    p.archetype in ARCHETYPES &&
    typeof p.entryState === 'object' &&
    p.entryState !== null
  );
}

/**
 * Fetch + expand the descent profile for a mission. Returns null when the
 * mission has no profile, the fetch fails, or the JSON is malformed
 * (fail-closed). `baseUrl` is the SvelteKit base path; `fetchFn` lets callers
 * pass the load fetch.
 */
export async function loadDescentProfile(
  missionId: string | undefined | null,
  fetchFn: typeof fetch = fetch,
  baseUrl = '',
): Promise<DescentProfile | null> {
  if (!hasDescentProfile(missionId)) return null;
  try {
    const res = await fetchFn(`${baseUrl}/data/descent-profiles/${missionId}.json`);
    if (!res.ok) return null;
    const data: unknown = await res.json();
    if (!isValidRaw(data)) return null;
    return expandDescentProfile(data);
  } catch {
    return null;
  }
}
