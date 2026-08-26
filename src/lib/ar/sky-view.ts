/**
 * Sky-pointing view sources (#393, cross-platform parity).
 *
 * The sky scene is substrate-agnostic: it places body reticles at true ENU
 * directions and asks a `SkyView` for (a) the current camera pose and (b) how to
 * rotate an ENU direction into the render world. Two implementations:
 *
 *   • {@link createXrSkyView} — AR session (ARKit or WebXR). ARKit is
 *     heading-aligned so ENU maps straight through; WebXR's `local` space is not,
 *     so the device compass corrects the azimuth each frame (`skyYawOffset`).
 *   • {@link createCameraSkyView} — the non-XR "magic window": the rear camera as
 *     a video backdrop + `DeviceOrientation` driving the camera directly. Works on
 *     any phone with a magnetometer + gyro, no ARCore/WebXR needed.
 *
 * {@link pickSkyView} chooses XR when a real immersive-AR session is supported,
 * else the magic window, else null (no sensors → the button never appears).
 */
import * as THREE from 'three';
import { getArBackend, isArSessionSupported, isMobileSkyCapable, type ArBackend } from '../ar';
import { deviceQuaternion, compassHeadingRad, skyYawOffset } from './sky-orientation';

const Y = new THREE.Vector3(0, 1, 0);

export interface SkyView {
  /** Passthrough substrate: 'xr' (device compositor) or 'camera' (video feed). */
  readonly kind: 'xr' | 'camera';
  /**
   * True when the pose is delivered in the device's NATIVE (landscape) frame and
   * the caller must roll it onto the current interface orientation itself — i.e.
   * ARKit only. WebXR viewer poses are already screen-oriented by the UA, and the
   * camera (magic-window) path compensates screen angle inside its quaternion, so
   * both are false (rolling them would double-count). Only meaningful after start().
   */
  readonly needsInterfaceRoll: boolean;
  /** Begin the session / sensors. Resolves false if the substrate can't start. */
  start(): Promise<boolean>;
  /** Per-frame: write the current pose into `camera`. */
  updateCamera(camera: THREE.PerspectiveCamera): void;
  /** Rotate an ENU sky direction into the render world (in place). */
  toWorldDir(dir: THREE.Vector3): void;
  /** Register a callback for a substrate-initiated end (system "exit AR"). */
  onEnded(cb: () => void): void;
  stop(): void;
}

/** `screen.orientation.angle` with the legacy `window.orientation` fallback. */
function screenAngleDeg(): number {
  if (typeof window === 'undefined') return 0;
  const a = window.screen?.orientation?.angle;
  if (typeof a === 'number') return a;
  const legacy = (window as unknown as { orientation?: number }).orientation;
  return typeof legacy === 'number' ? legacy : 0;
}

type OrientEvent = DeviceOrientationEvent & { webkitCompassHeading?: number | null };

// ---------------------------------------------------------------------------
// XR view — ARKit (heading-aligned) or WebXR (compass-corrected).
// ---------------------------------------------------------------------------
export function createXrSkyView(): SkyView {
  let backend: ArBackend | null = null;
  let heading: number | null = null; // live compass heading (WebXR only)
  let yawOffset = 0;
  let onOrient: ((e: Event) => void) | null = null;
  const scratch = new THREE.Quaternion();

  function startCompass(): void {
    onOrient = (e: Event) => {
      const o = e as OrientEvent;
      const h = compassHeadingRad(
        { alpha: o.alpha, webkitCompassHeading: o.webkitCompassHeading },
        screenAngleDeg(),
      );
      if (h != null) heading = h;
    };
    window.addEventListener('deviceorientationabsolute', onOrient);
    window.addEventListener('deviceorientation', onOrient);
  }
  function stopCompass(): void {
    if (!onOrient) return;
    window.removeEventListener('deviceorientationabsolute', onOrient);
    window.removeEventListener('deviceorientation', onOrient);
    onOrient = null;
  }

  return {
    kind: 'xr',
    // Only ARKit delivers a landscape-native pose that needs the interface roll;
    // WebXR poses are already screen-oriented by the UA. Resolved after start().
    get needsInterfaceRoll() {
      return backend?.name === 'arkit-capacitor';
    },
    async start() {
      backend = await getArBackend();
      if (!backend || !(await backend.isSupported())) return false;
      await backend.startSession({ headingAligned: true });
      // ARKit is already true-north; WebXR's local space is not → use the compass.
      if (backend.name === 'webxr') startCompass();
      return true;
    },
    updateCamera(camera) {
      if (!backend) return;
      const pose = backend.getCameraPose();
      camera.position.set(...pose.position);
      camera.quaternion.set(...pose.rotation);
      if (backend.name === 'webxr' && heading != null) {
        scratch.set(...pose.rotation);
        yawOffset = skyYawOffset(scratch, heading);
      }
    },
    toWorldDir(dir) {
      if (yawOffset) dir.applyAxisAngle(Y, yawOffset);
    },
    onEnded(cb) {
      backend?.on('session-ended', cb);
    },
    stop() {
      stopCompass();
      void backend?.endSession();
      backend = null;
    },
  };
}

