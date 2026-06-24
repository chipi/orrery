import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { latLonToUnitSphere } from '$lib/moon-projection';
import {
  northTangent,
  azimuthToAlignNorth,
  azimuthToAlignDir,
  placeOnSphereTangent,
} from './place-on-sphere';

const UP_Y = new THREE.Vector3(0, 1, 0);

/** The tangent quaternion the surface-patch wrapper carries at (lat,lon). */
function tangentQuat(latDeg: number, lonDeg: number): THREE.Quaternion {
  const u = latLonToUnitSphere(latDeg, lonDeg);
  return new THREE.Quaternion().setFromUnitVectors(UP_Y, new THREE.Vector3(u.x, u.y, u.z));
}

/**
 * Where the patch's texture-north (local -Z after the builder's rotateX(-90°)
 * + rotateY(deg)) ends up in WORLD space for a given azimuth.
 */
function textureNorthWorld(deg: number, q: THREE.Quaternion): THREE.Vector3 {
  const th = (deg * Math.PI) / 180;
  // rotateY(θ): (0,0,-1) → (-sinθ, 0, -cosθ)
  return new THREE.Vector3(-Math.sin(th), 0, -Math.cos(th)).applyQuaternion(q);
}

const SITES: Array<[number, number]> = [
  [-4.59, 137.44], // Curiosity / Gale
  [18.44, 77.45], // Perseverance / Jezero
  [-2.05, 354.47], // Opportunity-ish
  [40.5, 180], // mid-lat, antimeridian
  [-85, 123], // near south pole
  [0, 0], // equator / prime meridian
  [25.066, 109.925], // Zhurong
  [-14.57, 175.47], // Spirit-ish
];

describe('northTangent', () => {
  it('returns a unit vector', () => {
    for (const [lat, lon] of SITES) {
      expect(northTangent(lat, lon).length()).toBeCloseTo(1, 10);
    }
  });
  it('points toward increasing latitude (matches a small +lat step)', () => {
    for (const [lat, lon] of SITES) {
      const here = latLonToUnitSphere(lat, lon);
      const north = latLonToUnitSphere(lat + 0.01, lon);
      const fdDir = new THREE.Vector3(north.x - here.x, north.y - here.y, north.z - here.z).normalize();
      const n = northTangent(lat, lon);
      // finite-difference north and the analytic tangent should align.
      expect(n.dot(fdDir)).toBeGreaterThan(0.999);
    }
  });
});

describe('azimuthToAlignNorth', () => {
  it('spins texture-north onto geographic north at every site (incl. polar)', () => {
    for (const [lat, lon] of SITES) {
      const q = tangentQuat(lat, lon);
      const deg = azimuthToAlignNorth(lat, lon, q);
      const got = textureNorthWorld(deg, q);
      const want = northTangent(lat, lon);
      expect(got.distanceTo(want)).toBeLessThan(1e-9);
    }
  });
});

describe('azimuthToAlignDir', () => {
  it('spins texture-north onto an arbitrary world tangent direction', () => {
    for (const [lat, lon] of SITES) {
      const q = tangentQuat(lat, lon);
      // pick an in-plane direction = north rotated ~37° about the surface normal
      const u = latLonToUnitSphere(lat, lon);
      const normal = new THREE.Vector3(u.x, u.y, u.z);
      const target = northTangent(lat, lon)
        .clone()
        .applyAxisAngle(normal, (37 * Math.PI) / 180)
        .normalize();
      const deg = azimuthToAlignDir(target, q);
      const got = textureNorthWorld(deg, q);
      expect(got.distanceTo(target)).toBeLessThan(1e-9);
    }
  });
  it('azimuthToAlignNorth is the north special-case of azimuthToAlignDir', () => {
    const q = tangentQuat(18.44, 77.45);
    expect(azimuthToAlignNorth(18.44, 77.45, q)).toBeCloseTo(
      azimuthToAlignDir(northTangent(18.44, 77.45), q),
      10,
    );
  });
});

describe('placeOnSphereTangent', () => {
  it('positions on the sphere and aligns local +Y to the surface normal', () => {
    const g = new THREE.Object3D();
    const u = latLonToUnitSphere(18.44, 77.45);
    placeOnSphereTangent(g, u, 30);
    expect(g.position.length()).toBeCloseTo(30, 9);
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(g.quaternion);
    expect(up.distanceTo(new THREE.Vector3(u.x, u.y, u.z))).toBeLessThan(1e-9);
  });
});
