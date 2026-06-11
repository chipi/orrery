/**
 * `createAnimateLoop` — typed raf-driven animation loop with the
 * project-wide invariants baked in (#329 B.2 / TA.md contract).
 *
 * Every 3D route (`/explore`, `/fly`, `/earth`, `/moon`, `/mars`,
 * `/iss`, `/tiangong`) was re-inventing the same ~40-line block:
 * raf scheduling, dt clamp, reduced-motion gate, teardown. Worse, the
 * `document.hidden` pause contract that `docs/adr/TA.md` declares
 * for every 3D scene wasn't implemented anywhere — backgrounded tabs
 * kept burning CPU and battery. This factory makes it the default;
 * an opt-out exists for diagnostic builds that want raf to keep
 * firing under devtools-throttling.
 *
 * Usage:
 *
 *   const loop = createAnimateLoop({
 *     onFrame: ({ dt }) => {
 *       controls.update();
 *       scene.update(dt);
 *       renderer.render(scene, camera);
 *     },
 *     reducedMotion: () => mediaQuery.matches,
 *   });
 *   loop.start();
 *   onDestroy(loop.cleanup);
 *
 * Returns a `{ start, stop, cleanup }` triple — `start` arms the raf
 * pump, `stop` pauses without unregistering the visibility listener,
 * `cleanup` is the full teardown (raf cancel + visibility unbind +
 * media-query unbind if registered).
 */

import { browser } from '$app/environment';

export interface AnimateLoopOptions {
  /**
   * Per-frame callback. Receives the clamped delta-time so callers
   * can advance their own integrators / animations without each one
   * re-implementing the dt-clamp themselves.
   */
  onFrame: (frame: { dt: number; elapsed: number }) => void;
  /**
   * Predicate that returns true when reduced-motion is active. When
   * true, `onFrame` is invoked with `dt = 0` so passive animations
   * (camera drifts, parallax, idle spin) freeze while user-driven
   * updates (drag, scroll) still run. Defaults to a function that
   * reads `prefers-reduced-motion` once on first call.
   *
   * Pass a function (not a static boolean) so the loop picks up the
   * user toggling the OS preference mid-session without a reload.
   */
  reducedMotion?: () => boolean;
  /**
   * Maximum delta-time clamp in seconds. Defaults to 0.05 (i.e. 20 fps
   * minimum effective rate). Without this, a long-paused tab returning
   * to the foreground delivers a `dt` of several seconds in a single
   * frame, which makes integrators (orbit propagation, particle
   * physics) explode visibly.
   */
  maxDtSec?: number;
  /**
   * Opt out of the `document.hidden` pause. Defaults to false. Only
   * the rare diagnostic route that needs raf to keep firing while
   * backgrounded (e.g. screenshot harnesses) should set this true —
   * everything user-facing leaves it default.
   */
  ignoreVisibilityPause?: boolean;
}

export interface AnimateLoop {
  /** Begin the raf pump. Idempotent — additional calls are no-ops. */
  start(): void;
  /** Cancel the next raf without tearing down listeners. */
  stop(): void;
  /** Full teardown — cancel raf, unbind visibility / reduced-motion. */
  cleanup(): void;
  /** True while the raf pump is armed (not stopped, not cleaned up). */
  readonly running: boolean;
}

const DEFAULT_MAX_DT_SEC = 0.05;

function defaultReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function createAnimateLoop(opts: AnimateLoopOptions): AnimateLoop {
  const maxDtSec = opts.maxDtSec ?? DEFAULT_MAX_DT_SEC;
  const reducedMotion = opts.reducedMotion ?? defaultReducedMotion;
  const ignoreVisibilityPause = opts.ignoreVisibilityPause ?? false;

  let rafHandle: number | null = null;
  let running = false;
  let cleanedUp = false;
  let lastTime: number | null = null;
  let elapsed = 0;

  // The visibility listener pauses the raf pump while the tab is
  // hidden. We hold the bound handler so cleanup can remove it.
  const visibilityHandler = (): void => {
    if (cleanedUp) return;
    if (document.hidden) {
      stop();
    } else if (running) {
      // Wake-up: clear lastTime so the first post-resume frame doesn't
      // hand `onFrame` an inflated dt covering the whole hidden span.
      lastTime = null;
      armRaf();
    }
  };

  const armRaf = (): void => {
    if (rafHandle !== null) return;
    rafHandle = requestAnimationFrame(tick);
  };

  const tick = (now: number): void => {
    rafHandle = null;
    if (cleanedUp || !running) return;
    if (!ignoreVisibilityPause && browser && document.hidden) return;

    const nowSec = now / 1000;
    if (lastTime === null) {
      lastTime = nowSec;
      armRaf();
      return;
    }
    const rawDt = nowSec - lastTime;
    lastTime = nowSec;
    const dt = reducedMotion() ? 0 : Math.min(rawDt, maxDtSec);
    elapsed += dt;
    opts.onFrame({ dt, elapsed });
    if (running) armRaf();
  };

  const start = (): void => {
    if (running || cleanedUp) return;
    running = true;
    lastTime = null;
    armRaf();
  };

  const stop = (): void => {
    running = false;
    if (rafHandle !== null) {
      cancelAnimationFrame(rafHandle);
      rafHandle = null;
    }
  };

  const cleanup = (): void => {
    if (cleanedUp) return;
    cleanedUp = true;
    stop();
    if (browser && !ignoreVisibilityPause) {
      document.removeEventListener('visibilitychange', visibilityHandler);
    }
  };

  // Wire the visibility listener once at construction time. Even if
  // the caller never calls start(), tearing it down is harmless via
  // cleanup. Skipping the listener saves us a no-op cleanup branch.
  if (browser && !ignoreVisibilityPause) {
    document.addEventListener('visibilitychange', visibilityHandler);
  }

  return {
    start,
    stop,
    cleanup,
    get running() {
      return running;
    },
  };
}
