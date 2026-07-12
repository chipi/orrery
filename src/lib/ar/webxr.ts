// WebXR AR backend (#205 / RFC-021 §3) — Android web + Android wrapped.
//
// Implements ArBackend on the raw WebXR Device API (`immersive-ar`). Runs its own
// XRSession rAF loop that caches the latest viewer pose + hit-test result, so the
// AR scene builder (#208) can read `getCameraPose()` / `hitTest()` synchronously
// each render frame. Needs an ARCore-capable device — verify on-device (a rugged
// tablet may not be ARCore-certified; the backend then just reports unsupported).

import { Capacitor } from '@capacitor/core';
import type { ArBackend, ArBackendPlatform, ArCameraPose, ArEvent, ArHit } from '../ar';

type Handler = (...args: unknown[]) => void;
const IDENTITY_POSE: ArCameraPose = { position: [0, 0, 0], rotation: [0, 0, 0, 1] };

export function createWebXrBackend(): ArBackend {
  const platform: ArBackendPlatform = Capacitor.isNativePlatform()
    ? 'android-wrapped'
    : 'android-web';

  let session: XRSession | null = null;
  let localSpace: XRReferenceSpace | null = null;
  let viewerSpace: XRReferenceSpace | null = null;
  let hitTestSource: XRHitTestSource | null = null;
  let transientHitTestSource: XRTransientInputHitTestSource | null = null;
  let rafId: number | null = null;

  let lastPose: ArCameraPose = IDENTITY_POSE;
  let lastHit: ArHit | null = null;
  let lastTransientHit: ArHit | null = null;

  const listeners = new Map<ArEvent, Set<Handler>>();
  function emit(event: ArEvent, ...args: unknown[]): void {
    listeners.get(event)?.forEach((h) => h(...args));
  }

  function reset(): void {
    if (session && rafId != null) session.cancelAnimationFrame(rafId);
    rafId = null;
    session = null;
    localSpace = null;
    viewerSpace = null;
    hitTestSource = null;
    transientHitTestSource = null;
    lastPose = IDENTITY_POSE;
    lastHit = null;
    lastTransientHit = null;
    // Session gone → resolve any in-flight anchor requests with their id so
    // callers never hang (the anchor simply never materialised).
    for (const req of pendingAnchors.splice(0)) req.resolve(req.id);
    anchors.clear();
  }

  async function isSupported(): Promise<boolean> {
    const xr = navigator.xr;
    if (!xr) return false;
    try {
      return await xr.isSessionSupported('immersive-ar');
    } catch {
      return false;
    }
  }

  /** Convert a hit-test pose into an ArHit (world point + surface normal). */
  function hitFromPose(pose: XRPose): ArHit {
    const p = pose.transform.position;
    const o = pose.transform.orientation;
    // Surface normal ≈ the hit pose's local +Y rotated by its orientation.
    return { worldPosition: [p.x, p.y, p.z], worldNormal: rotateY(o.x, o.y, o.z, o.w) };
  }

  function updatePose(frame: XRFrame): void {
    if (!localSpace) return;
    const viewerPose = frame.getViewerPose(localSpace);
    if (!viewerPose) return;
    const { position: p, orientation: q } = viewerPose.transform;
    lastPose = { position: [p.x, p.y, p.z], rotation: [q.x, q.y, q.z, q.w] };
  }

  function updateHits(frame: XRFrame): void {
    if (!localSpace) return;
    if (hitTestSource) {
      const hitPose = frame.getHitTestResults(hitTestSource)[0]?.getPose(localSpace);
      lastHit = hitPose ? hitFromPose(hitPose) : null;
    }
    // Per-tap precision: transient-input hit-test rays from the actual touch
    // point. Results are only present during a live touch, so we cache the most
    // recent one — hitTest() (fired on pointerdown) then returns the exact
    // touched surface point rather than the centre-of-screen aim.
    if (transientHitTestSource) {
      const transient = frame.getHitTestResultsForTransientInput(transientHitTestSource);
      const pose = transient.find((r) => r.results.length > 0)?.results[0]?.getPose(localSpace);
      if (pose) lastTransientHit = hitFromPose(pose);
    }
  }

  // Materialise any queued anchors — createAnchor() needs a live frame, but
  // addAnchor() is called from a DOM tap outside the rAF loop.
  function drainAnchors(frame: XRFrame): void {
    if (!pendingAnchors.length || !localSpace) return;
    const canAnchor = typeof frame.createAnchor === 'function';
    for (const req of pendingAnchors.splice(0)) {
      const transform = new XRRigidTransform({
        x: req.position[0],
        y: req.position[1],
        z: req.position[2],
      });
      const promise = canAnchor ? frame.createAnchor?.(transform, localSpace) : undefined;
      if (promise) {
        promise.then(
          (anchor) => {
            anchors.set(req.id, anchor);
            req.resolve(req.id);
          },
          () => req.resolve(req.id),
        );
      } else {
        // Anchors unsupported on this device → synthetic id, graceful fallback.
        req.resolve(req.id);
      }
    }
  }

  const onFrame: XRFrameRequestCallback = (_t, frame) => {
    if (!session) return;
    rafId = session.requestAnimationFrame(onFrame);
    updatePose(frame);
    updateHits(frame);
    drainAnchors(frame);
    emit('frame', frame);
  };

  async function startSession(): Promise<void> {
    const xr = navigator.xr;
    if (!xr) throw new Error('WebXR unavailable on this platform');
    session = await xr.requestSession('immersive-ar', {
      requiredFeatures: ['local'],
      optionalFeatures: ['hit-test', 'anchors', 'dom-overlay'],
    });
    localSpace = await session.requestReferenceSpace('local');
    viewerSpace = await session.requestReferenceSpace('viewer');
    if (session.requestHitTestSource) {
      hitTestSource = (await session.requestHitTestSource({ space: viewerSpace })) ?? null;
    }
    // Per-tap ray precision — the touched point, not the centre-of-screen aim.
    if (session.requestHitTestSourceForTransientInput) {
      transientHitTestSource =
        (await session.requestHitTestSourceForTransientInput({
          profile: 'generic-touchscreen',
        })) ?? null;
    }
    session.addEventListener('end', () => {
      reset();
      emit('session-ended');
    });
    rafId = session.requestAnimationFrame(onFrame);
    emit('session-started', session);
  }

  async function endSession(): Promise<void> {
    if (session) await session.end();
    else reset();
  }

  function getCameraPose(): ArCameraPose {
    return lastPose;
  }

  async function hitTest(_screenX: number, _screenY: number): Promise<ArHit | null> {
    // Prefer the per-tap transient-input hit (the exact touched point); fall
    // back to the persistent viewer-space centre aim where transient hit-test
    // is unavailable on the device.
    return lastTransientHit ?? lastHit;
  }

  // Real WebXR anchors: frame.createAnchor() needs a live frame, so addAnchor()
  // queues the request and the rAF loop (drainAnchors) fulfils it against the
  // current frame, then resolves the promise with the anchor id.
  const anchors = new Map<string, XRAnchor>();
  const pendingAnchors: Array<{
    id: string;
    position: [number, number, number];
    resolve: (id: string) => void;
  }> = [];
  let anchorSeq = 0;
  async function addAnchor(worldPosition: [number, number, number]): Promise<string> {
    const id = `anchor-${++anchorSeq}`;
    if (!session) return id; // no session → nothing to anchor to
    return new Promise<string>((resolve) => {
      pendingAnchors.push({ id, position: worldPosition, resolve });
    });
  }
  async function removeAnchor(anchorId: string): Promise<void> {
    anchors.get(anchorId)?.delete();
    anchors.delete(anchorId);
  }

  function on(event: ArEvent, handler: Handler): () => void {
    let set = listeners.get(event);
    if (!set) {
      set = new Set();
      listeners.set(event, set);
    }
    set.add(handler);
    return () => listeners.get(event)?.delete(handler);
  }

  return {
    name: 'webxr',
    platform,
    isSupported,
    startSession,
    endSession,
    getCameraPose,
    hitTest,
    addAnchor,
    removeAnchor,
    on,
  };
}

/** Rotate the local +Y axis (0,1,0) by a quaternion → the hit surface normal.
 *  Exported for a unit regression guard — the device-only call path (hit-test
 *  rAF) can't validate the sign convention. */
export function rotateY(x: number, y: number, z: number, w: number): [number, number, number] {
  // q * (0,1,0) * q⁻¹, expanded for the unit +Y vector.
  return [2 * (x * y - w * z), 1 - 2 * (x * x + z * z), 2 * (y * z + w * x)];
}
