/**
 * Powered-ascent engine — the headless physics core for the /fly launch
 * act (RFC-033 · epic #412 · Scene 0). Pure functions, no Three.js, no
 * DOM: the same module drives both the animated Scene 0 render AND the
 * /plan take-off planner (RFC-033 L-I), exactly as fly-physics.ts is
 * shared between /fly and /plan.
 *
 * Model (S1): a 2-DOF planar gravity-turn integrated in SI units. The
 * vehicle flies an OPEN-LOOP pitch program (commanded flight-path angle
 * vs. time) — the load-bearing simplification that keeps the trajectory
 * predictable and teachable; a closed-loop guidance law is a later
 * refinement (RFC-033 §10 / L-H). Thrust interpolates between sea-level
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

/** A launch vehicle's ascent profile. See RFC-033 §6 for the shipped JSON schema. */
export interface LaunchProfile {
  id: string;
  name: string;
  /** Lower → upper. Stage 0 ignites at liftoff. */
  stages: LaunchStage[];
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
  /** Aerodynamic reference area (m²) for drag. Default 10. */
  refAreaM2?: number;
  /** Drag coefficient (dimensionless). Default 0.3. */
  cd?: number;
  /** Launch site — informational; not used by the S1 planar integration. */
  launchSite?: { lat: number; lon: number; name?: string };
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
  /** Combustion-chamber temperature (K) while firing; 0 when the engine is off. */
  chamberTempK: number;
  /** Stagnation aerodynamic heat flux ∝ √ρ·v³ (W·m⁻², proportional). Peaks after Max-Q. */
  aeroHeatFlux: number;
}

