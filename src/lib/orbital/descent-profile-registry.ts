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

/** Runtime allowlist of destination bodies the engine accepts (validation). */
const DESCENT_BODIES = [
  'moon',
  'mars',
  'venus',
  'titan',
  'earth',
  'jupiter',
  'comet_67p',
  'itokawa',
  'ryugu',
  'bennu',
  'eros',
] as const satisfies readonly DescentBody[];

// ─── Archetypes ─────────────────────────────────────────────────────

/** EDL archetypes. The first seven cover the 37 Moon/Mars/Venus landers
 *  (Phase 1); the last four cover the outer + small-body EDL (Phase 2,
 *  RFC-034 §12): asteroid touch-and-go, comet bounce-landing, Titan parachute
 *  descent, and the Jupiter atmospheric probe (no surface). */
export type ArchetypeName =
  | 'LUNAR_POWERED'
  | 'LUNA_DIRECT_IMPACT'
  | 'MARS_PARACHUTE_RETRO'
  | 'MARS_AIRBAG'
  | 'MARS_SKYCRANE'
  | 'MARS_PROPULSIVE'
  | 'VENUS_AEROSHELL'
  | 'ASTEROID_TOUCH_AND_GO'
  | 'COMET_HARPOON'
  | 'TITAN_PARACHUTE'
  | 'JUPITER_PROBE'
  | 'EARTH_CAPSULE_REENTRY';

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
  /** Altitude (m) of surface contact for touch-and-go / comet landing. */
  contactAltM?: number;
  /** Ambient pressure (Pa) at which an atmospheric probe is crushed / lost
   *  (Jupiter — the descent has no solid-surface terminus). */
  crushPressurePa?: number;
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

/** Fully propulsive Mars EDL — a hypersonic aeroshell/belly entry that bleeds
 *  speed on drag, then a landing burn straight to touchdown with NO parachute
 *  (Mars air is too thin to chute a 100-t vehicle). How SpaceX Starship lands. */
const MARS_PROPULSIVE: ArchetypeBuilder = (p) => [
  {
    kind: 'ballistic_entry',
    endTrigger: { type: 'altitude_m', value: p.terminalHandoffAltM ?? 3000 },
  },
  {
    kind: 'powered_retro',
    endTrigger: { type: 'ground', value: 0 },
    ispS: p.ispS ?? 350,
    terminalVelocityMs: p.terminalVelocityMs ?? 2,
    descentRateGain: p.descentRateGain ?? 0.06,
    events: ['retro_ignition'],
  },
];

/** Asteroid sample touch-and-go (Hayabusa/OSIRIS-REx). Airless micro-g: a slow
 *  guided descent from the station-keeping point to a feather-light contact,
 *  the sample horn fires, and the craft immediately backs away — there is no
 *  landing, so it ends on `touch_and_go_contact`, not a survivable touchdown. */
const ASTEROID_TOUCH_AND_GO: ArchetypeBuilder = (p) => [
  {
    kind: 'powered_retro',
    endTrigger: { type: 'altitude_m', value: p.contactAltM ?? 1 },
    ispS: p.ispS ?? 290,
    terminalVelocityMs: p.terminalVelocityMs ?? 0.1,
    descentRateGain: p.descentRateGain ?? 0.02,
    events: ['retro_ignition'],
  },
  {
    kind: 'touch_and_go_contact',
    endTrigger: { type: 'ground', value: 0 },
    events: ['first_contact', 'sample_collected'],
  },
];

/** Comet bounce-landing (Philae on 67P). Unpowered micro-g free-descent to the
 *  nucleus; the harpoons fire (Philae's failed), the lander touches at ~1 m·s⁻¹,
 *  rebounds and drifts, and finally settles — the multi-contact drama carried by
 *  the event beats rather than a rebound in the 1-DOF integrator. */
