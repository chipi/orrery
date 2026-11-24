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

import type {
  AfterTouchdown,
  DescentBeatSpec,
  DescentBody,
  DescentProfile,
  EDLPhase,
} from './descent-physics';

/** Runtime allowlist of destination bodies the engine accepts (validation). */
const DESCENT_BODIES = [
  'moon',
  'mars',
  'venus',
  'titan',
  'earth',
  'jupiter',
  'mercury',
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
  | 'MARS_CHUTE_AIRBAG'
  | 'MARS_SKYCRANE'
  | 'MARS_PROPULSIVE'
  | 'VENUS_AEROSHELL'
  | 'ASTEROID_TOUCH_AND_GO'
  | 'COMET_HARPOON'
  | 'TITAN_PARACHUTE'
  | 'JUPITER_PROBE'
  | 'EARTH_CAPSULE_REENTRY'
  | 'EARTH_STARSHIP_RETURN';

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
  /** Beagle 2: altitude (m) the pilot chute goes and the main opens (absent: one chute). */
  mainChuteAltM?: number;
  /** Beagle 2: the pilot chute's drag area with the body it pulls (m²). */
  pilotCdA?: number;
  /** Mars powered landers: the descent stops at this altitude (m) and hovers `hoverS` s. */
  hoverAltM?: number;
  hoverS?: number;
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
  /** Luna 9: altitude (m) the contact probe ejects the capsule; the brake runs to here
   *  instead of stopping (and free-falling) the moment it reaches `airbagReleaseMs`. */
  airbagReleaseAltM?: number;
  /** Altitude (m) of surface contact for touch-and-go / comet landing. */
  contactAltM?: number;
  /** Ambient pressure (Pa) at which an atmospheric probe is crushed / lost
   *  (Jupiter — the descent has no solid-surface terminus). */
  crushPressurePa?: number;
  /** Lunar powered descent from orbit (Apollo PDI, Chang'e, Luna): the braking phase's
   *  flight-path angle (deg) — near-horizontal, the burn kills orbital speed over ~8 min. */
  brakingFpaDeg?: number;
  /** Peak braking deceleration (g): the descent engine's thrust over the vehicle's mass
   *  (Apollo LM ~0.3 g) — what makes the braking phase last minutes, not seconds. */
  brakingMaxG?: number;
  /** The descent engine's maximum thrust (N). When set, every phase brakes at up to this thrust
   *  over the current mass (deceleration grows as propellant burns off); overrides brakingMaxG. */
  brakingMaxThrustN?: number;
  /** Speed (m/s) at which braking ends and the approach pitches up (Apollo "high gate"). */
  highGateSpeedMs?: number;
  /** The approach phase's flight-path angle (deg), steeper than braking. */
  approachFpaDeg?: number;
  /** Altitude (m) the approach ends and the vertical final descent starts ("low gate"). */
  lowGateAltM?: number;
  /** Braking-phase schedule gain (s⁻¹). Small, so the target speed sits well below the
   *  vehicle's and the engine brakes at its peak the whole phase — the real near-full-thrust
   *  braking burn; the normal gain on a shallow path would dawdle for many minutes. */
  brakingRateGain?: number;
  /** Lunar powered descent: emit `high_gate` and `low_gate` where the approach and the final
   *  descent start (Apollo's named gates). Off for landers whose record names none. */
  gateBeats?: boolean;
  /** Lunar powered descent: hovers (Chang'e at 100 m, Chandrayaan-3 at 800 m and 150 m): hold the
   *  altitude `durS` seconds on the way down. `resumeS` frees the lander to fall that long after the
   *  hover so it picks up its descent rate (the rate law only slows, never speeds up). */
  hovers?: { altM: number; durS: number; resumeS?: number }[];
}

type ArchetypeBuilder = (p: ArchetypeParams) => EDLPhase[];

