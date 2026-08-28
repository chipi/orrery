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
  LEO_REF_ALT_M,
  MU_EARTH_M3_S2,
  N_PER_KN,
  R_EARTH_M,
  SEA_LEVEL_DENSITY_KGM3,
  SEA_LEVEL_PRESSURE_PA,
} from './ascent-physics-constants';

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
}

/** A launch vehicle's ascent profile. See RFC-034 §6 for the shipped JSON schema. */
export interface LaunchProfile {
  id: string;
  name: string;
  /** Lower → upper. Stage 0 ignites at liftoff. */
  stages: LaunchStage[];
  /** Strap-on boosters that fire in parallel with stage 0, then jettison. */
  boosters?: LaunchBoosters;
  /** Payload mass carried all the way to orbit (kg). */
  payloadKg: number;
  /** Fairing mass (kg), jettisoned once out of the atmosphere. */
  fairingKg?: number;
  /** Altitude to jettison the fairing (m). Defaults to the Kármán line. */
  fairingJettisonAltM?: number;
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
  /** Propellant remaining in the active stage (kg); 0 while coasting. */
  propRemainingKg: number;
  /** Strap-on booster propellant remaining (kg); 0 when there are none or they're spent. */
  boosterPropRemainingKg: number;
  /** True while the strap-on boosters are lit (stage-0 parallel-boost phase). */
  boostersActive: boolean;
  /** Combustion-chamber temperature (K) while firing; 0 when the engine is off. */
  chamberTempK: number;
  /**
   * Stagnation aerodynamic heating proxy ∝ √ρ·v³ (Sutton-Graves form).
   * PROPORTIONAL, arbitrary units — NOT calibrated W·m⁻²; use only for
   * relative HUD gauges (peaks after Max-Q), never as an absolute flux.
   */
  aeroHeatFlux: number;
  /** Running Δv gravity loss to this instant (km·s⁻¹). Monotonic non-decreasing;
   *  the final sample equals `AscentSummary.losses.gravityKms`. For the ledger. */
  lossGravityKms: number;
  /** Running Δv drag loss to this instant (km·s⁻¹). Monotonic non-decreasing. */
  lossDragKms: number;
  /** Running Δv steering loss to this instant (km·s⁻¹). Monotonic non-decreasing. */
  lossSteeringKms: number;
}

