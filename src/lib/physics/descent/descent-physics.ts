/**
 * Powered-descent engine — the headless physics core for the /fly Entry,
 * Descent & Landing act (RFC-034 §9). The inverse of ascent-physics.ts:
 * where ascent integrates a stack from the pad to orbit, descent integrates
 * a lander from the entry interface down to touchdown. Pure functions, no
 * Three.js, no DOM — the same module drives the animated DescentScene AND
 * the headless profile validation harness.
 *
 * Model: a planar 2-DOF entry integration in SI units (RFC-036 / #419). The
 * state is speed `v`, altitude `h`, and — for sub-circular orbital-decay reentry
 * — the flight-path angle γ (below the local horizontal), integrated as a second
 * degree of freedom: v·dγ/dt = g·cosγ − L/m − (v²/(R+h))·cosγ. At orbital speed
 * the curvature term v²/(R+h) ≈ g so the trajectory skims shallow (long,
 * realistic duration); as drag sheds v, gravity wins and γ steepens into the
 * deceleration spike — so honest *duration* and *peak-g* emerge together.
 * SUPER-circular interplanetary arrivals (v > v_circ: Mars/Venus/Titan/Jupiter)
 * keep the 1-DOF fixed-γ model (a lift-free 2-DOF would skip out); guided
 * (powered_retro/skycrane) + explicit-γ + terminal phases also hold γ fixed.
 * Each EDL phase (ballistic entry → parachute → heat-shield sep → powered-retro /
 * skycrane / airbag → touchdown) swaps in its own drag area (with a chute-
 * inflation ramp) + retro thrust and ends on an altitude / velocity / duration /
 * ground trigger. It produces HONEST altitude, velocity, deceleration-g, Mach and
 * dynamic-pressure readouts (what the descent HUD teaches) without a full 3-DOF
 * trajectory the scene never renders.
 *
 * Units: SI internally (m, s, kg, N, Pa). Summaries expose km where natural
 * but keep velocities in m·s⁻¹ (EDL spans 6 km·s⁻¹ entry → <1 m·s⁻¹ touchdown).
 */

import {
  ATM_SCALE_HEIGHT_M,
  G0,
  MU_BODY_M3_S2,
  R_BODY_M,
  SOUND_SPEED_MS,
  SURFACE_DENSITY_KGM3,
} from './descent-physics-constants';
// Powered-descent throttle law now lives in the kernel SYSTEMS layer (ADR-087).
import { poweredDescentThrottle } from '../systems/powered-descent';

const DEG2RAD = Math.PI / 180;

// ─── Types ──────────────────────────────────────────────────────────

/**
 * A destination body the descent engine can land on (or, for Jupiter, descend
 * into). Phase 1: Moon/Mars/Venus. Phase 2 (RFC-034 §12) adds Titan (thick cold
 * N₂), Jupiter (atmosphere, no solid surface), comet 67P and the sampled
 * asteroids (micro-g, airless), each keyed to its real μ/R so the felt-g and
 * timeline stay honest across ten-orders-of-magnitude gravity. Tier-1 Earth-orbit
 * re-entry (RFC-034 §13) adds Earth — the one *return* body, where a capsule
 * deorbits from LEO and rides a heat-shield + parachutes down to splashdown/ground.
 */
export type DescentBody =
  | 'moon'
  | 'mars'
  | 'venus'
  | 'titan'
  | 'earth'
  | 'jupiter'
  | 'comet_67p'
  | 'itokawa'
  | 'ryugu'
  | 'bennu'
  | 'eros';

/**
 * The physical behaviour of one EDL phase. Determines defaults for the
 * flight-path angle and the terminal-velocity clamp; the drag area + retro
 * thrust come from the phase fields.
 */
export type EDLPhaseKind =
  | 'ballistic_entry' // hypersonic free-fall into the atmosphere (heat-shield drag)
  | 'parachute' // decelerating on the chute
  | 'powered_retro' // retro-rocket braking (Apollo/Viking/Phoenix/InSight/lunar)
  | 'skycrane' // hover + tether-lower (Curiosity/Perseverance)
  | 'airbag_bounce' // airbag impact + settle (Pathfinder/MER)
  | 'aeroshell_descent' // dense-atmosphere passive braking (Venera/Vega/Huygens/Galileo)
  | 'direct_impact' // no soft-landing system — hard arrival (Luna 9-class)
  | 'touch_and_go_contact' // micro-g sample contact then immediate departure (Hayabusa/OSIRIS-REx)
  | 'coast'; // unpowered coast (e.g. terminal free-fall, or comet drift between bounces)

