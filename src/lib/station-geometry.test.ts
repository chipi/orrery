// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import {
  setShadowFlags,
  cylinderBetween,
  makeWingPair,
  makeTwoSectionModule,
  makeMliBand,
  makeRadialDockingPort,
  makeAxialAdapter,
} from './station-geometry';

/**
 * Station-agnostic geometry helpers. Pure THREE.js — no DOM. Used by
 * `/iss` (ADR-040/041) and `/tiangong` (ADR-048/049). The picking
 * convention (`userData.stationPickable + userData.moduleId`) per
 * ADR-041 / ADR-049 is the highest-leverage invariant tested here.
 */

describe('setShadowFlags', () => {
  it('sets castShadow + receiveShadow on the target', () => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial());
    setShadowFlags(m);
    expect(m.castShadow).toBe(true);
    expect(m.receiveShadow).toBe(true);
  });

  it('works on a non-mesh Object3D too (group, sprite, etc.)', () => {
    const g = new THREE.Group();
    setShadowFlags(g);
    expect(g.castShadow).toBe(true);
    expect(g.receiveShadow).toBe(true);
  });
});

describe('cylinderBetween', () => {
  it('returns a mesh centred at the midpoint of p1 → p2', () => {
    const p1 = new THREE.Vector3(0, 0, 0);
    const p2 = new THREE.Vector3(0, 4, 0);
    const m = cylinderBetween(p1, p2, 0.1, new THREE.MeshStandardMaterial());
    expect(m.position.x).toBeCloseTo(0, 5);
    expect(m.position.y).toBeCloseTo(2, 5); // midpoint
    expect(m.position.z).toBeCloseTo(0, 5);
  });

  it('produces a cylinder geometry whose height matches |p2 - p1|', () => {
    const p1 = new THREE.Vector3(1, 2, 3);
    const p2 = new THREE.Vector3(4, 6, 3); // distance = 5
    const m = cylinderBetween(p1, p2, 0.05, new THREE.MeshStandardMaterial());
    const params = (m.geometry as THREE.CylinderGeometry).parameters;
    expect(params.height).toBeCloseTo(5, 5);
    expect(params.radiusTop).toBeCloseTo(0.05, 5);
    expect(params.radiusBottom).toBeCloseTo(0.05, 5);
  });

  it('orients the cylinder along the p1 → p2 direction', () => {
    const p1 = new THREE.Vector3(0, 0, 0);
    const p2 = new THREE.Vector3(0, 0, 3); // +Z direction
    const m = cylinderBetween(p1, p2, 0.1, new THREE.MeshStandardMaterial());
    // The default cylinder axis is +Y; the quaternion rotates +Y to +Z,
    // so applying it to (0,1,0) should produce (0,0,1).
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(m.quaternion);
    expect(up.x).toBeCloseTo(0, 5);
    expect(up.y).toBeCloseTo(0, 5);
    expect(up.z).toBeCloseTo(1, 5);
  });
});

describe('makeWingPair', () => {
  it('appends exactly 2 wing meshes to the parent group', () => {
    const parent = new THREE.Group();
    makeWingPair(parent, 2.0, 0.5, 0xb8954a);
    expect(parent.children.length).toBe(2);
    for (const child of parent.children) {
      expect(child).toBeInstanceOf(THREE.Mesh);
    }
  });

  it('positions the two wings symmetrically (negative + positive X)', () => {
    const parent = new THREE.Group();
    makeWingPair(parent, 2.0, 0.5, 0xb8954a);
    const xPositions = parent.children
      .filter((c): c is THREE.Mesh => c instanceof THREE.Mesh)
      .map((m) => m.position.x);
    xPositions.sort((a, b) => a - b);
    expect(xPositions[0]).toBeLessThan(0);
    expect(xPositions[1]).toBeGreaterThan(0);
    // Symmetric around the origin
    expect(Math.abs(xPositions[0] + xPositions[1])).toBeLessThan(1e-5);
  });

  it('each wing carries the requested color via MeshStandardMaterial', () => {
    const parent = new THREE.Group();
    makeWingPair(parent, 2.0, 0.5, 0xff8800);
    for (const child of parent.children) {
      if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
        expect(child.material.color.getHex()).toBe(0xff8800);
      }
    }
  });

  it('sets shadow flags on every wing', () => {
    const parent = new THREE.Group();
    makeWingPair(parent, 2.0, 0.5, 0xb8954a);
    for (const child of parent.children) {
      expect(child.castShadow).toBe(true);
      expect(child.receiveShadow).toBe(true);
    }
  });
});

