/**
 * Powered-ascent engine — the headless physics core for the /fly launch
 * act (RFC-034 · epic #412 · Scene 0). Pure functions, no Three.js, no
 * DOM: the same module drives both the animated Scene 0 render AND the
 * /plan take-off planner (RFC-034 L-I), exactly as fly-physics.ts is
 * shared between /fly and /plan.
 *
 * Model (S1): a 2-DOF planar gravity-turn integrated in SI units. The
 * vehicle flies an OPEN-LOOP pitch program (commanded flight-path angle
 * vs. time) — the load-bearing simplification that keeps the trajectory
 * predictable and teachable; a closed-loop guidance law is a later
 * refinement (RFC-034 §10 / L-H). Thrust interpolates between sea-level
 * and vacuum by ambient pressure; drag uses a single-exponential
 * atmosphere; stages jettison on propellant exhaustion. The engine
 * books the three teachable Δv losses (gravity / drag / steering) that
 * the HUD surfaces.
 *
 * Units: SI internally (m, s, kg, N, Pa). Summaries expose km and km·s⁻¹.
 */

import {
  ATM_SCALE_HEIGHT_M,
  G0,
  KARMAN_LINE_M,
  MU_EARTH_M3_S2,
  N_PER_KN,
  R_EARTH_M,
  SEA_LEVEL_DENSITY_KGM3,
  SEA_LEVEL_PRESSURE_PA,
} from './ascent-physics-constants';
// PEG guidance controller now lives in the kernel SYSTEMS layer (ADR-0037).
import { PEG, pegSolve, pegPitchRad, timeToApoapsisS, type PegState } from '../systems/peg';

// ─── Types ──────────────────────────────────────────────────────────

/** One stage of a launch vehicle. Masses in kg, thrust in kN, Isp in s. */
export interface LaunchStage {
  name: string;
  /** Full stage mass incl. propellant (kg). */
  wetKg: number;
  /** Empty stage mass — structure, engines, residuals (kg). */
  dryKg: number;
  /** Vacuum thrust (kN) — always required. */
  thrustVacKN: number;
  /** Sea-level thrust (kN) — omit for vacuum-only upper stages. */
  thrustSlKN?: number;
  /** Vacuum specific impulse (s) — always required. */
  ispVacS: number;
  /** Sea-level specific impulse (s) — omit for vacuum-only upper stages. */
  ispSlS?: number;
  /** Engine count on this stage (for the console's engine-out grid). */
  engines?: number;
  /** Combustion-chamber flame temperature (K) — adiabatic flame temp of the propellant. */
  chamberTempK?: number;
  /** Mission time (s) the stage lights. Stage 0: when it is air-lit after liftoff (LVM3's L110
   *  at ~T+110 s, the S200s alone lifting it off). An upper stage: when it lights after a
   *  ballistic coast from the previous stage's separation (Proton's Briz-M at T+680 s, 92 s after
   *  stage 3 leaves). Absent = at liftoff / at the previous separation. */
  ignitionS?: number;
  /** Seconds the spent stage stays attached after its cutoff before it separates (the
   *  Shuttle's external tank leaves ~18 s after MECO, the orbiter coasting with it). The
   *  MECO beat is at the cutoff, the STAGE SEP beat this long after. Absent = at the cutoff. */
  separationDelayS?: number;
  /** Throttle commands in mission time, held until the next one (the Shuttle's main engines:
   *  104 % at T+4 s, 67 % at T+27 s through max-Q, 104 % at T+60 s). The thrust values above
   *  are the 100 % rating. Absent = 100 % throughout. */
  throttle?: ThrottleStep[];
  /** Acceleration limit (multiples of g0): the stage throttles down to hold it (the Shuttle's
   *  3 g from about T+450 s to MECO). Absent = no limit. */
  maxAccelG?: number;
  /** Lowest throttle level the engines reach (the RS-25: 67 %); the acceleration limit cannot
   *  throttle below it. Absent = no floor. */
  minThrottle?: number;
}

/**
 * Strap-on boosters (RFC-034 §5.2 · #415 Track 3). `count` identical boosters
 * ignite at liftoff and burn IN PARALLEL with the first stage (the core), then
 * jettison when their propellant is spent — the core keeps firing throughout.
 * Masses/thrust/Isp are PER booster. Covers Ariane 5 EAP, H-IIA SRB-A, the R-7
 * strap-ons, Delta II GEM-40 solids, the Atlas half-stage boosters, etc.
 */
export interface LaunchBoosters {
  name: string;
  count: number;
  /** Full / empty mass PER booster (kg). */
  wetKg: number;
  dryKg: number;
  /** Thrust PER booster (kN) — sea-level required, vacuum optional. */
  thrustSlKN: number;
  thrustVacKN?: number;
  /** Specific impulse PER booster (s) — sea-level required, vacuum optional. */
  ispSlS: number;
  ispVacS?: number;
  chamberTempK?: number;
  /** The last `airLitCount` of the `count` light in the air: when the ground-lit ones burn
   *  out (Delta II's 3 of 9 GEMs), or at `airLitIgnitionS` while they still burn (PSLV-XL's
   *  2 of 6 PSOM-XLs at T+25 s). Each group jettisons at its own burnout. Absent = all
   *  light at liftoff. */
  airLitCount?: number;
  /** Mission time (s) the air-lit group lights; absent = at the ground-lit group's burnout. */
  airLitIgnitionS?: number;
  /** Seconds a burnt-out booster stays attached before it is jettisoned (Atlas V holds its
   *  AJ-60As from burnout at T+94 s to T+117 s; SRB-A 10 s; PSLV's PSOM-XLs ~20 s). The
   *  STAGE SEP beat is at the jettison. Absent = jettisoned at burnout. */
  separationDelayS?: number;
  /** The motor's published thrust-time curve as impulse gates: the fraction of its total
   *  impulse delivered by `t` seconds after ignition, rising to 1 at the last gate (the action
   *  time). Each segment between gates burns at the constant mass flow that delivers its share
   *  of the propellant, so the boost phase follows the real curve (the Shuttle RSRM's high
   *  liftoff thrust and its max-Q bucket) and burns out at the last gate. Absent = constant
   *  thrust until the propellant is spent. */
  impulseGates?: ImpulseGate[];
}

/** A direct-insertion MECO target (altitudes in m above the surface). */
export interface MecoTarget {
  altM: number;
  apogeeAltM: number;
  perigeeAltM: number;
}

/** The inertial speed, horizontal and radial (climbing) velocity (m/s) of a MECO target: the
 *  target orbit's state at the MECO altitude, on its way up to apogee. */
export function mecoTargetState(m: MecoTarget): { speed: number; vh: number; vr: number } {
  const r = R_EARTH_M + m.altM;
  const ra = R_EARTH_M + m.apogeeAltM;
  const rp = R_EARTH_M + m.perigeeAltM;
  const a = (ra + rp) / 2;
  const speed = Math.sqrt(MU_EARTH_M3_S2 * (2 / r - 1 / a));
  const vh = Math.sqrt(2 * MU_EARTH_M3_S2 * ((ra * rp) / (ra + rp))) / r; // h / r
  const vr = Math.sqrt(Math.max(0, speed * speed - vh * vh));
  return { speed, vh, vr };
}

/** One impulse gate: `fraction` (0-1) of the total impulse delivered by `t` s after ignition. */
export interface ImpulseGate {
  t: number;
  fraction: number;
}

/** One throttle command: from mission time `t` (s) the stage runs at `level` x its rated thrust. */
export interface ThrottleStep {
  t: number;
  level: number;
}

/** One reusable part's way home on a flight (0.9.11 F2). Falcon Heavy's centre core is the
 *  `booster` part (the core stage), its side boosters `strapOns`. */
export interface PartRecovery {
  part: 'booster' | 'strapOns';
  outcome: 'landed' | 'caught' | 'expended';
  site?: 'droneship' | 'landing-zone' | 'tower';
  /** The site's own name, as written (LZ-1 and LZ-2 for two side boosters, a drone ship's name). */
  siteNames?: string[];
  /** Touchdown (or the catch), mission seconds. */
  touchdownS?: number;
  /** Landing-burn start; absent = `LANDING_BURN_DEFAULT_S` before touchdown. */
  landingBurnS?: number;
  /** How the time is known: this flight's timeline, "about N minutes", or a sibling flight's. */
  timeClass?: 'sourced' | 'approx' | 'typical';
}

