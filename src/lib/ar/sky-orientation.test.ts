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

// ---------------------------------------------------------------------------
// Device-pointing harness (#51). The old deviceQuaternion tests checked the
// azimuth-change MAGNITUDE but explicitly not its sign ("device-dependent"),
// which let a mirrored/ drifting sky pass. This pins the full contract:
//   • where the back camera points (azimuth/altitude) for given device angles;
//   • that the compass yaw-offset corrects a relative/drifting alpha so a body
//     at its true azimuth lands where the phone actually points.
// This is the deterministic substitute for a real phone (jsdom has no sensors).
// ---------------------------------------------------------------------------
describe('device-pointing harness', () => {
  const Y = new THREE.Vector3(0, 1, 0);
  // Where the back camera looks, in ENU (x=East, y=Up, z=South → North=−z).
  function forward(alpha: number, beta: number, gamma: number, screen = 0) {
    const q = deviceQuaternion(alpha, beta, gamma, screen);
    const f = new THREE.Vector3(0, 0, -1).applyQuaternion(q);
    return {
      azDeg: (normRad(Math.atan2(f.x, -f.z)) * 180) / Math.PI,
      altDeg: (Math.asin(Math.max(-1, Math.min(1, f.y))) * 180) / Math.PI,
    };
  }
  // ENU unit direction for a sky azimuth/altitude.
  function enu(azDeg: number, altDeg: number) {
    const a = (azDeg * Math.PI) / 180;
    const e = (altDeg * Math.PI) / 180;
    const c = Math.cos(e);
    return new THREE.Vector3(c * Math.sin(a), Math.sin(e), -c * Math.cos(a));
  }

  it('upright (beta=90) looks at the true compass azimuth = 360−alpha', () => {
    // Android absolute alpha is counter-clockwise; 360−alpha is the true heading.
    expect(forward(0, 90, 0).azDeg).toBeCloseTo(0, 0); // north
    expect(forward(90, 90, 0).azDeg).toBeCloseTo(270, 0); // → west
    expect(forward(270, 90, 0).azDeg).toBeCloseTo(90, 0); // → east
    for (const a of [0, 90, 180, 270]) expect(Math.abs(forward(a, 90, 0).altDeg)).toBeLessThan(1);
  });

  it('tilting the top back (beta 90→180) sweeps the aim up to the zenith', () => {
    expect(forward(0, 110, 0).altDeg).toBeCloseTo(20, 0);
    expect(forward(0, 135, 0).altDeg).toBeCloseTo(45, 0);
    expect(forward(0, 160, 0).altDeg).toBeCloseTo(70, 0);
  });

  it('compass yaw-offset corrects a drifting/relative alpha (the iOS fix)', () => {
    // iOS: alpha is relative (arbitrary launch offset) but webkitCompassHeading
    // gives the TRUE heading. Whatever the relative alpha, a body at the true
    // azimuth the phone points at must end up centred in view.
    for (const relAlpha of [0, 137, 200, 305]) {
      const trueHeadingDeg = (360 - relAlpha) % 360; // pretend the compass reads this
      const camQ = deviceQuaternion(relAlpha, 90, 0);
      const yaw = skyYawOffset(camQ, (trueHeadingDeg * Math.PI) / 180)!; // horizon → non-null
      // Body at the true azimuth, rotated by the offset (toWorldDir), then into
      // camera space — should sit dead ahead (local ≈ 0,0,−1).
      const dir = enu(trueHeadingDeg, 0).applyAxisAngle(Y, yaw);
      const local = dir.applyQuaternion(camQ.clone().invert());
      expect(local.z).toBeLessThan(-0.99); // forward
      expect(Math.abs(local.x)).toBeLessThan(0.02); // centred horizontally
    }
  });

  it('without the compass offset, a relative-alpha sky is wrong (proves the bug)', () => {
    // Same as above but yaw=0 (current camera-path behaviour): a body at the true
    // azimuth is NOT where the phone points when alpha carries a launch offset.
    const relAlpha = 200;
    const trueHeadingDeg = 90; // phone really pointing east
    const camQ = deviceQuaternion(relAlpha, 90, 0);
    const dir = enu(trueHeadingDeg, 0); // no toWorldDir correction
    const local = dir.applyQuaternion(camQ.clone().invert());
    expect(local.z).toBeGreaterThan(-0.9); // NOT centred → mis-placed
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
    expect(Math.abs(skyYawOffset(cam, camHeading)!)).toBeLessThan(1e-6);
  });
  it('applying the offset to an ENU dir lands it where the phone points', () => {
    const cam = camYaw(1.1);
    const trueHeading = 2.0; // the phone is really pointing at 2.0 rad
    const delta = skyYawOffset(cam, trueHeading)!;
    // The ENU dir for the true heading, rotated by the offset, should match the
    // camera's local-space look direction.
    const enuDir = new THREE.Vector3(Math.sin(trueHeading), 0, -Math.cos(trueHeading));
    enuDir.applyAxisAngle(Y, delta);
    const camHeading = headingOfDir(new THREE.Vector3(0, 0, -1).applyQuaternion(cam));
    expect(Math.abs(wrapSignedRad(headingOfDir(enuDir) - camHeading))).toBeLessThan(1e-6);
  });

  it('returns null near the zenith so the caller holds the last offset (#51 M5)', () => {
    // Phone pointed ~straight up: forward ≈ (0, 1, 0), horizontal magnitude ≈ 0,
    // so the look azimuth is indeterminate — the old code let the sky spin here.
    const X = new THREE.Vector3(1, 0, 0);
    const up = new THREE.Quaternion().setFromAxisAngle(X, Math.PI / 2); // (0,0,−1) → (0,1,0)
    expect(skyYawOffset(up, 0)).toBeNull();
    // Steep but clear of the zenith (~70°) is still resolvable → a number.
    const nearUp = new THREE.Quaternion().setFromAxisAngle(X, (70 * Math.PI) / 180);
    expect(typeof skyYawOffset(nearUp, 0)).toBe('number');
  });
});