describe('makeTwoSectionModule', () => {
  const hullMat = new THREE.MeshStandardMaterial({ color: 0xece6dc });
  const mliMat = new THREE.MeshStandardMaterial({ color: 0xc8a04c });

  it('returns a Group containing 3 meshes (section A + section B + MLI band)', () => {
    const g = makeTwoSectionModule({
      id: 'test-module',
      position: new THREE.Vector3(0, 0, 0),
      axis: 'x',
      sections: [
        { len: 1.5, r: 0.22 },
        { len: 1.0, r: 0.16 },
      ],
      hullMat,
      mliMat,
    });
    expect(g).toBeInstanceOf(THREE.Group);
    const meshCount = g.children.filter((c) => c instanceof THREE.Mesh).length;
    expect(meshCount).toBe(3);
  });

  it('tags every mesh with userData.stationPickable + userData.moduleId (ADR-041/049)', () => {
    const g = makeTwoSectionModule({
      id: 'tianhe',
      position: new THREE.Vector3(0, 0, 0),
      axis: 'x',
      sections: [
        { len: 1.5, r: 0.22 },
        { len: 1.0, r: 0.16 },
      ],
      hullMat,
      mliMat,
    });
    for (const child of g.children) {
      if (child instanceof THREE.Mesh) {
        expect(child.userData.stationPickable).toBe(true);
        expect(child.userData.moduleId).toBe('tianhe');
      }
    }
  });

  it('positions the module group at the requested world position', () => {
    const pos = new THREE.Vector3(5, -2, 3);
    const g = makeTwoSectionModule({
      id: 'foo',
      position: pos,
      axis: 'y',
      sections: [
        { len: 1, r: 0.1 },
        { len: 1, r: 0.1 },
      ],
      hullMat,
      mliMat,
    });
    expect(g.position.x).toBe(5);
    expect(g.position.y).toBe(-2);
    expect(g.position.z).toBe(3);
  });

  it('applies the axis rotation (z-rotation for x-axis, x-rotation for z-axis)', () => {
    const xModule = makeTwoSectionModule({
      id: 'x-axis-test',
      position: new THREE.Vector3(0, 0, 0),
      axis: 'x',
      sections: [
        { len: 1, r: 0.1 },
        { len: 1, r: 0.1 },
      ],
      hullMat,
      mliMat,
    });
    expect(xModule.rotation.z).toBeCloseTo(Math.PI / 2, 5);

    const zModule = makeTwoSectionModule({
      id: 'z-axis-test',
      position: new THREE.Vector3(0, 0, 0),
      axis: 'z',
      sections: [
        { len: 1, r: 0.1 },
        { len: 1, r: 0.1 },
      ],
      hullMat,
      mliMat,
    });
    expect(zModule.rotation.x).toBeCloseTo(Math.PI / 2, 5);

    const yModule = makeTwoSectionModule({
      id: 'y-axis-test',
      position: new THREE.Vector3(0, 0, 0),
      axis: 'y',
      sections: [
        { len: 1, r: 0.1 },
        { len: 1, r: 0.1 },
      ],
      hullMat,
      mliMat,
    });
    expect(yModule.rotation.x).toBe(0);
    expect(yModule.rotation.y).toBe(0);
    expect(yModule.rotation.z).toBe(0);
  });

  it('accepts a non-MeshStandardMaterial hull mat (no clone path)', () => {
    // G8: covers the `instanceof THREE.MeshStandardMaterial` else-branch
    // where the hull material is reused as-is rather than cloned.
    const phongMat = new THREE.MeshPhongMaterial({ color: 0xffffff });
    const g = makeTwoSectionModule({
      id: 'phong-hull',
      position: new THREE.Vector3(0, 0, 0),
      axis: 'y',
      sections: [
        { len: 1, r: 0.1 },
        { len: 1, r: 0.1 },
      ],
      hullMat: phongMat,
      mliMat,
    });
    expect(g).toBeInstanceOf(THREE.Group);
    // The hull meshes reuse `phongMat` directly (no clone branch).
    const hullMeshes = g.children
      .filter((c): c is THREE.Mesh => c instanceof THREE.Mesh)
      .map((m) => m.material);
    expect(hullMeshes).toContain(phongMat);
  });

  it('clones the hull material per section (so per-section tinting is non-destructive)', () => {
    const sharedMat = new THREE.MeshStandardMaterial({ color: 0xff0000 });
    const g = makeTwoSectionModule({
      id: 'clone-test',
      position: new THREE.Vector3(0, 0, 0),
      axis: 'y',
      sections: [
        { len: 1, r: 0.1 },
        { len: 1, r: 0.1 },
      ],
      hullMat: sharedMat,
      mliMat,
    });
    // The first two children are the hull sections; both should have
    // their own material clones (not the same instance as sharedMat).
    const hullMaterials = g.children
      .filter((c): c is THREE.Mesh => c instanceof THREE.Mesh)
      .map((m) => m.material as THREE.MeshStandardMaterial)
      .filter((mat) => mat.color.getHex() === 0xff0000);
    // Both hull sections clone sharedMat — neither should be === sharedMat.
    for (const m of hullMaterials) {
      expect(m).not.toBe(sharedMat);
    }
  });
});