/** Discrete descent beats the HUD + scene key off. */
export type DescentEventType =
  | 'entry'
  | 'entry_flip' // capsule rotates from tip-first to heat-shield-forward (Earth crewed)
  | 'peak_heat'
  | 'peak_decel'
  | 'parachute_deploy'
  | 'heatshield_sep'
  | 'backshell_sep'
  | 'skycrane_lower'
  | 'skycrane_flyaway'
  | 'retro_ignition'
  | 'airbag_deploy'
  | 'harpoon_fire' // comet anchoring attempt (Philae)
  | 'first_contact' // first surface touch (comet bounce / asteroid TAG)
  | 'bounce' // rebound off a low-g surface (Philae, MER airbags)
  | 'sample_collected' // touch-and-go sample horn fired, ascent begins
  | 'parachute_jettison' // drogue/main chute released (Huygens two-chute, Galileo)
  | 'probe_signal_lost' // atmospheric probe crushed / comms end (Galileo, no surface)
  | 'skip_out' // super-circular lifting entry lofts back above the atmosphere (Apollo-4 skip)
  | 'second_entry' // the lofted capsule falls back into the atmosphere for the second pulse
  | 'touchdown';

/**
 * When a phase ends. `ground` fires at h ≤ 0 (touchdown). `pressure_pa` fires
 * when the ambient pressure exceeds `value` — the terminus for a body with no
 * solid surface (Jupiter probe crush), where `ground` never trips.
 */
export interface EDLEndTrigger {
  type: 'altitude_m' | 'velocity_ms' | 'duration_s' | 'ground' | 'pressure_pa';
  value: number;
}

/** One phase of an EDL sequence. Masses SI, thrust in kN, drag as Cd·A (m²). */
export interface EDLPhase {
  kind: EDLPhaseKind;
  endTrigger: EDLEndTrigger;
  /** Beats emitted at the START of this phase, in order (e.g. parachute_deploy). */
  events?: DescentEventType[];
  /** Specific impulse (s) for the retro propellant burn on guided powered
   *  phases — the throttle thrust is back-solved from the descent-rate
   *  schedule, and this converts it to a mass-flow for the fuel gauge. */
  ispS?: number;
  /** Effective drag area Cd·A (m²) — parachute/aeroshell override the entry value. */
  cdA?: number;
  /** Flight-path angle below horizontal (deg). Default: entry keeps the profile
   *  entry angle; every other kind goes near-vertical (90°). */
  flightPathAngleDeg?: number;
  /** Controlled terminal speed (m·s⁻¹) for guided powered/skycrane descent —
   *  the touchdown speed. Default 0.75. Ignored by aerodynamic phases. */
  terminalVelocityMs?: number;
  /** Descent-rate guidance gain (s⁻¹) for powered_retro/skycrane: the throttle
   *  holds descent-rate ≈ gain·altitude (bounded by the incoming speed and the
   *  terminal floor), so the vehicle slows smoothly and touches down soft.
   *  Default 0.06. Ignored by aerodynamic phases. */
  descentRateGain?: number;
  /** Max braking the retro can command (Earth-g) on a guided phase — rate-limits
   *  the descent-rate schedule so a fast-incoming direct-powered descent (e.g. a
   *  lunar high-gate) ramps down instead of snapping v in one step (which would
   *  read as a spurious 100-g spike). Default 5. Ignored by aerodynamic phases. */
  maxBrakeG?: number;
  /** Mass dropped at the START of this phase (kg) — heat-shield / backshell /
   *  chute / spent descent-stage. Lowers the flying mass (drag decel rises,
   *  propellant lasts longer) and keeps the fuel gauge honest, mirroring
   *  ascent staging. */
  jettisonKg?: number;
}

/** A mission's descent profile. See RFC-034 §9 for the shipped JSON schema. */
export interface DescentProfile {
  /** Landing-site id — the stable key (matches moon-sites/mars-sites `id`). */
  siteId: string;
  /** Mission id this profile belongs to. */
  missionId: string;
  body: DescentBody;
  /** Landing coordinates (deg) — from moon-sites.json / mars-sites.json. */
  landingSite: { lat: number; lon: number };
  /** Entry-interface state: top of the simulation. */
  entryState: {
    altitudeM: number;
    velocityMs: number;
    /** Angle below the local horizontal (deg, positive). Shallow = long entry. */
    flightPathAngleDeg: number;
  };
  /** Vehicle mass at the entry interface (kg). */
  entryMassKg: number;
  /** Ballistic entry drag area Cd·A (m²) — the heat-shield. */
  entryCdA: number;
  /**
   * Lift-to-drag ratio for the 2-DOF flight-path-angle integration (RFC-036 / #419).
   * 0 = purely ballistic (a non-lifting capsule flying zero angle of attack —
   * Mercury / Vostok / Voskhod / ballistic-mode Soyuz). A small positive L/D
   * (Apollo CM ~0.3, Gemini/Soyuz lifting ~0.2) flattens the corridor + lowers
   * peak-g. Default 0. Only the free-aerodynamic phases (entry / chute /
   * aeroshell) integrate γ; guided + explicit-γ phases ignore it.
   */
  liftToDragRatio?: number;
  /**
   * Guided-entry target downrange (km) from the entry interface to touchdown. When set (with a
   * positive L/D), `integrateGuidedDescent` SOLVES the constant bank angle that lands the capsule
   * here — the real Apollo/Orion/Soyuz range-control job, the same range-target → commanded-bank
   * PRINCIPLE the Lab entry-steering lesson teaches (the Lab uses its own `solveEntryBankForRange`;
   * this app path is a separate solver — reconcile per ADR-088 Phase 0d). Absent = full lift-up.
   */
  targetDownrangeKm?: number;
  /** Descent-stage retro propellant (kg) for the fuel gauge. Default ∞ (never gates). */
  retroPropellantKg?: number;
  /** Ordered EDL phases; the last should end on `ground`. */
  phases: EDLPhase[];
  /** Max touchdown speed the lander survives (m·s⁻¹). Default 3; airbags ~25;
   *  crash reconstructions keep it low so the impact reads as a failure. */
  survivableTouchdownMs?: number;
  source_tier: 'flagship' | 'generic';
  provenance?: { l: string; u: string }[];
}

