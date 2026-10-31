import {
  computeMissionApply,
  computePlanApply,
  computePlanApplyMoon,
  computeScenarioApply,
  type LoadedMission,
  type MissionApplyDefaults,
  type PlanApplyDefaults,
  type PlanSelectionType,
  type TrajectoryOverride,
} from '$lib/fly-mission-apply';
import type { DestinationId } from '$lib/physics/transfer/lambert-grid.constants';
import type { MissionTimeline, Vec2 } from '$lib/physics/transfer/mission-arc';
import type { CislunarTrajectory } from '$lib/orbital/cislunar/cislunar-geometry';
import type { InterplanetaryTrajectory } from '$lib/interplanetary-geometry';
import type { FlyUpdaters } from '$lib/three/fly-updaters';
import type { Mission, MissionEvent } from '$types/mission';
import type { LocalizedScenario } from '$types/scenario';

/**
 * Commit a mission / scenario / plan result to the `/fly` page state, lifted out
 * of routes/fly/+page.svelte. The math lives in `$lib/fly-mission-apply`
 * (`compute*Apply`); this module is the write sequence. The page owns the
 * `$state`, so it hands in setters; `getFlyUpdaters` is a getter because the
 * updaters are created in onMount, after these functions can already be called.
 *
 * The per-path write ORDER is deliberate and differs between paths (e.g.
 * `isMoonMission` lands before the helio `applyDestination` call for a mission
 * and after it for a scenario/plan). Keep each sequence as is.
 */
export interface FlyApplyContext {
  setArcTimeline: (v: MissionTimeline) => void;
  setIsFreeReturn: (v: boolean) => void;
  setIsMoonMission: (v: boolean) => void;
  setActiveDestination: (v: DestinationId) => void;
  setCurrentDestMeshId: (v: DestinationId) => void;
  setCislunarTrajectory: (v: CislunarTrajectory | null) => void;
  setInterplanetaryTrajectory: (v: InterplanetaryTrajectory | null) => void;
  setOutPts: (v: Vec2[]) => void;
  setRetPts: (v: Vec2[]) => void;
  setMission: (v: LoadedMission) => void;
  setSimDay: (v: number) => void;
  setSimSpeed: (v: number) => void;
  setMissionEvents: (v: MissionEvent[]) => void;
  /** Written LAST: the `__flyArcHash` test hook gates on it (see fly-test-hooks). */
  setLastAppliedMissionId: (v: string) => void;
  getFlyUpdaters: () => FlyUpdaters | undefined;
  /** Clear lingering cinematic-beat timers and arm the #86 opening sequence. */
  resetCinematicForMissionSwap: () => void;
  /** Read AFTER `resetCinematicForMissionSwap`, which is what arms the opening. */
  isOpeningActive: () => boolean;
  getOpeningDurationMs: () => number;
  setLaunchDwellUntil: (ms: number) => void;
  now: () => number;
  missionDefaults: MissionApplyDefaults;
  planDefaults: PlanApplyDefaults;
  /** Scenario id the default ORRERY-1 demo is applied under. */
  defaultScenarioId: string;
}

/**
 * Hold MET 0 so the camera can settle before the clock starts: until the #86
 * opening fades out (+300 ms of clean black), else the 4 s W3.3 pre-launch beat.
 */
function armLaunchDwell(ctx: FlyApplyContext): void {
  ctx.setLaunchDwellUntil(
    ctx.now() + (ctx.isOpeningActive() ? ctx.getOpeningDurationMs() + 300 : 4000),
  );
}

export function applyMissionToPage(
  ctx: FlyApplyContext,
  m: Mission,
  trajectoryOverride?: TrajectoryOverride,
): void {
  const r = computeMissionApply(m, ctx.missionDefaults, trajectoryOverride);
  // Same order the inline implementation used, so any reactive $effect that
  // watched isMoonMission + outPts + retPts together sees the same end state.
  ctx.setArcTimeline(r.timeline);
  ctx.setIsFreeReturn(r.isFreeReturn);
  ctx.setIsMoonMission(r.isMoonMission);
  ctx.setActiveDestination(r.activeDestination);
  ctx.getFlyUpdaters()?.helio.applyDestination(r.activeDestination);
  ctx.setCurrentDestMeshId(r.activeDestination);
  ctx.getFlyUpdaters()?.helio.setSpacecraftModel(m.id);
  ctx.setCislunarTrajectory(r.cislunarTrajectory);
  ctx.setInterplanetaryTrajectory(r.interplanetaryTrajectory);
  // Cislunar lines + annotations fire on both branches (null clears the
  // previous mission's geometry).
  ctx.getFlyUpdaters()?.cislunar.rebuildLines(r.cislunarTrajectory);
  ctx
    .getFlyUpdaters()
    ?.cislunar.rebuildAnnotations(r.cislunarTrajectory, m.flight?.cislunar_profile);
  ctx.setOutPts(r.outPts);
  ctx.setRetPts(r.retPts);
  ctx.getFlyUpdaters()?.helio.resetCamera();
  ctx.setMission(r.missionMeta);
  ctx.setSimDay(r.timeline.dep_day);
  ctx.setSimSpeed(r.simSpeed);
  ctx.setMissionEvents(r.missionEvents);
  // Clears stale W3.1-W3.7 timers from a prior mission (so the new one doesn't
  // start inside a held beat) and arms the opening, so the dwell comes after.
  ctx.resetCinematicForMissionSwap();
  armLaunchDwell(ctx);
  ctx.setLastAppliedMissionId(m.id);
}

