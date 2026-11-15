/**
 * Plot maths for the launch-director debug view (/dev/launch-director?debug=1). Pure: the
 * Svelte viewer only draws what this returns.
 *
 * Two charts: a SIDE view of the ascent path (downrange vs altitude, ground-relative,
 * each shot's stretch of path coloured), and a RIG view of where each shot puts the
 * camera relative to the vehicle (top-down x/z and elevation, in vehicle lengths) with its
 * look direction, the active shot highlighted and the live camera as a marker with a trail.
 */

import type { AscentState } from '$lib/physics/ascent/ascent-physics';
import type { CameraPose } from './ascent-cameras';
import {
  directedPoseAt,
  groundRelative,
  shotIndexAt,
  vehicleFill,
  type DirectedShot,
  type DirectorPlan,
} from './ascent-director';

export interface Pt {
  x: number;
  y: number;
}

export interface Bounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export interface Transform {
  sx: number;
  sy: number;
  ox: number;
  oy: number;
  /** Map a data point to canvas pixels (y flipped: up is up). */
  apply(p: Pt): Pt;
}

/** Fit `b` into a w x h canvas with `pad` px margins, same scale on both axes when `equal`. */
export function fitTransform(
  b: Bounds,
  w: number,
  h: number,
  pad: number,
  equal = false,
): Transform {
  const dx = Math.max(1e-9, b.maxX - b.minX);
  const dy = Math.max(1e-9, b.maxY - b.minY);
  let sx = (w - 2 * pad) / dx;
  let sy = (h - 2 * pad) / dy;
  if (equal) sx = sy = Math.min(sx, sy);
  const ox = (w - dx * sx) / 2 - b.minX * sx;
  const oy = (h + dy * sy) / 2 + b.minY * sy;
  return { sx, sy, ox, oy, apply: (p) => ({ x: p.x * sx + ox, y: oy - p.y * sy }) };
}

export function boundsOf(pts: Pt[], margin = 0.05): Bounds {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const p of pts) {
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y);
    maxY = Math.max(maxY, p.y);
  }
  if (!Number.isFinite(minX)) return { minX: 0, maxX: 1, minY: 0, maxY: 1 };
  const mx = (maxX - minX) * margin;
  const my = (maxY - minY) * margin;
  return { minX: minX - mx, maxX: maxX + mx, minY: minY - my, maxY: maxY + my };
}

/** Camera placement relative to the vehicle, in vehicle lengths. */
export interface CameraRel {
  /** Along downrange / across / up. */
  dx: number;
  dz: number;
  dy: number;
  /** Look direction (unit) in the same axes. */
  lx: number;
  lz: number;
  ly: number;
  fov: number;
  /** Elevation of the camera above the vehicle (deg) and distance (lengths). */
  elevDeg: number;
  dist: number;
}

export function cameraRelative(pose: CameraPose, s: AscentState, vehLen: number): CameraRel {
  const dx = (pose.px - s.downrangeKm) / vehLen;
  const dy = (pose.py - s.altKm) / vehLen;
  const dz = pose.pz / vehLen;
  let lx = pose.tx - pose.px;
  let ly = pose.ty - pose.py;
  let lz = pose.tz - pose.pz;
  const ll = Math.hypot(lx, ly, lz) || 1;
  lx /= ll;
  ly /= ll;
  lz /= ll;
  const dist = Math.hypot(dx, dy, dz);
  return {
    dx,
    dz,
    dy,
    lx,
    lz,
    ly,
    fov: pose.fov,
    elevDeg: (Math.atan2(dy, Math.hypot(dx, dz)) * 180) / Math.PI,
    dist,
  };
}

export interface PlotShot {
  index: number;
  id: string;
  kind: DirectedShot['kind'];
  tStart: number;
  tEnd: number;
  /** The shot's stretch of ascent path (side view, km). */
  path: Pt[];
  /** Camera at the shot's midpoint, relative to the vehicle. */
  mid: CameraRel;
  /** Framing: share of the frame height the vehicle fills at the midpoint. */
  fill: number;
}