/** Lunar powered descent. With `brakingFpaDeg` it flies from orbit like the real landers —
 *  a braking burn at a shallow angle down to the high-gate speed, an approach, a vertical
 *  final from low gate; without it, a single vertical terminal burn (the short-form profile). */
const LUNAR_POWERED: ArchetypeBuilder = (p) => {
  const common = {
    kind: 'powered_retro' as const,
    ispS: p.ispS ?? 311,
    terminalVelocityMs: p.terminalVelocityMs ?? 1,
    descentRateGain: p.descentRateGain ?? 0.05,
  };
  if (p.brakingFpaDeg == null) {
    return [{ ...common, endTrigger: { type: 'ground', value: 0 }, events: ['retro_ignition'] }];
  }
  const lowGate = p.lowGateAltM ?? 150;
  const guide = { maxBrakeG: p.brakingMaxG ?? 0.3, maxThrustN: p.brakingMaxThrustN };
  const hovers = [...(p.hovers ?? [])].sort((x, y) => y.altM - x.altM);
  // A hover holds the altitude (the descent-rate floor is ~0) for `durS`, then the descent goes on.
  const hover = (h: { durS: number }): EDLPhase => ({
    ...common,
    ...guide,
    endTrigger: { type: 'duration_s', value: h.durS },
    descentRateGain: 0,
    terminalVelocityMs: 0,
    events: ['hover'],
  });
  const resume = (h: { resumeS?: number }): EDLPhase[] =>
    h.resumeS
      ? [
          {
            kind: 'coast',
            endTrigger: { type: 'duration_s', value: h.resumeS },
            flightPathAngleDeg: 90,
          },
        ]
      : [];
  const phases: EDLPhase[] = [
    {
      ...common,
      endTrigger: { type: 'velocity_ms', value: p.highGateSpeedMs ?? 150 },
      flightPathAngleDeg: p.brakingFpaDeg,
      maxBrakeG: p.brakingMaxG ?? 0.3,
      maxThrustN: p.brakingMaxThrustN,
      descentRateGain: p.brakingRateGain ?? 0.01,
      events: ['retro_ignition'],
    },
  ];
  const approach = (end: number, first: boolean): EDLPhase => ({
    ...common,
    ...guide,
    endTrigger: { type: 'altitude_m', value: end },
    flightPathAngleDeg: p.approachFpaDeg ?? 16,
    ...(first && p.gateBeats ? { events: ['high_gate' as const] } : {}),
  });
  let first = true;
  for (const h of hovers.filter((x) => x.altM > lowGate)) {
    phases.push(
      approach(h.altM + 700, first),
      { ...approach(h.altM, false), descentRateGain: 8 / h.altM },
      hover(h),
      ...resume(h),
    );
    first = false;
  }
  const afterHover = first ? {} : { flightPathAngleDeg: 90 };
  phases.push({ ...approach(lowGate, first), ...afterHover });
  const fin = (end: number, gate: boolean): EDLPhase => ({
    ...common,
    ...guide,
    endTrigger: end > 0 ? { type: 'altitude_m', value: end } : { type: 'ground', value: 0 },
    ...(gate && p.gateBeats ? { events: ['low_gate' as const] } : {}),
  });
  let gate = true;
  for (const h of hovers.filter((x) => x.altM <= lowGate)) {
    phases.push(fin(h.altM, gate), hover(h), ...resume(h));
    gate = false;
  }
  phases.push(fin(0, gate));
  return phases;
};

const LUNA_DIRECT_IMPACT: ArchetypeBuilder = (p) => [
  {
    kind: 'powered_retro',
    endTrigger:
      p.airbagReleaseAltM !== undefined
        ? { type: 'altitude_m', value: p.airbagReleaseAltM }
        : { type: 'velocity_ms', value: p.airbagReleaseMs ?? 15 },
    ispS: p.ispS ?? 287,
    terminalVelocityMs: p.airbagReleaseMs ?? 15,
    descentRateGain: p.descentRateGain ?? 0.4,
    events: ['retro_ignition'],
  },
  { kind: 'coast', endTrigger: { type: 'ground', value: 0 }, events: ['airbag_deploy'] },
];