export function applyScenarioToPage(ctx: FlyApplyContext, s: LocalizedScenario): void {
  const r = computeScenarioApply(s);
  ctx.setArcTimeline(r.timeline);
  ctx.setIsFreeReturn(r.isFreeReturn);
  ctx.setActiveDestination(r.activeDestination);
  ctx.getFlyUpdaters()?.helio.applyDestination(r.activeDestination);
  ctx.setCurrentDestMeshId(r.activeDestination);
  // The default scenario is the ORRERY-1 demo — no dedicated spacecraft model,
  // so this clears any previously-loaded mission model.
  ctx.getFlyUpdaters()?.helio.setSpacecraftModel(ctx.defaultScenarioId);
  ctx.setIsMoonMission(r.isMoonMission);
  ctx.setCislunarTrajectory(r.cislunarTrajectory);
  ctx.setInterplanetaryTrajectory(r.interplanetaryTrajectory);
  ctx.setOutPts(r.outPts);
  ctx.setRetPts(r.retPts);
  ctx.getFlyUpdaters()?.helio.resetCamera();
  ctx.setMission(r.missionMeta);
  ctx.setSimDay(r.timeline.dep_day);
  ctx.setMissionEvents(r.missionEvents);
  ctx.resetCinematicForMissionSwap();
  armLaunchDwell(ctx);
  // The page initialises with this same scenario, so the test hook can't tell
  // "first paint" from "applyScenario ran" by mission name; this write is the
  // only signal that the URL load committed.
  ctx.setLastAppliedMissionId(ctx.defaultScenarioId);
}

/**
 * /plan-driven entry: `?dest=...&type=...&dep=N&tof=N` (no `?mission=`)
 * synthesises a one-way trajectory for the chosen destination instead of
 * falling through to the ORRERY DEMO scenario (ADR-026 §FLY-button experience).
 */
export function applyPlanSelectionToPage(
  ctx: FlyApplyContext,
  dest: DestinationId,
  type: PlanSelectionType,
  depDay: number,
  tofDays: number,
): void {
  const r = computePlanApply(dest, type, depDay, tofDays, ctx.planDefaults);
  ctx.setArcTimeline(r.timeline);
  ctx.setIsFreeReturn(r.isFreeReturn);
  ctx.setActiveDestination(r.activeDestination);
  ctx.getFlyUpdaters()?.helio.applyDestination(r.activeDestination);
  ctx.setCurrentDestMeshId(r.activeDestination);
  // No mission id on a /plan entry — clear any previous model.
  ctx.getFlyUpdaters()?.helio.setSpacecraftModel('');
  ctx.setIsMoonMission(r.isMoonMission);
  ctx.setCislunarTrajectory(r.cislunarTrajectory);
  ctx.setInterplanetaryTrajectory(r.interplanetaryTrajectory);
  ctx.setOutPts(r.outPts);
  ctx.setRetPts(r.retPts);
  ctx.getFlyUpdaters()?.helio.resetCamera();
  ctx.setMission(r.missionMeta);
  ctx.setSimDay(r.timeline.dep_day);
  ctx.setMissionEvents(r.missionEvents);
  ctx.resetCinematicForMissionSwap();
  armLaunchDwell(ctx);
  ctx.setLastAppliedMissionId(r.appliedId);
}

/**
 * Cislunar sibling of {@link applyPlanSelectionToPage} for the geocentric Moon
 * (ADR-085 · #308): `?dest=moon&dep&tof` from /plan's Earth→Moon porkchop
 * synthesises a cislunar flight so the trip you plan is the trip you fly.
 */
export function applyPlanSelectionMoonToPage(
  ctx: FlyApplyContext,
  depDay: number,
  tofDays: number,
): void {
  const r = computePlanApplyMoon(depDay, tofDays, ctx.planDefaults);
  ctx.setArcTimeline(r.timeline);
  ctx.setIsFreeReturn(r.isFreeReturn);
  ctx.setActiveDestination(r.activeDestination);
  ctx.getFlyUpdaters()?.helio.applyDestination(r.activeDestination);
  ctx.setCurrentDestMeshId(r.activeDestination);
  ctx.getFlyUpdaters()?.helio.setSpacecraftModel('');
  ctx.setIsMoonMission(r.isMoonMission);
  ctx.setCislunarTrajectory(r.cislunarTrajectory);
  ctx.setInterplanetaryTrajectory(r.interplanetaryTrajectory);
  ctx.setOutPts(r.outPts);
  ctx.setRetPts(r.retPts);
  ctx.getFlyUpdaters()?.helio.resetCamera();
  ctx.setMission(r.missionMeta);
  ctx.setSimDay(r.timeline.dep_day);
  ctx.setMissionEvents(r.missionEvents);
  // Cislunar trips are 2.5–5.5 days, not the 100–500 d of a helio plan; the
  // default 7 d/s would play the whole flight in under a second. Match the
  // Moon-mission cadence.
  ctx.setSimSpeed(0.4);
  ctx.resetCinematicForMissionSwap();
  armLaunchDwell(ctx);
  ctx.setLastAppliedMissionId(r.appliedId);
}
