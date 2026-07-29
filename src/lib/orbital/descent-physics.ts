/**
 * Powered-descent engine — the headless physics core for the /fly Entry,
 * Descent & Landing act (RFC-034 §9). The inverse of ascent-physics.ts:
 * where ascent integrates a stack from the pad to orbit, descent integrates
 * a lander from the entry interface down to touchdown. Pure functions, no
 * Three.js, no DOM — the same module drives the animated DescentScene AND
 * the headless profile validation harness.
 *
 * Model: a 1-DOF along-track integration in SI units. The state is speed `v`
 * (magnitude) and altitude `h`; a per-phase flight-path angle γ (below the
 * local horizontal) projects speed onto the vertical (dh/dt = −v·sinγ). The
 * hypersonic entry stays shallow (the profile's entry angle) so the vehicle
 * skims into denser air and sheds most of its speed to DRAG before the
 * terminal phases go near-vertical. Each EDL phase (ballistic entry →
 * parachute → heat-shield sep → powered-retro / skycrane / airbag →
 * touchdown) swaps in its own drag area + retro thrust and ends on an
 * altitude / velocity / duration / ground trigger. This 1-DOF abstraction is
 * the load-bearing simplification: it produces HONEST altitude, velocity,
 * deceleration-g, Mach and dynamic-pressure readouts (what the descent HUD
 * teaches) without a full 3-DOF trajectory the scene never renders.
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
}

/** Default flight-path angle (deg below horizontal) for a phase. */
function gammaDegFor(phase: EDLPhase, profile: DescentProfile): number {
  if (phase.flightPathAngleDeg != null) return phase.flightPathAngleDeg;
  if (phase.kind === 'ballistic_entry') return Math.abs(profile.entryState.flightPathAngleDeg);
  return 90; // terminal phases descend near-vertically
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
  const dt = opts.dtS ?? 0.02;
  const sampleDt = opts.sampleDtS ?? 0.5;
  const maxT = opts.maxTS ?? 12000;
  const body = profile.body;
  const survivable = profile.survivableTouchdownMs ?? 3;
  const propTotal = profile.retroPropellantKg ?? Infinity;

  let h = profile.entryState.altitudeM;
  let v = profile.entryState.velocityMs;
  let mass = profile.entryMassKg - (profile.phases[0]?.jettisonKg ?? 0);
  let phaseIndex = 0;
  let phaseStartT = 0;
  let propUsed = 0;
  let t = 0;

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
    const gammaDeg = gammaDegFor(phase, profile);
    const sinG = Math.sin(gammaDeg * DEG2RAD);
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
      flightPathAngleDeg: gammaDeg,
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
    const gammaDeg = gammaDegFor(phase, profile);
    const sinG = Math.sin(gammaDeg * DEG2RAD);
    const rho = bodyAirDensity(h, body);
    const g = bodyGravity(h, body);
    const cdA = phase.cdA ?? profile.entryCdA;
    const drag = 0.5 * rho * v * v * cdA;

    if (isGuidedPhase(phase.kind)) {
      // Throttle-guided controlled descent: track a descent-rate schedule
      // that eases to the terminal velocity at the surface. The braking is
      // rate-limited to `maxBrakeG` so a fast-incoming direct-powered descent
      // ramps down instead of snapping v (which would spike the felt-g).
      const gain = phase.descentRateGain ?? 0.06;
      const termV = phase.terminalVelocityMs ?? 0.75;
      const maxBrake = (phase.maxBrakeG ?? 5) * G0;
      const vPrev = v;
      const target = Math.max(termV, Math.min(vPrev, gain * h));
      v = Math.max(target, vPrev - maxBrake * dt);
      const brakeAccel = Math.max(0, (vPrev - v) / dt); // decel we just commanded
      const thrustAccel = g + brakeAccel; // retro also holds the vehicle up
      const thrustN = propUsed < propTotal ? mass * thrustAccel : 0; // engine out if tanks dry
      if (thrustN <= 0) v = vPrev; // no propellant → guidance can't hold; fall
      curThrustN = thrustN;
      curDragN = 0;
      curDecelG = thrustN / (mass * G0);
      if (thrustN > 0 && phase.ispS) propUsed += (thrustN / (phase.ispS * G0)) * dt;
    } else {
      // Aerodynamic / ballistic: gravity component adds speed, drag sheds it.
      const dvdt = g * sinG - drag / Math.max(1, mass);
      v += dvdt * dt;
      if (v < 0) v = 0;
      curThrustN = 0;
      curDragN = drag;
      curDecelG = drag / (mass * G0);
    }

    if (curDecelG > peakDecel.g) peakDecel = { t, g: curDecelG, altKm: h / 1000 };
    const flux = Math.sqrt(rho) * v * v * v;
    if (flux > peakHeat.flux) peakHeat = { t, altKm: h / 1000, flux };

    h += -v * sinG * dt;
    t += dt;

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
  };
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
  };
}