/** A launch vehicle's ascent profile. See RFC-034 §6 for the shipped JSON schema. */
export interface LaunchProfile {
  id: string;
  name: string;
  /** Lower → upper. Stage 0 ignites at liftoff. */
  stages: LaunchStage[];
  /** Strap-on boosters that fire in parallel with stage 0, then jettison. */
  boosters?: LaunchBoosters;
  /** The published liftoff thrust (kN), for the HUD, when the integrated figure differs:
   *  solid boosters are modelled at their burn-average thrust (so they burn out on time),
   *  well under their peak at ignition (SLS: 39,100 kN at liftoff, 8.8 million lbf). */
  liftoffThrustKN?: number;
  /** Payload mass carried all the way to orbit (kg). */
  payloadKg: number;
  /** Fairing mass (kg), jettisoned once out of the atmosphere. */
  fairingKg?: number;
  /** Altitude to jettison the fairing (m). Defaults to the Kármán line. */
  fairingJettisonAltM?: number;
  /**
   * Mission time (s) the fairing is jettisoned, when the real flight schedules it by time
   * (the free-molecular-heating criterion lands on a fixed time for a given trajectory:
   * Delta II M+39 s, Proton-M T+345 s). Takes precedence over `fairingJettisonAltM`.
   */
  fairingJettisonS?: number;
  /**
   * Seconds from SECO to spacecraft separation on a flight with no injection beat, from the
   * vehicle's published sequence (backlog F1, sources in
   * docs/wip/2026-11-17-launcher-timelines-sourced.md): Atlas V 169 s after the last Centaur
   * cutoff (ULA user's guide, every column), PSLV-XL 47 s after PS4 cutoff (C46, C61), LVM3 15 s
   * after C25 shut-off (M4), H-IIA 50 s after SECO (F15). The injection beat is cinematic time and ignores it. Unset:
   * separation at SECO.
   */
  payloadSeparationDelayS?: number;
  /**
   * Per-mission separation delays (s after SECO) where one vehicle flies payloads that leave
   * differently (Falcon 9: Crew Dragon about 197 s after SECO, plan L63), keyed by mission id.
   * Overrides `payloadSeparationDelayS` for that mission.
   */
  payloadSeparationDelayByMissionS?: Record<string, number>;
  /** How the vehicle's reusable parts come home on its usual flight (0.9.11 F2); a part not
   *  listed is expended. Sources per flight: docs/wip/2026-11-22-booster-recovery-sourced.md. */
  recovery?: PartRecovery[];
  /** Per-mission recovery, keyed by mission id; replaces `recovery` for that flight (Hera's
   *  booster and all three Europa Clipper cores were expended). */
  recoveryByMission?: Record<string, PartRecovery[]>;
  /**
   * The payload stays in the vehicle's bay for the whole launch (the Space Shuttle: it is
   * deployed hours later in orbit). No spacecraft-separation beat, no injection beat and no
   * payload deployment are drawn: the launch ends with the vehicle alone in orbit.
   */
  payloadInBay?: boolean;
  /**
   * Pitch program: `[t_seconds, flightPathAngleDeg]` knots, angle measured
   * from the LOCAL HORIZONTAL (90 = straight up, 0 = downrange). Linearly
   * interpolated; clamped to the endpoints outside the knot range.
   */
  pitchProgram: [number, number][];
  /**
   * Target circular-orbit altitude (m) for the closed-loop insertion guidance.
   * Above the atmosphere the integrator ignores the pitch table and steers to
   * arrive level here at circular speed. Defaults to `GUIDANCE_TARGET_ALT_M`.
   */
  targetOrbitAltM?: number;
  /**
   * Direct insertion (the Space Shuttle): the core stage steers (PEG) to a MECO state at
   * `altM` on the orbit `apogeeAltM` x `perigeeAltM` (climbing toward apogee) and cuts off when
   * its inertial speed reaches that orbit's speed there, leaving its residual propellant in the
   * tank, short of orbit so the tank re-enters. The final stage coasts to apogee and
   * circularises there (OMS-2); its cutoff waits for the circular orbit. STS-68: OMS-2 of
   * 48.8 m/s from T+2110 s to T+2208 s, to 221 x 221 km, so MECO onto about 58 x 221 km; its MECO
   * altitude is unpublished, so the profile's 105 km is calibrated to those two times (the
   * generic NASA TD0358A Table 3-1 figure, 360,000 ft, lit OMS-2 at 2081 s). Absent = the core burns to depletion and the first stable
   * perigee ends the ascent.
   */
  mecoTarget?: MecoTarget;
  /**
   * An elliptical injection by the final stage (plan item 4, 2026-11-19): it climbs to orbit at
   * `perigeeAltM` as usual, then keeps burning prograde, raising the apogee, and cuts off when the
   * apogee reaches `apogeeAltM` (LVM3 C25 into Chandrayaan-3's 170 x 36,500 km, one continuous
   * burn), or when it reaches the escape energy `c3Km2S2` (a direct escape injection). Absent =
   * the stage cuts off at the first stable orbit (a circular parking orbit).
   */
  injectionOrbit?: {
    perigeeAltM: number;
    /** Cut off when the apogee reaches this altitude (an elliptical orbit). */
    apogeeAltM?: number;
    /** Cut off when the injection energy C3 (km²/s², the hyperbolic excess speed squared)
     *  reaches this: a direct escape injection (Atlas-Centaur AC-20, Mariner VI: C3 11.185 at
     *  Centaur MECO T+725.5 s, NASA TM X-2278). */
    c3Km2S2?: number;
  };
  /** Aerodynamic reference area (m²) for drag. Default 10. */
  refAreaM2?: number;
  /** Drag coefficient (dimensionless). Default 0.3. */
  cd?: number;
  /** Launch site — informational; not used by the S1 planar integration. */
  launchSite?: { lat: number; lon: number; name?: string };
  /**
   * Launch-profile provenance tier — distinct from the cislunar/mission
   * `tier_*` trajectory taxonomy (see cislunar-geometry.ts); same field name,
   * different domain. "flagship" (hand-authored) | "generic" (parameterized).
   */
  source_tier?: 'flagship' | 'generic';
  /**
   * Lofted-ascent handoff (RFC-034 §5.1 · #416). Set on vehicles whose FINAL
   * stage is very low TWR (Centaur, ESC-A, LE-5B) — real ones fly a lofted
   * direct injection: the boost phase keeps raising apoapsis PAST target instead
   * of altitude-holding, so the weak upper stage ignites while still climbing
   * (v_r > 0) with apoapsis ahead. It then coasts UP during the long burn (the
   * time budget it needs), and PEG circularises. Without this the boost phase
   * hands the upper stage a dead at-apoapsis state it cannot fly out of.
   */
  loftBoost?: boolean;
  /** The lofted boost's reference time to apoapsis (s) for this vehicle, fitted to a published
   *  altitude (Proton: fairing jettison at 121-125 km, ILS guide). Absent = PEG.loftTApoRefS. */
  loftTApoRefS?: number;
  /** The first N stages fly the pitch table all the way, above the atmosphere too, instead of
   *  the closed-loop raise / altitude-hold: for a vehicle whose published trajectory (an altitude
   *  or speed at a staging event) the shared guidance does not fly (Proton: fairing at 121-125 km
   *  at T+348 s; H3: MECO at 208 km). The final stage keeps its guidance. Absent = 0. */
  pitchTableStages?: number;
  /** Provenance rows (publisher + source URL) for the shipped JSON. */
  provenance?: { l: string; u: string }[];
}

/** A sampled instant of the ascent trajectory. */
export interface AscentState {
  /** Seconds since liftoff. */
  t: number;
  /** Altitude above sea level (km). */
  altKm: number;
  /** Downrange distance (km). */
  downrangeKm: number;
  /** Speed magnitude (km·s⁻¹). */
  speedKms: number;
  /** Vertical velocity component (km·s⁻¹). */
  velUpKms: number;
  /** Current total vehicle mass (kg). */
  massKg: number;
  /** Active stage index (0-based); -1 once all stages are spent. */
  stageIndex: number;
  /** Dynamic pressure q = ½ρv² (Pa). */
  qPa: number;
  /** Thrust-to-weight ratio (local g). */
  twr: number;
  /** Instantaneous thrust (N) — 0 while coasting. For the forces lens. */
  thrustN: number;
  /** Instantaneous drag (N). For the forces lens. */
  dragN: number;
  /** Commanded thrust direction — flight-path angle from horizontal (rad). */
  pitchRad: number;
  /** Drawn body attitude from horizontal (rad): `pitchRad` rate-limited (see setDrawnAttitude). */
  attitudeRad?: number;
  /** Propellant remaining in the active stage (kg); 0 while coasting. */
  propRemainingKg: number;
  /** Strap-on booster propellant remaining (kg); 0 when there are none or they're spent. */
  boosterPropRemainingKg: number;
  /** True while the strap-on boosters are lit (stage-0 parallel-boost phase). */
  boostersActive: boolean;
  /** How many strap-ons are firing now (the air-lit group lights after the ground-lit). */
  boostersLit?: number;
  /** The air-lit strap-on group is firing. */
  airLitBurning?: boolean;
  /** The ground-lit strap-on group is firing. */
  groundLitBurning?: boolean;
  /** The active stage's engines are firing (false before an air-lit core lights and during
   *  a coast to apoapsis), so the scene draws its flame only then. */
  coreLit?: boolean;
  /** Combustion-chamber temperature (K) while firing; 0 when the engine is off. */
  chamberTempK: number;
  /**
   * Stagnation aerodynamic heating proxy ∝ √ρ·v³ (Sutton-Graves form).
   * PROPORTIONAL, arbitrary units — NOT calibrated W·m⁻²; use only for
   * relative HUD gauges (peaks after Max-Q), never as an absolute flux.
   */
  aeroHeatFlux: number;
  /** Running Δv gravity loss to this instant (km·s⁻¹) = ∫ g·sinγ dt over powered
   *  flight; the final sample equals `AscentSummary.losses.gravityKms`. NOT
   *  strictly monotonic — it dips slightly during a powered lofted descent
   *  (flight-path angle < 0). Note: the ledger itemises gravity + drag + steering
   *  only; the atmospheric back-pressure (reduced sea-level Isp) loss ~0.1–0.3
   *  km/s is inside the integrator's delivered Δv but not broken out, so
   *  `idealDv − these three` won't reconcile to the delivered Δv exactly. */
  lossGravityKms: number;
  /** Running Δv drag loss to this instant (km·s⁻¹). Monotonic non-decreasing
   *  (drag always opposes motion). */
  lossDragKms: number;
  /** Running Δv steering (cosine) loss to this instant (km·s⁻¹). Monotonic
   *  non-decreasing (a cosine loss is always ≥ 0). */
  lossSteeringKms: number;
}

/** A discrete ascent beat (liftoff, staging, Max-Q, MECO, SECO, …). */
export interface AscentEvent {
  type:
    | 'liftoff'
    | 'max_q'
    | 'staging'
    | 'meco'
    | 'fairing_jettison'
    | 'seco'
    | 'orbit'
    /** A direct insertion's circularising burn lights at apogee (the Shuttle's OMS-2). */
    | 'insertion_burn';
  t: number;
  altKm: number;
  speedKms: number;
  massKg: number;
  /** Free-text detail (e.g. which stage). */
  note?: string;
  /** Bookkeeping only, not a flight event: the end of powered flight on a vehicle that has no
   *  final cutoff of its own (the Shuttle's orbiter coasts after the tank leaves; its OMS burns
   *  come later). The HUD beat lists leave it out; the camera / clock code still reads it. */
  silent?: boolean;
}

