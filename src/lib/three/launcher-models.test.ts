// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { buildLauncherModel, LAUNCHER_MODEL_IDS } from './launcher-models';

/**
 * Gaps along a launcher's body axis: the y-ranges the core stack's visible meshes cover
 * (meshes whose footprint contains the axis — strap-ons, fins and the Shuttle orbiter sit
 * off it), and the uncovered stretches between them. A real rocket is one connected
 * stack: stages meet at interstages and adapters, the fairing sits on the upper stage.
 */
function isInside(o: THREE.Object3D, group: THREE.Object3D): boolean {
  for (let p: THREE.Object3D | null = o; p; p = p.parent) if (p === group) return true;
  return false;
}

function axisGaps(id: string, vehLen = 1): { from: number; to: number }[] {
  const model = buildLauncherModel(id, vehLen, 2);
  model.root.updateMatrixWorld(true);
  const boxes: THREE.Box3[] = [];
  model.root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh || !mesh.geometry) return;
    let visible = true;
    for (let p: THREE.Object3D | null = mesh; p; p = p.parent) if (!p.visible) visible = false;
    const mat = mesh.material as THREE.Material & { opacity?: number };
    if (!visible || (mat.transparent && (mat.opacity ?? 1) < 0.05)) return;
    if (model.strapOns && isInside(mesh, model.strapOns)) return;
    // An upper stage's engines are not structure: an interstage (or a lattice) must close
    // the joint around them. Only the first stage's bells hang in the open.
    let engine = false;
    for (let p: THREE.Object3D | null = mesh; p; p = p.parent)
      if (p.userData?.engine) engine = true;
    if (engine && !isInside(mesh, model.booster)) return;
    boxes.push(new THREE.Box3().setFromObject(mesh));
  });
  // The core's radius: the widest body that straddles the axis. Anything centred inside it
  // (an engine cluster's off-axis bells, a ring of tanks) is part of the stack.
  const straddles = (b: THREE.Box3): boolean =>
    b.min.x <= 1e-6 && b.max.x >= -1e-6 && b.min.z <= 1e-6 && b.max.z >= -1e-6;
  const coreR = Math.max(
    ...boxes.filter(straddles).map((b) => Math.min(b.max.x - b.min.x, b.max.z - b.min.z) / 2),
  );
  const spans: [number, number][] = boxes
    .filter((b) => {
      const c = b.getCenter(new THREE.Vector3());
      return straddles(b) || Math.hypot(c.x, c.z) < coreR;
    })
    .map((b) => [b.min.y, b.max.y]);
  spans.sort((a, b) => a[0] - b[0]);
  const gaps: { from: number; to: number }[] = [];
  let reach = spans[0]?.[1] ?? 0;
  for (const [lo, hi] of spans.slice(1)) {
    if (lo > reach + vehLen * 0.002) gaps.push({ from: reach, to: lo });
    reach = Math.max(reach, hi);
  }
  return gaps;
}

describe('launcher models are one connected stack', () => {
  // The Shuttle stack is not axial: the orbiter rides beside the tank.
  for (const id of LAUNCHER_MODEL_IDS.filter((x) => x !== 'space-shuttle-stack')) {
    it(`${id} has no gap between its stages`, () => {
      expect(axisGaps(id)).toEqual([]);
    });
  }
});
