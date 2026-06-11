/**
 * Runtime adaptive frame monitor for /fly's helio scene (and re-usable
 * by other 3D routes). Maintains a rolling window of frame intervals
 * and, when the rolling average exceeds a hard budget, fires a
 * one-shot `onStruggle` callback that the UI can use to suggest the
 * next-lower QualityTier to the user.
 *
 * We DON'T silently demote — flipping pixelRatio / bloom / sphere
 * segments mid-shot would change the composition the user is already
 * looking at, which is its own UX problem (see quality-tier.ts header
 * note). The right pattern is: surface a non-blocking toast, let the
 * user opt in, then `writeUserChoice` + reload.
 *
 * Tunables:
 *  - windowMs: how long the rolling average covers (default 5000 ms)
 *  - frameBudgetMs: per-frame budget that defines "struggling"
 *    (default 33.3 ms ≈ 30 fps target)
 *  - sustainedFor: how long the average must stay over budget before
 *    we fire the callback (default 4000 ms — long enough that a single
 *    bloom-heavy moment doesn't flip the toast)
 *  - cooldownMs: minimum time between successive `onStruggle` fires
 *    (default 30 000 ms — don't pester the user)
 *
 * Usage:
 *   const detach = attachFrameMonitor({
 *     onStruggle: (avgMs) => showDemotionToast(avgMs),
 *   });
 *   // …in your animate() loop:
 *   detach.tick();
 *   // …on teardown:
 *   detach.stop();
 */

import { ALL_TIERS, type QualityTier } from './quality-tier';

export interface FrameMonitorOptions {
  windowMs?: number;
  frameBudgetMs?: number;
  sustainedFor?: number;
  cooldownMs?: number;
  /** Fires when the rolling average has stayed above `frameBudgetMs`
   *  continuously for at least `sustainedFor`. Receives the current
   *  rolling average frame time in ms. */
  onStruggle: (avgFrameMs: number) => void;
  /** Optional clock injection for tests. Defaults to performance.now. */
  getNow?: () => number;
}

export interface FrameMonitorHandle {
  /** Call once per animation frame to feed the monitor a sample. */
  tick: () => void;
  /** Permanently disable the monitor. Idempotent. */
  stop: () => void;
}

const DEFAULTS = {
  windowMs: 5000,
  frameBudgetMs: 33.3,
  sustainedFor: 4000,
  cooldownMs: 30_000,
};

export function attachFrameMonitor(opts: FrameMonitorOptions): FrameMonitorHandle {
  const windowMs = opts.windowMs ?? DEFAULTS.windowMs;
  const frameBudgetMs = opts.frameBudgetMs ?? DEFAULTS.frameBudgetMs;
  const sustainedFor = opts.sustainedFor ?? DEFAULTS.sustainedFor;
  const cooldownMs = opts.cooldownMs ?? DEFAULTS.cooldownMs;
  const now = opts.getNow ?? (() => performance.now());

  // Ring of {t, dt} samples for the last windowMs. We grow up to a
  // sensible cap (the window at 144 fps is ~720 samples) then trim
  // from the head as old samples fall out.
  const samples: { t: number; dt: number }[] = [];
  let lastTickAt = -1;
  let firstOverBudgetAt = -1;
  let lastStruggleFiredAt = -Infinity;
  let stopped = false;

  function tick(): void {
    if (stopped) return;
    const t = now();
    if (lastTickAt < 0) {
      lastTickAt = t;
      return;
    }
    const dt = t - lastTickAt;
    lastTickAt = t;
    // Drop pathological samples (tab backgrounded, devtools paused —
    // dt > 500ms is not a real frame). Including them would flag every
    // tab-switch as a performance struggle.
    if (dt > 500) {
      // Reset the sustained-over-budget timer too; we don't want a
      // backgrounded second to count as "over budget for 1000ms".
      firstOverBudgetAt = -1;
      return;
    }
    samples.push({ t, dt });
    // Trim old samples out of the window.
    const cutoff = t - windowMs;
    while (samples.length > 0 && samples[0].t < cutoff) samples.shift();

    // Need a small noise floor before drawing conclusions (a single
    // 50 ms outlier shouldn't trip the toast). 5 samples is enough to
    // smooth instantaneous spikes while still letting low-fps scenes
    // fire the callback within the sustained window.
    if (samples.length < 5) return;
    const totalDt = samples.reduce((acc, s) => acc + s.dt, 0);
    const avg = totalDt / samples.length;
    if (avg > frameBudgetMs) {
      if (firstOverBudgetAt < 0) firstOverBudgetAt = t;
      if (
        t - firstOverBudgetAt >= sustainedFor &&
        t - lastStruggleFiredAt >= cooldownMs
      ) {
        lastStruggleFiredAt = t;
        firstOverBudgetAt = -1;
        opts.onStruggle(avg);
      }
    } else {
      firstOverBudgetAt = -1;
    }
  }

  function stop(): void {
    stopped = true;
  }

  return { tick, stop };
}

/** Pick the next-lower QualityTier given the user's current effective
 *  one. Returns null if we're already at the floor (`minimal`). */
export function nextLowerTier(current: QualityTier): QualityTier | null {
  const idx = ALL_TIERS.indexOf(current);
  if (idx <= 0) return null;
  return ALL_TIERS[idx - 1];
}
