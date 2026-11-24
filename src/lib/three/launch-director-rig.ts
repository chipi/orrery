/**
 * The launch camera DIRECTOR wired to a launch scene (G3). One implementation for /fly's launch
 * (LaunchScene) and the /dev/launch-director review route: it builds the seeded shot plan, draws
 * the launch's conditions (sky, sun from the real launch time when known, clouds, pad smoke,
 * limb, night lights, tower) and, per frame, feeds the scene the ground-relative state and
 * drives the camera from the plan.
 *
 * Deterministic for any t (the plan and the pose are pure functions of the state), so scrubbing
 * and seeking never jump. `?cam=classic` skips all of this: LaunchScene then runs today's camera.
 */

import type { AscentScene } from './ascent-scene';
import {
  directorTimesOnPlayClock,
  toMissionT,
  toSceneT,
  type LaunchCoastWarp,
} from '$lib/orbital/launch-coast-warp';
import { attachLaunchConditions, type ConditionsRig } from './launch-conditions-scene';
import {
  sampleAscentAt,
  type AscentState,
  type AscentSummary,
  type LaunchProfile,
} from '$lib/physics/ascent/ascent-physics';
import type { CameraPose } from '$lib/orbital/ascent-cameras';
import type { PadSpec } from '$lib/launches/pad-family';
import {
  buildDirectorPlan,
  directedPoseAt,
  groundRelative,
  type CoverId,
  type DirectorPlan,
  type LightId,
  type OpeningId,
  type SafeArea,
} from '$lib/orbital/ascent-director';
import type { LaunchInstant } from '$lib/orbital/launch-sun';

export interface LaunchDirectorOptions {
  asc: AscentScene;
  summary: AscentSummary;
  profile: LaunchProfile;
  vehLen: number;
  /** Seeds the plan with the vehicle id (a Plan flight passes its own `plan-…` id). */
  missionId?: string;
  /** Overrides the vehicle + mission seed (review). */
  seed?: number;
  /** The mission's real launch instant and pad; absent = seeded light. */
  launch?: LaunchInstant | null;
  /** The pad model of the launch site and date (G4); absent keeps the generic lattice tower. */
  pad?: PadSpec | null;
  /** The vehicle's real height in metres: the pad is built at true scale against it. */
  launcherHeightM?: number;
  /** Spacecraft separation time when it is not SECO (an injection burn), and the end of the act. */
  payloadSepT?: number;
  endT?: number;
  /** Authoring speed (the plan is fixed: a speed change never reshuffles shots). */
  speed?: number;
  reducedMotion?: boolean;
  force?: { opening?: OpeningId; light?: LightId; cover?: CoverId };
  nightUrl?: string;
  /** Lighter conditions rig for weak GPUs (fewer sphere segments and smoke puffs). */
  lite?: boolean;
  /** false: the sky, clouds and smoke are not drawn (review only). */
  conditions?: boolean;
  /** The HUD-safe area at start (see `setSafeArea`). */
  safe?: SafeArea | null;
  /** A compressed coast in the launch act (launch-coast-warp): the shots are planned and
   *  looked up on the play clock, so a 26-minute coast is not cut through in 15 s. */
  coastWarp?: LaunchCoastWarp | null;
}

export interface DirectorFrame {
  /** The ground-relative state the scene was given. */
  state: AscentState;
  shotIndex: number;
  shot: string;
  pose: CameraPose;
}

export interface LaunchDirector {
  readonly plan: DirectorPlan;
  /** The HUD-safe area (touch and narrow viewports): the whole vehicle is framed inside it. */
  setSafeArea(safe: SafeArea | null): void;
  /** Feed the scene the (ground-relative) state; drive the camera unless `camera` is false. */
  apply(raw: AscentState, opts?: { camera?: boolean }): DirectorFrame;
  dispose(): void;
}

export function createLaunchDirector(o: LaunchDirectorOptions): LaunchDirector {
  const { asc, summary, profile, vehLen } = o;
  const lat = profile.launchSite?.lat ?? 28.5;
  const w = o.coastWarp ?? null;
  const scene = (t: number) => toSceneT(w, t);
  const plan = buildDirectorPlan({
    vehicleId: profile.id,
    missionId: o.missionId,
    seed: o.seed,
    launch: o.launch ?? undefined,
    ...directorTimesOnPlayClock(w, {
      events: summary.events,
      maxQt: summary.maxQ.t,
      duration: summary.totalDurationS,
      payloadSepT: o.payloadSepT,
      endT: o.endT,
    }),
    altAt: (t) => sampleAscentAt(summary.states, toMissionT(w, t)).altKm,
    hasBoosters: (profile.boosters?.count ?? 0) > 0,
    payloadInBay: profile.payloadInBay === true,
    speed: o.speed ?? 5,
    reducedMotion: o.reducedMotion,
    force: o.force,
  });
  const rig: ConditionsRig | null =
    o.conditions === false
      ? null
      : attachLaunchConditions(
          asc,
          plan.conditions,
          vehLen,
          o.nightUrl,
          o.lite === true,
          o.pad ? { spec: o.pad, vehicleM: o.launcherHeightM } : null,
        );

  let safe: SafeArea | null = o.safe ?? null;
  return {
    plan,
    setSafeArea(s) {
      safe = s;
    },
    apply(raw, opts) {
      const state = groundRelative(raw, lat);
      asc.setState(state);
      // Shots and the handheld wobble run on the play clock; the scene keeps mission time.
      const sceneT = scene(state.t);
      // After SECO the shots frame the spacecraft where the scene put it (it springs free of the
      // stage); without it the separation shot held the empty spot between the two.
      const dp = directedPoseAt(
        plan,
        sceneT,
        { ...state, t: sceneT },
        vehLen,
        asc.focus,
        safe,
        asc.stackSpan,
      );
      if (opts?.camera !== false) {
        const p = dp.pose;
        asc.camera.position.set(p.px, p.py, p.pz);
        asc.camera.lookAt(p.tx, p.ty, p.tz);
        asc.camera.fov = p.fov;
        asc.camera.updateProjectionMatrix();
      }
      rig?.update(state, asc.camera);
      return { state, shotIndex: dp.index, shot: plan.shots[dp.index].id, pose: dp.pose };
    },
    dispose() {
      rig?.dispose();
    },
  };
}
