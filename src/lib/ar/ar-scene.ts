// AR scene builders (#208 / RFC-021 §1, §5) — simplified Three.js scene variants
// for the four globe routes, placed on a real-world surface. Anchor decision X-C:
// SAME scene data, simplified rendering for AR perf (72 fps) — 100 stars, no
// particles/trails/postprocessing.
//
// Split into two layers:
//   • buildArSceneContent(type) — PURE: returns a THREE.Group of simplified
//     bodies at a small tabletop scale. Unit-testable, no AR/session needed.
//   • createArScene(...)         — wires the ArBackend session + tap-to-place +
//     the render loop that drives Camera B from the backend pose. Needs a device.

import * as THREE from 'three';
import { getArBackend, type ArBackend, type ArHit } from '../ar';
import { updateArListener, createSpatialSource, initHeadphoneDetection } from './ar-audio';
import { arHaptic } from './ar-haptics';
import { scheduleArNarration, type ArNarratorHandle } from './ar-narrator';
import { audioEngine } from '../sensory/audio-engine';
import { audioBus } from '../audio-bus';

export type ArSceneType = 'explore' | 'earth' | 'moon' | 'mars';

// Tabletop scale — the whole scene fits in ~40 cm so it sits on a table.
const TABLE_RADIUS = 0.2;

const BODY_COLOR: Record<Exclude<ArSceneType, 'explore'>, number> = {
  earth: 0x3a6ea5,
  moon: 0xb9b9b9,
  mars: 0xc1440e,
};

// /explore: the Sun + eight planets on rings, ordered outward. Radii/colours are
// illustrative (simplified), not the flat-screen scene's exact values.
const PLANETS: Array<{ orbit: number; size: number; color: number }> = [
  { orbit: 0.03, size: 0.006, color: 0xb5b5b5 }, // Mercury
  { orbit: 0.05, size: 0.009, color: 0xe0c080 }, // Venus
  { orbit: 0.07, size: 0.01, color: 0x3a6ea5 }, // Earth
  { orbit: 0.09, size: 0.008, color: 0xc1440e }, // Mars
  { orbit: 0.12, size: 0.02, color: 0xd8a878 }, // Jupiter
  { orbit: 0.15, size: 0.018, color: 0xd9c07a }, // Saturn
  { orbit: 0.17, size: 0.014, color: 0x9fd4e0 }, // Uranus
  { orbit: 0.19, size: 0.014, color: 0x5b7bd4 }, // Neptune
];

/**
 * Build the simplified AR scene content (pure — no AR session). Returns a Group
 * scaled to sit on a tabletop, with a light so the bodies read in a real room.
 */
export function buildArSceneContent(type: ArSceneType): THREE.Group {
  const group = new THREE.Group();
  group.name = `ar-scene-${type}`;

  // One key light — physically-correct default (× Math.PI like the flat scenes).
  const key = new THREE.DirectionalLight(0xfff4e8, 1.1 * Math.PI);
  key.position.set(0.3, 0.5, 0.4);
  group.add(key);
  group.add(new THREE.HemisphereLight(0x334455, 0x111111, 0.4 * Math.PI));

  if (type === 'explore') {
    const sun = new THREE.Mesh(
      new THREE.SphereGeometry(0.02, 24, 24),
      new THREE.MeshBasicMaterial({ color: 0xffcc55 }),
    );
    sun.name = 'sun';
    group.add(sun);
    for (let i = 0; i < PLANETS.length; i++) {
      const p = PLANETS[i];
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(p.size, 16, 16),
        new THREE.MeshStandardMaterial({ color: p.color, roughness: 0.8 }),
      );
      mesh.name = `planet-${i}`;
      mesh.position.set(p.orbit, 0, 0);
      group.add(mesh);
      group.add(orbitRing(p.orbit));
    }
  } else {
    const body = new THREE.Mesh(
      new THREE.SphereGeometry(TABLE_RADIUS * 0.7, 48, 48),
      new THREE.MeshStandardMaterial({ color: BODY_COLOR[type], roughness: 0.9 }),
    );
    body.name = type;
    group.add(body);
  }
  return group;
}

function orbitRing(radius: number): THREE.Line {
  const pts: THREE.Vector3[] = [];
  for (let a = 0; a <= 64; a++) {
    const t = (a / 64) * Math.PI * 2;
    pts.push(new THREE.Vector3(Math.cos(t) * radius, 0, Math.sin(t) * radius));
  }
  const geo = new THREE.BufferGeometry().setFromPoints(pts);
  return new THREE.Line(
    geo,
    new THREE.LineBasicMaterial({ color: 0x556677, transparent: true, opacity: 0.4 }),
  );
}

export interface ArSceneHandle {
  /** Start AR: returns false if AR is unsupported on this device. */
  start(): Promise<boolean>;
  stop(): void;
}

/**
 * Wire an AR session for a globe scene: renderer.xr for the framebuffer, a scene
 * root placed on the first tapped surface, and a render loop that reads the
 * backend camera pose. Needs an AR-capable device — verify on Android/iPhone.
 */
export interface ArSceneOptions {
  /** Called when the AR session ends (system exit / device unsupported), so the
   *  caller can remove the AR canvas and return to the flat view. */
  onExit?: () => void;
  /** Play the scene's Guide narration episode by id — wired to the app's audio
   *  player by launch-ar. Omitted (e.g. in tests) → narration simply doesn't
   *  auto-play; placement/spatial-audio/haptics are unaffected. */
  playNarration?: (episodeId: string) => void;
}

