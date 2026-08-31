/**
 * KERNEL SYSTEMS — re-entry lift-vector steering (bank-angle controller + lifting-entry sim).
 *
 * The "systems" layer (ADR-087): the guidance/control controllers that fly the physics. A lifting
 * capsule (Apollo, Orion, Soyuz) cannot throttle and cannot parachute at orbital speed — its ONE
 * control is BANK: by rolling, it points its lift vector up (raise the trajectory, shed less
 * energy, avoid over-g) or down (dig in, avoid skipping back out). The controller here holds a
 * target deceleration by commanding the vertical lift fraction cos(bank): lift UP when the g-load
 * runs high, lift DOWN when it runs low. Pure + black-box.
 *
 * The companion `simulateLiftingEntry` is a 2-DOF planar entry (altitude, speed, flight-path
 * angle) over a round planet with an exponential atmosphere, flown by the controller. Its payoff,
 * `liftCorridorWidthDeg`, is the honest teaching claim the ballistic `entry-corridor` formula sets
 * up: a ballistic capsule's survivable entry-angle band is a knife-edge, and LIFT + steering
 * WIDENS it (Apollo's L/D≈0.3 roughly doubles it) — which is why crewed lunar returns fly lifting.
 */
import {
  MU_EARTH_M3_S2,
  R_EARTH_M,
  G0,
  SEA_LEVEL_DENSITY_KGM3,
  ATM_SCALE_HEIGHT_M,
} from '../ascent/ascent-physics-constants';

/**
 * Bank controller: the commanded VERTICAL lift fraction cos(bank) ∈ [−1, +1]. +1 = full lift up
 * (bank 0°, pull out of the dive), −1 = full lift down (bank 180°, hold the capsule in). Drives
 * the drag deceleration toward the target: too much decel → lift up; too little → lift down.
 */
export function bankLiftFraction(opts: {
  dragDecelMs2: number;
  targetDecelMs2: number;
  gain: number;
}): number {
  return Math.max(-1, Math.min(1, opts.gain * (opts.dragDecelMs2 - opts.targetDecelMs2)));
}

export type EntryOutcome = 'captured' | 'skip' | 'ground' | 'timeout';

export interface LiftingEntryResult {
  outcome: EntryOutcome;
  peakG: number;
  trajectory: { altKm: number; speedKms: number }[];
}

const ENTRY_ALT_M = 122_000; // entry interface

/**
 * Fly a 2-DOF lifting entry with the bank controller. `liftToDrag` = 0 is a ballistic capsule
 * (no steering — the controller output is irrelevant with zero lift). `ballisticCoeff` = m/(Cd·A)
 * (kg·m⁻²). Returns the outcome + peak felt-g + a downsampled altitude/speed trajectory.
 */
export function simulateLiftingEntry(opts: {
  entryVelocityMs: number;
  entryAngleDeg: number; // flight-path angle at the interface, below horizontal (positive number)
  liftToDrag: number;
  ballisticCoeff: number;
  targetDecelG: number;
  bankGain?: number;
}): LiftingEntryResult {
  const { entryVelocityMs, entryAngleDeg, liftToDrag, ballisticCoeff, targetDecelG } = opts;
  const bankGain = opts.bankGain ?? 0.02;
  const dt = 0.05;
  let h = ENTRY_ALT_M;
  let v = entryVelocityMs;
  let gamma = (-Math.abs(entryAngleDeg) * Math.PI) / 180;
  let peakG = 0;
  const trajectory: { altKm: number; speedKms: number }[] = [
    { altKm: h / 1000, speedKms: v / 1000 },
  ];
  let outcome: EntryOutcome = 'timeout';
  for (let t = 0; t < 1400; t += dt) {
    const rho = SEA_LEVEL_DENSITY_KGM3 * Math.exp(-Math.max(0, h) / ATM_SCALE_HEIGHT_M);
    const aD = (0.5 * rho * v * v) / ballisticCoeff; // drag deceleration (m·s⁻²)
    const aL = liftToDrag * aD; // lift-acceleration magnitude
    const grav = MU_EARTH_M3_S2 / ((R_EARTH_M + h) * (R_EARTH_M + h));
    const cosBank = bankLiftFraction({
      dragDecelMs2: aD,
      targetDecelMs2: targetDecelG * G0,
      gain: bankGain,
    });
    // flight-path-angle rate: lift's vertical component curves the path; gravity + centrifugal.
    const gammaDot = (aL * cosBank) / v + Math.cos(gamma) * (v / (R_EARTH_M + h) - grav / v);
    v += (-aD - grav * Math.sin(gamma)) * dt;
    gamma += gammaDot * dt;
    h += v * Math.sin(gamma) * dt;
    peakG = Math.max(peakG, aD / G0);
    if (trajectory.length < 300 && (t * 20) % 4 < 1) {
      trajectory.push({ altKm: Math.max(0, h) / 1000, speedKms: v / 1000 });
    }
    if (v < 400) {
      outcome = 'captured';
      break;
    }
    if (h > 150_000 && Math.sin(gamma) > 0) {
      outcome = 'skip';
      break;
    }
    if (h < 0) {
      outcome = 'ground';
      break;
    }
  }
  trajectory.push({ altKm: Math.max(0, h) / 1000, speedKms: v / 1000 });
  return { outcome, peakG, trajectory };
}

/**
 * The survivable entry-angle corridor for a given lift-to-drag: the band of interface flight-path
 * angles that CAPTURE (don't skip out) at ≤ the g-limit. Sweeps 3°…9° at 0.25° steps. A wider band
 * is a more forgiving re-entry; ballistic (L/D=0) is a knife-edge, lift widens it.
 */
export function liftCorridor(opts: {
  entryVelocityMs: number;
  liftToDrag: number;
  ballisticCoeff: number;
  targetDecelG: number;
  gLimitG: number;
}): { shallowDeg: number | null; steepDeg: number | null; widthDeg: number } {
  let shallow: number | null = null;
  let steep: number | null = null;
  for (let a = 3; a <= 9.0001; a += 0.25) {
    const r = simulateLiftingEntry({
      entryVelocityMs: opts.entryVelocityMs,
      entryAngleDeg: a,
      liftToDrag: opts.liftToDrag,
      ballisticCoeff: opts.ballisticCoeff,
      targetDecelG: opts.targetDecelG,
    });
    if (r.outcome === 'captured' && r.peakG <= opts.gLimitG) {
      if (shallow === null) shallow = a; // shallowest survivable
      steep = a; // steepest survivable so far
    }
  }
  return {
    shallowDeg: shallow,
    steepDeg: steep,
    widthDeg: shallow !== null && steep !== null ? steep - shallow : 0,
  };
}