/** The result of integrating an ascent. */
export interface AscentSummary {
  /** Trajectory sampled at `sampleDtS` (default 1 s). */
  states: AscentState[];
  /** Beats in chronological order. */
  events: AscentEvent[];
  /** Peak dynamic pressure. */
  maxQ: { t: number; altKm: number; qPa: number };
  finalAltKm: number;
  finalSpeedKms: number;
  /** True once the vehicle passes the Kármán line at ≥ local circular speed. */
  reachedOrbit: boolean;
  /** Δv losses (km·s⁻¹), the three the HUD teaches. */
  losses: { gravityKms: number; dragKms: number; steeringKms: number };
  /** Ideal Δv capacity (km·s⁻¹) — Tsiolkovsky summed over stages, vacuum Isp. */
  idealDvKms: number;
  /** Free eastward Δv the launch site donates via Earth's rotation (km·s⁻¹) =
   *  EARTH_SURFACE_SPEED_EQ·cos(lat). The rocket needs this much LESS than the
   *  target orbital speed, so it offsets dvRequired (M2). */
  siteRotationCreditKms: number;
  /** Total flight duration (s) — the MET of the final sampled state. */
  totalDurationS: number;
}

// ─── Atmosphere + gravity ───────────────────────────────────────────

/** Fraction of sea-level pressure at altitude — ρ/ρ₀ ≡ p/p₀ for an isothermal model. */
export function pressureRatio(altM: number): number {
  return Math.exp(-Math.max(0, altM) / ATM_SCALE_HEIGHT_M);
}

/** Air density (kg·m⁻³) at altitude — single-exponential US-Std-1976 approximation. */
export function airDensity(altM: number): number {
  return SEA_LEVEL_DENSITY_KGM3 * pressureRatio(altM);
}

/** Ambient pressure (Pa) at altitude. */
export function ambientPressure(altM: number): number {
  return SEA_LEVEL_PRESSURE_PA * pressureRatio(altM);
}

/** Local gravitational acceleration (m·s⁻²): g = µ / (R⊕ + h)². */
export function gravity(altM: number): number {
  const r = R_EARTH_M + Math.max(0, altM);
  return MU_EARTH_M3_S2 / (r * r);
}

/** Circular-orbit speed (m·s⁻¹) at altitude: v = √(µ / (R⊕ + h)). */
export function circularSpeed(altM: number): number {
  return Math.sqrt(MU_EARTH_M3_S2 / (R_EARTH_M + Math.max(0, altM)));
}

/** Dynamic pressure q = ½ρv² (Pa). */
export function dynamicPressure(densityKgM3: number, speedMs: number): number {
  return 0.5 * densityKgM3 * speedMs * speedMs;
}

// ─── Rocket equation ────────────────────────────────────────────────

/**
 * Tsiolkovsky ideal Δv (m·s⁻¹): Δv = Isp·g₀·ln(m₀/m_f).
 *
 * @example a stage with Isp 312 s, wet 433 t, dry 26 t
 *          → 312·9.80665·ln(433/26) ≈ 8.6 km/s (before losses).
 */
export function tsiolkovskyDv(ispS: number, m0Kg: number, mfKg: number): number {
  if (mfKg <= 0 || m0Kg <= mfKg) return 0;
  return ispS * G0 * Math.log(m0Kg / mfKg);
}

/** Propellant mass of a stage (kg). */
export function stagePropellant(stage: LaunchStage): number {
  return Math.max(0, stage.wetKg - stage.dryKg);
}

/** The `count` strap-on boosters as one combined stage-like object (masses,
 *  thrust and Isp summed/shared), so the same thrust/Isp/propellant helpers
 *  apply. */
export function combinedBoosterStage(b: LaunchBoosters): LaunchStage {
  return {
    name: b.name,
    wetKg: b.count * b.wetKg,
    dryKg: b.count * b.dryKg,
    thrustVacKN: b.count * (b.thrustVacKN ?? b.thrustSlKN),
    thrustSlKN: b.count * b.thrustSlKN,
    ispVacS: b.ispVacS ?? b.ispSlS,
    ispSlS: b.ispSlS,
    chamberTempK: b.chamberTempK,
  };
}

/**
 * Ideal Δv capacity of a whole stack (m·s⁻¹) — Tsiolkovsky summed
 * bottom-up, each stage burning against the mass it actually carries
 * (its own dry mass + everything above it). Vacuum Isp (upper-bound
 * capacity); the delivered Δv is this minus the integrated losses.
 */
export function stackIdealDv(profile: LaunchProfile): number {
  const upperMass = (fromIndex: number): number => {
    let m = profile.payloadKg + (profile.fairingKg ?? 0);
    for (let i = fromIndex; i < profile.stages.length; i++) m += profile.stages[i].wetKg;
    return m;
  };
  let dv = 0;
  // Upper stages (1+): serial Tsiolkovsky, each against the mass it carries.
  for (let i = 1; i < profile.stages.length; i++) {
    const s = profile.stages[i];
    const above = upperMass(i + 1);
    dv += tsiolkovskyDv(s.ispVacS, above + s.wetKg, above + s.dryKg);
  }
  const core = profile.stages[0];
  const aboveCore = upperMass(1);
  if (!profile.boosters) {
    // No strap-ons: stage 0 is a plain serial stage.
    return dv + tsiolkovskyDv(core.ispVacS, aboveCore + core.wetKg, aboveCore + core.dryKg);
  }
  // Parallel boost (M4). The core + boosters burn TOGETHER, so each boost phase is ONE
  // combined burn at the mass-flow-weighted exhaust velocity — NOT the core's full solo Δv
  // PLUS the boosters' Δv, which double-counted the phase and inflated the ideal-Δv /
  // payload-margin readout. Boosters burn in groups (ground-lit, then air-lit), each
  // jettisoning at its burnout; an air-lit core only burns once lit. Then the core alone.
  const airLit = Math.min(
    Math.max(0, profile.boosters.airLitCount ?? 0),
    profile.boosters.count - 1,
  );
  const groups = [
    combinedBoosterStage({ ...profile.boosters, count: profile.boosters.count - airLit }),
    ...(airLit > 0 ? [combinedBoosterStage({ ...profile.boosters, count: airLit })] : []),
  ];
  const Tc = core.thrustVacKN * 1000;
  const veC = core.ispVacS * G0;
  const mdotC = veC > 0 ? Tc / veC : 0;
  const ignition = core.ignitionS ?? 0;
  let coreLeft = stagePropellant(core);
  let m = aboveCore + core.wetKg + groups.reduce((k, g) => k + g.wetKg, 0); // on the pad
  let t = 0;
  for (const g of groups) {
    const veB = g.ispVacS * G0;
    const prop = stagePropellant(g);
    // With impulse gates the motor burns out at its last gate, at the average flow that spends
    // its propellant by then, not at the rated mass flow.
    const gates = profile.boosters.impulseGates;
    const mdotRated = veB > 0 ? ((g.thrustVacKN ?? 0) * 1000) / veB : 0;
    const tBurn = gates?.length ? gates[gates.length - 1].t : mdotRated > 0 ? prop / mdotRated : 0;
    const mdotB = gates?.length ? (tBurn > 0 ? prop / tBurn : 0) : mdotRated;
    const Tb = mdotB * veB;
    // The core burns at its commanded throttle (the Falcon Heavy core at 46 % beside its side
    // boosters); its acceleration limit acts late in its own burn and is not modelled here.
    const coreStart = Math.max(t, ignition);
    const coreOn = Math.max(0, t + tBurn - coreStart);
    const level = coreOn > 0 ? meanThrottle(core, coreStart, coreStart + coreOn) : 1;
    const coreDuring = Math.min(coreLeft, mdotC * level * coreOn);
    const share = tBurn > 0 ? (coreOn * level) / tBurn : 0; // the core's average flow share
    const ve = mdotB + mdotC * share > 0 ? (Tb + Tc * share) / (mdotB + mdotC * share) : veB;
    const burn = prop + coreDuring;
    if (burn > 0 && m - burn > 0) dv += ve * Math.log(m / (m - burn));
    m -= burn + g.dryKg;
    coreLeft -= coreDuring;
    t += tBurn;
  }
  if (coreLeft > 0 && m - coreLeft > 0) dv += veC * Math.log(m / (m - coreLeft));
  return dv;
}

// ─── Per-stage thrust / Isp (pressure-interpolated) ─────────────────

/**
 * Thrust (N) of a stage at altitude. Linear in ambient pressure between
 * sea-level and vacuum values: T = T_vac − (T_vac − T_sl)·(p/p₀).
 * Stages without a sea-level value run at vacuum thrust throughout.
 */
export function stageThrustN(stage: LaunchStage, altM: number): number {
  const vac = stage.thrustVacKN * N_PER_KN;
  if (stage.thrustSlKN == null) return vac;
  const sl = stage.thrustSlKN * N_PER_KN;
  return vac - (vac - sl) * pressureRatio(altM);
}

/** Specific impulse (s) of a stage at altitude — same pressure interpolation as thrust. */
export function stageIspS(stage: LaunchStage, altM: number): number {
  if (stage.ispSlS == null) return stage.ispVacS;
  return stage.ispVacS - (stage.ispVacS - stage.ispSlS) * pressureRatio(altM);
}

/** The mean commanded throttle level of a stage over mission time [t0, t1] (step commands). */
export function meanThrottle(stage: LaunchStage, t0: number, t1: number): number {
  const steps = stage.throttle ?? [];
  if (steps.length === 0 || t1 <= t0) return 1;
  const edges = [t0, ...steps.map((st) => st.t).filter((x) => x > t0 && x < t1), t1];
  let sum = 0;
  for (let i = 0; i + 1 < edges.length; i++) {
    sum += throttleLevel(stage, edges[i]) * (edges[i + 1] - edges[i]);
  }
  return sum / (t1 - t0);
}

/** The throttle level (fraction of rated thrust) a stage is commanded to at mission time t. */
export function throttleLevel(stage: LaunchStage, t: number): number {
  let level = 1;
  for (const step of stage.throttle ?? []) {
    if (t >= step.t) level = step.level;
  }
  return level;
}

/**
 * Thrust multiplier of a booster `sinceIgnitionS` seconds into its burn, from its impulse
 * gates: on each segment the mass flow that spends that segment's share of `propKg`, against
 * the booster's rated vacuum mass flow. 1 when the booster has no gates. Past the last gate
 * the last segment's value holds (any propellant left from the altitude-dependent Isp burns
 * out at the same rate).
 */