/** A sampled instant of the descent trajectory. */
export interface DescentState {
  /** Seconds since the entry interface. */
  t: number;
  altKm: number;
  altM: number;
  /** Speed magnitude (m·s⁻¹). */
  velocityMs: number;
  /** Vertical descent rate (m·s⁻¹, positive downward) = v·sinγ. */
  velDownMs: number;
  /** Felt deceleration (Earth-g) from drag + thrust — free-fall reads 0. */
  decelG: number;
  massKg: number;
  /** Retro thrust (N); 0 in aerodynamic/coast phases. For the forces lens. */
  thrustN: number;
  /** Aerodynamic drag (N). For the forces lens. */
  dragN: number;
  /** Active EDL phase index. */
  phaseIndex: number;
  phaseKind: EDLPhaseKind;
  /** Mach number (v / a); 0 in vacuum (Moon). */
  machNumber: number;
  /** Dynamic pressure q = ½ρv² (Pa). */
  dynamicPressurePa: number;
  /** Stagnation aero-heating proxy ∝ √ρ·v³ (Sutton-Graves). PROPORTIONAL,
   *  arbitrary units — relative HUD gauge only, never an absolute flux. */
  aeroHeatFlux: number;
  /** Retro propellant remaining (kg). */
  propRemainingKg: number;
  /** Flight-path angle below horizontal (deg) — for the scene's attitude. */
  flightPathAngleDeg: number;
  /** Ground distance flown from the entry interface (km) — the entry ground track. */
  downrangeKm: number;
}

/** A discrete descent beat. */
export interface DescentEvent {
  type: DescentEventType;
  t: number;
  altKm: number;
  velocityMs: number;
  note?: string;
}

/** The result of integrating a descent. */
export interface DescentSummary {
  body: DescentBody;
  /** Trajectory sampled at `sampleDtS` (default 0.5 s). */
  states: DescentState[];
  /** Beats in chronological order. */
  events: DescentEvent[];
  totalDurationS: number;
  /** Peak felt deceleration. */
  peakDecel: { t: number; g: number; altKm: number };
  /** Peak aero-heating proxy. */
  peakHeat: { t: number; altKm: number; flux: number };
  /** Speed at touchdown (m·s⁻¹). */
  touchdownVelocityMs: number;
  /** True when touchdown speed ≤ the lander's survivable limit. */
  touchdownSuccess: boolean;
  /** Ground distance flown from the entry interface to touchdown (km). */
  landingDownrangeKm: number;
  /** For a guided entry (targetDownrangeKm set): the bank the computer solved, and whether the
   *  target sat inside the reachable footprint. Undefined for an unguided (full-lift-up) descent. */
  guidance?: { entryBankCos: number; targetReachable: boolean };
}

// ─── Per-body atmosphere + gravity ──────────────────────────────────

/** Air density (kg·m⁻³) at altitude for a body — single-exponential; Moon = 0.
 *  Altitude is NOT clamped at the datum: a surface-bound descent never goes
 *  below h=0 (the ground break stops it), but an atmospheric probe (Jupiter)
 *  sinks below the 1-bar datum into ever-denser gas, so the drag must rise. */
export function bodyAirDensity(altM: number, body: DescentBody): number {
  const rho0 = SURFACE_DENSITY_KGM3[body];
  if (rho0 <= 0) return 0;
  return rho0 * Math.exp(-altM / ATM_SCALE_HEIGHT_M[body]);
}

/** Local gravitational acceleration (m·s⁻²): g = μ / (R + h)². */
export function bodyGravity(altM: number, body: DescentBody): number {
  const r = R_BODY_M[body] + Math.max(0, altM);
  return MU_BODY_M3_S2[body] / (r * r);
}

/**
 * Ambient atmospheric pressure (Pa) at altitude — isothermal hydrostatic
 * P(h) = ρ₀·g·H·exp(−h/H). Unlike `bodyAirDensity`, altitude is NOT clamped at
 * the datum, so pressure keeps rising as an atmospheric probe sinks below it
 * (Jupiter has no solid surface — the `pressure_pa` end-trigger fires here).
 * Airless bodies return 0.
 */
export function bodyAmbientPressurePa(altM: number, body: DescentBody): number {
  const rho0 = SURFACE_DENSITY_KGM3[body];
  if (rho0 <= 0) return 0;
  const gSurf = MU_BODY_M3_S2[body] / (R_BODY_M[body] * R_BODY_M[body]);
  const H = ATM_SCALE_HEIGHT_M[body];
  return rho0 * gSurf * H * Math.exp(-altM / H);
}