const COMET_HARPOON: ArchetypeBuilder = (p) => [
  {
    kind: 'coast',
    endTrigger: { type: 'altitude_m', value: p.contactAltM ?? 20 },
    events: ['harpoon_fire'],
  },
  {
    kind: 'airbag_bounce',
    endTrigger: { type: 'ground', value: 0 },
    events: ['first_contact', 'bounce', 'touchdown'],
  },
];

/** Titan parachute descent (Huygens). Hypersonic aeroshell entry, a pilot/drogue
 *  chute pulls the main, then the heat shield drops and a small stabiliser chute
 *  carries the probe through the thick cold N₂ to a ~5 m·s⁻¹ surface contact —
 *  a ~2.5-hour descent. */
const TITAN_PARACHUTE: ArchetypeBuilder = (p) => [
  {
    kind: 'ballistic_entry',
    endTrigger: { type: 'altitude_m', value: p.chuteDeployAltM ?? 160000 },
  },
  {
    kind: 'parachute',
    endTrigger: { type: 'altitude_m', value: p.terminalHandoffAltM ?? 120000 },
    cdA: p.parachuteCdA ?? 12,
    jettisonKg: p.heatshieldKg ?? 80,
    events: ['parachute_deploy', 'heatshield_sep'],
  },
  {
    kind: 'aeroshell_descent',
    endTrigger: { type: 'ground', value: 0 },
    cdA: p.terminalCdA ?? 3,
    jettisonKg: p.backshellKg ?? 20,
    events: ['parachute_jettison'],
  },
];

/** Jupiter atmospheric probe (Galileo). A ~47 km·s⁻¹ hypersonic entry (peak
 *  ~230 g), a single parachute, then a passive descent deeper into the H₂/He
 *  until the rising pressure crushes the probe — there is NO solid surface, so
 *  the terminus is `pressure_pa`, not `ground`, and the beat is signal-loss. */
const JUPITER_PROBE: ArchetypeBuilder = (p) => [
  {
    kind: 'ballistic_entry',
    endTrigger: { type: 'altitude_m', value: p.chuteDeployAltM ?? 100000 },
  },
  {
    kind: 'parachute',
    endTrigger: { type: 'altitude_m', value: p.terminalHandoffAltM ?? 50000 },
    cdA: p.parachuteCdA ?? 8,
    jettisonKg: p.heatshieldKg ?? 150,
    events: ['parachute_deploy', 'heatshield_sep'],
  },
  {
    kind: 'aeroshell_descent',
    endTrigger: { type: 'pressure_pa', value: p.crushPressurePa ?? 2_200_000 }, // ~22 bar
    cdA: p.terminalCdA ?? 3,
    events: ['probe_signal_lost'],
  },
];

/** Earth-orbit capsule re-entry (Tier-1: Mercury/Gemini/Vostok/Voskhod/Apollo CM/
 *  Soyuz/Dragon/Shenzhou — RFC-034 §13). A deorbited (or suborbital-lofted) blunt
 *  capsule rides its ablative heat shield through a hypersonic ballistic entry
 *  (entry/peak-heat/peak-decel auto-emitted), a drogue stabilises it through the
 *  transonic band, then the main canopies deploy (the drogue is released as they
 *  do) and carry it to a ~7 m·s⁻¹ splashdown/ground touchdown. Orbital vs
 *  suborbital differ only in the JSON entry state (velocity/FPA) + the coast
 *  layer — the EDL hardware is identical, so one archetype covers both. Soyuz-class
 *  ground landings tune to a lower terminal via a larger main Cd·A; a failed main
 *  (soyuz-1) is a low-Cd·A profile that busts the survivable limit → honest crash. */
