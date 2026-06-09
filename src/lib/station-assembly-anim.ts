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
 * Per-mesh home transforms. WeakMap so disposing the scene cleans up.
 */
export function captureHomes(meshes: THREE.Mesh[]): WeakMap<THREE.Mesh, MeshHome> {
  const m = new WeakMap<THREE.Mesh, MeshHome>();
  for (const mesh of meshes) {
    m.set(mesh, {
      pos: mesh.position.clone(),
      scale: mesh.scale.clone(),
      visible: mesh.visible,
    });
  }
  return m;
}

function easeOutCubic(t: number): number {
  const c = 1 - t;
  return 1 - c * c * c;
}

/**
 * Apply assembly state to a mesh — interpolates scale + position from
 * "launch site above the station" to the resting home transform across
 * the per-module ANIM_WINDOW_MS centred on `launchEpoch`.
 *
 * - t = (nowEpoch - launchEpoch) / ANIM_WINDOW_MS
 * - t < 0  → hidden (mesh.visible = false)
 * - 0..1   → fly-in (scale tween 0 → 1, position offset +3y → 0)
 * - t > 1  → fully visible at home transform
 */
export function applyAssembly(
  mesh: THREE.Mesh,
  home: MeshHome,
  state: AssemblyState,
  launchEpoch: number,
): void {
  if (!state.active) {
    mesh.position.copy(home.pos);
    mesh.scale.copy(home.scale);
    mesh.visible = home.visible;
    return;
  }
  const t = (state.nowEpoch - launchEpoch) / ANIM_WINDOW_MS;
  if (t < 0) {
    mesh.visible = false;
    return;
  }
  mesh.visible = home.visible;
  if (t >= 1) {
    mesh.position.copy(home.pos);
    mesh.scale.copy(home.scale);
    return;
  }
  const e = easeOutCubic(t);
  mesh.scale.set(home.scale.x * e, home.scale.y * e, home.scale.z * e);
  // Fly in from above (positive Y) — drops onto the resting position.
  mesh.position.set(home.pos.x, home.pos.y + (1 - e) * 3, home.pos.z);
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