/** Dynamic pressure q = ½ρv² (Pa). */
export function dynamicPressure(densityKgM3: number, speedMs: number): number {
  return 0.5 * densityKgM3 * speedMs * speedMs;
}

/** Mach number at a body; 0 in vacuum (no speed of sound). */
export function machNumber(speedMs: number, body: DescentBody): number {
  const a = SOUND_SPEED_MS[body];
  return a > 0 ? speedMs / a : 0;
}

// ─── Integrator ─────────────────────────────────────────────────────

export interface DescentOptions {
  /** Integration step (s). Default 0.02 — small enough for Venus's fierce drag. */
  dtS?: number;
  /** Trajectory sample interval (s). Default 0.5. */
  sampleDtS?: number;
  /** Hard stop (s) so a mis-authored profile can't loop forever. Default 12000 —
   *  Titan's parachute descent legitimately runs ~3 h; every other body reaches
   *  the ground (or the Jupiter crush) long before the cap. */
  maxTS?: number;
  /** Guided entry (#29 · ADR-088): constant vertical-lift fraction cos(bank) applied to the entry
   *  γ integration. Internal — set by the range-control solve when a profile carries a
   *  `targetDownrangeKm`. Default 1 (full lift-up, the unguided behaviour). */
  entryBankCos?: number;
}

/** Default flight-path angle (deg below horizontal) for a phase. */
function gammaDegFor(phase: EDLPhase, profile: DescentProfile): number {
  if (phase.flightPathAngleDeg != null) return phase.flightPathAngleDeg;
  if (phase.kind === 'ballistic_entry') return Math.abs(profile.entryState.flightPathAngleDeg);
  return 90; // terminal phases descend near-vertically
}

/**
 * Free-aerodynamic-flight phases whose flight-path angle γ is INTEGRATED as a
 * second degree of freedom (2-DOF, RFC-036 / #419) rather than held at a fixed
 * per-phase constant. Only these carry the entry-corridor dynamics that make
 * realistic *duration* and *peak-g* emerge together: at orbital speed the
 * curvature term v²/(R+h) nearly cancels gravity so the trajectory skims
 * shallow (long duration); as drag sheds v, gravity wins and γ steepens into
 * the deceleration spike. Guided phases (powered_retro / skycrane) track a
 * descent-rate schedule, and any phase with an explicit `flightPathAngleDeg`
 * is a hard author constraint — both keep the fixed-γ behaviour.
 */
const GAMMA_DYNAMICAL: ReadonlySet<EDLPhaseKind> = new Set([
  'ballistic_entry',
  'parachute',
  'aeroshell_descent',
  'coast',
]);

/** Whether a phase integrates γ (2-DOF) vs. holds it fixed. */
function gammaIsDynamical(phase: EDLPhase): boolean {
  return phase.flightPathAngleDeg == null && GAMMA_DYNAMICAL.has(phase.kind);
}

/** A powered phase is throttle-guided (descent-rate schedule); the rest are
 *  pure force integration (drag + gravity). */
function isGuidedPhase(kind: EDLPhaseKind): boolean {
  return kind === 'powered_retro' || kind === 'skycrane';
}

function triggerMet(
  trigger: EDLEndTrigger,
  altM: number,
  velMs: number,
  tInPhase: number,
  ambientPa: number,
): boolean {
  switch (trigger.type) {
    case 'altitude_m':
      return altM <= trigger.value;
    case 'velocity_ms':
      return velMs <= trigger.value;
    case 'duration_s':
      return tInPhase >= trigger.value;
    case 'ground':
      return altM <= 0;
    case 'pressure_pa':
      return ambientPa >= trigger.value;
  }
}

/**
 * Integrate an EDL profile from the entry interface to touchdown (or
 * `maxTS`). Aerodynamic phases (entry / parachute / aeroshell / coast /
 * airbag / direct-impact) are explicit-Euler force integration — per-body
 * exponential drag + the gravity component along a per-phase flight-path
 * angle. Powered phases (powered_retro / skycrane) are throttle-GUIDED: the
 * descent rate tracks `gain·altitude` down to a soft terminal velocity, and
 * the retro thrust needed to fly that schedule (cancel weight + brake) is
 * back-solved for the fuel gauge and the felt-g readout. Pure — safe from a
 * Svelte scene, a worker, or a vitest test.
 */