const MARS_PARACHUTE_RETRO: ArchetypeBuilder = (p) => {
  const burn: EDLPhase = {
    kind: 'powered_retro',
    endTrigger: { type: 'ground', value: 0 },
    ispS: p.ispS ?? 225,
    terminalVelocityMs: p.terminalVelocityMs ?? 2.4,
    descentRateGain: p.descentRateGain ?? 0.08,
  };
  // With `hoverAltM` the burn stops its descent there, holds for `hoverS` (hazard avoidance:
  // Tianwen-1 at about 100 m), then descends to the ground.
  const hover: EDLPhase[] =
    p.hoverAltM == null
      ? [{ ...burn, jettisonKg: p.backshellKg ?? 200, events: ['backshell_sep', 'retro_ignition'] }]
      : [
          {
            ...burn,
            endTrigger: { type: 'altitude_m', value: p.hoverAltM },
            jettisonKg: p.backshellKg ?? 200,
            events: ['backshell_sep', 'retro_ignition'],
          },
          {
            ...burn,
            endTrigger: { type: 'duration_s', value: p.hoverS ?? 10 },
            terminalVelocityMs: 0,
            descentRateGain: 0,
            events: ['hover'],
          },
          burn,
        ];
  return [
    {
      kind: 'ballistic_entry',
      endTrigger: { type: 'altitude_m', value: p.chuteDeployAltM ?? 8000 },
    },
    {
      kind: 'parachute',
      endTrigger: { type: 'altitude_m', value: p.terminalHandoffAltM ?? 1500 },
      cdA: p.parachuteCdA ?? 120,
      jettisonKg: p.heatshieldKg ?? 100,
      events: ['parachute_deploy', 'heatshield_sep'],
    },
    ...hover,
  ];
};

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

/** Beagle 2: no retro rockets. With `mainChuteAltM` the pilot chute (a small drag area) flies
 *  first and the main opens at that height (the inquiry's pilot-then-main sequence), the back
 *  cover leaving with the pilot; the airbag phase keeps the main chute's drag area to first
 *  impact, where the scene releases it. Without it, one chute from deployment. */
const MARS_CHUTE_AIRBAG: ArchetypeBuilder = (p) => {
  const mainCdA = p.parachuteCdA ?? 40;
  const handoff = p.finalPhaseAltM ?? 200;
  const twoStage = p.mainChuteAltM != null;
  const first: EDLPhase = {
    kind: 'parachute',
    endTrigger: { type: 'altitude_m', value: p.mainChuteAltM ?? handoff },
    cdA: twoStage ? (p.pilotCdA ?? 2) : mainCdA,
    jettisonKg: p.heatshieldKg ?? 20,
    events: ['parachute_deploy', 'heatshield_sep'],
  };
  const main: EDLPhase = {
    kind: 'parachute',
    endTrigger: { type: 'altitude_m', value: handoff },
    cdA: mainCdA,
    jettisonKg: p.backshellKg ?? 0,
    events: ['parachute_jettison', 'backshell_sep'],
  };
  return [
    {
      kind: 'ballistic_entry',
      endTrigger: { type: 'altitude_m', value: p.chuteDeployAltM ?? 7000 },
    },
    first,
    ...(twoStage ? [main] : []),
    {
      kind: 'airbag_bounce',
      endTrigger: { type: 'ground', value: 0 },
      cdA: mainCdA,
      events: ['airbag_deploy'],
    },
  ];
};

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
    // The chute is cut here (Venera 13: at about 50 km); the lander falls on air braking alone.
    events: ['parachute_jettison', 'heatshield_sep'],
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
    events: ['landing_flip', 'retro_ignition'],
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
    // `probe_signal_lost` is emitted by the integrator when the crush pressure trips, not at
    // phase start (listing it here fired it twice, the first time 40 min early).
    endTrigger: { type: 'pressure_pa', value: p.crushPressurePa ?? 2_200_000 }, // ~22 bar
    cdA: p.terminalCdA ?? 3,
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
    // The capsule comes off the deorbit burn falling tip-first, then pitches
    // around to heat-shield-forward before the plasma builds — a distinct beat.
    events: ['entry_flip'],
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