// Soft, quiet per-body voices for AR spatial sonification (#209, RFC-021 §6).
// Pitches ascend a C-major scale so a multi-body scene reads as a consonant
// chord; each voice pans from its body's real-world position via a PannerNode.
const AR_VOICE_HZ = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.25];
const AR_VOICE_GAIN = 0.04;

export function createArScene(
  type: ArSceneType,
  canvas: HTMLCanvasElement,
  opts: ArSceneOptions = {},
): ArSceneHandle {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.xr.enabled = true;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(70, 1, 0.01, 20);

  // Star backdrop — 100 points, per the simplified budget.
  scene.add(starField(100));

  const root = new THREE.Group();
  root.visible = false; // hidden until placed
  root.add(buildArSceneContent(type));
  scene.add(root);

  let backend: ArBackend | null = null;
  let placed = false;
  let disposed = false;
  let narrator: ArNarratorHandle | null = null;
  let disposeHeadphones: (() => void) | null = null;
  let offNarrationEnd: (() => void) | null = null;
  const voices: Array<{ disconnect: () => void; osc: OscillatorNode }> = [];

  // Give each body a world-positioned HRTF voice so the sonification pans from
  // where the object actually sits on the table (RFC-021 §6). Reuses the shared
  // sensory audio-engine bus — no separate graph.
  function attachSpatialAudio(): void {
    const bus = audioEngine.bus();
    if (!bus) return;
    root.updateMatrixWorld(true);
    const wp = new THREE.Vector3();
    let i = 0;
    root.traverse((o) => {
      if (!(o as THREE.Mesh).isMesh) return;
      o.getWorldPosition(wp);
      const source = createSpatialSource([wp.x, wp.y, wp.z]);
      if (!source) return;
      const osc = bus.ctx.createOscillator();
      osc.type = i % 2 === 0 ? 'sine' : 'triangle';
      osc.frequency.value = AR_VOICE_HZ[i % AR_VOICE_HZ.length];
      const voice = bus.ctx.createGain();
      voice.gain.value = AR_VOICE_GAIN;
      osc.connect(voice);
      source.connect(voice);
      osc.start();
      voices.push({ disconnect: source.disconnect, osc });
      i++;
    });
  }

  function detachSpatialAudio(): void {
    for (const { disconnect, osc } of voices) {
      try {
        osc.stop();
        osc.disconnect();
      } catch {
        /* already stopped */
      }
      disconnect();
    }
    voices.length = 0;
  }

  function place(hit: ArHit): void {
    root.position.set(...hit.worldPosition);
    root.visible = true;
    placed = true;
    // Three senses confirm the placement: haptic pulse, a real anchor locking
    // the origin, spatial voices, and the Guide narration 2s later (NE-B).
    arHaptic('anchor-placed');
    void backend?.addAnchor(hit.worldPosition);
    attachSpatialAudio();
    narrator = scheduleArNarration(type, (id) => opts.playNarration?.(id));
    offNarrationEnd = audioBus.on('ended', () => arHaptic('narrator-end'));
  }

  async function onTap(clientX: number, clientY: number): Promise<void> {
    if (!backend || placed) return;
    const hit = await backend.hitTest(clientX, clientY);
    if (hit) place(hit);
  }
  const tapHandler = (e: PointerEvent) => void onTap(e.clientX, e.clientY);

  async function start(): Promise<boolean> {
    backend = await getArBackend();
    if (!backend || !(await backend.isSupported())) return false;
    // System "exit AR" / lost tracking → tear down + notify the caller.
    backend.on('session-ended', () => {
      stop();
      opts.onExit?.();
    });
    await backend.startSession();
    disposeHeadphones = initHeadphoneDetection();
    canvas.addEventListener('pointerdown', tapHandler);
    renderer.setAnimationLoop(() => {
      if (disposed || !backend) return;
      const pose = backend.getCameraPose();
      // Camera B follows the device: WebXR drives renderer.xr's camera; the
      // ARKit path applies the cached backend pose to our camera.
      if (backend.name === 'arkit-capacitor') {
        camera.position.set(...pose.position);
        camera.quaternion.set(...pose.rotation);
      }
      // Move the Web Audio listener to the device once the scene is placed so
      // the spatial voices pan correctly as the user walks around.
      if (placed) updateArListener(pose);
      renderer.render(scene, camera);
    });
    return true;
  }

  function stop(): void {
    if (disposed) return;
    disposed = true;
    renderer.setAnimationLoop(null);
    canvas.removeEventListener('pointerdown', tapHandler);
    narrator?.cancel();
    narrator = null;
    offNarrationEnd?.();
    offNarrationEnd = null;
    detachSpatialAudio();
    disposeHeadphones?.();
    disposeHeadphones = null;
    void backend?.endSession();
    backend = null;
    renderer.dispose();
  }

  return { start, stop };
}

function starField(count: number): THREE.Points {
  const positions = new Float32Array(count * 3);
  // Deterministic spread on a distant sphere (no Math.random — SSR/build-safe).
  for (let i = 0; i < count; i++) {
    const phi = Math.acos(1 - (2 * (i + 0.5)) / count);
    const theta = Math.PI * (1 + Math.sqrt(5)) * i;
    positions[i * 3] = Math.sin(phi) * Math.cos(theta) * 8;
    positions[i * 3 + 1] = Math.sin(phi) * Math.sin(theta) * 8;
    positions[i * 3 + 2] = Math.cos(phi) * 8;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  return new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.02 }));
}