export function integrateDescent(
  profile: DescentProfile,
  opts: DescentOptions = {},
): DescentSummary {
  // Guided range-control entry (#29 · ADR-088): when a profile carries a target downrange, the
  // entry computer solves the constant bank angle that lands there before flying the trajectory.
  if (profile.targetDownrangeKm != null && opts.entryBankCos === undefined) {
    return integrateGuidedDescent(profile, opts);
  }
  const entryBankCos = opts.entryBankCos ?? 1; // full lift-up unless the range solve set a bank
  const dt = opts.dtS ?? 0.02;
  const sampleDt = opts.sampleDtS ?? 0.5;
  const maxT = opts.maxTS ?? 12000;
  const body = profile.body;
  const survivable = profile.survivableTouchdownMs ?? 3;
  const propTotal = profile.retroPropellantKg ?? Infinity;

  let h = profile.entryState.altitudeM;
  let v = profile.entryState.velocityMs;
  let mass = profile.entryMassKg - (profile.phases[0]?.jettisonKg ?? 0);
  let downrange = 0; // ground distance flown from the entry interface (m)
  let phaseIndex = 0;
  let phaseStartT = 0;
  let propUsed = 0;
  let t = 0;

  // Flight-path angle γ (rad below horizontal), the 2-DOF state (#419). Seeded
  // from the entry angle (== gammaDegFor for a ballistic-entry first phase);
  // integrated while in a GAMMA_DYNAMICAL phase, else pinned to gammaDegFor each
  // step. `liftBonus` = L/D applied as a fraction of drag in the γ EOM.
  let gammaRad = gammaDegFor(profile.phases[0], profile) * DEG2RAD;
  const liftBonus = profile.liftToDragRatio ?? 0;
  const hasLift = liftBonus > 0;
  const bodyRadiusM = R_BODY_M[body];
  const muBody = MU_BODY_M3_S2[body];
  // 2-DOF γ integration (#419) is enabled for SUB-CIRCULAR (orbital-decay) reentry — the
  // Earth-capsule case, where the shallow-skim corridor produces the honest duration + peak-g —
  // AND for LIFTING super-circular entries (#29 · ADR-089: lunar-return 11 km/s, Mars guided
  // lifting), where the lift vector produces the real loft/skip. Non-lifting super-circular arrivals
  // (ballistic Mars/Venus/Titan/Jupiter probes) keep the validated fixed-γ model — a lift-free 2-DOF
  // would skim out unrealistically.
  const vCircEntry = Math.sqrt(
    bodyGravity(profile.entryState.altitudeM, body) * (bodyRadiusM + profile.entryState.altitudeM),
  );
  const subCircular = profile.entryState.velocityMs <= vCircEntry * 1.02;
  // Loft/skip bookkeeping (ADR-089). A lifting entry may climb back above the atmosphere (γ<0);
  // above SKIP_ALT_M the air is negligible and explicit Euler drifts specific energy, so we HOLD
  // the conserved orbital energy on the exo-atmospheric coast. `lofted` gates the skip beats.
  const SKIP_ALT_M = 105_000;
  let lofted = false;
  let coastEnergy: number | null = null; // specific orbital energy held during the vacuum coast
  // Drag-area a phase inflates FROM (the previous phase's Cd·A). A chute/aeroshell
  // deploy is not instantaneous — it inflates over ~INFLATION_S, so the effective
  // Cd·A ramps up smoothly instead of applying full area at deploy velocity (which
  // explicit Euler turns into a spurious multi-g opening spike). Only increases
  // ramp; a jettison (area drop) is instant.
  let deployFromCdA = profile.phases[0]?.cdA ?? profile.entryCdA;
  // Base chute-inflation time. Real reefed mains disreef over several seconds;
  // bigger area jumps take longer to inflate, so the per-deploy time scales
  // (mildly) with the area ratio — this spreads the opening shock to the
  // physical few-g range instead of a one-step spike. Capped so a huge ratio
  // can't stall the descent.
  const INFLATION_BASE_S = 3.5;

  // Force locals for the current instant — updated each step, read by makeState.
  let curThrustN = 0;
  let curDragN = 0;
  let curDecelG = 0;

  const states: DescentState[] = [];
  const events: DescentEvent[] = [];
  let peakDecel = { t: 0, g: 0, altKm: h / 1000 };
  let peakHeat = { t: 0, altKm: h / 1000, flux: 0 };

  const makeState = (): DescentState => {
    const phase = profile.phases[phaseIndex];
    const sinG = Math.sin(gammaRad); // the live 2-DOF flight-path angle
    const rho = bodyAirDensity(h, body);
    return {
      t,
      altKm: h / 1000,
      altM: h,
      velocityMs: v,
      velDownMs: v * sinG,
      decelG: curDecelG,
      massKg: mass,
      thrustN: curThrustN,
      dragN: curDragN,
      phaseIndex,
      phaseKind: phase.kind,
      machNumber: machNumber(v, body),
      dynamicPressurePa: dynamicPressure(rho, v),
      aeroHeatFlux: Math.sqrt(rho) * v * v * v,
      propRemainingKg: Number.isFinite(propTotal) ? Math.max(0, propTotal - propUsed) : Infinity,
      flightPathAngleDeg: gammaRad / DEG2RAD,
      downrangeKm: downrange / 1000,
    };
  };

  const pushEvent = (type: DescentEventType, note?: string): void => {
    events.push({ type, t, altKm: h / 1000, velocityMs: v, note });
  };
  const emitPhaseStartEvents = (idx: number): void => {
    for (const e of profile.phases[idx].events ?? []) pushEvent(e);
  };

  pushEvent('entry');
  emitPhaseStartEvents(0);
  states.push(makeState());
  let nextSampleT = sampleDt;

  while (t < maxT) {
    const phase = profile.phases[phaseIndex];
    // 2-DOF flight-path angle (#419): a free-aerodynamic phase evolves γ (below);
    // every other phase pins it to the profile/default constant. sinG/cosG are
    // read from the live γ at the start of the step (semi-implicit Euler with h).
    const dynamicalGamma = (subCircular || hasLift) && gammaIsDynamical(phase);
    if (!dynamicalGamma) gammaRad = gammaDegFor(phase, profile) * DEG2RAD;
    const sinG = Math.sin(gammaRad);
    const cosG = Math.cos(gammaRad);
    const rho = bodyAirDensity(h, body);
    const g = bodyGravity(h, body);
    // Cd·A with inflation ramp: a deploy grows the drag area from the prior
    // phase's over INFLATION_S; a jettison (smaller area) applies instantly.
    const targetCdA = phase.cdA ?? profile.entryCdA;
    let cdA = targetCdA;
    if (targetCdA > deployFromCdA) {
      const ratio = targetCdA / Math.max(1e-6, deployFromCdA);
      const inflationS = Math.min(8, INFLATION_BASE_S * Math.sqrt(Math.max(1, ratio)) * 0.25);
      const inflateFrac = Math.min(1, (t - phaseStartT) / inflationS);
      cdA = deployFromCdA + (targetCdA - deployFromCdA) * inflateFrac;
    }
    const drag = 0.5 * rho * v * v * cdA;

    if (isGuidedPhase(phase.kind)) {
      // Throttle-guided controlled descent — the kernel SYSTEMS powered-descent controller
      // (ADR-087) runs the descent-rate schedule + rate limit; the integrator just applies its
      // command. Same controller the /fly descent sim and the Lab powered-descent lesson use.
      const vPrev = v;
      const cmd = poweredDescentThrottle({
        altitudeM: h,
        speedMs: v,
        gravityMs2: g,
        maxBrakeMs2: (phase.maxBrakeG ?? 5) * G0,
        descentRateGain: phase.descentRateGain ?? 0.06,
        terminalVelocityMs: phase.terminalVelocityMs ?? 0.75,
        dtS: dt,
      });
      v = cmd.nextSpeedMs;
      const thrustAccel = cmd.thrustAccelMs2; // brake + gravity (retro also holds the vehicle up)
      const thrustN = propUsed < propTotal ? mass * thrustAccel : 0; // engine out if tanks dry
      if (thrustN <= 0) v = vPrev; // no propellant → guidance can't hold; fall
      curThrustN = thrustN;
      curDragN = 0;
      curDecelG = thrustN / (mass * G0);
      if (thrustN > 0 && phase.ispS) propUsed += (thrustN / (phase.ispS * G0)) * dt;
    } else {
      // Aerodynamic / ballistic: gravity component adds speed, drag sheds it.
      const dvdt = g * sinG - drag / Math.max(1, mass);
      let vNext = v + dvdt * dt;
      if (vNext < 0) vNext = 0;
      // A body decelerating under drag asymptotes to its terminal velocity and
      // never overshoots it. Explicit Euler with a stiff chute WOULD overshoot in
      // one step — a spurious multi-g spike at deploy (v snapping 133→25 m/s).
      // Clamp to terminal velocity (drag balances the along-track weight); the
      // felt-g then reads the physical sustained value, not the numerical artifact.
      if (drag > 0 && v > 0) {
        const sinGabs = Math.max(Math.abs(sinG), 1e-3);
        const vTerm = Math.sqrt((2 * Math.max(1, mass) * g * sinGabs) / (rho * cdA));
        if (v > vTerm && vNext < vTerm) vNext = vTerm;
      }
      // Report drag + felt-g at the resolved velocity (post-clamp) so a deploy
      // step reads the sustained load, not the pre-clamp overshoot.
      const effDrag = 0.5 * rho * vNext * vNext * cdA;
      v = vNext;
      curThrustN = 0;
      curDragN = effDrag;
      curDecelG = effDrag / (mass * G0);

      // 2-DOF: integrate the flight-path angle (#419). v·dγ/dt = g·cosγ − L/m −
      // (v²/(R+h))·cosγ — gravity steepens the dive, lift + planetary curvature
      // flatten it. At orbital speed v²/(R+h) ≈ g so the trajectory skims shallow
      // (long duration); as drag sheds v the curvature term collapses, gravity
      // wins, and γ steepens into the deceleration spike — realistic duration AND
      // peak-g from one model. Guided/explicit/terminal phases skip this (γ pinned).
      if (dynamicalGamma) {
        // Lift flown vertical-up caps the peak-g (Apollo's "heads-down, lift-up" ~7 g attitude).
        // Its magnitude = (L/D)·D, scaled by the commanded bank: cos(bank)=+1 full lift-up (max
        // range, min g), −1 lift-down (dig in, short + high g). `entryBankCos` is 1 for an unguided
        // capsule; a guided entry (targetDownrangeKm) sets it via the range-control solve so the
        // computer steers to its landing point — the range-control job the Lab teaches.
        // Lift only exists on the LIFTING BODY (the capsule/aeroshell at angle of attack) — a
        // deployed PARACHUTE is a symmetric canopy with ~zero L/D, so zero its lift (M1 fix): under
        // the chute γ still integrates as a ballistic falling body, just with no lift term.
        const isLiftingBody =
          phase.kind === 'ballistic_entry' || phase.kind === 'aeroshell_descent';
        const lift = isLiftingBody ? liftBonus * drag * entryBankCos : 0; // L = (L/D)·D, bank-scaled
        const dGammaDt =
          (g * cosG - lift / Math.max(1, mass) - (v * v * cosG) / (bodyRadiusM + h)) /
          Math.max(v, 1);
        gammaRad += dGammaDt * dt;
        // A LIFTING entry may loft (γ<0 = climbing back up) — that IS the super-circular skip
        // (ADR-089), so don't floor it. A non-lifting capsule can't fly upward: floor γ at ~0.1°.
        if (!hasLift && gammaRad < 0.0017) gammaRad = 0.0017;
        else if (gammaRad > Math.PI / 2) gammaRad = Math.PI / 2; // cap at vertical
      }
    }

    if (curDecelG > peakDecel.g) peakDecel = { t, g: curDecelG, altKm: h / 1000 };
    const flux = Math.sqrt(rho) * v * v * v;
    if (flux > peakHeat.flux) peakHeat = { t, altKm: h / 1000, flux };

    h += -v * sinG * dt;
    downrange += v * cosG * dt; // ground track advances with the horizontal velocity component
    t += dt;

    // ── Loft/skip handling (ADR-089), lifting entries only ──────────────────────────────────
    // A super-circular lifting entry can climb back above the atmosphere (the Apollo-4 skip). Above
    // SKIP_ALT_M the air is negligible: we HOLD the conserved specific orbital energy so explicit
    // Euler doesn't drift the coast, and emit skip_out / second_entry beats at the crossing.
    if (hasLift) {
      if (h > SKIP_ALT_M) {
        if (!lofted) {
          lofted = true;
          pushEvent('skip_out');
          coastEnergy = (v * v) / 2 - muBody / (bodyRadiusM + h); // enter the vacuum coast
        } else if (coastEnergy !== null) {
          // Conserve energy: v = √(2·(E + μ/r)). Gravity is conservative, so the coast keeps E.
          const vSq = 2 * (coastEnergy + muBody / (bodyRadiusM + h));
          if (vSq > 0) v = Math.sqrt(vSq);
        }
      } else if (lofted && coastEnergy !== null) {
        // Fell back into the atmosphere — the second entry pulse begins; drag resumes.
        pushEvent('second_entry');
        coastEnergy = null;
      }
    }

    if (t >= nextSampleT) {
      states.push(makeState());
      nextSampleT += sampleDt;
    }

    // No-surface terminus (Jupiter probe): the final phase ends when the rising
    // pressure crushes the probe, not at a ground the body doesn't have. Let the
    // probe sink below the datum until the pressure trigger fires.
    if (phase.endTrigger.type === 'pressure_pa') {
      if (bodyAmbientPressurePa(h, body) >= phase.endTrigger.value) {
        pushEvent('probe_signal_lost');
        break;
      }
    } else if (h <= 0) {
      h = 0;
      pushEvent('touchdown');
      break;
    }

    // Phase transition. `ground` is handled by the h ≤ 0 break above; other
    // triggers advance to the next phase (staying on the last if exhausted).
    if (
      phase.endTrigger.type !== 'ground' &&
      triggerMet(phase.endTrigger, h, v, t - phaseStartT, bodyAmbientPressurePa(h, body))
    ) {
      if (phaseIndex < profile.phases.length - 1) {
        // Remember the drag area we're leaving so the next phase inflates FROM it.
        deployFromCdA = phase.cdA ?? profile.entryCdA;
        phaseIndex += 1;
        phaseStartT = t;
        mass = Math.max(1, mass - (profile.phases[phaseIndex].jettisonKg ?? 0));
        emitPhaseStartEvents(phaseIndex);
      }
    }
  }

  // Ensure a final sample + a terminal beat even if maxT clamped the run. A
  // no-surface probe (Jupiter) closes on `probe_signal_lost`, everything else on
  // `touchdown` — don't append a spurious touchdown when the probe already ended.
  const final = makeState();
  states.push(final);
  if (!events.some((e) => e.type === 'touchdown' || e.type === 'probe_signal_lost')) {
    pushEvent('touchdown', 'timeout');
  }

  // Splice the peak beats in at their recorded instants, then re-sort.
  events.push({ type: 'peak_heat', t: peakHeat.t, altKm: peakHeat.altKm, velocityMs: 0 });
  events.push({ type: 'peak_decel', t: peakDecel.t, altKm: peakDecel.altKm, velocityMs: 0 });
  events.sort((a, b) => a.t - b.t);

  const touchdownVelocityMs = final.velocityMs;
  return {
    body,
    states,
    events,
    totalDurationS: final.t,
    peakDecel,
    peakHeat,
    touchdownVelocityMs,
    touchdownSuccess: touchdownVelocityMs <= survivable,
    landingDownrangeKm: downrange / 1000,
  };
}