export function boosterThrustMultiplier(
  b: Pick<LaunchBoosters, 'impulseGates' | 'thrustSlKN' | 'thrustVacKN' | 'ispSlS' | 'ispVacS'>,
  propKg: number,
  sinceIgnitionS: number,
): number {
  const gates = b.impulseGates;
  if (!gates || gates.length === 0) return 1;
  const mdotVac = ((b.thrustVacKN ?? b.thrustSlKN) * N_PER_KN) / ((b.ispVacS ?? b.ispSlS) * G0);
  if (mdotVac <= 0) return 1;
  let t0 = 0;
  let f0 = 0;
  for (const g of gates) {
    if (sinceIgnitionS < g.t || g === gates[gates.length - 1]) {
      const dt = g.t - t0;
      return dt > 0 ? ((g.fraction - f0) * propKg) / dt / mdotVac : 1;
    }
    t0 = g.t;
    f0 = g.fraction;
  }
  return 1;
}

// ─── Pitch program ──────────────────────────────────────────────────

/**
 * Commanded flight-path angle (radians from local horizontal) at time
 * `t`, linearly interpolated over the profile's pitch-program knots and
 * clamped to the endpoints outside the knot range.
 */
export function pitchAngleRad(profile: LaunchProfile, t: number): number {
  const knots = profile.pitchProgram;
  if (knots.length === 0) return Math.PI / 2; // straight up by default
  if (t <= knots[0][0]) return (knots[0][1] * Math.PI) / 180;
  const last = knots[knots.length - 1];
  if (t >= last[0]) return (last[1] * Math.PI) / 180;
  for (let i = 1; i < knots.length; i++) {
    const [t1, a1] = knots[i];
    if (t <= t1) {
      const [t0, a0] = knots[i - 1];
      const f = (t - t0) / (t1 - t0);
      return ((a0 + (a1 - a0) * f) * Math.PI) / 180;
    }
  }
  return (last[1] * Math.PI) / 180;
}

// ─── Closed-loop insertion guidance (RFC-034 §6 · #415 Track 1) ──────

/**
 * Closed-loop insertion guidance tuning. One shared set of gains flies every
 * adequately-powered serial vehicle to orbit — NOT tuned per vehicle.
 */
export const GUIDANCE = {
  /** Altitude (m) above which the pitch table hands over to guidance. */
  handoverAltM: 55_000,
  /** Blend band (m) over which table → guidance, so the command doesn't step. */
  blendM: 25_000,
  /** Default target circular-orbit altitude (m) for insertion. */
  targetAltM: 180_000,
  /** Altitude-error → vertical-accel gain (s⁻²). */
  kAlt: 5e-4,
  /** Vertical-speed → vertical-accel damping (s⁻¹). */
  kVy: 0.05,
  /** How far above / below local horizontal the guidance may point (rad). */
  maxClimbRad: 0.6,
  maxDiveRad: 0.25,
};

/**
 * Commanded thrust flight-path angle (rad from local horizontal).
 *
 * Below `handoverAltM` the aero-safe pitch table drives the gravity turn.
 * Above it, closed-loop insertion in the 2-body dynamics: while the osculating
 * APOAPSIS is below target, burn PROGRADE to raise it; once apoapsis reaches
 * target, altitude-hold to circularise — command the vertical accel toward the
 * target altitude at zero vertical speed and solve for the pitch that delivers
 * it after the effective radial gravity (g − velHoriz²/r). Blends over
 * `blendM`; falls back to the table while coasting.
 */
export function commandedPitchRad(
  profile: LaunchProfile,
  t: number,
  altM: number,
  velUpMs: number,
  velHorizMs: number,
  thrustAccelMs2: number,
): number {
  const table = pitchAngleRad(profile, t);
  if (altM <= GUIDANCE.handoverAltM || thrustAccelMs2 <= 1e-6) return table;
  const targetAlt = profile.targetOrbitAltM ?? GUIDANCE.targetAltM;

  const r = R_EARTH_M + altM;
  const energy = (velUpMs * velUpMs + velHorizMs * velHorizMs) / 2 - MU_EARTH_M3_S2 / r;
  let apoapsisAltM = Infinity;
  if (energy < 0) {
    const h = r * velHorizMs;
    const a = -MU_EARTH_M3_S2 / (2 * energy);
    const e = Math.sqrt(Math.max(0, 1 + (2 * energy * h * h) / (MU_EARTH_M3_S2 * MU_EARTH_M3_S2)));
    apoapsisAltM = a * (1 + e) - R_EARTH_M;
  }

  let guided: number;
  if (apoapsisAltM < targetAlt) {
    guided = Math.atan2(velUpMs, velHorizMs); // prograde — raise apoapsis
  } else {
    const aDes = GUIDANCE.kAlt * (targetAlt - altM) - GUIDANCE.kVy * velUpMs;
    const gDeficit = gravity(altM) - (velHorizMs * velHorizMs) / (R_EARTH_M + altM);
    const sinGamma = (aDes + gDeficit) / thrustAccelMs2;
    guided = Math.max(
      -GUIDANCE.maxDiveRad,
      Math.min(GUIDANCE.maxClimbRad, Math.asin(Math.max(-1, Math.min(1, sinGamma)))),
    );
  }
  const blend = Math.max(0, Math.min(1, (altM - GUIDANCE.handoverAltM) / GUIDANCE.blendM));
  return table * (1 - blend) + guided * blend;
}

// ─── Powered Explicit Guidance — low-TWR upper stages (RFC-034 §5.1 · #416) ──
// PEG moved to the kernel SYSTEMS layer (ADR-0037); imported for `integrateAscent` (below)
// and re-exported here for back-compat so existing importers keep resolving it from this module.
export { PEG, pegSolve, pegPitchRad, timeToApoapsisS };
export type { PegState };

// ─── Integrator ─────────────────────────────────────────────────────

export interface AscentOptions {
  /** Integration step (s). Default 0.05. */
  dtS?: number;
  /** Trajectory sample interval (s). Default 1. */
  sampleDtS?: number;
  /** Hard stop (s) so a sub-orbital / underpowered stack can't loop forever. Default 2000. */
  maxTS?: number;
}

/**
 * Integrate a launch profile from the pad to orbit (or propellant
 * exhaustion / `maxTS`). Semi-implicit Euler in the launch plane; pitch
 * table through the atmosphere then closed-loop insertion guidance;
 * pressure-interpolated thrust; single-exponential drag; stages jettison
 * on propellant exhaustion.
 *
 * Returns the sampled trajectory, the ascent beats, Max-Q, the three Δv
 * losses, and the ideal Δv capacity. Pure — safe to call from a Svelte
 * scene, a worker, or a vitest test.
 */