const EARTH_CAPSULE_REENTRY: ArchetypeBuilder = (p) => [
  {
    kind: 'ballistic_entry',
    endTrigger: { type: 'altitude_m', value: p.chuteDeployAltM ?? 8000 },
  },
  {
    kind: 'parachute', // drogue — stabilises through the transonic band
    endTrigger: { type: 'altitude_m', value: p.terminalHandoffAltM ?? 3000 },
    cdA: p.parachuteCdA ?? 30,
    jettisonKg: p.heatshieldKg ?? 0,
    events: ['parachute_deploy'],
  },
  {
    kind: 'parachute', // main canopies — the drogue is released as they open
    endTrigger: { type: 'ground', value: 0 },
    cdA: p.terminalCdA ?? 900,
    events: ['parachute_jettison'],
  },
];

const ARCHETYPES: Record<ArchetypeName, ArchetypeBuilder> = {
  LUNAR_POWERED,
  LUNA_DIRECT_IMPACT,
  MARS_PARACHUTE_RETRO,
  MARS_AIRBAG,
  MARS_SKYCRANE,
  MARS_PROPULSIVE,
  VENUS_AEROSHELL,
  ASTEROID_TOUCH_AND_GO,
  COMET_HARPOON,
  TITAN_PARACHUTE,
  JUPITER_PROBE,
  EARTH_CAPSULE_REENTRY,
};

/** The default survivable-touchdown limit (m·s⁻¹) per archetype. */
const ARCHETYPE_SURVIVABLE: Record<ArchetypeName, number> = {
  LUNAR_POWERED: 3,
  LUNA_DIRECT_IMPACT: 30,
  MARS_PARACHUTE_RETRO: 3,
  MARS_AIRBAG: 25,
  MARS_SKYCRANE: 3,
  MARS_PROPULSIVE: 3,
  VENUS_AEROSHELL: 15,
  ASTEROID_TOUCH_AND_GO: 1, // feather contact; not a landing
  COMET_HARPOON: 5, // Philae touched at ~1 m/s and survived the bounces
  TITAN_PARACHUTE: 8, // Huygens hit ~4.5 m/s
  JUPITER_PROBE: 60, // no touchdown — high limit so the crush isn't flagged a crash
  EARTH_CAPSULE_REENTRY: 10, // splash/ground at ~7 m/s; a fouled main busts this → crash
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
  // Phase 2 — outer + small bodies, already-flyable arrivals (RFC-034 §12)
  'hayabusa1', // Itokawa touch-and-go
  'osiris-rex', // Bennu touch-and-go
  'galileo', // Jupiter atmospheric probe (no surface)
  'hayabusa2', // Ryugu touch-and-go
  'rosetta', // Philae bounce-landing on comet 67P
  'huygens', // Titan parachute descent
  'near-shoemaker', // Eros soft landing (433 Eros)
  // Tier-1 Earth-orbit capsule re-entry (RFC-034 §13). MVP first; the rest of the
  // ~31 are added as their profiles land.
  'friendship-7', // Mercury-Atlas 6 — John Glenn, 3 orbits, Atlantic splashdown
  'vostok-1', // Gagarin — first human, 1 orbit, Saratov steppe landing
  'apollo7', // first crewed Apollo — Apollo CM, 163 orbits, Atlantic splashdown
  // The rest of the Tier-1 set (Mercury/Gemini/Vostok/Voskhod/Apollo CM/Soyuz/
  // Dragon/Shenzhou + 2 Mercury-Redstone suborbital hops).
  'aurora-7',
  'sigma-7',
  'faith-7',
  'freedom-7',
  'liberty-bell-7',
  'gemini3',
  'gemini4',
  'gemini6a',
  'gemini7',
  'gemini8',
  'gemini12',
  'vostok-2',
  'vostok-3',
  'vostok-4',
  'vostok-5',
  'vostok-6',
  'voskhod-1',
  'voskhod-2',
  'apollo9',
  'apollo-soyuz',
  'skylab-2',
  'skylab-3',
  'skylab-4',
  'soyuz-1',
  'soyuz-11',
  'inspiration4',
  'polaris-dawn',
  'shenzhou-1',
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
    typeof p.body === 'string' &&
    (DESCENT_BODIES as readonly string[]).includes(p.body) &&
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
