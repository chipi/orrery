import * as THREE from 'three';
import {
  eciKmToScreenPx,
  helioAuToScreenPx,
  type ScreenPoint,
  type MinimalProjector,
} from '$lib/orbital/cislunar/cislunar-screen-projection';
import { markerStateFor, type RevealResult } from '$lib/orbital/cislunar/cislunar-marker-reveal';
import { defaultEventLabel } from '$lib/fly-event-labels';
import type { PhaseMarker, ScienceRef } from '$lib/orbital/cislunar/cislunar-events';
import { spacecraftPos, type MissionTimeline, type Vec2 } from '$lib/orbital/mission-arc';
import { SCALE_3D } from '$lib/fly-scene-constants';
import { pickVisibleMilestones, fdLegProgress } from '$lib/fly/fly-frame-selectors';
import type { LoadedMission } from '$lib/fly-mission-apply';

/**
 * Pure per-frame HUD-overlay projection builders for /fly (RFC-036 WS-B/B4).
 *
 * The `onFrame` body projects three heliocentric/cislunar HUD marker overlays each
 * frame. The selection brains (`pickVisibleMilestones` / `fdLegProgress`) already
 * live in `fly-frame-selectors`; these builders own the remaining *assembly* — the
 * loops that turn markers into positioned render arrays via the extracted THREE
 * screen-projection helpers (`eciKmToScreenPx` / `helioAuToScreenPx`). Each is a
 * pure `(inputs) → array | null` function (null = the guard failed, page clears the
 * `$state`), so the frame body shrinks to `const a = build…(); if (a) x = a; else …`.
 * Byte-identical to the inline logic — same guards, same projection calls, same
 * order. The render-state types move here too (the page imports them back).
 */

/** One projected cislunar/interplanetary phase marker. */
export interface PhaseMarkerRenderState {
  event: PhaseMarker['event'];
  scienceRef: ScienceRef | null;
  screen: ScreenPoint;
  reveal: RevealResult;
  eventLabel: string;
}

/** A marker with a heliocentric AU position (Mars/outer-system pipeline). */
export interface InterplanetaryPhaseMarkerLike {
  event: PhaseMarker['event'];
  scienceRef: ScienceRef | null;
  posAu: { x: number; y: number; z: number };
}

/** One Flight-Director cadence stage (the 7-beat INJECTION→ARRIVAL×2-legs set). */
export interface FdStage {
  id:
    | 'injection'
    | 'separation'
    | 'cruise'
    | 'approach'
    | 'arrival'
    | 'cruise-return'
    | 'approach-earth'
    | 'arrival-earth';
  /** Which arc `tickArc` indexes — `outPts` for outbound, `retPts` for return. */
  leg: 'out' | 'return';
  /** Where the diamond anchors on its arc (0–1). */
  tickArc: number;
  /** Reveal threshold against the LEG-relative progress. */
  arcThreshold: number;
  label: () => string;
}

/** One projected FD stage diamond. */
export interface FdPhaseMarkerRender {
  id: FdStage['id'];
  label: string;
  tickScreen: ScreenPoint;
  showTick: boolean;
  revealed: boolean;
}

/** One projected milestone chip (3-state). */
export interface MilestoneRender {
  label: string;
  description?: string;
  met_days: number;
  screen: ScreenPoint;
  /** Legacy flag — true when `state === 'active'`. */
  active: boolean;
  state: 'past' | 'active' | 'future';
}

/** The reused `(x,y,z) → MinimalProjector` factory the frame body builds once. */
export type ProjectorFactory = (x: number, y: number, z: number) => MinimalProjector;

/** Build the shared projector factory (one reused `THREE.Vector3` per instance),
 *  or null when there is no container to project into. */
export function makeProjectorFactory(container: HTMLElement | null): ProjectorFactory | null {
  if (container == null) return null;
  return (x: number, y: number, z: number): MinimalProjector => {
    const v = new THREE.Vector3(x, y, z);
    return {
      project(cam) {
        v.project(cam as unknown as THREE.Camera);
        return v;
      },
    };
  };
}

export interface PhaseMarkerScreensOpts {
  hasPhaseMarkers: boolean;
  container: HTMLElement | null;
  factory: ProjectorFactory | null;
  viewMode: 'heliocentric' | 'cislunar';
  phaseMarkers: PhaseMarker[];
  interplanetaryPhaseMarkers: InterplanetaryPhaseMarkerLike[];
  cislunarCamera: THREE.Camera;
  camera: THREE.Camera;
  simMet: number;
  reducedMotion: boolean;
}

/** Project the cislunar + interplanetary phase markers to screen space. Returns
 *  null when the guard fails (page clears its `$state`). Byte-identical to inline. */
