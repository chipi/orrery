// ARKit AR backend adapter (#207 / RFC-021 §3) — wrapped iPhone only.
//
// Implements ArBackend by calling the native @orrery/ar-bridge Capacitor plugin
// (#206) as `ArBridge`. Native ARKit emits `frame` events (30–60 Hz) carrying the
// camera pose; we cache the latest so getCameraPose() is synchronous, mirroring
// the WebXR backend's rAF cache.

import { Capacitor, registerPlugin } from '@capacitor/core';
import type { ArBackend, ArCameraPose, ArEvent, ArHit, ArSessionOptions } from '../ar';

// The native plugin surface (mirrors the @objc methods in ArBridgePlugin.swift).
interface ArBridgePlugin {
  requestSession(options?: { headingAligned?: boolean }): Promise<void>;
  endSession(): Promise<void>;
  hitTest(options: { x: number; y: number }): Promise<{ hit: ArHit | null }>;
  addAnchor(options: { position: [number, number, number] }): Promise<{ anchorId: string }>;
  removeAnchor(options: { anchorId: string }): Promise<void>;
  addListener(
    event: 'frame' | 'session-started' | 'session-ended',
    cb: (data: { pose?: ArCameraPose }) => void,
  ): Promise<{ remove: () => Promise<void> }>;
}

const ArBridge = registerPlugin<ArBridgePlugin>('ArBridge');

type Handler = (...args: unknown[]) => void;
const IDENTITY_POSE: ArCameraPose = { position: [0, 0, 0], rotation: [0, 0, 0, 1] };

export function createArkitBackend(): ArBackend {
  let lastPose: ArCameraPose = IDENTITY_POSE;
  const nativeRemovers: Array<() => Promise<void>> = [];
  const listeners = new Map<ArEvent, Set<Handler>>();

  function emit(event: ArEvent, ...args: unknown[]): void {
    listeners.get(event)?.forEach((h) => h(...args));
  }

  async function isSupported(): Promise<boolean> {
    // World tracking requires the native wrapper on iOS; the plugin's
    // requestSession rejects at runtime if the specific device can't do ARKit.
    return Capacitor.getPlatform() === 'ios' && Capacitor.isNativePlatform();
  }

  async function startSession(opts?: ArSessionOptions): Promise<void> {
    // Register listeners WITHOUT awaiting: Capacitor adds the JS callback
    // synchronously, but awaiting a custom plugin's addListener *handle* can
    // never resolve (bridge quirk) and would deadlock start. Collect the remover
    // when/if the handle promise settles.
    const track = (p: Promise<{ remove: () => Promise<void> }>) =>
      void p.then((sub) => nativeRemovers.push(sub.remove)).catch(() => {});
    track(
      ArBridge.addListener('frame', (data) => {
        if (data.pose) lastPose = data.pose;
        emit('frame', data.pose);
      }),
    );
    track(ArBridge.addListener('session-started', () => emit('session-started')));
    track(
      ArBridge.addListener('session-ended', () => {
        lastPose = IDENTITY_POSE;
        emit('session-ended');
      }),
    );
    await ArBridge.requestSession({ headingAligned: opts?.headingAligned ?? false });
  }

  async function endSession(): Promise<void> {
    await ArBridge.endSession().catch(() => {});
    for (const remove of nativeRemovers.splice(0)) await remove().catch(() => {});
    lastPose = IDENTITY_POSE;
  }

  function getCameraPose(): ArCameraPose {
    return lastPose;
  }

  async function hitTest(screenX: number, screenY: number): Promise<ArHit | null> {
    const { hit } = await ArBridge.hitTest({ x: screenX, y: screenY });
    return hit ?? null;
  }

  async function addAnchor(worldPosition: [number, number, number]): Promise<string> {
    const { anchorId } = await ArBridge.addAnchor({ position: worldPosition });
    return anchorId;
  }

  async function removeAnchor(anchorId: string): Promise<void> {
    await ArBridge.removeAnchor({ anchorId });
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
    name: 'arkit-capacitor',
    platform: 'iphone-wrapped',
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
