/**
 * Frame-stepping test harness for /fly's cinematic state machine.
 *
 * Drives the SAME `runCinematicFrame` dispatcher /fly's animate body
 * uses (see slice 20). The harness owns the inputs (`simDay`, `now`,
 * `subPhase`, reducedMotion / isDrag gates) and a minimal camera; each
 * `advanceFrames(N)` call ticks the wall clock by N × 1/60 s, advances
 * `simDay` by `simSpeed × dt` (subject to the cinematic-freeze gate),
 * and runs the dispatcher exactly once per frame.
 *
 * Why this exists: the polish-wave-3 beats (W3.1 peak hold, W3.2
 * afterglow, W3.4 finale, W3.6 cut, W3.7 cruise hold) all have timing-
 * curve behaviours whose orchestration was previously only verified
 * with chrome-devtools-mcp browser instrumentation. The harness gives
 * vitest deterministic frame-by-frame visibility into the same
 * dispatcher prod runs, so silent regressions during the ~80-mission
 * scale-out trip a test instead of an observation. See issue #325.
 *
 * Scope discipline:
 *   - No WebGL. THREE.PerspectiveCamera is used for camera math only
 *     (Vector3 + position writes); no renderer, no GL context. Pixel
 *     fidelity is Playwright's job.
 *   - No DOM. Pure functions + a single `now` clock.
 *   - Mission data is read directly off disk under
 *     `static/data/missions/<dest>/<id>.json` because vitest+node has
 *     no `fetch()` target for `/data/` URLs.
 */
import { PerspectiveCamera, Vector3 } from 'three';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Mission } from '$types/mission';
import {
  CINEMATIC_TIMINGS,
  type CinematicBeatState,
  computeAfterglowCameraFrame,
  computeCruiseHoldTriggerSimDay,
  createCinematicBeatState,
  parseFlybyMetFromSubPhase,
} from '$lib/fly-cinematic-beats';
import { runCinematicFrame } from '$lib/fly-cinematic-frame';
import { dateToSimDay } from '$lib/sim-day';

/** Matches /fly's FLYBY_PEAK_DAYS (the ±-window for peak-hold reset). */
const FLYBY_PEAK_DAYS = 4;
/** 60 fps wall clock. Tests can be sensitive to this — keep in sync
 *  with the raf cadence prod sees in a real browser. */
const FRAME_DT_MS = 1000 / 60;

export interface CreateFlyHarnessOptions {
  /** Mission id slug (e.g. `cassini`, `voyager-2`). */
  mission: string;
  /** Destination folder under `static/data/missions/` (e.g. `saturn`). */
  dest: string;
  /** Sim playback speed in days per simulated second. Default 7 mirrors
   *  /fly's nominal cruise rate; specs can bump this to cross long
   *  cruise gaps in fewer frames. */
  simSpeed?: number;
  /** Starting camera radius (arbitrary units). The W3.2 afterglow
   *  tween multiplies this by `AFTERGLOW_PULLBACK_FACTOR` at its end,
   *  so specs that assert the end-of-tween value pick a non-zero
   *  starting value here and compare against `camR × 4.5`. Default 10. */
  startingCamR?: number;
}

export interface FlyHarness {
  readonly mission: Mission;
  /** Mutable cinematic state — inspect `peakHoldUntil`, `cruiseHoldUntil`,
   *  `cutStartedAt`, `finaleStartedAt`, … directly to assert arming. */
  readonly cine: CinematicBeatState;
  /** Current sim-day (advances when not frozen). */
  readonly simDay: number;
  /** Wall-clock now (ms). Starts at 1000 so the 0 sentinel never collides. */
  readonly now: number;
  /** Mission's launch-day in sim-day space (J2000 epoch). */
  readonly depDay: number;
  /** Cruise-hold trigger sim-day, or `null` when no qualifying gap. */
  readonly cruiseHoldTriggerSimDay: number | null;
  /** Active flyby's MET if `setSubPhase('flyby-<met>-…')` was used,
   *  null otherwise. Read via `parseFlybyMetFromSubPhase`. */
  readonly currentFrameFlybyMet: number | null;
  /** Most recent `runCinematicFrame` return. */
  readonly lastOut: ReturnType<typeof runCinematicFrame>;
  /** Camera radius. Driven by the W3.2 afterglow tween while active. */
  readonly camR: number;
  /** `THREE.PerspectiveCamera` whose `.position.length()` reflects `camR`. */
  readonly camera: PerspectiveCamera;
  /** Advance N raf-paced frames. */
  advanceFrames(n: number): void;
  /** Jump sim-day to `depDay + met`. If the jump exceeds
   *  `CUT_THRESHOLD_DAYS`, sets `cine.cutStartedAt = now` (W3.6 cut
   *  fires next frame). Mirrors /fly's `jumpToMet(met)` shape. */
  scrubToMet(met: number): void;
  /** Engage / release the prefers-reduced-motion gate. */
  setReducedMotion(v: boolean): void;
  /** Engage / release the pointer-drag gate (suppresses arming). */
  setIsDrag(v: boolean): void;
  /** Set sub-phase string. `flyby-<met>-<planet>` enters a flyby
   *  cinematic; `null` / `cruise-out` / etc. report no active flyby. */
  setSubPhase(sub: string | null): void;
}