export function buildPhaseMarkerScreens(
  o: PhaseMarkerScreensOpts,
): PhaseMarkerRenderState[] | null {
  if (!(o.hasPhaseMarkers && o.container && o.factory)) return null;
  const cw = o.container.clientWidth;
  const ch = o.container.clientHeight;
  const next: PhaseMarkerRenderState[] = [];
  if (o.viewMode === 'cislunar' && o.phaseMarkers.length > 0) {
    for (const mk of o.phaseMarkers) {
      next.push({
        event: mk.event,
        scienceRef: mk.scienceRef,
        screen: eciKmToScreenPx(mk.posKm, o.factory, o.cislunarCamera, cw, ch),
        reveal: markerStateFor(mk.event.met_days ?? 0, o.simMet, {
          reducedMotion: o.reducedMotion,
        }),
        eventLabel: defaultEventLabel(mk.event.type),
      });
    }
  }
  if (o.viewMode === 'heliocentric' && o.interplanetaryPhaseMarkers.length > 0) {
    for (const mk of o.interplanetaryPhaseMarkers) {
      next.push({
        event: mk.event,
        scienceRef: mk.scienceRef,
        screen: helioAuToScreenPx(mk.posAu, o.factory, o.camera, cw, ch),
        reveal: markerStateFor(mk.event.met_days ?? 0, o.simMet, {
          reducedMotion: o.reducedMotion,
        }),
        eventLabel: defaultEventLabel(mk.event.type),
      });
    }
  }
  return next;
}

export interface FdPhaseMarkerScreensOpts {
  viewMode: 'heliocentric' | 'cislunar';
  outPts: Vec2[];
  retPts: Vec2[];
  container: HTMLElement | null;
  factory: ProjectorFactory | null;
  camera: THREE.Camera;
  stages: FdStage[];
  scPhase: string;
  scProgress: number;
}

/** Project the Flight-Director stage diamonds (heliocentric only). Returns null
 *  when the guard fails. Byte-identical to inline (uses `fdLegProgress`). */
export function buildFdPhaseMarkerScreens(
  o: FdPhaseMarkerScreensOpts,
): FdPhaseMarkerRender[] | null {
  if (!(o.viewMode === 'heliocentric' && o.outPts.length >= 2 && o.container && o.factory)) {
    return null;
  }
  const cwFd = o.container.clientWidth;
  const chFd = o.container.clientHeight;
  const outLastIdx = o.outPts.length - 1;
  const retLastIdx = o.retPts.length - 1;
  const hasReturnArc = o.retPts.length >= 2;
  const { outboundT, returnT } = fdLegProgress(o.scPhase, o.scProgress);
  const fdNext: FdPhaseMarkerRender[] = [];
  for (const s of o.stages) {
    if (s.leg === 'return' && !hasReturnArc) continue;
    const arc = s.leg === 'out' ? o.outPts : o.retPts;
    const lastIdx = s.leg === 'out' ? outLastIdx : retLastIdx;
    const legT = s.leg === 'out' ? outboundT : returnT;
    const tickIdx = Math.max(0, Math.min(lastIdx, Math.round(s.tickArc * lastIdx)));
    const tickPt = arc[tickIdx];
    fdNext.push({
      id: s.id,
      label: s.label(),
      tickScreen: helioAuToScreenPx(
        { x: tickPt.x * SCALE_3D, y: (tickPt.y ?? 0) * SCALE_3D, z: tickPt.z * SCALE_3D },
        o.factory,
        o.camera,
        cwFd,
        chFd,
      ),
      showTick: s.id !== 'injection' && s.id !== 'arrival-earth',
      revealed: legT >= s.arcThreshold,
    });
  }
  return fdNext;
}

export interface MilestoneScreensOpts {
  viewMode: 'heliocentric' | 'cislunar';
  container: HTMLElement | null;
  factory: ProjectorFactory | null;
  camera: THREE.Camera;
  mission: LoadedMission;
  simDay: number;
  arcTimeline: MissionTimeline;
  outPts: Vec2[];
  retPts: Vec2[];
}

/** The ±day windows bounding a milestone's "active" state (byte-identical consts). */
const ACTIVE_APPROACH_DAYS = 30;
const ACTIVE_DEPART_DAYS = 20;

/** Project the labelled milestone chips (heliocentric only). Returns null when the
 *  guard fails. Byte-identical to inline (uses `pickVisibleMilestones`). */
export function buildMilestoneScreens(o: MilestoneScreensOpts): MilestoneRender[] | null {
  if (!(o.viewMode === 'heliocentric' && o.container && o.factory)) return null;
  const cwMs = o.container.clientWidth;
  const chMs = o.container.clientHeight;
  const currentMet = o.simDay - o.arcTimeline.dep_day;
  const picked = pickVisibleMilestones(o.mission.flight?.events ?? [], currentMet, {
    approachDays: ACTIVE_APPROACH_DAYS,
    departDays: ACTIVE_DEPART_DAYS,
  });
  const msNext: MilestoneRender[] = [];
  for (const { evt, state } of picked) {
    const eventSimDay = o.arcTimeline.dep_day + evt.met_days!;
    const evtSc = spacecraftPos(eventSimDay, o.arcTimeline, o.outPts, o.retPts);
    msNext.push({
      label: evt.label!,
      description: evt.description,
      met_days: evt.met_days!,
      screen: helioAuToScreenPx(
        { x: evtSc.pos.x * SCALE_3D, y: 0, z: evtSc.pos.z * SCALE_3D },
        o.factory,
        o.camera,
        cwMs,
        chMs,
      ),
      active: state === 'active',
      state,
    });
  }
  return msNext;
}
