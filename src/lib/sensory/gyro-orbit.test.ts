// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import * as THREE from 'three';

// Drive the gyro service to emit a non-zero delta so applyGyroOrbit exercises
// its spherical camera-rotation path (not just the early-out).
vi.mock('./device-orientation', () => ({
  gyro: { consume: vi.fn().mockReturnValueOnce({ dAz: 0.1, dEl: 0.05 }).mockReturnValue({ dAz: 0, dEl: 0 }) },
}));

import { applyGyroOrbit } from './gyro-orbit';

describe('applyGyroOrbit', () => {
  it('rotates the camera around the target when there is a delta', () => {
    const camera = new THREE.PerspectiveCamera();
    camera.position.set(0, 0, 5);
    const target = new THREE.Vector3(0, 0, 0);
    const before = camera.position.clone();
    expect(applyGyroOrbit(camera, target)).toBe(true);
    expect(camera.position.equals(before)).toBe(false); // moved
  });

  it('returns false (no-op) when the delta is zero', () => {
    const camera = new THREE.PerspectiveCamera();
    camera.position.set(0, 0, 5);
    expect(applyGyroOrbit(camera, new THREE.Vector3())).toBe(false);
  });
});
