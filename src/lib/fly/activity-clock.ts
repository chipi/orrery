/**
 * The activity clock (F8, operator 2026-11-25): a launch or a landing plays fast where little
 * changes and at the real rate, or slower, where things happen. "The clock ticks faster when not
 * much is changing", monotonic, on a log scale.
 *
 * From the flight's samples it builds a play-rate multiplier r(t) over mission time t:
 *  - activity from change: how fast altitude and speed change, relatively (d ln h/dt, d ln v/dt),
 *    and of the felt load. A quantity moving 10 %/s is busy (1×); 0.1 %/s or less is calm (`rMax`).
 *    Between, the rate is interpolated on a log scale.
 *  - activity from events (separations, chutes, touchdown): the slow-motion beat of the old
 *    `sepSlowmoFactor`, down to `rMin` at the event.
 *  - the rate is the lower of the two, then slew-limited in WALL time: ln r changes by at most
 *    `slewPerWallS` per real second, before an event as well as after it, so the clock eases in.
 *
 * It only scales how fast the clock advances; the clock itself stays mission time, so a scrub is
 * exact and the HUD's MET is the real one. r > 0 everywhere: the clock never stops or runs back.
 */

export interface ActivitySample {
  /** Mission time (s). */
  t: number;
  /** Altitude (m). */
  altM: number;
  /** Speed (m/s). */
  speedMs: number;
  /** Felt acceleration (g); optional. */
  loadG?: number;
}

export interface ActivityClockOptions {
  /** Play rate when nothing changes. */
  rMax?: number;
  /** Play rate at an event. */
  rMin?: number;
  /** Half-width (s of mission time) of an event's slow-motion beat. */
  eventWindowS?: number;
  /** Largest change of ln(rate) per wall-clock second. */
  slewPerWallS?: number;
  /** Relative change rates (1/s) read as calm and as busy. */
  calmPerS?: number;
  busyPerS?: number;
  /** Altitude and speed floors (m, m/s) so ln stays finite near the ground and at rest. */
  altFloorM?: number;
  speedFloorMs?: number;
}

export interface ActivityClock {
  /** Play-rate multiplier at mission time t. */
  rate(t: number): number;
  /** Advance mission time t by `wallDt` real seconds at the user's speed multiplier. */
  advance(t: number, wallDt: number, speed?: number): number;
  /** Real seconds the clock takes from t0 to t1 at the user's speed. */
  wallSeconds(t0: number, t1: number, speed?: number): number;
}

const DEFAULTS: Required<ActivityClockOptions> = {
  rMax: 30,
  rMin: 0.22,
  eventWindowS: 3.2,
  slewPerWallS: Math.log(30) / 2,
  calmPerS: 1e-3,
  busyPerS: 0.1,
  altFloorM: 10,
  speedFloorMs: 5,
};

const smooth = (x: number) => {
  const c = Math.min(1, Math.max(0, x));
  return c * c * (3 - 2 * c);
};

/** The slow-motion depth (0..1) of the nearest event: 1 at it, an asymmetric ease either side
 *  (a quick slow-in, a short hold, a longer ramp out — the old sep beat's shape). */
function eventDepth(t: number, events: readonly number[], w: number): number {
  let best = 0;
  for (const e of events) {
    const s = t - e;
    const a = Math.abs(s);
    const hold = w * 0.18;
    const span = s < 0 ? w * 0.8 : w * 1.6;
    const d = a <= hold ? 1 : a >= span ? 0 : 1 - smooth((a - hold) / (span - hold));
    if (d > best) best = d;
  }
  return best;
}

/**
 * Build the clock for one act (a launch, a descent). `samples` in mission-time order;
 * `eventTimes` in the same time base.
 */
