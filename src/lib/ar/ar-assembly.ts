/**
 * Tabletop station-assembly replay for AR (#408).
 *
 * When an ISS / Tiangong proxy is anchored on a surface, this plays the same
 * "watch it build itself" animation the /iss and /tiangong routes offer as a
 * scrubbable timeline — but auto-advancing once, from an empty stage to the
 * fully-assembled station, so the first thing the viewer sees on the table is
 * the station coming together module by module in launch order.
 *
 * It reuses the route's assembly primitives verbatim (`applyAssembly`,
 * `buildPiecewiseMapping`, `captureHomes`) and the same launch-epoch data
 * (`ISS_DOCK_EVENTS` / `ISS_TRUSS_PHASES` / `TIANGONG_DOCK_EVENTS` + the base
 * module lists), so the AR replay and the flat route stay in lockstep.
 *
 * The proxy meshes are already tagged (`userData.animModuleId` / `moduleId` /
 * `deployAxis` / `stationPickable`) by the proxy-model builders — the same tags
 * the routes animate against — so no AR-specific tagging is needed.
 */
import * as THREE from 'three';
import {
  captureHomes,
  applyAssembly,
  buildPiecewiseMapping,
  ANIM_WINDOW_MS,
  type AssemblyState,
  type ApplyKind,
} from '../station-assembly-anim';
import { ISS_DOCK_EVENTS, ISS_TRUSS_PHASES } from '../iss-assembly-phases';
import { TIANGONG_DOCK_EVENTS } from '../tiangong-assembly-phases';
import {
  getIssModulesBase,
  getIssVisitorsBase,
  getTiangongModulesBase,
  getTiangongVisitorsBase,
} from '../data';

export type StationKind = 'iss' | 'tiangong';

/** One full tabletop assembly replay lasts this long, then holds assembled. */
const AR_ASSEMBLY_DURATION_MS = 9000;
/** Beat to hold on the finished station before the replay reports done. */
const HOLD_AT_END_MS = 1500;

interface Part {
  mesh: THREE.Object3D;
  id: string;
  kind: ApplyKind;
}

/**
 * Walk the proxy root and collect every independently-animatable part, mirroring
 * the traversal in the /iss + /tiangong animate loops: an object animates on its
 * `animModuleId ?? moduleId`, unless an ancestor already owns an animation id (in
 * which case the ancestor's fly-in carries the whole subtree).
 */
export function collectParts(root: THREE.Object3D): Part[] {
  const parts: Part[] = [];
  root.traverse((o) => {
    const animId = (o.userData.animModuleId ?? o.userData.moduleId) as string | undefined;
    if (!animId) return;
    let p: THREE.Object3D | null = o.parent;
    while (p && p !== root) {
      if (p.userData.animModuleId || p.userData.moduleId) return;
      p = p.parent;
    }
    let kind: ApplyKind;
    if (o.userData.deployAxis) kind = 'deploy';
    else if (o.userData.stationPickable) kind = 'body';
    else kind = 'appendage';
    parts.push({ mesh: o, id: animId, kind });
  });
  return parts;
}

/**
 * Resolve id → launch epoch (ms) for a station, mirroring each route's
 * `launchEpochOf`: synthetic dock / truss phases first, then the base module +
 * visitor lists. Only `id` + `launch_date` are needed, so the overlay-free base
 * loaders are used (no locale prose fetched).
 */
export async function loadStationEpochs(kind: StationKind): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  const add = (id: string, date?: string): void => {
    if (!date) return;
    const e = Date.parse(date);
    if (!Number.isNaN(e)) map.set(id, e);
  };
  if (kind === 'iss') {
    const [mods, vis] = await Promise.all([getIssModulesBase(), getIssVisitorsBase()]);
    for (const m of [...mods, ...vis]) add(m.id, m.launch_date);
    for (const d of ISS_DOCK_EVENTS) add(d.id, d.launch_date);
    for (const t of ISS_TRUSS_PHASES) add(t.id, t.launch_date);
  } else {
    const [mods, vis] = await Promise.all([getTiangongModulesBase(), getTiangongVisitorsBase()]);
    for (const m of [...mods, ...vis]) add(m.id, m.launch_date);
    for (const d of TIANGONG_DOCK_EVENTS) add(d.id, d.launch_date);
  }
  return map;
}

export interface ArStationAssembly {
  /** Advance the replay by `dtMs`. No-op once finished. */
  update(dtMs: number): void;
  /** Snap every part to its assembled home + release captured transforms. */
  dispose(): void;
  /** True once the station is fully assembled and the end-hold has elapsed. */
  readonly done: boolean;
}

/**
 * Start an auto-advancing assembly replay on an anchored proxy `root`. Captures
 * each part's resting transform up front, hides everything (empty stage), then
 * flies parts in on the piecewise launch timeline until fully built.
 */
export function startArStationAssembly(
  root: THREE.Object3D,
  epochs: Map<string, number>,
): ArStationAssembly {
  const parts = collectParts(root);
  const homes = captureHomes(parts.map((pt) => pt.mesh));
  const partEpochs = parts
    .map((pt) => epochs.get(pt.id))
    .filter((e): e is number => e !== undefined && !Number.isNaN(e));
  const startEpoch = partEpochs.length ? Math.min(...partEpochs) : 0;
  const endEpoch = partEpochs.length ? Math.max(...partEpochs) : 0;
  const mapEpoch = buildPiecewiseMapping(partEpochs, ANIM_WINDOW_MS);

  let elapsed = 0;
  let done = false;

  function apply(progress: number): void {
    const state: AssemblyState = {
      active: true,
      nowEpoch: mapEpoch(progress),
      startEpoch,
      endEpoch,
    };
    for (const { mesh, id, kind } of parts) {
      const home = homes.get(mesh);
      if (!home) continue;
      const launchEpoch = epochs.get(id);
      if (launchEpoch === undefined || Number.isNaN(launchEpoch)) {
        mesh.visible = home.visible;
        continue;
      }
      applyAssembly(mesh, home, state, launchEpoch, kind);
    }
  }

  function restoreHomes(): void {
    const state: AssemblyState = { active: false, nowEpoch: 0, startEpoch, endEpoch };
    for (const { mesh, id, kind } of parts) {
      const home = homes.get(mesh);
      if (home) applyAssembly(mesh, home, state, epochs.get(id) ?? 0, kind);
    }
  }

  // Empty stage on frame 0 — nothing has "launched" yet.
  apply(0);

  return {
    get done() {
      return done;
    },
    update(dtMs: number) {
      if (done) return;
      elapsed += dtMs;
      apply(Math.min(1, elapsed / AR_ASSEMBLY_DURATION_MS));
      if (elapsed >= AR_ASSEMBLY_DURATION_MS + HOLD_AT_END_MS) {
        restoreHomes();
        done = true;
      }
    },
    dispose() {
      restoreHomes();
      done = true;
    },
  };
}