/** A discrete ascent beat (liftoff, staging, Max-Q, MECO, SECO, …). */
export interface AscentEvent {
  type: 'liftoff' | 'max_q' | 'staging' | 'meco' | 'fairing_jettison' | 'seco' | 'orbit';
  t: number;
  altKm: number;
  speedKms: number;
  massKg: number;
  /** Free-text detail (e.g. which stage). */
  note?: string;
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
  for (let i = 0; i < profile.stages.length; i++) {
    const s = profile.stages[i];
    const above = upperMass(i + 1);
    const m0 = above + s.wetKg;
    const mf = above + s.dryKg;
    dv += tsiolkovskyDv(s.ispVacS, m0, mf);
  }
  // Strap-on boosters add Δv over the parallel boost phase (burning against
  // the full stack) — approximate, for the HUD's ideal-Δv readout.
  if (profile.boosters) {
    const b = combinedBoosterStage(profile.boosters);
    const full = upperMass(0) + b.wetKg;
    dv += tsiolkovskyDv(b.ispVacS, full, full - stagePropellant(b));
  }
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

/**
 * PEG tuning — ONE shared set, never per vehicle. The altitude-hold law above
 * demands *instantaneous* altitude hold (`sinγ = (aDes + gDeficit)/a`); a
 * Centaur-class final stage (~0.3 TWR) can only satisfy the altitude constraint
 * *integrated over the whole burn* — a lofted arc that dips through apoapsis
 * while horizontal speed builds. That two-point boundary problem is PEG:
 * linear-tangent steering (`sinγ` linear in time) with a gravity/centrifugal
 * feed-forward, solved each major cycle. PEG only STEERS — the honest osculating
 * perigee gate in `integrateAscent` still decides SECO + `reachedOrbit`, so a
 * guidance error can never fabricate an orbit.
 */
export const PEG = {
  /** Major guidance cycle (s): re-solve A,B,tgo this often, not every step. */
  majorCycleS: 1,
  /** Freeze A,B when time-to-go drops below this — the 2×2 goes singular near burnout. */
  freezeTgoS: 8,
  /** Cap |sin(pitch)| ≈ 30°. Above this the prograde (speed-building) component
   *  collapses (cos 0.5 → 87% of thrust wasted vertically) and a low-TWR stage
   *  pins itself up while not accelerating. A stage that can't hold with 30° of
   *  up-pitch should be allowed to dip (a dip is free — altitude converts to
   *  speed at zero Δv cost); only the atmosphere/ground is fatal. */
  maxSinPitch: 0.5,
  /** Coast-to-apoapsis hysteresis (s) — only coast if apoapsis is comfortably
   *  more than half the remaining burn away, so the relight centres the burn. */
  coastGuardS: 60,
  /** Lofted-boost target time-to-apoapsis (s) at the boost stage: hold the
   *  burnout runway near this so the upper stage stages climbing with apoapsis
   *  a useful distance ahead — not at apoapsis, not over-lofted into a descent. */
  loftTApoRefS: 105,
  /** Feedback gain (rad per second of time-to-apoapsis error) around prograde. */
  loftTApoGainRadPerS: 0.002,
};

/** Solved linear-tangent steering coefficients + predicted time-to-go. */
export interface PegState {
  /** sin(pitch) intercept at the solve instant (feed-forward removed). */
  A: number;
  /** sin(pitch) slope (s⁻¹). */
  B: number;
  /** Predicted time-to-go to cutoff (s). */
  tgo: number;
  /** Whether the last solve produced a usable A,B (else hold the prior). */
  ok: boolean;
}

/**
 * Solve the linear-tangent radial boundary problem at the current instant.
 * Pure. Steers so the RADIAL channel hits `(r=rT, vr=0)` over the remaining
 * burn while the horizontal channel builds circular speed. `prior` warm-starts
 * the iteration (pass `null` on the first PEG cycle). Returns updated {A,B,tgo}.
 *
 * Pure linear-tangent steering `sin(pitch) = A + B·t` (NO pointwise gravity
 * feed-forward — that pins a low-TWR stage at max-up pitch and it sinks, the
 * very failure we're fixing). Gravity enters as a PREDICTED integral on the
 * boundary RHS (the "gravity integral"), computed by numerically integrating
 * the predicted trajectory forward each cycle with the current steering — the
 * crude analytic `½·gDeficit·T` estimate over-predicts the fall for a stage
 * that must dip and recover, forcing an infeasible up-pitch. Radial boundary
 * (mass-depleting thrust integrals):
 *   Δv_r:  A·b0 + B·b1 = (0 − v_r) + G_r
 *   Δr:    A·c0 + B·c1 = (r_T − r − v_r·T) + G_pos
 * where `G_r = ∫₀ᵀ (g − v_h²/r) dt` and `G_pos = ∫₀ᵀ ∫₀ᵗ (g − v_h²/r)` along the
 * PREDICTED path. Time-to-go from the horizontal angular-momentum channel.
 */
export function pegSolve(
  r: number,
  vr: number,
  vh: number,
  a: number,
  ve: number,
  g: number,
  rT: number,
  vhT: number,
  maxBurnS: number,
  prior: PegState | null,
): PegState {
  if (a <= 1e-6 || ve <= 1e-6) return prior ?? { A: 0, B: 0, tgo: 0, ok: false };
  const tau = ve / a; // mass-flow time constant (a(t) = a/(1 − t/τ))
  const capT = Math.max(0.1, Math.min(0.98 * tau, maxBurnS));

  let T = prior?.ok
    ? Math.min(prior.tgo, capT)
    : Math.min(tau * (1 - Math.exp(-Math.max(0, vhT - vh) / ve)), capT);
  T = Math.max(0.1, T);
  let A = prior?.ok ? prior.A : 0;
  let B = prior?.ok ? prior.B : 0;
  let ok = prior?.ok ?? false;

  const iters = prior?.ok ? 3 : 10; // fixed-point on the gravity integral
  for (let i = 0; i < iters; i++) {
    T = Math.max(0.1, Math.min(T, capT));
    const b0 = -ve * Math.log(1 - T / tau); // = ∫₀ᵀ a(t) dt  (Δv over T)
    const b1 = b0 * tau - ve * T; // = ∫₀ᵀ a(t)·t dt
    const c0 = b0 * T - b1; // = ∫₀ᵀ (∫₀ᵗ a) dt
    const c1 = c0 * tau - (ve * T * T) / 2;
    const det = b0 * c1 - b1 * c0;
    if (!Number.isFinite(det) || Math.abs(det) < 1e-9) break; // singular → hold last A,B

    // Predict the trajectory forward with the current steering to integrate the
    // net gravity deficit (g − v_h²/r) over the burn — velocity integral G_r and
    // position double-integral G_pos. Coarse Euler; the deficit shrinks as the
    // predicted v_h builds, so this credits the centrifugal relief the analytic
    // estimate ignored.
    const M = 24;
    const h = T / M;
    let pr = r;
    let pvr = vr;
    let pvh = vh;
    let gr = 0;
    let gpos = 0;
    let cum = 0; // running ∫₀ᵗ deficit dt
    for (let k = 0; k < M; k++) {
      const tk = k * h;
      const ak = a / (1 - tk / tau); // thrust accel (mass depletes)
      const gk = MU_EARTH_M3_S2 / (pr * pr);
      const deficit = gk - (pvh * pvh) / pr;
      gpos += cum * h + 0.5 * deficit * h * h;
      gr += deficit * h;
      cum += deficit * h;
      const sinp = Math.max(-PEG.maxSinPitch, Math.min(PEG.maxSinPitch, A + B * tk));
      const cosp = Math.sqrt(Math.max(0, 1 - sinp * sinp));
      pvr += (ak * sinp - deficit) * h;
      pvh += (ak * cosp - (pvr * pvh) / pr) * h;
      pr += pvr * h;
    }

    const dvr = -vr + gr;
    const dr = rT - r - vr * T + gpos;
    A = (c1 * dvr - b1 * dr) / det;
    B = (b0 * dr - c0 * dvr) / det;
    ok = true;

    // Re-estimate T from the horizontal (angular-momentum) channel, using the
    // predicted final horizontal speed for the mean thrust-cosine.
    const dh = rT * vhT - r * vh;
    if (dh <= 0) {
      T = 0.1; // already at/over target angular momentum → cut essentially now
      break;
    }
    const rbar = (r + rT) / 2;
    const fr0 = A; // radial thrust fraction now (no feed-forward)
    const frT = A + B * T; // …at cutoff
    const fbarH = Math.max(0.1, 1 - (fr0 * fr0 + fr0 * frT + frT * frT) / 6); // mean √(1−f_r²)
    const dv = dh / (rbar * fbarH);
    const Tnew = Math.min(tau * (1 - Math.exp(-dv / ve)), capT);
    if (Math.abs(Tnew - T) < 0.5 && i >= 2) {
      T = Tnew;
      break;
    }
    T = Tnew;
  }
  return { A, B, tgo: T, ok };
}

/**
 * PEG commanded flight-path angle (rad from local horizontal): pure
 * linear-tangent `sin(pitch) = A + B·Δt`, clamped. `Δt` is the time since the
 * coefficients were solved. `cos(pitch) ≥ 0` always → thrust never points
 * retrograde. Wider clamp than the heuristic's `maxDiveRad` — `f_r < 0` (thrust
 * below horizontal, trading altitude for speed) is legitimate on a lofted
 * low-TWR arc, and the gravity integral in `pegSolve` already accounts for it.
 */
export function pegPitchRad(st: PegState, dtSinceSolveS: number): number {
  const fr = st.A + st.B * dtSinceSolveS;
  return Math.asin(Math.max(-PEG.maxSinPitch, Math.min(PEG.maxSinPitch, fr)));
}

/**
 * Time (s) from the current osculating state to apoapsis, via Kepler's
 * equation. `Infinity` for a non-elliptical (escape) arc; `0` for (near-)
 * circular. Used by the coast-to-apoapsis + relight rule for a final stage that
 * can't circularise in a single continuous burn (Shuttle-OMS, Centaur two-burn).
 */
export function timeToApoapsisS(r: number, vr: number, vh: number): number {
  const v2 = vr * vr + vh * vh;
  const energy = v2 / 2 - MU_EARTH_M3_S2 / r;
  if (energy >= 0) return Infinity;
  const a = -MU_EARTH_M3_S2 / (2 * energy);
  const h = r * vh;
  const ecc = Math.sqrt(Math.max(0, 1 + (2 * energy * h * h) / (MU_EARTH_M3_S2 * MU_EARTH_M3_S2)));
  if (ecc < 1e-4) return 0; // already circular — "at apoapsis"
  const cosE = Math.max(-1, Math.min(1, (1 - r / a) / ecc));
  let E = Math.acos(cosE); // [0, π]
  if (vr < 0) E = 2 * Math.PI - E; // descending → past periapsis, before next apoapsis
  const M = E - ecc * Math.sin(E); // mean anomaly
  const n = Math.sqrt(MU_EARTH_M3_S2 / (a * a * a)); // mean motion
  let dM = Math.PI - M; // apoapsis is at mean anomaly π
  if (dM < 0) dM += 2 * Math.PI;
  return dM / n;
}

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
  const maxT = opts.maxTS ?? 2000; // a low-TWR upper stage burns for many minutes
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