export function integrateAscent(profile: LaunchProfile, opts: AscentOptions = {}): AscentSummary {
  const dt = opts.dtS ?? 0.05;
  const sampleDt = opts.sampleDtS ?? 1;
  // A low-TWR upper stage burns for many minutes; a direct insertion coasts half an orbit to
  // its circularising burn (STS-68's OMS-2 at T+2110 s).
  const maxT = opts.maxTS ?? (profile.mecoTarget ? 4000 : 2000);
  const mecoTarget = profile.mecoTarget;
  const directInsertion = mecoTarget != null;
  const mecoState = mecoTarget ? mecoTargetState(mecoTarget) : null;
  // The core stage has been cut off on its insertion orbit (direct insertion only).
  let stageCutOff = false;
  // The altitude the final stage circularises at on a direct insertion: the apoapsis MECO
  // delivered (OMS-2 burns at apogee, whatever it is), set when the final stage takes over.
  let circulariseAtM: number | null = null;
  // OMS-2 lit: the circularising burn has started (it then runs to the circular orbit).
  let insertionBurnLit = false;
  const refArea = profile.refAreaM2 ?? 10;
  const cd = profile.cd ?? 0.3;

  // Earth-rotation launch credit (the missing physics — #416). The pad rotates
  // eastward at 465.1·cos(lat) m/s; every published stage-Δv budget closes
  // BECAUSE of this free velocity, and it's the reason equatorial sites exist
  // (Kourou at 5.2° gets the most). The vehicle starts with it, and the
  // co-rotating atmosphere means drag acts on air-RELATIVE speed, not inertial.
  // Assumes an eastward (prograde) launch — true for every flagship LEO profile.
  const EARTH_SURFACE_SPEED_EQ_MS = 465.1;
  const siteLatRad = ((profile.launchSite?.lat ?? 28.5) * Math.PI) / 180;
  const siteSpeed = EARTH_SURFACE_SPEED_EQ_MS * Math.cos(siteLatRad);

  // Mass bookkeeping: dropped stages are gone; the current stage carries
  // its dry mass + remaining propellant; upper stages ride as full wet.
  let stageIndex = 0;
  let remainingProp = stagePropellant(profile.stages[0]);
  let fairingOn = (profile.fairingKg ?? 0) > 0;
  const fairingJettAlt = profile.fairingJettisonAltM ?? KARMAN_LINE_M;

  // Strap-on boosters (Track 3): fire with the core, jettison when spent. They fly as up to
  // two groups — ground-lit, then air-lit — each with its own propellant: the air-lit one
  // lights at `airLitIgnitionS` (both burning together) or at the ground-lit burnout, and
  // each jettisons at its own burnout. An unlit group rides along at full mass.
  const airLit = Math.min(
    Math.max(0, profile.boosters?.airLitCount ?? 0),
    Math.max(0, (profile.boosters?.count ?? 0) - 1),
  );
  const groundCount = (profile.boosters?.count ?? 0) - airLit;
  type BoosterGroup = {
    stage: LaunchStage;
    prop: number;
    air: boolean;
    dropped: boolean;
    burnoutAt?: number;
    /** Mission time the group lit (its impulse gates count from here). */
    litAt?: number;
  };
  const groups: BoosterGroup[] = profile.boosters
    ? [
        {
          stage: combinedBoosterStage({ ...profile.boosters, count: groundCount }),
          prop: 0,
          air: false,
          dropped: false,
        },
        ...(airLit > 0
          ? [
              {
                stage: combinedBoosterStage({ ...profile.boosters, count: airLit }),
                prop: 0,
                air: true,
                dropped: false,
              },
            ]
          : []),
      ]
    : [];
  for (const g of groups) g.prop = stagePropellant(g.stage);
  const boosterPropEach = profile.boosters
    ? Math.max(0, profile.boosters.wetKg - profile.boosters.dryKg)
    : 0;
  // A lit group's thrust (and mass flow) follows the booster's impulse gates, timed from when
  // the group lit. The gates fix the MASS FLOW of each segment; at altitude the thrust is that
  // flow times the local Isp, so a motor whose sea-level and vacuum flows differ (H-IIA SRB-A,
  // Falcon side boosters) still burns out on its last gate.
  const groupMultiplier = (g: BoosterGroup, alt: number): number => {
    const b = profile.boosters;
    if (!b?.impulseGates?.length) return 1;
    const k = boosterThrustMultiplier(b, boosterPropEach, t - (g.litAt ?? t));
    const mdotVac = stageThrustN(g.stage, Infinity) / (stageIspS(g.stage, Infinity) * G0);
    const mdotHere = stageThrustN(g.stage, alt) / (stageIspS(g.stage, alt) * G0);
    return mdotHere > 0 ? (k * mdotVac) / mdotHere : k;
  };
  // The active stage's thrust at this altitude and time: its throttle command, capped by its
  // acceleration limit (the boosters' thrust counts against the cap).
  const coreThrustAt = (alt: number, mass: number, boostThrust: number): number => {
    const stage = profile.stages[stageIndex];
    const rated = stageThrustN(stage, alt);
    let thrust = rated * throttleLevel(stage, t);
    if (stage.maxAccelG != null) {
      const floor = rated * (stage.minThrottle ?? 0);
      thrust = Math.min(thrust, Math.max(floor, stage.maxAccelG * G0 * mass - boostThrust));
    }
    return thrust;
  };
  const airLitAt = profile.boosters?.airLitIgnitionS;
  const groupLit = (g: BoosterGroup): boolean =>
    !g.dropped && g.prop > 0 && (!g.air || (airLitAt != null ? t >= airLitAt : groups[0].dropped));
  const coreIgnitionS = profile.stages[0].ignitionS ?? 0;
  let lastCoreLit = coreIgnitionS <= 0;

  const massAbove = (i: number): number => {
    let m = 0;
    for (let k = i + 1; k < profile.stages.length; k++) m += profile.stages[k].wetKg;
    return m;
  };
  const currentMass = (): number => {
    // Boosters ride only while still attached (during the stage-0 boost phase).
    const boosterMass = groups.reduce(
      (k, g) => k + (g.dropped ? 0 : g.stage.dryKg + Math.max(0, g.prop)),
      0,
    );
    if (stageIndex < 0) {
      // After SECO the spent final stage is still there (its dry mass and any residual): the
      // upper stage carries the spacecraft until it separates, the Shuttle's orbiter is the
      // vehicle. Dropping it left the payload alone (100 % payload on the HUD; with no
      // payload, zero mass).
      const last = profile.stages[profile.stages.length - 1];
      return (
        profile.payloadKg +
        (fairingOn ? (profile.fairingKg ?? 0) : 0) +
        boosterMass +
        last.dryKg +
        Math.max(0, remainingProp)
      );
    }
    const s = profile.stages[stageIndex];
    return (
      profile.payloadKg +
      (fairingOn ? (profile.fairingKg ?? 0) : 0) +
      s.dryKg +
      remainingProp +
      massAbove(stageIndex) +
      boosterMass
    );
  };

  // Planar state: x downrange, y altitude (m); vx, vy (m·s⁻¹). The pad already
  // carries Earth's eastward (downrange) rotation speed — the launch credit.
  let x = 0;
  let y = 0;
  let vx = siteSpeed;
  let vy = 0;
  let t = 0;

  const states: AscentState[] = [];
  const events: AscentEvent[] = [];
  let maxQ = { t: 0, altKm: 0, qPa: 0 };
  const losses = { gravity: 0, drag: 0, steering: 0 }; // m·s⁻¹
  let reachedOrbit = false;
  let mecoSeen = false;
  let orbitSeen = false;
  let secoT = -1; // time all stages are spent → start of the orbit coast
  const POST_SECO_COAST_S = 90; // render a serene "engine dark" coast after SECO
  const PERIGEE_TARGET_M = 140_000; // perigee altitude that counts as a stable orbit

  // Cache the last-commanded pitch so the snapshot's HUD value matches the
  // dynamics exactly (the guidance is stateful across the trajectory).
  let lastPitch = Math.PI / 2;
  // Actual delivered thrust from the last integrator step (0 during a coast) so
  // the HUD reports engine-dark coasts honestly instead of full stage thrust (S3).
  let lastThrust = 0;

  // PEG state for the final stage (#416): solved coefficients + when they were
  // solved (major cycle), and a coast-to-apoapsis flag for a stage that can't
  // circularise in one continuous burn.
  let peg: PegState | null = null;
  let pegSolveT = -Infinity;
  let coasting = false;
  // Latched once the heuristic altitude-hold saturates (a too-weak final stage).
  let pegLatched = false;
  // injectionOrbit: past the orbit gate, the final stage burns on to the apogee target
  let raisingApogee = false;

  const snapshot = (): AscentState => {
    // Radial frame: position from Earth's centre, altitude above the surface,
    // velocity split into radial (up) and downrange (horizontal) components.
    const ry = y + R_EARTH_M;
    const r = Math.hypot(x, ry) || R_EARTH_M;
    const alt = r - R_EARTH_M;
    const speed = Math.hypot(vx, vy); // inertial speed (orbital-mechanics frame)
    const velUp = (vx * x + vy * ry) / r;
    const rho = airDensity(alt);
    const g = gravity(alt);
    const m = currentMass();
    // Aero terms use AIR-RELATIVE airspeed, not inertial speed (B2). The
    // atmosphere co-rotates eastward with Earth (≈ siteSpeed downrange), so the
    // pad's rotation velocity is NOT airspeed — otherwise the HUD shows ~100 kPa
    // dynamic pressure and hundreds of kN of drag on a vehicle sitting still on
    // the pad. Mirrors the integrator's vRel (see the loop body).
    const horizX = ry / r; // local horizontal, +downrange
    const horizY = -x / r;
    const airspeed = Math.hypot(vx - siteSpeed * horizX, vy - siteSpeed * horizY);
    const q = dynamicPressure(rho, airspeed);
    // Actual delivered thrust from the last integrator step — 0 during a
    // coast-to-apoapsis (S3), so TWR / thrust / chamber-temp read engine-dark
    // instead of full stage thrust.
    return {
      t,
      altKm: alt / 1000,
      downrangeKm: (R_EARTH_M * Math.atan2(x, ry)) / 1000,
      speedKms: speed / 1000,
      velUpKms: velUp / 1000,
      massKg: m,
      stageIndex,
      qPa: q,
      twr: m > 0 ? lastThrust / (m * g) : 0,
      thrustN: lastThrust,
      dragN: q * cd * refArea,
      pitchRad: lastPitch,
      propRemainingKg: stageIndex >= 0 ? Math.max(0, remainingProp) : 0,
      boosterPropRemainingKg: groups.reduce((k, g) => k + (g.dropped ? 0 : Math.max(0, g.prop)), 0),
      boostersActive: stageIndex === 0 && groups.some(groupLit),
      boostersLit:
        stageIndex === 0
          ? groups.reduce((k, g) => k + (groupLit(g) ? (g.air ? airLit : groundCount) : 0), 0)
          : 0,
      airLitBurning: stageIndex === 0 && groups.some((g) => g.air && groupLit(g)),
      groundLitBurning: stageIndex === 0 && groups.some((g) => !g.air && groupLit(g)),
      coreLit: lastCoreLit,
      chamberTempK:
        stageIndex >= 0 && lastThrust > 0 ? (profile.stages[stageIndex].chamberTempK ?? 3500) : 0,
      // Sutton-Graves form (proportional): stagnation heating rises with v³
      // but needs air (√ρ), so it peaks inside the atmosphere then vanishes.
      aeroHeatFlux: Math.sqrt(rho) * airspeed * airspeed * airspeed,
      // Running Δv-loss ledger (m·s⁻¹ → km·s⁻¹), snapshotted each sample so the
      // ledger layer can read the live tally at any scrubbed time t.
      lossGravityKms: losses.gravity / 1000,
      lossDragKms: losses.drag / 1000,
      lossSteeringKms: losses.steering / 1000,
    };
  };

  const pushEvent = (type: AscentEvent['type'], note?: string, silent = false): void => {
    const s = snapshot();
    events.push({
      type,
      t,
      altKm: s.altKm,
      speedKms: s.speedKms,
      massKg: s.massKg,
      note,
      ...(silent ? { silent: true } : {}),
    });
  };
  // A spent stage that rides on for `separationDelayS` after its cutoff (the Shuttle's tank).
  let sepPendingAtS = -1;

  // Liftoff: engine lit at full stage-0 (+ booster) thrust so the t=0 snapshot
  // isn't engine-dark before the loop first updates lastThrust.
  lastThrust =
    (coreIgnitionS <= 0
      ? stageThrustN(profile.stages[0], 0) * throttleLevel(profile.stages[0], 0)
      : 0) +
    groups.reduce(
      (k, g) => k + (groupLit(g) ? stageThrustN(g.stage, 0) * groupMultiplier(g, 0) : 0),
      0,
    );
  pushEvent('liftoff');
  states.push(snapshot());
  let nextSampleT = sampleDt;

  while (t < maxT) {
    // Radial frame — the honest curved-Earth geometry. Position from the
    // centre is (x, y+R⊕); local vertical points radially out, local
    // horizontal (downrange) is perpendicular to it. Gravity always pulls
    // toward the centre, so elliptical orbits + circularisation are inherent.
    const ry = y + R_EARTH_M;
    const r = Math.hypot(x, ry) || R_EARTH_M;
    const alt = r - R_EARTH_M;
    const upX = x / r;
    const upY = ry / r;
    const horizX = upY; // local horizontal, +downrange
    const horizY = -upX;
    const g = gravity(alt);
    const rho = airDensity(alt);
    const speed = Math.hypot(vx, vy);
    const m = currentMass();
    const velUp = vx * upX + vy * upY; // radial (vertical) speed
    const horizSpeed = vx * horizX + vy * horizY; // downrange speed

    // Osculating orbit's perigee + apoapsis — the orbit gate fires when perigee
    // is a stable, non-decaying altitude. velHoriz is the tangential speed, so
    // h = r·velHoriz. Apoapsis drives the PEG coast-to-apoapsis rule.
    const energy = (speed * speed) / 2 - MU_EARTH_M3_S2 / r;
    let perigeeAltM = -Infinity;
    let apoapsisAltM = Infinity;
    if (energy < 0) {
      const hMom = r * horizSpeed;
      const semiMajor = -MU_EARTH_M3_S2 / (2 * energy);
      const ecc = Math.sqrt(
        Math.max(0, 1 + (2 * energy * hMom * hMom) / (MU_EARTH_M3_S2 * MU_EARTH_M3_S2)),
      );
      perigeeAltM = semiMajor * (1 - ecc) - R_EARTH_M;
      apoapsisAltM = semiMajor * (1 + ecc) - R_EARTH_M;
    }

    // Strap-on boosters (fire in parallel with stage 0 along the body axis).
    const litGroups = stageIndex === 0 ? groups.filter(groupLit) : [];
    for (const g of litGroups) g.litAt ??= t;
    const boostThrust = litGroups.reduce(
      (k, g) => k + stageThrustN(g.stage, alt) * groupMultiplier(g, alt),
      0,
    );
    // Core thrust IF the engine is lit (propellant remaining on the active stage).
    // Direct insertion: the core stage cuts off on its insertion orbit, before depletion.
    if (
      directInsertion &&
      !stageCutOff &&
      stageIndex >= 0 &&
      stageIndex < profile.stages.length - 1 &&
      alt > GUIDANCE.handoverAltM &&
      speed >= mecoState!.speed
    ) {
      stageCutOff = true;
    }
    const coreThrustLit =
      stageIndex >= 0 &&
      remainingProp > 0 &&
      !stageCutOff &&
      !(t < (stageIndex === 0 ? coreIgnitionS : (profile.stages[stageIndex].ignitionS ?? 0)))
        ? coreThrustAt(alt, m, boostThrust)
        : 0;

    // Guidance. Below the handover the aero-safe pitch table drives the gravity
    // turn; above it, adequately-powered stages + all lower stages use the
    // closed-loop apoapsis-raise/altitude-hold heuristic. The FINAL stage above
    // the handover flies PEG (RFC-034 §5.1 · #416) — the only law that closes a
    // very-low-TWR upper stage — with a coast-to-apoapsis + relight for a stage
    // that can't circularise in one continuous burn. PEG only STEERS; the honest
    // perigee gate below still decides SECO + reachedOrbit.
    const isFinalStage = stageIndex === profile.stages.length - 1;
    const targetAltM =
      circulariseAtM ??
      mecoTarget?.apogeeAltM ??
      profile.injectionOrbit?.perigeeAltM ??
      profile.targetOrbitAltM ??
      GUIDANCE.targetAltM;
    let pitch: number;
    let engineOn: boolean; // set by every guidance branch below

    // The heuristic altitude-hold flies every ADEQUATELY-powered final stage to
    // orbit. It only fails for a very-low-TWR upper stage (Centaur ~0.3 TWR),
    // where holding altitude at apoapsis demands `sinγ > 1` — the stage saturates
    // and sinks. So: run the heuristic by default; the instant its circularise
    // command provably saturates, LATCH onto PEG for the rest of the stage (no
    // vehicle list, no chatter). PEG then flies the lofted low-TWR insertion.
    if (
      circulariseAtM == null &&
      !pegLatched &&
      isFinalStage &&
      coreThrustLit > 0 &&
      alt > GUIDANCE.handoverAltM
    ) {
      if (profile.loftBoost) {
        // Lofted low-TWR upper stage: we know it's PEG's job — latch on ignition.
        pegLatched = true;
      } else if (energy < 0 && apoapsisAltM >= targetAltM) {
        // Otherwise latch only when the heuristic altitude-hold provably saturates.
        const aDes = GUIDANCE.kAlt * (targetAltM - alt) - GUIDANCE.kVy * velUp;
        const gDeficit = g - (horizSpeed * horizSpeed) / r;
        if ((aDes + gDeficit) / (coreThrustLit / m) > 0.98) pegLatched = true;
      }
    }

    if (raisingApogee && isFinalStage && coreThrustLit > 0) {
      // Apogee raise: burn prograde (along the velocity) until the apogee reaches the target.
      pitch = Math.atan2(velUp, Math.abs(horizSpeed));
      engineOn = true;
    } else if (mecoState && !isFinalStage && coreThrustLit > 0 && alt > GUIDANCE.handoverAltM) {
      // Direct insertion: the core steers (PEG, linear tangent) to the MECO state. Blended in
      // from the pitch table like the heuristic so the command does not step.
      const ve = stageIspS(profile.stages[stageIndex], alt) * G0;
      const a = (coreThrustLit + boostThrust) / m;
      const mdot = coreThrustLit / ve;
      const maxBurnS = mdot > 0 ? remainingProp / mdot : 0;
      const frozen = peg?.ok === true && peg.tgo < PEG.freezeTgoS;
      if (!frozen && (t - pegSolveT >= PEG.majorCycleS || !peg?.ok)) {
        peg = pegSolve(
          r,
          velUp,
          Math.abs(horizSpeed),
          a,
          ve,
          g,
          R_EARTH_M + mecoTarget!.altM,
          mecoState.vh,
          maxBurnS,
          peg,
          mecoState.vr,
        );
        pegSolveT = t;
      }
      const guided = peg?.ok
        ? pegPitchRad(peg, t - pegSolveT)
        : Math.atan2(velUp, Math.abs(horizSpeed));
      const table = pitchAngleRad(profile, t);
      const blend = Math.max(0, Math.min(1, (alt - GUIDANCE.handoverAltM) / GUIDANCE.blendM));
      pitch = table * (1 - blend) + guided * blend;
      engineOn = true;
    } else if (circulariseAtM != null && isFinalStage && coreThrustLit > 0) {
      // Direct insertion, OMS-2: coast to apoapsis, light half the burn before it (the burn is
      // the circularising Δv there over the stage's acceleration), burn prograde to circular.
      const vhAbs = Math.abs(horizSpeed);
      const rA = R_EARTH_M + circulariseAtM;
      const dvCirc = Math.max(0, Math.sqrt(MU_EARTH_M3_S2 / rA) - (r * vhAbs) / rA);
      const burnS = (dvCirc * m) / coreThrustLit;
      if (!insertionBurnLit && (timeToApoapsisS(r, velUp, vhAbs) <= burnS / 2 || velUp <= 0)) {
        insertionBurnLit = true;
        // the apogee it lights at (drag trims it on the coast); an unbound orbit keeps the target
        if (Number.isFinite(apoapsisAltM)) circulariseAtM = apoapsisAltM;
        pushEvent('insertion_burn', profile.stages[stageIndex].name);
      }
      pitch = Math.atan2(velUp, vhAbs);
      engineOn = insertionBurnLit;
    } else if (pegLatched && isFinalStage && coreThrustLit > 0) {
      const ve = stageIspS(profile.stages[stageIndex], alt) * G0;
      const a = coreThrustLit / m;
      const mdot = coreThrustLit / ve;
      const maxBurnS = mdot > 0 ? remainingProp / mdot : 0;
      // A lofted stage circularises at the altitude it lofted to (its apoapsis),
      // not the nominal low target it has already climbed past.
      const circAltM = profile.loftBoost ? Math.max(targetAltM, apoapsisAltM - 10_000) : targetAltM;
      const rT = R_EARTH_M + circAltM;
      const vhT = Math.sqrt(MU_EARTH_M3_S2 / rT);
      const vhAbs = Math.abs(horizSpeed);

      // Coast-to-apoapsis + relight: if apoapsis is at/above target but we're
      // still more than half the remaining burn away from it, coast so the burn
      // centres on apoapsis; relight when time-to-apoapsis drops to tgo/2.
      // A lofted-boost vehicle ignites its upper stage still climbing (apoapsis
      // ahead) and burns continuously — no coast (coasting toward apoapsis would
      // re-create the dead at-apoapsis state the loft exists to avoid).
      const tApo = timeToApoapsisS(r, velUp, vhAbs);
      const tgo = peg?.ok ? peg.tgo : maxBurnS;
      if (
        !profile.loftBoost &&
        !coasting &&
        apoapsisAltM >= targetAltM &&
        tApo > tgo / 2 + PEG.coastGuardS
      ) {
        coasting = true;
      } else if (coasting && tApo <= tgo / 2) {
        coasting = false;
      }

      if (coasting) {
        engineOn = false;
        pitch = lastPitch; // hold attitude, engine dark
      } else {
        // Major cycle: re-solve unless inside the near-burnout freeze band (the
        // 2×2 goes singular as tgo → 0 — hold the last coefficients).
        const frozen = peg?.ok === true && peg.tgo < PEG.freezeTgoS;
        if (!frozen && (t - pegSolveT >= PEG.majorCycleS || !peg?.ok)) {
          peg = pegSolve(r, velUp, vhAbs, a, ve, g, rT, vhT, maxBurnS, peg);
          pegSolveT = t;
        }
        pitch = peg?.ok ? pegPitchRad(peg, t - pegSolveT) : Math.atan2(velUp, vhAbs);
        engineOn = true;
      }
    } else if (stageIndex >= 0 && stageIndex < (profile.pitchTableStages ?? 0)) {
      // A lower stage that flies its pitch table all the way (the published trajectory), not the
      // closed-loop raise / altitude-hold.
      pitch = pitchAngleRad(profile, t);
      engineOn = coreThrustLit > 0;
    } else if (profile.loftBoost && !isFinalStage && alt > GUIDANCE.handoverAltM) {
      // Lofted boost (#416): fly near-prograde but steer the burnout GEOMETRY —
      // keep the time-to-apoapsis near a reference so the low-TWR upper stage
      // stages while still CLIMBING with apoapsis a useful runway ahead (not at
      // apoapsis, and not over-lofted so the core arcs over and descends). A
      // small feedback around prograde (±12°) keeps steering loss cosine-small.
      const tApo = timeToApoapsisS(r, velUp, Math.max(1, Math.abs(horizSpeed)));
      const prograde = Math.atan2(velUp, Math.max(1, Math.abs(horizSpeed)));
      const guided = Math.max(
        prograde - 0.21,
        Math.min(
          prograde + 0.21,
          prograde + PEG.loftTApoGainRadPerS * ((profile.loftTApoRefS ?? PEG.loftTApoRefS) - tApo),
        ),
      );
      const table = pitchAngleRad(profile, t);
      const blend = Math.max(0, Math.min(1, (alt - GUIDANCE.handoverAltM) / GUIDANCE.blendM));
      pitch = table * (1 - blend) + guided * blend;
      engineOn = coreThrustLit > 0;
    } else {
      // Table (low) / heuristic (raise + adequately-powered circularise).
      pitch = commandedPitchRad(
        profile,
        t,
        alt,
        velUp,
        Math.abs(horizSpeed),
        (coreThrustLit + boostThrust) / m,
      );
      engineOn = coreThrustLit > 0;
    }

    const coreThrust = engineOn ? coreThrustLit : 0;
    const thrust = coreThrust + boostThrust;
    lastPitch = pitch;
    lastThrust = thrust; // HUD reads the real delivered thrust (0 on coast, B2/S3)
    lastCoreLit = coreThrust > 0;
    const thrustDirX = Math.cos(pitch) * horizX + Math.sin(pitch) * upX;
    const thrustDirY = Math.cos(pitch) * horizY + Math.sin(pitch) * upY;

    // Drag acts on AIR-relative velocity — the atmosphere co-rotates eastward
    // with Earth (≈ siteSpeed downrange), so the pad's rotation velocity is not
    // airspeed and must not register dynamic pressure. Below ~90 km (where drag
    // matters) the co-rotation speed is ≈ siteSpeed.
    const vRelX = vx - siteSpeed * horizX;
    const vRelY = vy - siteSpeed * horizY;
    const airspeed = Math.hypot(vRelX, vRelY);
    const q = dynamicPressure(rho, airspeed);
    const drag = q * cd * refArea;
    const dragDirX = airspeed > 1e-6 ? -vRelX / airspeed : 0;
    const dragDirY = airspeed > 1e-6 ? -vRelY / airspeed : 0;

    // Net acceleration (m·s⁻²): thrust + drag + gravity toward Earth's centre.
    const ax = (thrust * thrustDirX + drag * dragDirX) / m - g * upX;
    const ay = (thrust * thrustDirY + drag * dragDirY) / m - g * upY;

    // Δv-loss bookkeeping — accumulated over POWERED flight only (a loss is
    // Δv you spend and don't get back; a ballistic coast spends none).
    if (thrust > 0) {
      // Gravity loss integrates g·sin(flight-path angle) — the flight-path
      // angle here is relative to the LOCAL horizontal (velUp / speed).
      losses.gravity += g * (speed > 1e-3 ? velUp / speed : Math.sin(pitch)) * dt;
      losses.drag += (drag / m) * dt;
      // Steering (cosine) loss is measured against the AIR-relative velocity, not
      // inertial — at liftoff the vehicle already carries Earth's horizontal
      // rotation speed, so booking thrust-vs-inertial-velocity would charge a
      // huge phantom steering loss for simply thrusting straight up. Air-relative
      // is ~0 on the pad and aligns with the flight path through the ascent.
      if (airspeed > 1e-3) {
        const cosAlpha = (thrustDirX * vRelX + thrustDirY * vRelY) / airspeed; // thrust·v̂_air
        losses.steering += (thrust / m) * (1 - Math.max(-1, Math.min(1, cosAlpha))) * dt;
      }
    }

    // Semi-implicit Euler: velocity then position.
    vx += ax * dt;
    vy += ay * dt;

    // On the pad: an underpowered (TWR<1) stack can't sink through the ground.
    if (alt <= 0 && velUp < 0) {
      vx = 0;
      vy = 0;
    }
    x += vx * dt;
    y += vy * dt;

    // Burn propellant (mdot = T / (Isp·g₀)) — core and boosters separately,
    // since they run different Isp.
    if (coreThrust > 0) {
      remainingProp -= (coreThrust / (stageIspS(profile.stages[stageIndex], alt) * G0)) * dt;
    }
    // Each lit group burns its own propellant (shared Isp); a spent group jettisons while
    // the core fires on.
    for (const g of litGroups) {
      g.prop -=
        ((stageThrustN(g.stage, alt) * groupMultiplier(g, alt)) / (stageIspS(g.stage, alt) * G0)) *
        dt;
    }
    for (const g of groups) {
      if (!g.dropped && g.prop <= 0) {
        g.burnoutAt ??= t + (profile.boosters?.separationDelayS ?? 0);
        if (t < g.burnoutAt) continue;
        g.dropped = true;
        pushEvent(
          'staging',
          groups.length > 1
            ? `${g.stage.name} (${g.air ? 'air-lit' : 'ground-lit'})`
            : g.stage.name,
        );
      }
    }
    t += dt;

    // Max-Q tracking.
    if (q > maxQ.qPa) maxQ = { t, altKm: alt / 1000, qPa: q };

    // Stage burnout → jettison + advance.
    if (stageIndex >= 0 && (remainingProp <= 0 || stageCutOff)) {
      const isLast = stageIndex >= profile.stages.length - 1;
      const delayS = isLast ? 0 : (profile.stages[stageIndex].separationDelayS ?? 0);
      if (!mecoSeen && !isLast) {
        pushEvent('meco', profile.stages[stageIndex].name);
        mecoSeen = true;
      }
      if (delayS > 0 && sepPendingAtS < 0) sepPendingAtS = t + delayS;
      if (sepPendingAtS >= 0 && t < sepPendingAtS) {
        // cut off, tank still attached: coast until it separates
      } else {
        sepPendingAtS = -1;
        pushEvent(
          isLast ? 'seco' : 'staging',
          profile.stages[stageIndex].name,
          isLast && profile.payloadInBay === true,
        );
        if (isLast) {
          stageIndex = -1; // all propellant spent → coast
          secoT = t;
        } else {
          stageIndex += 1;
          remainingProp = stagePropellant(profile.stages[stageIndex]); // the residual leaves with the spent stage
          stageCutOff = false;
          if (directInsertion && stageIndex === profile.stages.length - 1) {
            circulariseAtM = Number.isFinite(apoapsisAltM) ? apoapsisAltM : null;
          }
          if (directInsertion) {
            peg = null; // the core's MECO solution is not the orbiter's
            pegSolveT = -Infinity;
          }
        }
      }
    }

    // Fairing jettison once above the atmosphere.
    if (
      fairingOn &&
      (profile.fairingJettisonS != null ? t >= profile.fairingJettisonS : alt >= fairingJettAlt)
    ) {
      fairingOn = false;
      pushEvent('fairing_jettison');
    }

    // Orbit gate: the osculating orbit's PERIGEE has climbed to a stable
    // altitude → a real, non-decaying orbit (works identically for a high-TWR
    // direct ascent and a low-TWR stage that circularises over a long burn). A
    // real vehicle cuts the final stage off ON TARGET here (SECO), keeping a
    // propellant margin rather than burning to depletion.
    if (!orbitSeen && alt >= KARMAN_LINE_M && perigeeAltM >= PERIGEE_TARGET_M) {
      pushEvent('orbit');
      orbitSeen = true;
      reachedOrbit = true;
      if (stageIndex === profile.stages.length - 1 && !directInsertion && profile.injectionOrbit) {
        raisingApogee = true;
      } else if (stageIndex === profile.stages.length - 1 && !directInsertion) {
        pushEvent(
          'seco',
          `${profile.stages[stageIndex].name} — orbit`,
          profile.payloadInBay === true,
        );
        stageIndex = -1; // SECO on target; residual propellant is margin
        secoT = t;
      }
    }

    // Elliptical injection: the apogee raise ends on the target apogee; an escape injection on
    // the target C3 (twice the specific orbital energy).
    const inj = profile.injectionOrbit;
    if (
      raisingApogee &&
      secoT < 0 &&
      stageIndex === profile.stages.length - 1 &&
      inj &&
      ((inj.apogeeAltM != null && apoapsisAltM >= inj.apogeeAltM) ||
        (inj.c3Km2S2 != null && (2 * energy) / 1e6 >= inj.c3Km2S2))
    ) {
      pushEvent('seco', `${profile.stages[stageIndex].name} — injection orbit`);
      stageIndex = -1;
      secoT = t;
    }

    // Direct insertion: the circularising burn ends once the orbit is circular at the target
    // (its perigee within 2 km of the apoapsis target), not at the first stable perigee.
    if (
      directInsertion &&
      secoT < 0 &&
      stageIndex === profile.stages.length - 1 &&
      perigeeAltM >= (circulariseAtM ?? mecoTarget!.apogeeAltM) - 2_000
    ) {
      pushEvent(
        'seco',
        `${profile.stages[stageIndex].name} — circular`,
        profile.payloadInBay === true,
      );
      stageIndex = -1;
      secoT = t;
    }

    // Orbit already reached on an EARLIER stage (SLS: the core stage alone inserts Orion +
    // ICPS): the final stage has no insertion left to fly. Hold it dark — its propellant is
    // for the later injection burn (the scene's injection beat) — instead of letting it burn
    // to depletion onto an escape path, which nothing else would ever cut off.
    if (
      !directInsertion &&
      !raisingApogee &&
      orbitSeen &&
      secoT < 0 &&
      stageIndex === profile.stages.length - 1
    ) {
      // The Shuttle reaches orbit on its main engines: its orbiter's held engines are no SECO
      // beat either (silent, as at the end of its powered flight).
      pushEvent(
        'seco',
        `${profile.stages[stageIndex].name} — held for injection`,
        profile.payloadInBay === true,
      );
      stageIndex = -1;
      secoT = t;
    }

    // Soft-insertion floor (#416): a very-low-TWR final stage whose PEG solve
    // can't close the orbit from the energy state its boost phase delivered
    // still can't circularise. Rather than burn on into a re-entry / crater, cut
    // the engine once it's over the top (descending, above the Kármán line, on a
    // still-sub-orbital arc) and hand off to /fly there. reachedOrbit stays
    // honestly false — no orbit was achieved, no data faked.
    // Only fire when the insertion is genuinely unrecoverable — descending back
    // toward the atmosphere. A high-altitude dip during a low-TWR circularisation
    // is FREE (altitude converts to speed at no Δv cost) and must be allowed to
    // recover; cutting it there manufactured the huge steering loss (#416).
    if (
      !orbitSeen &&
      stageIndex === profile.stages.length - 1 &&
      alt < KARMAN_LINE_M + 30_000 &&
      velUp < -150 &&
      perigeeAltM < 0
    ) {
      pushEvent('seco', `${profile.stages[stageIndex].name} — apoapsis (insertion pending PEG)`);
      stageIndex = -1;
      secoT = t;
    }

    // Sample the trajectory.
    if (t >= nextSampleT) {
      states.push(snapshot());
      nextSampleT += sampleDt;
    }

    // Once all stages are spent, render a bounded serene coast, then stop
    // (or stop early if the vehicle falls back to the ground).
    if (stageIndex < 0) {
      if (secoT < 0) secoT = t;
      // A genuine orbit holds altitude through the coast; a soft-insertion is
      // sub-orbital and sinks — end it once it drops back toward the atmosphere
      // so the /fly handoff happens in space, not part-way down.
      const softSinking = !reachedOrbit && alt < KARMAN_LINE_M + 20_000;
      if (t - secoT >= POST_SECO_COAST_S || (alt <= 0 && t > 1) || softSinking) break;
    }
  }

  const final = snapshot();
  states.push(final);
  setDrawnAttitude(states);

  return {
    states,
    events,
    maxQ,
    finalAltKm: final.altKm,
    finalSpeedKms: final.speedKms,
    reachedOrbit,
    losses: {
      gravityKms: losses.gravity / 1000,
      dragKms: losses.drag / 1000,
      steeringKms: losses.steering / 1000,
    },
    idealDvKms: stackIdealDv(profile) / 1000,
    siteRotationCreditKms: siteSpeed / 1000,
    totalDurationS: final.t,
  };
}

