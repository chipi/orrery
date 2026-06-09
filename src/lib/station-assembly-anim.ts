/**
 * Station assembly animation — replays the chronological assembly of a
 * modular space station (Tiangong or ISS) inside the existing Three.js
 * scene by hiding modules whose launch date is still in the future and
 * fly-tweening newly-launched modules into their final position.
 *
 * Used by /tiangong (Shape B follow-up to the timeline strip).
 *
 * The fly-in spans `ANIM_WINDOW_MS` of simulated time around each module's
 * launch_date — outside that window the module is either fully visible
 * (past the window) or completely hidden (before the window).
 */
import * as THREE from 'three';

export const ANIM_WINDOW_MS = 1500;

export type AssemblyState = {
  /** Replay is showing. When false, all modules are unconditionally visible. */
  active: boolean;
  /** Current playback date as a Unix epoch (ms). */
  nowEpoch: number;
  /** Earliest launch epoch in the module set (start of the timeline). */
  startEpoch: number;
  /** Latest launch epoch in the module set (end of the timeline). */
  endEpoch: number;
};

/**
 * Cached resting (target) transform of a mesh, captured before the
 * assembly animation ever touches it. Restored when assembly mode exits.
 */
type MeshHome = {
  pos: THREE.Vector3;
  scale: THREE.Vector3;
  visible: boolean;
};

/**
 * Per-object home transforms. WeakMap so disposing the scene cleans up.
 * Accepts any Object3D so animatable Groups (e.g. Wentian / Mengtian
 * solar-pair Groups) get their home transform cached alongside Meshes.
 */
export function captureHomes(objects: THREE.Object3D[]): WeakMap<THREE.Object3D, MeshHome> {
  const m = new WeakMap<THREE.Object3D, MeshHome>();
  for (const o of objects) {
    m.set(o, {
      pos: o.position.clone(),
      scale: o.scale.clone(),
      visible: o.visible,
    });
  }
  return m;
}

function easeOutCubic(t: number): number {
  const c = 1 - t;
  return 1 - c * c * c;
}

export type ApplyKind =
  | 'body' // cylinder / hull mesh — flies in from above with the module
  | 'appendage' // small fixture (dish, whip, boom) — pop in at home
  | 'deploy'; // solar panel — telescopes outward from a per-mesh
//                                deployAnchor along a chosen deployAxis.

/**
 * Apply assembly state to a scene object (Mesh OR Group).
 *
 * - body: t<0 hidden, 0..1 fly-in from above (scale + y-pos), t>1 home
 * - appendage: t<0.55 hidden, 0.55..1 scale 0→1 in place
 * - deploy: t<0.55 hidden, 0.55..1 fold-out from userData.deployAnchor
 *   along userData.deployAxis — only that scale axis animates, other
 *   axes stay full, and the object's position lerps from anchor → home
 *   so the inner edge stays glued to the module while the outer edge
 *   extends outward (real solar-array deployment)
 */
export function applyAssembly(
  obj: THREE.Object3D,
  home: MeshHome,
  state: AssemblyState,
  launchEpoch: number,
  kind: ApplyKind = 'body',
): void {
  if (!state.active) {
    obj.position.copy(home.pos);
    obj.scale.copy(home.scale);
    obj.visible = home.visible;
    return;
  }
  const t = (state.nowEpoch - launchEpoch) / ANIM_WINDOW_MS;
  if (t < 0) {
    obj.visible = false;
    return;
  }
  if (t >= 1) {
    obj.visible = home.visible;
    obj.position.copy(home.pos);
    obj.scale.copy(home.scale);
    return;
  }
  if (kind === 'deploy') {
    const startFrac = 0.55;
    if (t < startFrac) {
      obj.visible = false;
      return;
    }
    obj.visible = home.visible;
    const localT = (t - startFrac) / (1 - startFrac);
    const e = easeOutCubic(localT);
    const axis = (obj.userData.deployAxis as 'x' | 'y' | 'z' | undefined) ?? 'y';
    const anchor = (obj.userData.deployAnchor as THREE.Vector3 | undefined) ?? home.pos;
    // Other axes stay at full home scale — only the long axis grows.
    obj.scale.copy(home.scale);
    obj.scale[axis] = home.scale[axis] * e;
    // Position interpolates from the anchor (folded against module body)
    // to the resting home centre.
    obj.position.lerpVectors(anchor, home.pos, e);
    return;
  }
  if (kind === 'appendage') {
    const startFrac = 0.55;
    if (t < startFrac) {
      obj.visible = false;
      return;
    }
    obj.visible = home.visible;
    const localT = (t - startFrac) / (1 - startFrac);
    const e = easeOutCubic(localT);
    obj.scale.set(home.scale.x * e, home.scale.y * e, home.scale.z * e);
    obj.position.copy(home.pos);
    return;
  }
  obj.visible = home.visible;
  const e = easeOutCubic(t);
  obj.scale.set(home.scale.x * e, home.scale.y * e, home.scale.z * e);
  // Fly in from above (positive Y) — drops onto the resting position.
  obj.position.set(home.pos.x, home.pos.y + (1 - e) * 3, home.pos.z);
}

/**
 * Pick the most-recently-launched module whose launch epoch is at or
 * before `nowEpoch`. Returns null before the first launch.
 */
export function currentChip<T extends { id: string; launch_epoch: number }>(
  perModule: T[],
  nowEpoch: number,
): T | null {
  let best: T | null = null;
  for (const m of perModule) {
    if (m.launch_epoch <= nowEpoch && (!best || m.launch_epoch > best.launch_epoch)) {
      best = m;
    }
  }
  return best;
}

/**
 * Format a Unix-epoch (ms) as `YYYY-MM-DD` — matches the launch_date
 * field shape used in iss-modules.json / tiangong-modules.json.
 */
export function fmtDate(epoch: number): string {
  return new Date(epoch).toISOString().slice(0, 10);
}

/**
 * Build an even-spaced playback mapping over a set of launch epochs.
 *
 * Real launch dates are highly uneven — e.g. Tianhe → Wentian is 15
 * months, then Wentian → Mengtian is 3 months. A linear mapping puts
 * most playback time on the empty 15-month gap. Instead, this function
 * gives every distinct launch event the same slice of progress, so the
 * viewer sees one module land per ~equal chunk of playback time.
 *
 * Each segment maps progress [k/N, (k+1)/N] onto wall-clock dates
 * [epoch_k - window, epoch_k + window], producing a 2×window fly-in
 * centred on the launch event. Dates between events are skipped — the
 * date readout will visibly jump at each segment boundary.
 */
export function buildPiecewiseMapping(
  epochs: number[],
  window: number,
): (progress: number) => number {
  const unique = [...new Set(epochs)].sort((a, b) => a - b);
  if (unique.length === 0) return () => 0;
  return (progress: number): number => {
    const N = unique.length;
    const clamped = Math.max(0, Math.min(1 - 1e-6, progress));
    const segmentIdx = Math.min(N - 1, Math.floor(clamped * N));
    const segmentProgress = clamped * N - segmentIdx;
    const e = unique[segmentIdx];
    return e - window + segmentProgress * window * 2;
  };
}