export interface PlotModel {
  /** The whole ascent path (downrange, altitude), ground-relative, km. */
  path: Pt[];
  shots: PlotShot[];
  sideBounds: Bounds;
  /** Largest camera offset in vehicle lengths (sizes the rig chart). */
  rigRadius: number;
}

export interface PlotInputs {
  plan: DirectorPlan;
  /** Sampler for the raw (inertial) state at flight time t. */
  stateAt: (t: number) => AscentState;
  latDeg: number;
  vehLen: number;
  /** Time step (s) for the path polyline. */
  stepS?: number;
}

export function buildPlotModel(inp: PlotInputs): PlotModel {
  const { plan, stateAt, latDeg, vehLen } = inp;
  const step = inp.stepS ?? 2;
  const gs = (t: number): AscentState => groundRelative(stateAt(t), latDeg);
  const end = plan.shots[plan.shots.length - 1].tEnd;
  const path: Pt[] = [];
  for (let t = 0; t <= end; t += step) {
    const s = gs(t);
    path.push({ x: s.downrangeKm, y: s.altKm });
  }
  let rigRadius = 1;
  const shots: PlotShot[] = plan.shots.map((sh, index) => {
    const pts: Pt[] = [];
    for (let t = sh.tStart; t < sh.tEnd; t += step) {
      const s = gs(t);
      pts.push({ x: s.downrangeKm, y: s.altKm });
    }
    const last = gs(sh.tEnd);
    pts.push({ x: last.downrangeKm, y: last.altKm });
    const tm = (sh.tStart + sh.tEnd) / 2;
    const sm = gs(tm);
    const pose = directedPoseAt(plan, tm, sm, vehLen).pose;
    const mid = cameraRelative(pose, sm, vehLen);
    rigRadius = Math.max(rigRadius, Math.hypot(mid.dx, mid.dz), Math.abs(mid.dy));
    return {
      index,
      id: sh.id,
      kind: sh.kind,
      tStart: sh.tStart,
      tEnd: sh.tEnd,
      path: pts,
      mid,
      fill: vehicleFill(pose, sm, vehLen),
    };
  });
  return { path, shots, sideBounds: boundsOf(path, 0.08), rigRadius: rigRadius * 1.15 };
}

export interface LiveReadout {
  shot: string;
  shotIndex: number;
  t: number;
  camPos: [number, number, number];
  camTarget: [number, number, number];
  fillPct: number;
  rel: CameraRel;
}

/** The live camera: the active shot, the pose numbers and the framing fill. */
export function liveReadout(
  plan: DirectorPlan,
  t: number,
  s: AscentState,
  vehLen: number,
): LiveReadout {
  const dp = directedPoseAt(plan, t, s, vehLen);
  const p = dp.pose;
  return {
    shot: plan.shots[shotIndexAt(plan.shots, t)].id,
    shotIndex: dp.index,
    t,
    camPos: [p.px, p.py, p.pz],
    camTarget: [p.tx, p.ty, p.tz],
    fillPct: vehicleFill(p, s, vehLen) * 100,
    rel: cameraRelative(p, s, vehLen),
  };
}

/** What the debug view draws; the owner of the launch (LaunchScene) fills it per frame. */
export interface DirectorDebugData {
  model: PlotModel;
  live: LiveReadout | null;
  /** Live camera trail in the rig frame (vehicle lengths: x downrange, y across). */
  trail: Pt[];
  vehicle: Pt | null;
  light: string;
  cover: string;
  opening: string;
  seed: number;
}

/** Append to a trail, keeping the last `max` points and skipping a point that has not moved. */
export function pushTrail(trail: Pt[], p: Pt, max = 160, minStep = 0.02): Pt[] {
  const last = trail[trail.length - 1];
  if (last && Math.hypot(last.x - p.x, last.y - p.y) < minStep) return trail;
  const next = [...trail, p];
  return next.length > max ? next.slice(next.length - max) : next;
}
