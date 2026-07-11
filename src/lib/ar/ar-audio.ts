// Spatial audio for AR (#209 / RFC-021 §6, anchor A-A). The PRD-017 sonification
// graph is reused verbatim; the ONLY change in AR is where the AudioListener
// sits (the XR camera) and that per-object sources pan by world position. Reuses
// the sensory audio-engine's shared AudioContext + master gain — no new graph.

import { audioEngine } from '../sensory/audio-engine';
import type { ArCameraPose } from '../ar';

/** Forward (−Z) and up (+Y) unit vectors of a quaternion — the listener basis. */
export function orientationVectors(q: [number, number, number, number]): {
  forward: [number, number, number];
  up: [number, number, number];
} {
  const [x, y, z, w] = q;
  return {
    // q * (0, 0, −1) * q⁻¹
    forward: [-2 * (x * z + w * y), -2 * (y * z - w * x), -(1 - 2 * (x * x + y * y))],
    // q * (0, 1, 0) * q⁻¹
    up: [2 * (x * y - w * z), 1 - 2 * (x * x + z * z), 2 * (y * z + w * x)],
  };
}

/** Move the Web Audio listener to the XR camera pose. Call each AR frame. */
export function updateArListener(pose: ArCameraPose): void {
  const bus = audioEngine.bus();
  if (!bus) return;
  const l = bus.ctx.listener;
  const [px, py, pz] = pose.position;
  const { forward, up } = orientationVectors(pose.rotation);
  // Modern AudioParam API where present; fall back to the deprecated setters.
  if ('positionX' in l && l.positionX) {
    l.positionX.value = px;
    l.positionY.value = py;
    l.positionZ.value = pz;
    l.forwardX.value = forward[0];
    l.forwardY.value = forward[1];
    l.forwardZ.value = forward[2];
    l.upX.value = up[0];
    l.upY.value = up[1];
    l.upZ.value = up[2];
  } else {
    (l as AudioListener & { setPosition?(x: number, y: number, z: number): void }).setPosition?.(
      px,
      py,
      pz,
    );
    (
      l as AudioListener & {
        setOrientation?(
          fx: number,
          fy: number,
          fz: number,
          ux: number,
          uy: number,
          uz: number,
        ): void;
      }
    ).setOrientation?.(forward[0], forward[1], forward[2], up[0], up[1], up[2]);
  }
}

export interface ArSpatialSource {
  /** Feed an audio node (an oscillator/gain from a sonification graph) into the panner. */
  connect(node: AudioNode): void;
  /** Move the source in world space (e.g. a planet orbiting). */
  setPosition(x: number, y: number, z: number): void;
  disconnect(): void;
}

/**
 * A world-positioned HRTF panner on the shared master bus — an object's
 * sonification pans from its real-world position. Returns null when Web Audio
 * is unavailable.
 */
export function createSpatialSource(
  worldPosition: [number, number, number],
): ArSpatialSource | null {
  const bus = audioEngine.bus();
  if (!bus) return null;
  const panner = bus.ctx.createPanner();
  panner.panningModel = 'HRTF';
  panner.distanceModel = 'inverse';
  panner.refDistance = 0.1; // tabletop scale
  panner.setPosition(worldPosition[0], worldPosition[1], worldPosition[2]);
  panner.connect(bus.master);
  return {
    connect: (node) => node.connect(panner),
    setPosition: (x, y, z) => panner.setPosition(x, y, z),
    disconnect: () => panner.disconnect(),
  };
}