/**
 * Guided range-control entry (#29 · ADR-088). The entry computer's real job: solve the constant
 * bank angle that lands a lifting capsule at its `targetDownrangeKm`, then fly that trajectory.
 * Downrange is monotone in the vertical lift fraction cos(bank) — full lift-up flies the farthest
 * (long shallow skim), lift-down digs in short — so a bisection converges without per-case tuning.
 * Same range-target → commanded-bank PRINCIPLE as the Lab's `solveEntryBankForRange`, but a
 * SEPARATE solver (this integrates the full EDL profile incl. chutes; the Lab one is standalone) —
 * the two are to be reconciled per ADR-088 Phase 0d.
 * If the target sits outside the reachable footprint it clamps to the nearest edge and flags it.
 */
function integrateGuidedDescent(profile: DescentProfile, opts: DescentOptions): DescentSummary {
  const target = profile.targetDownrangeKm ?? 0;
  const run = (u: number): DescentSummary =>
    integrateDescent(profile, { ...opts, entryBankCos: u });
  const rMinus = run(-1).landingDownrangeKm;
  const rPlus = run(1).landingDownrangeKm;
  const footLo = Math.min(rMinus, rPlus);
  const footHi = Math.max(rMinus, rPlus);
  // M4 guard — no steering authority. A profile that carries a `targetDownrangeKm` but has no
  // effective lift (liftToDragRatio absent/0, or a SUPER-CIRCULAR arrival where the γ/lift
  // integration is disabled — the Mars/lunar case, #29) has a ~zero-width footprint: bank does
  // nothing. Don't pretend to guide it — fly the nominal descent and flag targetReachable=false.
  const STEERABLE_KM = 20;
  if (footHi - footLo < STEERABLE_KM) {
    return { ...run(1), guidance: { entryBankCos: 1, targetReachable: false } };
  }
  const increasing = rPlus >= rMinus;
  const reachable = target >= footLo && target <= footHi;
  const clamped = Math.max(footLo, Math.min(footHi, target));
  let lo = -1;
  let hi = 1;
  let mid = 0;
  let res = run(0);
  for (let i = 0; i < 28; i += 1) {
    mid = (lo + hi) / 2;
    res = run(mid);
    if (res.landingDownrangeKm < clamped === increasing) lo = mid;
    else hi = mid;
  }
  // M3 guard — residual check. The bisection ASSUMES range is monotone in cos(bank); if a future
  // profile breaks that mid-curve the solve returns a wrong bank with no other symptom. Only claim
  // the target was reached if we actually landed near it (a converged solve misses by ~0 km; a
  // monotonicity break misses by hundreds). 50 km is well above convergence + the ±30 km test band.
  const converged = Math.abs(res.landingDownrangeKm - clamped) <= 50;
  return { ...res, guidance: { entryBankCos: mid, targetReachable: reachable && converged } };
}

