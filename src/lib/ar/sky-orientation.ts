/**
 * Sky-pointing orientation math (#393, Android parity).
 *
 * The sky scene marks each body at its true-world ENU direction (see
 * `skyDirectionENU`: `+x`=East, `+y`=Up, North=`−z`) and needs to know where the
 * phone points *relative to true north*. ARKit gives that for free
 * (`worldAlignment = .gravityAndHeading`). WebXR and the non-XR "magic-window"
 * path do NOT — they must recover heading from the device compass
 * (`DeviceOrientation`). This module is the pure math for both:
 *
 *   • {@link deviceQuaternion} — DeviceOrientation angles → a THREE camera
 *     quaternion in the ENU world (magic-window path drives the camera with it).
 *   • {@link compassHeadingRad} — screen-compensated true-north heading, handling
 *     iOS `webkitCompassHeading` (clockwise from true north) vs the W3C absolute
 *     `alpha` (counter-clockwise). Used by the WebXR path.
 *   • {@link skyYawOffset} — given the WebXR camera pose + the true heading, the
 *     yaw to rotate ENU directions by so they land at the right azimuth.
 *
 * DEVICE-CALIBRATION NOTE: compass sign/offset conventions vary by OS + browser
 * and cannot be verified in jsdom. {@link AZIMUTH_CALIBRATION_RAD} is the single
 * knob to nudge if the whole sky reads mirrored or rotated on a real device.
 */
import * as THREE from 'three';

/** Nudge if the on-device sky is rotated as a whole (radians, added to heading). */
export const AZIMUTH_CALIBRATION_RAD = 0;

const DEG = Math.PI / 180;
const TWO_PI = Math.PI * 2;

/** Wrap to [0, 2π). */
export function normRad(a: number): number {
  return ((a % TWO_PI) + TWO_PI) % TWO_PI;
}

/** Wrap to (−π, π]. */
export function wrapSignedRad(a: number): number {
  const x = normRad(a);
  return x > Math.PI ? x - TWO_PI : x;
}

/**
 * True-north compass heading in radians, clockwise from north, [0, 2π) — or null
 * when no absolute heading is available (device has no magnetometer / not
 * absolute). `screenAngleDeg` is `screen.orientation.angle` (0/90/180/270).
 */
export function compassHeadingRad(
  e: { alpha: number | null; webkitCompassHeading?: number | null },
  screenAngleDeg = 0,
): number | null {
  const wk = e.webkitCompassHeading;
  if (wk != null && !Number.isNaN(wk)) {
    // iOS Safari/WKWebView: already clockwise from TRUE north.
    return normRad((wk + screenAngleDeg) * DEG + AZIMUTH_CALIBRATION_RAD);
  }
  if (e.alpha == null || Number.isNaN(e.alpha)) return null;
  // W3C absolute frame: alpha increases COUNTER-clockwise from north, so the
  // compass heading is (360 − alpha), then compensated for screen rotation.
  return normRad((360 - e.alpha + screenAngleDeg) * DEG + AZIMUTH_CALIBRATION_RAD);
}

// Scratch objects for deviceQuaternion — the standard DeviceOrientationControls
// construction (Z-X'-Y'' intrinsic → THREE 'YXZ' Euler), then two fixups:
// q1 makes the camera look out the BACK of the device (not the top), q0 undoes
// the current screen rotation.
const _zee = new THREE.Vector3(0, 0, 1);
const _euler = new THREE.Euler();
const _q0 = new THREE.Quaternion();
const _q1 = new THREE.Quaternion(-Math.SQRT1_2, 0, 0, Math.SQRT1_2); // −90° about X

/**
 * DeviceOrientation angles (degrees) → camera orientation quaternion in the ENU
 * world. With the device held upright and `alpha` referenced to north, the
 * camera looks toward that compass azimuth on the horizon.
 */
export function deviceQuaternion(
  alphaDeg: number,
  betaDeg: number,
  gammaDeg: number,
  screenAngleDeg = 0,
  out: THREE.Quaternion = new THREE.Quaternion(),
): THREE.Quaternion {
  _euler.set(betaDeg * DEG, alphaDeg * DEG, -gammaDeg * DEG, 'YXZ');
  out.setFromEuler(_euler);
  out.multiply(_q1);
  out.multiply(_q0.setFromAxisAngle(_zee, -screenAngleDeg * DEG));
  return out;
}

/** Azimuth (heading, [0,2π) clockwise from north=−z toward east=+x) of a dir. */
export function headingOfDir(dir: THREE.Vector3): number {
  return normRad(Math.atan2(dir.x, -dir.z));
}

/**
 * Below this horizontal-component magnitude of the camera-forward vector, the
 * look azimuth is sensor noise (≈0.2 ⇒ pitch ≳ 78° from horizontal — the phone is
 * pointed near the zenith/nadir). {@link skyYawOffset} returns null there so the
 * caller HOLDS its last good offset instead of letting the sky spin. Sky mode is
 * "hold the phone up", so this regime is common, not an edge case.
 */
export const ZENITH_HORIZ_MIN = 0.2;

/**
 * Yaw (radians) to rotate every ENU direction by — around world up (+y) — so
 * that, in the WebXR session's arbitrarily-yawed `local` space, a body's true
 * azimuth lines up with where the phone actually points. Derived from the live
 * XR camera quaternion + the live compass heading, so it tracks continuously.
 *
 * A `Ry(Δ)` rotation shifts a direction's heading by `−Δ`; we want the ENU dir at
 * heading `trueHeading` to end up at the camera's current `local`-space heading,
 * hence `Δ = trueHeading − xrHeading`.
 *
 * Returns **null** when the phone points too near the zenith/nadir for the look
 * azimuth to be meaningful (see {@link ZENITH_HORIZ_MIN}); the caller should keep
 * its previous offset (holding the sky steady) rather than apply a noisy value.
 */
export function skyYawOffset(cameraQuat: THREE.Quaternion, trueHeadingRad: number): number | null {
  const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(cameraQuat);
  if (Math.hypot(fwd.x, fwd.z) < ZENITH_HORIZ_MIN) return null;
  const xrHeading = normRad(Math.atan2(fwd.x, -fwd.z));
  return wrapSignedRad(trueHeadingRad - xrHeading);
}