export function buildActivityClock(
  samples: readonly ActivitySample[],
  eventTimes: readonly number[],
  opts: ActivityClockOptions = {},
): ActivityClock {
  const o = { ...DEFAULTS, ...opts };
  const n = samples.length;
  if (n < 2) {
    const one = (_t: number) => 1;
    return {
      rate: one,
      advance: (t, dt, sp = 1) => t + dt * sp,
      wallSeconds: (a, b, sp = 1) => Math.max(0, b - a) / sp,
    };
  }
  const t0 = samples[0].t;
  const t1 = samples[n - 1].t;
  // A uniform grid (the samples are often uneven) fine enough for the event beats.
  const m = Math.min(20_000, Math.max(200, Math.ceil((t1 - t0) / 0.1)));
  const h = (t1 - t0) / m;
  const grid = new Float64Array(m + 1);
  const lnRMax = Math.log(o.rMax);
  const lnRMin = Math.log(o.rMin);
  const lnCalm = Math.log(o.calmPerS);
  const lnBusy = Math.log(o.busyPerS);

  let j = 0;
  const at = (t: number) => {
    while (j < n - 2 && samples[j + 1].t < t) j++;
    while (j > 0 && samples[j].t > t) j--;
    const a = samples[j];
    const b = samples[j + 1];
    const f = b.t > a.t ? Math.min(1, Math.max(0, (t - a.t) / (b.t - a.t))) : 0;
    return {
      lnH: Math.log(Math.max(o.altFloorM, a.altM + (b.altM - a.altM) * f) + o.altFloorM),
      lnV: Math.log(Math.max(0, a.speedMs + (b.speedMs - a.speedMs) * f) + o.speedFloorMs),
      g: (a.loadG ?? 0) + ((b.loadG ?? 0) - (a.loadG ?? 0)) * f,
    };
  };

  // Change over a 2 s window (at least two grid steps), so sample noise does not read as busy.
  const dw = Math.max(2 * h, 2);
  for (let i = 0; i <= m; i++) {
    const t = t0 + i * h;
    const lo = at(Math.max(t0, t - dw / 2));
    const hi = at(Math.min(t1, t + dw / 2));
    const span = Math.min(t1, t + dw / 2) - Math.max(t0, t - dw / 2);
    // The load counts only as it changes: hanging under a chute feels a steady 1 g (2.5 g at
    // Jupiter), which is not action.
    const dLoad = Math.abs(Math.log1p(Math.max(0, hi.g)) - Math.log1p(Math.max(0, lo.g)));
    const x = span > 0 ? (Math.abs(hi.lnH - lo.lnH) + Math.abs(hi.lnV - lo.lnV) + dLoad) / span : 0;
    const busy = x > 0 ? Math.min(1, Math.max(0, (Math.log(x) - lnCalm) / (lnBusy - lnCalm))) : 0;
    const lnChange = lnRMax * (1 - busy);
    const depth = eventDepth(t, eventTimes, o.eventWindowS);
    grid[i] = Math.min(lnChange, depth * lnRMin + (1 - depth) * lnChange);
  }
  // Slew limit in wall time: one grid step lasts about h / r real seconds, r taken at the step's
  // faster end (a second pass on the cap) so a rising rate is not given the slower end's time.
  const capFrom = (g: number) => {
    const c = g + (o.slewPerWallS * h) / Math.exp(g);
    return g + (o.slewPerWallS * h) / Math.exp(c);
  };
  for (let i = 1; i <= m; i++) grid[i] = Math.min(grid[i], capFrom(grid[i - 1]));
  for (let i = m - 1; i >= 0; i--) grid[i] = Math.min(grid[i], capFrom(grid[i + 1]));

  const lnRate = (t: number) => {
    const u = (Math.min(t1, Math.max(t0, t)) - t0) / h;
    const i = Math.min(m - 1, Math.floor(u));
    const f = u - i;
    return grid[i] + (grid[i + 1] - grid[i]) * f;
  };
  const rate = (t: number) => Math.exp(lnRate(t));
  // Advance in sub-steps no longer than a grid step of mission time, so one long frame at a
  // high rate cannot jump past an event's slow beat.
  const advance = (t: number, wallDt: number, speed = 1) => {
    let left = wallDt * speed;
    let x = t;
    for (let k = 0; left > 1e-9 && k < 10_000; k++) {
      const r = rate(x);
      const step = Math.min(left, h / r);
      x += step * r;
      left -= step;
    }
    return x;
  };
  const wallSeconds = (a: number, b: number, speed = 1) => {
    let s = 0;
    for (let x = a; x < b;) {
      const dx = Math.min(h, b - x);
      s += dx / rate(x + dx / 2);
      x += dx;
    }
    return s / speed;
  };
  return { rate, advance, wallSeconds };
}