/**
 * The angle the drawn vehicle's body makes with local vertical (rad): the commanded thrust
 * direction, which is where the engines point. Not the INERTIAL velocity: the pad already
 * carries Earth's ~0.4 km/s eastward rotation, so that vector is nearly horizontal at liftoff
 * and drawing the body along it laid the rocket flat right off the pad.
 */
export function bodyAngleFromVerticalRad(s: AscentState): number {
  return Math.min(Math.PI, Math.max(0, Math.PI / 2 - (s.attitudeRad ?? s.pitchRad)));
}

/** Fastest the drawn body turns (rad/s) — about what a real vehicle's attitude control slews. */
export const DRAWN_ATTITUDE_RATE_RAD_S = (3 * Math.PI) / 180;

/**
 * Fill `attitudeRad` on every sampled state: the commanded pitch, rate-limited. The guidance
 * steps when a stage takes over or PEG re-solves (66° → 104° → 71° at a Falcon 9 staging);
 * drawn literally the craft snaps. Computed once over the samples, so scrubbing stays exact.
 */
function setDrawnAttitude(states: AscentState[]): void {
  let prev: AscentState | null = null;
  for (const s of states) {
    if (!prev || prev.attitudeRad == null) {
      s.attitudeRad = s.pitchRad;
    } else {
      const max = DRAWN_ATTITUDE_RATE_RAD_S * Math.max(0, s.t - prev.t);
      s.attitudeRad =
        prev.attitudeRad + Math.max(-max, Math.min(max, s.pitchRad - prev.attitudeRad));
    }
    prev = s;
  }
}