function readMissionFromDisk(missionId: string, dest: string): Mission {
  const path = resolve(`static/data/missions/${dest}/${missionId}.json`);
  return JSON.parse(readFileSync(path, 'utf-8')) as Mission;
}

export function createFlyHarness(opts: CreateFlyHarnessOptions): FlyHarness {
  const mission = readMissionFromDisk(opts.mission, opts.dest);
  const simSpeed = opts.simSpeed ?? 7;
  const startingCamR = opts.startingCamR ?? 10;
  const depDay = dateToSimDay(mission.departure_date) ?? 0;
  const cruiseHoldTriggerSimDay = computeCruiseHoldTriggerSimDay(mission.flight?.events, depDay);

  const cine = createCinematicBeatState();
  let simDay = depDay;
  // Start `now` away from 0 so the not-armed-yet sentinel in
  // `cine.finaleStartedAt === 0` etc. never collides with a real
  // wall-clock value during a spec.
  let now = 1_000;
  let reducedMotion = false;
  let isDrag = false;
  let subPhase: string | null = null;
  let camR = startingCamR;
  const camTarget = new Vector3(0, 0, 0);
  const camera = new PerspectiveCamera(60, 16 / 9, 0.1, 1_000);
  camera.position.set(camR, 0, 0);

  function flybyMetForLabel(met: number | null): boolean {
    if (met == null) return false;
    const evt = mission.flight?.events?.find((e) => e.met_days === met);
    return (evt?.label ?? '').toLowerCase().includes('earth');
  }

  function runFrame(): void {
    const met = parseFlybyMetFromSubPhase(subPhase);
    lastOut = runCinematicFrame(
      cine,
      {
        simDay,
        depDay,
        reducedMotion,
        isDrag,
        isMoonMission: false,
        currentFrameFlybyMet: met,
        isEarthFlyby: flybyMetForLabel(met),
        cruiseHoldTriggerSimDay,
        flybyPeakDays: FLYBY_PEAK_DAYS,
      },
      now,
    );
    if (!lastOut.isCinematicFreeze) {
      simDay += (FRAME_DT_MS / 1000) * simSpeed;
    }
    // W3.2 afterglow capture + tween. Mirrors /fly's behaviour at
    // +page.svelte ~line 3670: on the first afterglow frame after the
    // peak hold expires, snapshot camR/camTarget/camP so the helper
    // has start values to ease against. While the tween runs, apply
    // it back into camR.
    const afterglowing = now >= cine.peakHoldUntil && now < cine.afterglowUntil;
    if (afterglowing && cine.afterglowStartCamR === 0) {
      cine.afterglowStartCamR = camR;
      cine.afterglowTargetCamR = camR * CINEMATIC_TIMINGS.AFTERGLOW_PULLBACK_FACTOR;
      cine.afterglowCenterX = camTarget.x;
      cine.afterglowCenterZ = camTarget.z;
      cine.afterglowP = 0;
    }
    if (afterglowing && cine.afterglowStartCamR > 0) {
      const tween = computeAfterglowCameraFrame(cine, now);
      camR = tween.camR;
    }
    camera.position.set(camR, 0, 0);
  }

  // Prime `lastOut` so the getter never sees `undefined` before the
  // first `advanceFrames` call.
  let lastOut = runCinematicFrame(
    cine,
    {
      simDay,
      depDay,
      reducedMotion,
      isDrag,
      isMoonMission: false,
      currentFrameFlybyMet: null,
      isEarthFlyby: false,
      cruiseHoldTriggerSimDay,
      flybyPeakDays: FLYBY_PEAK_DAYS,
    },
    now,
  );

  return {
    mission,
    get cine() {
      return cine;
    },
    get simDay() {
      return simDay;
    },
    get now() {
      return now;
    },
    get depDay() {
      return depDay;
    },
    get cruiseHoldTriggerSimDay() {
      return cruiseHoldTriggerSimDay;
    },
    get currentFrameFlybyMet() {
      return parseFlybyMetFromSubPhase(subPhase);
    },
    get lastOut() {
      return lastOut;
    },
    get camR() {
      return camR;
    },
    get camera() {
      return camera;
    },
    advanceFrames(n: number): void {
      for (let i = 0; i < n; i++) {
        now += FRAME_DT_MS;
        runFrame();
      }
    },
    scrubToMet(met: number): void {
      const newSimDay = depDay + met;
      if (Math.abs(newSimDay - simDay) > CINEMATIC_TIMINGS.CUT_THRESHOLD_DAYS) {
        cine.cutStartedAt = now;
      }
      simDay = newSimDay;
    },
    setReducedMotion(v: boolean): void {
      reducedMotion = v;
    },
    setIsDrag(v: boolean): void {
      isDrag = v;
    },
    setSubPhase(sub: string | null): void {
      subPhase = sub;
    },
  };
}