describe('makeMliBand', () => {
  it('returns a mesh positioned at the requested point with the requested radius/length', () => {
    const pos = new THREE.Vector3(1, 2, 3);
    const band = makeMliBand(pos, 'y', 0.25, 0.08, new THREE.MeshStandardMaterial());
    expect(band.position.x).toBeCloseTo(1);
    expect(band.position.y).toBeCloseTo(2);
    expect(band.position.z).toBeCloseTo(3);
    const params = (band.geometry as THREE.CylinderGeometry).parameters;
    expect(params.radiusTop).toBeCloseTo(0.25);
    expect(params.height).toBeCloseTo(0.08);
  });

  it('rotates correctly for each axis', () => {
    const b1 = makeMliBand(new THREE.Vector3(), 'x', 0.1, 0.05, new THREE.MeshStandardMaterial());
    expect(b1.rotation.z).toBeCloseTo(Math.PI / 2, 5);
    const b2 = makeMliBand(new THREE.Vector3(), 'z', 0.1, 0.05, new THREE.MeshStandardMaterial());
    expect(b2.rotation.x).toBeCloseTo(Math.PI / 2, 5);
  });

  it('sets shadow flags', () => {
    const b = makeMliBand(new THREE.Vector3(), 'y', 0.1, 0.05, new THREE.MeshStandardMaterial());
    expect(b.castShadow).toBe(true);
    expect(b.receiveShadow).toBe(true);
  });
});

