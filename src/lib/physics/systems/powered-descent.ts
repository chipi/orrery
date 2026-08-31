/**
 * KERNEL SYSTEMS — powered-descent guidance (throttle controller).
 *
 * The "systems" layer (ADR-087): the guidance/control controllers that fly the physics,
 * separated from the physics engines. This is the throttle law a lander runs on its final
 * powered descent — the loop that decides, every step, how hard to burn so the vehicle arrives
 * at the ground at a survivable speed instead of smashing in or hovering out of fuel.
 *
 * The law is a DESCENT-RATE SCHEDULE: the commanded speed is proportional to the altitude
 * (`v_target = gain · h`), so the vehicle slows as it nears the surface and eases to a terminal
 * touchdown speed — the same shape Apollo's LM guidance and SpaceX's landing burn fly. The
 * commanded braking is rate-limited to `maxBrake` so a fast-incoming direct descent ramps down
 * instead of snapping the speed (which would spike the felt-g). Pure + black-box: state in →
 * throttle command out. Extracted from `descent/descent-physics.ts` unchanged; `integrateDescent`
 * calls this, so the same controller runs in the /fly descent sim and any Lab lesson.
 */

export interface DescentThrottleCommand {
  /** Descent-rate schedule's target speed at this altitude (m·s⁻¹). */
  targetSpeedMs: number;
  /** Rate-limited commanded speed for this step (m·s⁻¹). */
  nextSpeedMs: number;
  /** Commanded deceleration this step (m·s⁻², ≥ 0). */
  brakeAccelMs2: number;
  /** Total thrust acceleration = braking + gravity (the retro also holds the vehicle up). */
  thrustAccelMs2: number;
}

/**
 * One control step of the powered-descent throttle law. Given the current altitude + speed and
 * the schedule parameters, returns the commanded speed and the thrust acceleration needed to
 * achieve it. Pure — no state, no constants; `maxBrakeMs2` is passed pre-scaled to SI so the
 * controller needs no G0.
 */
export function poweredDescentThrottle(opts: {
  altitudeM: number;
  speedMs: number;
  gravityMs2: number;
  maxBrakeMs2: number; // hard cap on commanded deceleration
  descentRateGain: number; // s⁻¹ — target speed = gain · altitude
  terminalVelocityMs: number; // floor: the survivable touchdown speed
  dtS: number;
}): DescentThrottleCommand {
  const { altitudeM, speedMs, gravityMs2, maxBrakeMs2, descentRateGain, terminalVelocityMs, dtS } =
    opts;
  // Schedule target: slow in proportion to altitude, never below terminal, never speed UP.
  const target = Math.max(terminalVelocityMs, Math.min(speedMs, descentRateGain * altitudeM));
  // Rate-limit the approach to the schedule so the felt-g stays bounded.
  const next = Math.max(target, speedMs - maxBrakeMs2 * dtS);
  const brakeAccel = Math.max(0, (speedMs - next) / dtS);
  return {
    targetSpeedMs: target,
    nextSpeedMs: next,
    brakeAccelMs2: brakeAccel,
    thrustAccelMs2: gravityMs2 + brakeAccel,
  };
}