/** Starship's return to Earth (Flight 5, 0.9.11 F3): a belly-first lifting entry bleeds speed to
 *  a subsonic fall, then the landing flip — the ship swings from belly-down to tail-down as the
 *  Raptors light — and the landing burn to the water. No parachute, no heat-shield jettison. */
const EARTH_STARSHIP_RETURN: ArchetypeBuilder = (p) => [
  {
    kind: 'ballistic_entry',
    endTrigger: { type: 'altitude_m', value: p.terminalHandoffAltM ?? 1000 },
  },
  {
    kind: 'powered_retro',
    endTrigger: { type: 'ground', value: 0 },
    ispS: p.ispS ?? 330,
    terminalVelocityMs: p.terminalVelocityMs ?? 3,
    descentRateGain: p.descentRateGain ?? 0.12,
    maxThrustN: p.brakingMaxThrustN,
    events: ['landing_flip', 'retro_ignition'],
  },
];

const ARCHETYPES: Record<ArchetypeName, ArchetypeBuilder> = {
  LUNAR_POWERED,
  LUNA_DIRECT_IMPACT,
  MARS_PARACHUTE_RETRO,
  MARS_AIRBAG,
  MARS_CHUTE_AIRBAG,
  MARS_SKYCRANE,
  MARS_PROPULSIVE,
  VENUS_AEROSHELL,
  ASTEROID_TOUCH_AND_GO,
  COMET_HARPOON,
  TITAN_PARACHUTE,
  JUPITER_PROBE,
  EARTH_CAPSULE_REENTRY,
  EARTH_STARSHIP_RETURN,
};