  // Strap-on boosters (Track 3): fire with the core, jettison when spent.
  const boosterStage = profile.boosters ? combinedBoosterStage(profile.boosters) : null;
  let boosterProp = boosterStage ? stagePropellant(boosterStage) : 0;
  let boostersOn = boosterProp > 0;

  const massAbove = (i: number): number => {
    let m = 0;
    for (let k = i + 1; k < profile.stages.length; k++) m += profile.stages[k].wetKg;
    return m;
  };
  const currentMass = (): number => {
    // Boosters ride only while still attached (during the stage-0 boost phase).
    const boosterMass =
      boostersOn && boosterStage ? boosterStage.dryKg + Math.max(0, boosterProp) : 0;
    if (stageIndex < 0)
      return profile.payloadKg + (fairingOn ? (profile.fairingKg ?? 0) : 0) + boosterMass;
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

  // PEG state for the final stage (#416): solved coefficients + when they were
  // solved (major cycle), and a coast-to-apoapsis flag for a stage that can't
  // circularise in one continuous burn.
  let peg: PegState | null = null;
  let pegSolveT = -Infinity;
  let coasting = false;
  // Latched once the heuristic altitude-hold saturates (a too-weak final stage).
  let pegLatched = false;

  const snapshot = (): AscentState => {
    // Radial frame: position from Earth's centre, altitude above the surface,
    // velocity split into radial (up) and downrange (horizontal) components.
    const ry = y + R_EARTH_M;
    const r = Math.hypot(x, ry) || R_EARTH_M;
    const alt = r - R_EARTH_M;
    const speed = Math.hypot(vx, vy);
    const velUp = (vx * x + vy * ry) / r;
    const rho = airDensity(alt);
    const g = gravity(alt);
    const m = currentMass();
    const thrust =
      (stageIndex >= 0 ? stageThrustN(profile.stages[stageIndex], alt) : 0) +
      (boostersOn && stageIndex === 0 && boosterProp > 0 ? stageThrustN(boosterStage!, alt) : 0);
    return {
      t,
      altKm: alt / 1000,
      downrangeKm: (R_EARTH_M * Math.atan2(x, ry)) / 1000,
      speedKms: speed / 1000,
      velUpKms: velUp / 1000,
      massKg: m,
      stageIndex,
      qPa: dynamicPressure(rho, speed),
      twr: m > 0 ? thrust / (m * g) : 0,
      thrustN: thrust,
      dragN: dynamicPressure(rho, speed) * cd * refArea,
      pitchRad: lastPitch,
      propRemainingKg: stageIndex >= 0 ? Math.max(0, remainingProp) : 0,
      boosterPropRemainingKg: boostersOn ? Math.max(0, boosterProp) : 0,
      boostersActive: boostersOn && stageIndex === 0 && boosterProp > 0,
      chamberTempK:
        stageIndex >= 0 && thrust > 0 ? (profile.stages[stageIndex].chamberTempK ?? 3500) : 0,
      // Sutton-Graves form (proportional): stagnation heating rises with v³
      // but needs air (√ρ), so it peaks inside the atmosphere then vanishes.
      aeroHeatFlux: Math.sqrt(rho) * speed * speed * speed,
      // Running Δv-loss ledger (m·s⁻¹ → km·s⁻¹), snapshotted each sample so the
      // ledger layer can read the live tally at any scrubbed time t.
      lossGravityKms: losses.gravity / 1000,
      lossDragKms: losses.drag / 1000,
      lossSteeringKms: losses.steering / 1000,
    };
  };

  const pushEvent = (type: AscentEvent['type'], note?: string): void => {
    const s = snapshot();
    events.push({ type, t, altKm: s.altKm, speedKms: s.speedKms, massKg: s.massKg, note });
  };

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
    const boostThrust =
      boostersOn && stageIndex === 0 && boosterProp > 0 ? stageThrustN(boosterStage!, alt) : 0;
    // Core thrust IF the engine is lit (propellant remaining on the active stage).
    const coreThrustLit =
      stageIndex >= 0 && remainingProp > 0 ? stageThrustN(profile.stages[stageIndex], alt) : 0;

    // Guidance. Below the handover the aero-safe pitch table drives the gravity
    // turn; above it, adequately-powered stages + all lower stages use the
    // closed-loop apoapsis-raise/altitude-hold heuristic. The FINAL stage above
    // the handover flies PEG (RFC-034 §5.1 · #416) — the only law that closes a
    // very-low-TWR upper stage — with a coast-to-apoapsis + relight for a stage
    // that can't circularise in one continuous burn. PEG only STEERS; the honest
    // perigee gate below still decides SECO + reachedOrbit.
    const isFinalStage = stageIndex === profile.stages.length - 1;
    const targetAltM = profile.targetOrbitAltM ?? GUIDANCE.targetAltM;
    let pitch: number;
    let engineOn: boolean; // set by every guidance branch below

    // The heuristic altitude-hold flies every ADEQUATELY-powered final stage to
    // orbit. It only fails for a very-low-TWR upper stage (Centaur ~0.3 TWR),
    // where holding altitude at apoapsis demands `sinγ > 1` — the stage saturates
    // and sinks. So: run the heuristic by default; the instant its circularise
    // command provably saturates, LATCH onto PEG for the rest of the stage (no
    // vehicle list, no chatter). PEG then flies the lofted low-TWR insertion.
    if (!pegLatched && isFinalStage && coreThrustLit > 0 && alt > GUIDANCE.handoverAltM) {
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

    if (pegLatched && isFinalStage && coreThrustLit > 0) {
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
        Math.min(prograde + 0.21, prograde + PEG.loftTApoGainRadPerS * (PEG.loftTApoRefS - tApo)),
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
    if (boostThrust > 0) {
      boosterProp -= (boostThrust / (stageIspS(boosterStage!, alt) * G0)) * dt;
    }
    // Boosters jettison the moment their propellant is spent; the core fires on.
    if (boostersOn && boosterProp <= 0) {
      boostersOn = false;
      pushEvent('staging', boosterStage!.name);
    }
    t += dt;

    // Max-Q tracking.
    if (q > maxQ.qPa) maxQ = { t, altKm: alt / 1000, qPa: q };

    // Stage burnout → jettison + advance.
    if (stageIndex >= 0 && remainingProp <= 0) {
      const isLast = stageIndex >= profile.stages.length - 1;
      if (!mecoSeen && !isLast) {
        pushEvent('meco', profile.stages[stageIndex].name);
        mecoSeen = true;
      }
      pushEvent(isLast ? 'seco' : 'staging', profile.stages[stageIndex].name);
      if (isLast) {
        stageIndex = -1; // all propellant spent → coast
        secoT = t;
      } else {
        stageIndex += 1;
        remainingProp = stagePropellant(profile.stages[stageIndex]);
      }
    }

    // Fairing jettison once above the atmosphere.
    if (fairingOn && alt >= fairingJettAlt) {
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
      if (stageIndex === profile.stages.length - 1) {
        pushEvent('seco', `${profile.stages[stageIndex].name} — orbit`);
        stageIndex = -1; // SECO on target; residual propellant is margin
        secoT = t;
      }
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
    totalDurationS: final.t,
  };
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
    chamberTempK: f < 0.5 ? a.chamberTempK : b.chamberTempK,
    aeroHeatFlux: lerp(a.aeroHeatFlux, b.aeroHeatFlux),
    lossGravityKms: lerp(a.lossGravityKms, b.lossGravityKms),
    lossDragKms: lerp(a.lossDragKms, b.lossDragKms),
    lossSteeringKms: lerp(a.lossSteeringKms, b.lossSteeringKms),
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
  const dvRequiredKms = circularSpeed(LEO_REF_ALT_M) / 1000 + totalLossKms;
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
