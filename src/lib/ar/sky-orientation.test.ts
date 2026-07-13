import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import {
  normRad,
  wrapSignedRad,
  compassHeadingRad,
  deviceQuaternion,
  headingOfDir,
  skyYawOffset,
} from './sky-orientation';

const TAU = Math.PI * 2;

describe('angle helpers', () => {
  it('normRad wraps into [0, 2π)', () => {
    expect(normRad(0)).toBeCloseTo(0);
    expect(normRad(-0.1)).toBeCloseTo(TAU - 0.1);
    expect(normRad(TAU + 0.5)).toBeCloseTo(0.5);
  });
  it('wrapSignedRad wraps into (−π, π]', () => {
    expect(wrapSignedRad(0)).toBeCloseTo(0);
    expect(wrapSignedRad(TAU - 0.1)).toBeCloseTo(-0.1);
    expect(wrapSignedRad(Math.PI + 0.2)).toBeCloseTo(-Math.PI + 0.2);
  });
});

describe('compassHeadingRad', () => {
  it('uses iOS webkitCompassHeading directly (clockwise from true north)', () => {
    // 90° East → π/2.
    expect(compassHeadingRad({ alpha: 123, webkitCompassHeading: 90 })).toBeCloseTo(Math.PI / 2);
  });
  it('derives Android heading as (360 − alpha) since alpha is counter-clockwise', () => {
    // alpha 90 (CCW) → compass 270° West → 3π/2.
    expect(compassHeadingRad({ alpha: 90 })).toBeCloseTo((3 * Math.PI) / 2);
    // alpha 0 → compass 0 (north).
    expect(compassHeadingRad({ alpha: 0 })).toBeCloseTo(0);
  });
  it('adds the screen rotation angle', () => {
    expect(compassHeadingRad({ alpha: 0 }, 90)).toBeCloseTo(Math.PI / 2);
  });
  it('returns null when no absolute heading is available', () => {
    expect(compassHeadingRad({ alpha: null })).toBeNull();
    expect(compassHeadingRad({ alpha: NaN })).toBeNull();
  });
});

describe('headingOfDir (ENU: north=−z, east=+x)', () => {
  it('maps the cardinal directions', () => {
    expect(headingOfDir(new THREE.Vector3(0, 0, -1))).toBeCloseTo(0); // north
    expect(headingOfDir(new THREE.Vector3(1, 0, 0))).toBeCloseTo(Math.PI / 2); // east
    expect(headingOfDir(new THREE.Vector3(0, 0, 1))).toBeCloseTo(Math.PI); // south
    expect(headingOfDir(new THREE.Vector3(-1, 0, 0))).toBeCloseTo((3 * Math.PI) / 2); // west
  });
  it('ignores the up component (altitude)', () => {
    expect(headingOfDir(new THREE.Vector3(1, 5, 0))).toBeCloseTo(Math.PI / 2);
  });
});

describe('deviceQuaternion', () => {
  it('returns a unit quaternion', () => {
    const q = deviceQuaternion(45, 90, 0);
    expect(q.length()).toBeCloseTo(1);
  });
  it('held upright (beta≈90) looks at the horizon (forward.y ≈ 0)', () => {
    const q = deviceQuaternion(0, 90, 0);
    const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(q);
    expect(Math.abs(fwd.y)).toBeLessThan(0.15);
  });
  it('a change in alpha rotates the look heading by the same magnitude', () => {
    const fwdAt = (alpha: number) => {
      const q = deviceQuaternion(alpha, 90, 0);
      return headingOfDir(new THREE.Vector3(0, 0, -1).applyQuaternion(q));
    };
    const delta = Math.abs(wrapSignedRad(fwdAt(40) - fwdAt(0)));
    expect(delta).toBeGreaterThan(0.5); // ~40° of change, sign is device-dependent
    expect(delta).toBeLessThan(0.9);
  });
});

describe('skyYawOffset', () => {
  const Y = new THREE.Vector3(0, 1, 0);
  // A camera yawed by θ about +y has look-heading normRad(−θ).
  const camYaw = (theta: number) => new THREE.Quaternion().setFromAxisAngle(Y, theta);

  it('is ~0 when the true heading already matches where the camera looks', () => {
    const theta = 0.7;
    const cam = camYaw(theta);
    const camHeading = headingOfDir(new THREE.Vector3(0, 0, -1).applyQuaternion(cam));
    expect(Math.abs(skyYawOffset(cam, camHeading))).toBeLessThan(1e-6);
  });
  it('applying the offset to an ENU dir lands it where the phone points', () => {
    const cam = camYaw(1.1);
    const trueHeading = 2.0; // the phone is really pointing at 2.0 rad
    const delta = skyYawOffset(cam, trueHeading);
    // The ENU dir for the true heading, rotated by the offset, should match the
    // camera's local-space look direction.
    const enuDir = new THREE.Vector3(Math.sin(trueHeading), 0, -Math.cos(trueHeading));
    enuDir.applyAxisAngle(Y, delta);
    const camHeading = headingOfDir(new THREE.Vector3(0, 0, -1).applyQuaternion(cam));
    expect(Math.abs(wrapSignedRad(headingOfDir(enuDir) - camHeading))).toBeLessThan(1e-6);
  });
});
