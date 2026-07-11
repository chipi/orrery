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

export interface ArBackend {
  readonly name: ArBackendName;
  readonly platform: ArBackendPlatform;

  // Lifecycle
  isSupported(): Promise<boolean>;
  startSession(): Promise<void>;
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