// ---------------------------------------------------------------------------
// Camera view — the non-XR "magic window": rear-camera video + DeviceOrientation.
// ---------------------------------------------------------------------------
export function createCameraSkyView(): SkyView {
  let stream: MediaStream | null = null;
  let video: HTMLVideoElement | null = null;
  let onOrient: ((e: Event) => void) | null = null;
  let gotEvent = false;
  let alpha = 0;
  let beta = 90; // upright default → look at the horizon before the first event
  let gamma = 0;
  // True-north lock (#51). On iOS the DeviceOrientation `alpha` is RELATIVE (an
  // arbitrary launch offset that drifts), so driving the camera from it alone
  // makes the whole sky slide as you move. `webkitCompassHeading` (and Android's
  // absolute `alpha`) give true north; we recover it here and correct the ENU
  // directions each frame via a yaw offset — exactly as the WebXR path does.
  let heading: number | null = null;
  let yawOffset = 0;
  const q = new THREE.Quaternion();

  async function requestOrientationPermission(): Promise<void> {
    const DOE = (
      typeof DeviceOrientationEvent !== 'undefined' ? DeviceOrientationEvent : undefined
    ) as
      (typeof DeviceOrientationEvent & { requestPermission?: () => Promise<string> }) | undefined;
    if (typeof DOE?.requestPermission === 'function') {
      try {
        await DOE.requestPermission();
      } catch {
        /* denied → events simply won't fire; start() resolves false */
      }
    }
  }

  function startOrientation(): Promise<boolean> {
    return new Promise((resolve) => {
      if (typeof window === 'undefined' || typeof DeviceOrientationEvent === 'undefined') {
        resolve(false);
        return;
      }
      onOrient = (e: Event) => {
        const o = e as OrientEvent;
        if (o.alpha == null && o.beta == null && o.gamma == null) return;
        gotEvent = true;
        if (o.alpha != null) alpha = o.alpha;
        if (o.beta != null) beta = o.beta;
        if (o.gamma != null) gamma = o.gamma;
        // Recover true north from the compass (iOS webkitCompassHeading, or
        // Android's absolute alpha). Null on devices with no magnetometer → we
        // fall back to the raw relative frame (no worse than before).
        const h = compassHeadingRad(
          { alpha: o.alpha, webkitCompassHeading: o.webkitCompassHeading },
          screenAngleDeg(),
        );
        if (h != null) heading = h;
      };
      window.addEventListener('deviceorientationabsolute', onOrient);
      window.addEventListener('deviceorientation', onOrient);
      // Resolve on the first event, or after a short grace period (some devices
      // fire nothing → treat as unsupported so the caller can bail).
      const t = setTimeout(() => resolve(gotEvent), 1200);
      const check = () => {
        if (gotEvent) {
          clearTimeout(t);
          resolve(true);
        }
      };
      window.addEventListener('deviceorientationabsolute', check, { once: true });
      window.addEventListener('deviceorientation', check, { once: true });
    });
  }

  function attachVideo(s: MediaStream): void {
    video = document.createElement('video');
    video.className = 'ar-camera-feed';
    video.playsInline = true;
    video.muted = true;
    video.autoplay = true;
    video.srcObject = s;
    // Full-bleed backdrop directly behind the (transparent) sky canvas.
    video.style.cssText =
      'position:fixed;inset:0;width:100vw;height:100vh;object-fit:cover;z-index:9996;';
    document.body.appendChild(video);
    void video.play().catch(() => {});
  }

  return {
    kind: 'camera',
    // The magic-window path already compensates screen angle inside deviceQuaternion,
    // so the caller must NOT roll it again.
    needsInterfaceRoll: false,
    async start() {
      await requestOrientationPermission();
      const okOrient = await startOrientation();
      if (!okOrient) {
        stopOrientation();
        return false; // no compass/gyro → sky mode can't work
      }
      // Rear camera as the backdrop. If it's blocked/absent we still run — the
      // sky reticles just sit over black instead of a live feed.
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
          audio: false,
        });
        attachVideo(stream);
      } catch {
        stream = null;
      }
      return true;
    },
    updateCamera(camera) {
      camera.position.set(0, 0, 0);
      camera.quaternion.copy(deviceQuaternion(alpha, beta, gamma, screenAngleDeg(), q));
      // North-lock: the yaw that brings the (possibly relative) camera frame onto
      // true north. Self-cancels to ~0 when alpha is already absolute (Android),
      // and corrects the launch offset + drift when it isn't (iOS).
      if (heading != null) yawOffset = skyYawOffset(camera.quaternion, heading);
    },
    toWorldDir(dir) {
      if (yawOffset) dir.applyAxisAngle(Y, yawOffset);
    },
    onEnded() {
      /* no system-initiated end; exit is the button only */
    },
    stop() {
      stopOrientation();
      stream?.getTracks().forEach((t) => t.stop());
      stream = null;
      video?.remove();
      video = null;
    },
  };

  function stopOrientation(): void {
    if (!onOrient) return;
    window.removeEventListener('deviceorientationabsolute', onOrient);
    window.removeEventListener('deviceorientation', onOrient);
    onOrient = null;
  }
}

/** Pick the best available sky substrate: real immersive-AR first, else the
 *  non-XR magic window on a mobile device, else null (no sensors → the SKY
 *  affordance stays hidden). Mirrors the {@link skyAvailability} gate. */
export async function pickSkyView(): Promise<SkyView | null> {
  if (await isArSessionSupported()) return createXrSkyView();
  if (isMobileSkyCapable()) return createCameraSkyView();
  return null;
}
