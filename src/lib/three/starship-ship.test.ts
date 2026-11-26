import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { buildStarshipShip, SHIP_R } from './starship-ship';

describe('buildStarshipShip', () => {
  const g = buildStarshipShip();
  const box = new THREE.Box3().setFromObject(g);

  it('is one unit tall, nose up, the skirt at y = 0 and the bells below it', () => {
    expect(box.max.y).toBeCloseTo(1, 1);
    expect(box.min.y).toBeLessThan(0);
    expect(box.min.y).toBeGreaterThan(-0.06);
  });

  it('keeps the 9 m by 50.3 m body proportion', () => {
    expect(SHIP_R * 2 * 50.3).toBeCloseTo(9, 6);
  });

  it('has four flaps on the tile edge (±z), forward and aft on each side', () => {
    const flaps = g.userData.flaps as { pivot: THREE.Group; side: number; fwd: boolean }[];
    expect(flaps).toHaveLength(4);
    expect(flaps.filter((f) => f.fwd)).toHaveLength(2);
    for (const f of flaps) expect(Math.sign(f.pivot.position.z)).toBe(f.side);
    const fwdY = (f: { pivot: THREE.Group }) =>
      new THREE.Box3().setFromObject(f.pivot).getCenter(new THREE.Vector3()).y;
    for (const side of [-1, 1]) {
      const [fwd, aft] = [true, false].map((w) =>
        flaps.find((f) => f.side === side && f.fwd === w)!,
      );
      expect(fwdY(fwd)).toBeGreaterThan(fwdY(aft));
    }
  });

  it('puts the heat-shield tiles on the windward (-x) half', () => {
    const tiled = g.children.filter(
      (o): o is THREE.Mesh =>
        o instanceof THREE.Mesh && (o.material as THREE.MeshStandardMaterial).roughness === 0.85,
    );
    expect(tiled).toHaveLength(2);
    for (const m of tiled) {
      m.geometry.computeBoundingBox();
      const b = m.geometry.boundingBox!;
      expect(b.max.x).toBeLessThan(1e-6);
      expect(b.min.x).toBeLessThan(-SHIP_R * 0.9);
    }
  });

  it('carries four RCS plumes, dark until the scene lights them', () => {
    const rcs = g.userData.rcs as THREE.Object3D[];
    expect(rcs).toHaveLength(4);
    for (const p of rcs) expect(p.visible).toBe(false);
  });
});
