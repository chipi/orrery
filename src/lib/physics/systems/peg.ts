/**
 * KERNEL SYSTEMS — Powered Explicit Guidance (PEG).
 *
 * The "systems" layer (ADR-0037): the guidance/control CONTROLLERS a real vehicle runs,
 * separated from the pure physics engines they steer. PEG is the ascent insertion
 * controller — it solves a two-point boundary problem each major cycle (linear-tangent
 * steering `sin γ = A + B·t` with a predicted gravity integral) so a low-TWR upper stage
 * reaches (r=rT, vr=0) at circular speed. Pure + black-box: `pegSolve` takes a state and
 * returns steering coefficients; nothing here integrates a full trajectory or fabricates an
 * orbit (the honest perigee gate in `integrateAscent` still decides SECO). Extracted from
 * `ascent/ascent-physics.ts` unchanged; that module re-exports these for back-compat.
 */
import { MU_EARTH_M3_S2 } from '../ascent/ascent-physics-constants';

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
