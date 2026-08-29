// AR backend abstraction (#204 / RFC-021 §3). One interface, two implementations
// (WebXR on Android, an ARKit Capacitor plugin on wrapped iPhone). Three.js scene
// code never knows which backend is active — same "abstract over provider,
// implement once per platform" template as PRD-016 TtsProvider / PRD-018
// VisionProvider.

import { Capacitor } from '@capacitor/core';

export type ArBackendName = 'webxr' | 'arkit-capacitor';
export type ArBackendPlatform = 'android-web' | 'android-wrapped' | 'iphone-wrapped';
export type ArEvent = 'session-started' | 'session-ended' | 'frame';

export interface ArCameraPose {
  position: [number, number, number];
  rotation: [number, number, number, number]; // quaternion (x, y, z, w)
}

export interface ArHit {
  worldPosition: [number, number, number];
  worldNormal: [number, number, number];
}

export interface ArSessionOptions {
  /** iOS/ARKit: align the AR world frame to true north + gravity
   *  (ARWorldTrackingConfiguration.worldAlignment = .gravityAndHeading) so a
   *  body's altitude/azimuth maps straight to a world direction — the basis of
   *  the sky-pointing mode (#393). Ignored by backends that can't honour it. */
  headingAligned?: boolean;
}

export interface ArBackend {
  readonly name: ArBackendName;
  readonly platform: ArBackendPlatform;

  // Lifecycle
  isSupported(): Promise<boolean>;
  startSession(opts?: ArSessionOptions): Promise<void>;
  endSession(): Promise<void>;

  // Per-frame (called from RAF)
  getCameraPose(): ArCameraPose;

  // Hit-testing (tap on screen → real-world point)
  hitTest(screenX: number, screenY: number): Promise<ArHit | null>;

  // Anchors (lock a scene origin to a real-world point)
  addAnchor(worldPosition: [number, number, number]): Promise<string>;
  removeAnchor(anchorId: string): Promise<void>;

  // Events
  on(event: ArEvent, handler: (...args: unknown[]) => void): () => void;
}

// ── Backend selection ────────────────────────────────────────────────────────

export type ArPlatform = ArBackendPlatform | 'unsupported';

export interface ArEnv {
  /** `Capacitor.getPlatform()` — 'web' | 'android' | 'ios'. */
  capacitorPlatform: string;
  /** Running inside the Capacitor native wrapper. */
  isNative: boolean;
  /** `navigator.xr` present (WebXR). */
  hasWebXR: boolean;
}

/**
 * Pure classification of the AR platform from environment facts — testable
 * without a device. iPhone-wrapped → ARKit; Android (wrapped or web-with-WebXR)
 * → WebXR; everything else (desktop, iOS Safari, Android web without WebXR) is
 * unsupported.
 */
export function classifyArPlatform(env: ArEnv): ArPlatform {
  const { capacitorPlatform, isNative, hasWebXR } = env;
  if (isNative && capacitorPlatform === 'ios') return 'iphone-wrapped';
  if (isNative && capacitorPlatform === 'android') return 'android-wrapped';
  if (!isNative && capacitorPlatform === 'web' && hasWebXR) return 'android-web';
  return 'unsupported';
}

/** Classify the live environment. */
export function detectArPlatform(): ArPlatform {
  if (typeof navigator === 'undefined') return 'unsupported';
  return classifyArPlatform({
    capacitorPlatform: Capacitor.getPlatform(),
    isNative: Capacitor.isNativePlatform(),
    hasWebXR: 'xr' in navigator && Boolean((navigator as Navigator & { xr?: unknown }).xr),
  });
}

/** iOS web (Safari/WebKit, not the wrapped app) — where AR is impossible but an
 *  App Store fallback makes sense. Capacitor reports 'web' for iOS Safari, so we
 *  read the user agent. */
export function isIosWeb(): boolean {
  if (typeof navigator === 'undefined') return false;
  return !Capacitor.isNativePlatform() && /iPad|iPhone|iPod/.test(navigator.userAgent);
}

/**
 * The REAL device capability check (not just API presence). A device can expose
 * `navigator.xr` yet not support immersive-AR (a non-ARCore Android). This is the
 * gate — analogous to a WebGL capability probe for the flat scenes. Doesn't load
 * the backend chunk. ARKit-wrapped is assumed supported (it's the native app).
 */
export async function isArSessionSupported(): Promise<boolean> {
  const platform = detectArPlatform();
  if (platform === 'unsupported') return false;
  if (platform === 'iphone-wrapped') return true;
  try {
    return (await navigator.xr?.isSessionSupported('immersive-ar')) ?? false;
  } catch {
    return false;
  }
}

/** UI state for an "Enter AR" affordance (#213). */
export type ArAvailability = 'enabled' | 'ios-fallback' | 'hidden';

/** enabled where AR works; a greyed App-Store fallback on iOS Safari; hidden on
 *  desktop / unsupported-non-iOS. Pure — testable. */
export function arAvailability(platform: ArPlatform, iosWeb: boolean): ArAvailability {
  if (platform !== 'unsupported') return 'enabled';
  if (iosWeb) return 'ios-fallback';
  return 'hidden';
}

/**
 * Sky-pointing (#393) availability. Two substrates give functional parity:
 * a real immersive-AR session (ARKit heading-aligned, or WebXR + compass
 * correction) OR the non-XR "magic window" (rear-camera feed + DeviceOrientation
 * compass), which works on any mobile with a magnetometer + gyro — no ARCore. So
 * SKY is enabled wherever EITHER is available; hidden only on desktop / no
 * sensors. Pure — the caller probes `xrSupported` (await isArSessionSupported())
 * and `magicWindow` ({@link isMobileSkyCapable}). */
export function skyAvailability(xrSupported: boolean, magicWindow: boolean): ArAvailability {
  return xrSupported || magicWindow ? 'enabled' : 'hidden';
}

/**
 * Whether the non-XR sky substrate could run: a DeviceOrientation API on a
 * MOBILE device. The gyro is the hard requirement (it drives the camera pose);
 * the rear camera is an OPTIONAL backdrop — where `getUserMedia` is absent or
 * blocked (notably iOS Safari home-screen PWAs, which don't expose it) the
 * substrate still runs as a dark-sky **planetarium** (`createCameraSkyView`
 * degrades gracefully). Requiring the camera here is what wrongly hid the whole
 * sky feature in the iOS PWA — so it's gated on the gyro + a mobile pointer, not
 * the camera. The mobile gate (coarse pointer / touch) keeps it off desktop
 * browsers, which expose DeviceOrientationEvent but have no usable compass; real
 * event delivery is re-confirmed when the view actually starts. */
export function isMobileSkyCapable(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  if (typeof DeviceOrientationEvent === 'undefined') return false;
  const coarse = window.matchMedia?.('(pointer: coarse)')?.matches ?? false;
  const touch = (navigator.maxTouchPoints ?? 0) > 0;
  return coarse || touch;
}

/**
 * Lazily load the AR backend for the current platform. Returns null when AR is
 * unsupported. The backend chunk (WebXR or ARKit adapter) only loads here, so it
 * never weighs on the flat-screen bundle.
 */
export async function getArBackend(): Promise<ArBackend | null> {
  switch (detectArPlatform()) {
    case 'android-web':
    case 'android-wrapped':
      return (await import('./ar/webxr')).createWebXrBackend();
    case 'iphone-wrapped':
      return (await import('./ar/arkit-capacitor')).createArkitBackend();
    default:
      return null;
  }
}