/** The default survivable-touchdown limit (m·s⁻¹) per archetype. */
const ARCHETYPE_SURVIVABLE: Record<ArchetypeName, number> = {
  LUNAR_POWERED: 3,
  LUNA_DIRECT_IMPACT: 30,
  MARS_PARACHUTE_RETRO: 3,
  MARS_AIRBAG: 25,
  MARS_CHUTE_AIRBAG: 25, // airbags like Pathfinder's, no retro to slow the impact
  MARS_SKYCRANE: 3,
  MARS_PROPULSIVE: 3,
  VENUS_AEROSHELL: 15,
  ASTEROID_TOUCH_AND_GO: 1, // feather contact; not a landing
  COMET_HARPOON: 5, // Philae touched at ~1 m/s and survived the bounces
  TITAN_PARACHUTE: 8, // Huygens hit ~4.5 m/s
  JUPITER_PROBE: 60, // no touchdown — high limit so the crush isn't flagged a crash
  EARTH_STARSHIP_RETURN: 5, // a controlled landing burn to the water (Flight 5)
  EARTH_CAPSULE_REENTRY: 12, // splash/ground at ~8–11 m/s (Aurora 7's sourced timeline: 10.4); a fouled main (Soyuz 1, ~40) busts this → crash
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
  /** Lift-to-drag ratio (#419). 0/absent = ballistic (Mercury/Vostok). A lifting
   *  capsule (Apollo CM ~0.3, Gemini/Soyuz/Dragon ~0.2) flies lift-up: caps peak-g
   *  below the ballistic value. MODEL ESTIMATE — declare in `estimatedFields`. */
  liftToDragRatio?: number;
  /** Guided-entry target downrange (km) from the entry interface (#29 · ADR-088). With a positive
   *  L/D, the entry computer solves the bank that lands here. MODEL ESTIMATE — declare in
   *  `estimatedFields`. Absent = full lift-up (open loop). */
  targetDownrangeKm?: number;
  /** Names of fields whose values are MODEL-AUTHORED ESTIMATES, not taken from the `provenance`
   *  sources (ADR-088 Phase 0b). The provenance block backs sourced fields (mass, Cd·A); it does
   *  NOT back these. A test enforces that any Earth profile setting liftToDragRatio/targetDownrangeKm
   *  declares them here, so an invented number can never silently wear real mission-report provenance. */
  estimatedFields?: string[];
  /** Integrate γ on a ballistic super-circular entry flown at its sourced angle (descent-physics). */
  dynamicGamma?: boolean;
  retroPropellantKg?: number;
  survivableTouchdownMs?: number;
  /** The published record stops at this altitude (m): the descent ends there (see DescentProfile). */
  recordEndsAltM?: number;
  /** Beats placed by altitude or delay (DescentBeatSpec); each replaces a phase-start beat of its type. */
  beats?: DescentBeatSpec[];
  /** Bounces, roll and ground beats after the first contact (AfterTouchdown). */
  afterTouchdown?: AfterTouchdown;
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
    ...(raw.estimatedFields?.includes('landingSite') ? { landingSiteEstimated: true } : {}),
    entryState: raw.entryState,
    entryMassKg: raw.entryMassKg,
    entryCdA: raw.entryCdA,
    liftToDragRatio: raw.liftToDragRatio,
    targetDownrangeKm: raw.targetDownrangeKm,
    dynamicGamma: raw.dynamicGamma,
    retroPropellantKg: raw.retroPropellantKg,
    phases: build(raw.params ?? {}),
    survivableTouchdownMs: raw.survivableTouchdownMs ?? ARCHETYPE_SURVIVABLE[raw.archetype],
    ...(raw.recordEndsAltM != null ? { recordEndsAltM: raw.recordEndsAltM } : {}),
    ...(raw.beats ? { beats: raw.beats } : {}),
    ...(raw.afterTouchdown ? { afterTouchdown: raw.afterTouchdown } : {}),
    source_tier: raw.source_tier,
    provenance: raw.provenance,
  };
}

// ─── Mission gate + loader ──────────────────────────────────────────

/** Every mission that ships a descent profile (Moon, Mars, Venus and other landers, and the Earth-return capsules). */
export const DESCENT_MISSION_IDS = new Set<string>([
  // Moon (22)
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
  'chandrayaan2',
  'chandrayaan3',
  'slim',
  'beresheet',
  'artemis4',
  'artemis5',
  'blue-moon-mk1',
  // Mars (14)
  'viking1',
  'mars3',
  'mars-pathfinder',
  'spirit',
  'opportunity',
  'phoenix',
  'curiosity',
  'insight',
  'schiaparelli',
  'mars-express', // Beagle 2, released from Mars Express (siteId beagle2)
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
  'apollo8', // first crewed lunar-return entry — 10.8 km/s SKIP entry (Apollo-4 double pulse)
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
  'starship-flight-5', // Starship's belly-first return, landing flip and burn (0.9.11 F3)
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
  return loadDescentProfileFile(missionId, fetchFn, baseUrl);
}

/**
 * Fetch + expand one descent-profile file by its file id: a mission's second descent that is not
 * the mission's own landing (Apollo 11's Earth splashdown, `apollo11-splashdown`, named by its
 * return profile). Same fail-closed rules as `loadDescentProfile`, minus the mission gate.
 */
export async function loadDescentProfileFile(
  fileId: string | undefined | null,
  fetchFn: typeof fetch = fetch,
  baseUrl = '',
): Promise<DescentProfile | null> {
  if (fileId == null || !/^[a-z0-9][a-z0-9-]*$/.test(fileId)) return null;
  try {
    const res = await fetchFn(`${baseUrl}/data/descent-profiles/${fileId}.json`);
    if (!res.ok) return null;
    const data: unknown = await res.json();
    if (!isValidRaw(data)) return null;
    return expandDescentProfile(data);
  } catch {
    return null;
  }
}