/**
 * Linear-interpolate a descent state at time `t` (s) from the sampled
 * `states` (ascending in t). Clamps to the endpoints. Lets the render /
 * scrubber read a smooth state at any clock position between samples.
 */
export function sampleDescentAt(states: DescentState[], t: number): DescentState {
  if (states.length === 0) throw new Error('sampleDescentAt: empty trajectory');
  if (t <= states[0].t) return states[0];
  const last = states[states.length - 1];
  if (t >= last.t) return last;
  let lo = 0;
  let hi = states.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (states[mid].t <= t) lo = mid;
    else hi = mid;
  }
  const a = states[lo];
  const b = states[hi];
  const span = b.t - a.t;
  const f = span > 0 ? (t - a.t) / span : 0;
  const lerp = (x: number, y: number): number => x + (y - x) * f;
  return {
    t,
    altKm: lerp(a.altKm, b.altKm),
    altM: lerp(a.altM, b.altM),
    velocityMs: lerp(a.velocityMs, b.velocityMs),
    velDownMs: lerp(a.velDownMs, b.velDownMs),
    decelG: lerp(a.decelG, b.decelG),
    massKg: lerp(a.massKg, b.massKg),
    thrustN: lerp(a.thrustN, b.thrustN),
    dragN: lerp(a.dragN, b.dragN),
    phaseIndex: f < 0.5 ? a.phaseIndex : b.phaseIndex,
    phaseKind: f < 0.5 ? a.phaseKind : b.phaseKind,
    machNumber: lerp(a.machNumber, b.machNumber),
    dynamicPressurePa: lerp(a.dynamicPressurePa, b.dynamicPressurePa),
    aeroHeatFlux: lerp(a.aeroHeatFlux, b.aeroHeatFlux),
    propRemainingKg: lerp(a.propRemainingKg, b.propRemainingKg),
    flightPathAngleDeg: lerp(a.flightPathAngleDeg, b.flightPathAngleDeg),
    downrangeKm: lerp(a.downrangeKm, b.downrangeKm),
  };
}