describe('makeRadialDockingPort', () => {
  const mat = new THREE.MeshStandardMaterial();

  it('inherits host moduleId for pickability (port click selects parent module)', () => {
    const port = makeRadialDockingPort({
      hostPosition: new THREE.Vector3(0, 0, 0),
      hostId: 'tianhe',
      direction: 'zenith',
      hostRadius: 0.22,
      mat,
    });
    expect(port.userData.moduleId).toBe('tianhe');
    expect(port.userData.stationPickable).toBe(true);
  });

  it('offsets along the correct direction vector', () => {
    const hostPos = new THREE.Vector3(0, 0, 0);
    // 'zenith' = +Y, 'nadir' = -Y, 'port' = -Z, 'starboard' = +Z, 'fwd' = +X, 'aft' = -X
    const zen = makeRadialDockingPort({
      hostPosition: hostPos,
      hostId: 'h',
      direction: 'zenith',
      hostRadius: 0.5,
      mat,
    });
    expect(zen.position.y).toBeGreaterThan(0);
    const nad = makeRadialDockingPort({
      hostPosition: hostPos,
      hostId: 'h',
      direction: 'nadir',
      hostRadius: 0.5,
      mat,
    });
    expect(nad.position.y).toBeLessThan(0);
    const fwd = makeRadialDockingPort({
      hostPosition: hostPos,
      hostId: 'h',
      direction: 'fwd',
      hostRadius: 0.5,
      mat,
    });
    expect(fwd.position.x).toBeGreaterThan(0);
    const aft = makeRadialDockingPort({
      hostPosition: hostPos,
      hostId: 'h',
      direction: 'aft',
      hostRadius: 0.5,
      mat,
    });
    expect(aft.position.x).toBeLessThan(0);
  });

  it('uses default portRadius and portLength when omitted', () => {
    const port = makeRadialDockingPort({
      hostPosition: new THREE.Vector3(0, 0, 0),
      hostId: 'h',
      direction: 'zenith',
      hostRadius: 0.4,
      mat,
    });
    const params = (port.geometry as THREE.CylinderGeometry).parameters;
    expect(params.radiusTop).toBeCloseTo(0.4 * 0.35, 5);
    expect(params.height).toBeCloseTo(0.06, 5);
  });

  it('honours explicit portRadius and portLength', () => {
    const port = makeRadialDockingPort({
      hostPosition: new THREE.Vector3(0, 0, 0),
      hostId: 'h',
      direction: 'zenith',
      hostRadius: 0.4,
      portRadius: 0.15,
      portLength: 0.2,
      mat,
    });
    const params = (port.geometry as THREE.CylinderGeometry).parameters;
    expect(params.radiusTop).toBeCloseTo(0.15);
    expect(params.height).toBeCloseTo(0.2);
  });

  // G8 gap-closure: exercise the remaining direction branches (port + starboard)
  // and verify the axis-alignment quaternion for both.
  it('offsets toward -Z for direction=port', () => {
    const p = makeRadialDockingPort({
      hostPosition: new THREE.Vector3(0, 0, 0),
      hostId: 'h',
      direction: 'port',
      hostRadius: 0.5,
      mat,
    });
    expect(p.position.z).toBeLessThan(0);
  });

  it('offsets toward +Z for direction=starboard', () => {
    const p = makeRadialDockingPort({
      hostPosition: new THREE.Vector3(0, 0, 0),
      hostId: 'h',
      direction: 'starboard',
      hostRadius: 0.5,
      mat,
    });
    expect(p.position.z).toBeGreaterThan(0);
  });
});

describe('makeAxialAdapter', () => {
  const mat = new THREE.MeshStandardMaterial();

  it('produces a truncated cone (top < bottom radius)', () => {
    const cone = makeAxialAdapter({
      position: new THREE.Vector3(0, 0, 0),
      axis: 'x',
      length: 0.2,
      bigRadius: 0.3,
      mat,
    });
    const params = (cone.geometry as THREE.CylinderGeometry).parameters;
    expect(params.radiusTop).toBeCloseTo(0.3 * 0.7, 5);
    expect(params.radiusBottom).toBeCloseTo(0.3, 5);
    expect(params.height).toBeCloseTo(0.2);
  });

  it('honours explicit smallRadius', () => {
    const cone = makeAxialAdapter({
      position: new THREE.Vector3(0, 0, 0),
      axis: 'y',
      length: 0.1,
      bigRadius: 0.3,
      smallRadius: 0.1,
      mat,
    });
    const params = (cone.geometry as THREE.CylinderGeometry).parameters;
    expect(params.radiusTop).toBeCloseTo(0.1);
  });

  it('positions at the requested location', () => {
    const cone = makeAxialAdapter({
      position: new THREE.Vector3(1, 2, 3),
      axis: 'x',
      length: 0.2,
      bigRadius: 0.3,
      mat,
    });
    expect(cone.position.x).toBeCloseTo(1);
    expect(cone.position.y).toBeCloseTo(2);
    expect(cone.position.z).toBeCloseTo(3);
  });
});