/** A discrete ascent beat (liftoff, staging, Max-Q, MECO, SECO, …). */
export interface AscentEvent {
  type: 'liftoff' | 'max_q' | 'staging' | 'meco' | 'fairing_jettison' | 'seco' | 'orbit' | 'burnout';
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

// ─── Integrator ─────────────────────────────────────────────────────

export interface AscentOptions {
  /** Integration step (s). Default 0.05. */
  dtS?: number;
  /** Trajectory sample interval (s). Default 1. */
  sampleDtS?: number;
  /** Hard stop (s) so a sub-orbital / underpowered stack can't loop forever. Default 1200. */
  maxTS?: number;
}

/**
 * Integrate a launch profile from the pad to orbit (or propellant
 * exhaustion / `maxTS`). Semi-implicit Euler in the launch plane;
 * open-loop pitch program; pressure-interpolated thrust; single-
 * exponential drag; stages jettison on propellant exhaustion.
 *
 * Returns the sampled trajectory, the ascent beats, Max-Q, the three Δv
 * losses, and the ideal Δv capacity. Pure — safe to call from a Svelte
 * scene, a worker, or a vitest test.
 */
export function integrateAscent(profile: LaunchProfile, opts: AscentOptions = {}): AscentSummary {
  const dt = opts.dtS ?? 0.05;
  const sampleDt = opts.sampleDtS ?? 1;
  const maxT = opts.maxTS ?? 1200;
  const refArea = profile.refAreaM2 ?? 10;
  const cd = profile.cd ?? 0.3;

  // Mass bookkeeping: dropped stages are gone; the current stage carries
  // its dry mass + remaining propellant; upper stages ride as full wet.
  let stageIndex = 0;
  let remainingProp = stagePropellant(profile.stages[0]);
  let fairingOn = (profile.fairingKg ?? 0) > 0;
  const fairingJettAlt = profile.fairingJettisonAltM ?? KARMAN_LINE_M;

  const massAbove = (i: number): number => {
    let m = 0;
    for (let k = i + 1; k < profile.stages.length; k++) m += profile.stages[k].wetKg;
    return m;
  };
  const currentMass = (): number => {
    if (stageIndex < 0) return profile.payloadKg + (fairingOn ? (profile.fairingKg ?? 0) : 0);
    const s = profile.stages[stageIndex];
    return (
      profile.payloadKg +
      (fairingOn ? (profile.fairingKg ?? 0) : 0) +
      s.dryKg +
      remainingProp +
      massAbove(stageIndex)
    );
  };

  // Planar state: x downrange, y altitude (m); vx, vy (m·s⁻¹).
  let x = 0;
  let y = 0;
  let vx = 0;
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

  const snapshot = (): AscentState => {
    const speed = Math.hypot(vx, vy);
    const rho = airDensity(y);
    const g = gravity(y);
    const m = currentMass();
    const thrust = stageIndex >= 0 ? stageThrustN(profile.stages[stageIndex], y) : 0;
    return {
      t,
      altKm: y / 1000,
      downrangeKm: x / 1000,
      speedKms: speed / 1000,
      velUpKms: vy / 1000,
      massKg: m,
      stageIndex,
      qPa: dynamicPressure(rho, speed),
      twr: m > 0 ? thrust / (m * g) : 0,
      thrustN: thrust,
      dragN: dynamicPressure(rho, speed) * cd * refArea,
      pitchRad: pitchAngleRad(profile, t),
      propRemainingKg: stageIndex >= 0 ? Math.max(0, remainingProp) : 0,
      chamberTempK: stageIndex >= 0 && thrust > 0 ? (profile.stages[stageIndex].chamberTempK ?? 3500) : 0,
      // Sutton-Graves form (proportional): stagnation heating rises with v³
      // but needs air (√ρ), so it peaks inside the atmosphere then vanishes.
      aeroHeatFlux: Math.sqrt(rho) * speed * speed * speed,
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
    const g = gravity(y);
    const rho = airDensity(y);
    const speed = Math.hypot(vx, vy);
    const m = currentMass();

    // Thrust: open-loop along the commanded pitch angle.
    const thrust = stageIndex >= 0 && remainingProp > 0 ? stageThrustN(profile.stages[stageIndex], y) : 0;
    const pitch = pitchAngleRad(profile, t);
    const thrustDirX = Math.cos(pitch);
    const thrustDirY = Math.sin(pitch);

    // Drag opposes the velocity vector.
    const q = dynamicPressure(rho, speed);
    const drag = q * cd * refArea;
    const dragDirX = speed > 1e-6 ? -vx / speed : 0;
    const dragDirY = speed > 1e-6 ? -vy / speed : 0;

    // Net acceleration (m·s⁻²).
    const ax = (thrust * thrustDirX + drag * dragDirX) / m;
    const ay = (thrust * thrustDirY + drag * dragDirY) / m - g;

    // Δv-loss bookkeeping — accumulated over POWERED flight only (a loss is
    // Δv you spend and don't get back; a ballistic coast spends none).
    if (thrust > 0) {
      const gammaVel = speed > 1e-3 ? Math.atan2(vy, vx) : pitch; // flight-path angle of velocity
      losses.gravity += g * Math.sin(gammaVel) * dt;
      losses.drag += (drag / m) * dt;
      if (speed > 1e-3) {
        const cosAlpha = (thrustDirX * vx + thrustDirY * vy) / speed; // thrust·v̂
        losses.steering += (thrust / m) * (1 - Math.max(-1, Math.min(1, cosAlpha))) * dt;
      }
    }

    // Semi-implicit Euler: velocity then position.
    vx += ax * dt;
    vy += ay * dt;

    // On the pad: an underpowered (TWR<1) stack can't sink through the ground.
    if (y <= 0 && vy < 0) {
      vy = 0;
      vx = 0;
    }
    x += vx * dt;
    y += vy * dt;
    if (y < 0) y = 0;

    // Burn propellant (mdot = T / (Isp·g₀)).
    if (thrust > 0) {
      const isp = stageIspS(profile.stages[stageIndex], y);
      remainingProp -= (thrust / (isp * G0)) * dt;
    }
    t += dt;

    // Max-Q tracking.
    if (q > maxQ.qPa) maxQ = { t, altKm: y / 1000, qPa: q };

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
    if (fairingOn && y >= fairingJettAlt) {
      fairingOn = false;
      pushEvent('fairing_jettison');
    }

    // Orbit gate: past the Kármán line at ≥ local circular speed.
    if (!orbitSeen && y >= KARMAN_LINE_M && Math.hypot(vx, vy) >= circularSpeed(y)) {
      pushEvent('orbit');
      orbitSeen = true;
      reachedOrbit = true;
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
      if (t - secoT >= POST_SECO_COAST_S || (y <= 0 && t > 1)) break;
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
    chamberTempK: f < 0.5 ? a.chamberTempK : b.chamberTempK,
    aeroHeatFlux: lerp(a.aeroHeatFlux, b.aeroHeatFlux),
  };
}

// ─── /plan reuse: headless take-off summary (RFC-033 L-I / S10) ──────

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
 * the same integrator as Scene 0 (RFC-033 L-I): no rendering, just the
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