/**
 * Linear-interpolate a trajectory state at time `t` (s) from the sampled
 * `states` (ascending in t). Clamps to the endpoints. Lets the render /
 * scrubber read a smooth state at any clock position between samples.
 */
export function sampleAscentAt(states: AscentState[], t: number): AscentState {
  if (states.length === 0) throw new Error('sampleAscentAt: empty trajectory');
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
    downrangeKm: lerp(a.downrangeKm, b.downrangeKm),
    speedKms: lerp(a.speedKms, b.speedKms),
    velUpKms: lerp(a.velUpKms, b.velUpKms),
    massKg: lerp(a.massKg, b.massKg),
    stageIndex: f < 0.5 ? a.stageIndex : b.stageIndex,
    qPa: lerp(a.qPa, b.qPa),
    twr: lerp(a.twr, b.twr),
    thrustN: lerp(a.thrustN, b.thrustN),
    dragN: lerp(a.dragN, b.dragN),
    pitchRad: lerp(a.pitchRad, b.pitchRad),
    propRemainingKg: lerp(a.propRemainingKg, b.propRemainingKg),
    boosterPropRemainingKg: lerp(a.boosterPropRemainingKg, b.boosterPropRemainingKg),
    boostersActive: f < 0.5 ? a.boostersActive : b.boostersActive,
    boostersLit: f < 0.5 ? a.boostersLit : b.boostersLit,
    coreLit: f < 0.5 ? a.coreLit : b.coreLit,
    airLitBurning: f < 0.5 ? a.airLitBurning : b.airLitBurning,
    chamberTempK: f < 0.5 ? a.chamberTempK : b.chamberTempK,
    aeroHeatFlux: lerp(a.aeroHeatFlux, b.aeroHeatFlux),
    lossGravityKms: lerp(a.lossGravityKms, b.lossGravityKms),
    lossDragKms: lerp(a.lossDragKms, b.lossDragKms),
    lossSteeringKms: lerp(a.lossSteeringKms, b.lossSteeringKms),
    ...(a.attitudeRad != null && b.attitudeRad != null
      ? { attitudeRad: lerp(a.attitudeRad, b.attitudeRad) }
      : {}),
  };
}

// ─── /plan reuse: headless take-off summary (RFC-034 L-I / S10) ──────

/** Compact take-off planning summary — the shape /plan consumes. */
export interface AscentPlanSummary {
  /** Ideal Δv the stack can supply (km·s⁻¹) — Tsiolkovsky, vacuum Isp. */
  idealDvKms: number;
  /** Δv actually required to reach orbit = local circular speed + losses (km·s⁻¹). */
  dvRequiredKms: number;
  /** idealDv − dvRequired (km·s⁻¹). Positive ⇒ the vehicle closes orbit with margin. */
  payloadMarginKms: number;
  losses: { gravityKms: number; dragKms: number; steeringKms: number };
  reachedOrbit: boolean;
  finalAltKm: number;
  finalSpeedKms: number;
}

/**
 * Headless take-off summary for the /plan configurator — "can this
 * rocket lift this payload to orbit, and with how much margin?" Reuses
 * the same integrator as Scene 0 (RFC-034 L-I): no rendering, just the
 * planning numbers.
 */
export function ascentToOrbit(profile: LaunchProfile, opts?: AscentOptions): AscentPlanSummary {
  const s = integrateAscent(profile, opts);
  const totalLossKms = s.losses.gravityKms + s.losses.dragKms + s.losses.steeringKms;
  // Δv the rocket must supply = orbital speed at the ACTUAL target altitude
  // (not a fixed 200 km ref) + losses − the free launch-site rotation credit the
  // vehicle already carries off the pad (M2 — was inconsistent on both terms).
  const targetAltM = profile.targetOrbitAltM ?? GUIDANCE.targetAltM;
  const dvRequiredKms = circularSpeed(targetAltM) / 1000 + totalLossKms - s.siteRotationCreditKms;
  return {
    idealDvKms: s.idealDvKms,
    dvRequiredKms,
    payloadMarginKms: s.idealDvKms - dvRequiredKms,
    losses: s.losses,
    reachedOrbit: s.reachedOrbit,
    finalAltKm: s.finalAltKm,
    finalSpeedKms: s.finalSpeedKms,
  };
}

/** Seconds from SECO to spacecraft separation for this mission on this vehicle (plan L63). */
export function payloadSeparationDelayFor(
  profile: Pick<LaunchProfile, 'payloadSeparationDelayS' | 'payloadSeparationDelayByMissionS'>,
  missionId: string | undefined,
): number | undefined {
  return (
    (missionId ? profile.payloadSeparationDelayByMissionS?.[missionId] : undefined) ??
    profile.payloadSeparationDelayS
  );
}

/** Seconds of landing burn before touchdown where a flight's start is not published (0.9.11 F2:
 *  Psyche's side boosters burned 17 s, Inspiration4's booster 27 s). */
export const LANDING_BURN_DEFAULT_S = 25;
/** The landing inset stays open this long after touchdown. */
export const LANDING_HOLD_S = 4;

/** When the flight's last landing inset closes (0 without landings): the launch act runs at
 *  least this long, so a booster that lands after the injection beat is still seen. */
export function landingsEndS(landings: { touchdownS: number }[]): number {
  return landings.length ? Math.max(...landings.map((l) => l.touchdownS)) + LANDING_HOLD_S : 0;
}

/** How a recovered part comes home on this flight, or that it is expended (0.9.11 F2). */
export function recoveryFor(
  profile: Pick<LaunchProfile, 'recovery' | 'recoveryByMission'>,
  missionId: string | undefined,
): PartRecovery[] {
  return (missionId ? profile.recoveryByMission?.[missionId] : undefined) ?? profile.recovery ?? [];
}

/** The landed or caught parts of a flight, with the landing-burn start filled in. */
export function landingsFor(
  profile: Pick<LaunchProfile, 'recovery' | 'recoveryByMission'>,
  missionId: string | undefined,
): (PartRecovery & { touchdownS: number; landingBurnS: number })[] {
  return recoveryFor(profile, missionId)
    .filter((r) => r.outcome !== 'expended' && r.touchdownS != null)
    .map((r) => ({
      ...r,
      touchdownS: r.touchdownS!,
      landingBurnS: r.landingBurnS ?? r.touchdownS! - LANDING_BURN_DEFAULT_S,
    }));
}
