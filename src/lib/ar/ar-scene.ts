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
import { base } from '$app/paths';
import { buildSolarSystem, type SolarSystem } from '../explore-scene';
import { prefersReducedMotion } from '../reduced-motion';
import { getArBackend, type ArBackend, type ArHit } from '../ar';
import { updateArListener, createSpatialSource, initHeadphoneDetection } from './ar-audio';
import { arHaptic } from './ar-haptics';
import { scheduleArNarration, type ArNarratorHandle } from './ar-narrator';
import { audioEngine } from '../sensory/audio-engine';
import { audioBus } from '../audio-bus';

export type ArSceneType = 'explore' | 'earth' | 'moon' | 'mars';

// Tabletop scale — the whole scene fits in ~40 cm so it sits on a table.
const TABLE_RADIUS = 0.2;

// Scale factor applied to the real /explore scene units so the whole solar
// system fits on a tabletop (Neptune's orbitR 430 → ~0.18 m). Relative sizes +
// distances stay identical to the flat scene.
const EXPLORE_AR_SCALE = 0.0004;
// Ambient orbital pace for AR (sim-years per real second) — inner planets sweep
// visibly, outer ones drift, as on the flat scene at a gentle speed.
const EXPLORE_SIM_RATE = 0.03;
// Present the ecliptic tilted toward the viewer at the SAME elevation as the flat
// /explore default view (camP 1.05 → ~30° above the plane), so you look down onto
// the orbits instead of edge-on (planets otherwise collapse to a line of disks).
const EXPLORE_VIEW_ELEV = (30 * Math.PI) / 180;

// Real surface textures (same assets the flat /earth,/moon,/mars scenes use),
// plus the fallback tint used when no loader is supplied (unit tests) and the
// true axial tilt so the globe sits like its flat-scene counterpart.
const BODY: Record<
  Exclude<ArSceneType, 'explore'>,
  { texture: string; color: number; tiltDeg: number }
> = {
  earth: { texture: '2k_earth_daymap.jpg', color: 0x3a6ea5, tiltDeg: 23.4 },
  moon: { texture: '2k_moon.jpg', color: 0xb9b9b9, tiltDeg: 6.7 },
  mars: { texture: '2k_mars.jpg', color: 0xc1440e, tiltDeg: 25.2 },
};

/** A loader that resolves a texture file name to a THREE.Texture. Injected at
 *  runtime (createArScene) so the pure builder stays testable without a DOM. */
export type TextureFn = (file: string) => THREE.Texture;

/** The three single-globe AR scenes. /explore is built by buildSolarSystem. */
export type SurfaceArType = Exclude<ArSceneType, 'explore'>;

/**
 * Build a single textured globe (earth/moon/mars) for AR. Pure — no session.
 * With a `loadTexture` (runtime) the globe gets the same surface texture the
 * flat scene uses; without one (tests) it falls back to a flat tint so the
 * structure stays unit-testable.
 */
export function buildArSceneContent(
  type: SurfaceArType,
  opts: { loadTexture?: TextureFn } = {},
): THREE.Group {
  const load = opts.loadTexture;
  const group = new THREE.Group();
  group.name = `ar-scene-${type}`;

  // One key light — physically-correct default (× Math.PI like the flat scenes).
  const key = new THREE.DirectionalLight(0xfff4e8, 1.1 * Math.PI);
  key.position.set(0.3, 0.5, 0.4);
  group.add(key);
  group.add(new THREE.HemisphereLight(0x334455, 0x111111, 0.4 * Math.PI));

  const b = BODY[type];
  // Phong with shininess 4 mirrors the flat surface scene's globe material.
  const material = load
    ? new THREE.MeshPhongMaterial({ map: load(b.texture), color: 0xffffff, shininess: 4 })
    : new THREE.MeshStandardMaterial({ color: b.color, roughness: 0.9 });
  const body = new THREE.Mesh(new THREE.SphereGeometry(TABLE_RADIUS * 0.7, 64, 64), material);
  body.name = type;
  body.rotation.z = (b.tiltDeg * Math.PI) / 180;
  group.add(body);
  return group;
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
  /** Called once the user taps a surface and the scene anchors — lets the caller
   *  dismiss the "tap to place" instruction. */
  onPlaced?: () => void;
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
  // Fully transparent clear so the native ARKit camera (behind the WebView)
  // shows through the empty space of the scene — not an opaque black backdrop.
  renderer.setClearColor(0x000000, 0);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(70, 1, 0.01, 20);

  // Match the renderer + camera to the real (portrait) canvas. Without this the
  // drawing buffer defaults to 300×150 and the camera keeps aspect 1, which
  // horizontally compresses the scene on a phone — the planets pile up. Kept in
  // sync on orientation change / resize.
  function resize(): void {
    const w = canvas.clientWidth || (typeof window !== 'undefined' ? window.innerWidth : 1);
    const h = canvas.clientHeight || (typeof window !== 'undefined' ? window.innerHeight : 1);
    if (typeof window !== 'undefined') {
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    }
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resize();

  // Star backdrop — 100 points, per the simplified budget.
  scene.add(starField(100));

  // Runtime texture loader — same assets as the flat scenes ($base/textures/…),
  // sRGB-tagged. Tracked so stop() can free the GPU memory on exit.
  const texLoader = new THREE.TextureLoader();
  const textures: THREE.Texture[] = [];
  const loadTexture: TextureFn = (file) => {
    const t = texLoader.load(`${base}/textures/${file}`);
    t.colorSpace = THREE.SRGBColorSpace;
    textures.push(t);
    return t;
  };

  const root = new THREE.Group();
  root.visible = false; // shown as a floating preview on the first frame (below)

  // /explore renders the REAL shared solar system (buildSolarSystem) — one source
  // of truth with the flat route, scaled + AR-quality to sit on a tabletop.
  // earth/moon/mars use the single textured globe.
  let solar: SolarSystem | null = null;
  let simT = 0;
  const animateOrbits = !prefersReducedMotion();
  const orbitClock = new THREE.Clock();
  if (type === 'explore') {
    solar = buildSolarSystem({ loadTexture, scale: EXPLORE_AR_SCALE, quality: 'ar' });
    solar.setInitialSimT(0); // anchor to today's real sky positions
    solar.update(0, 0); // place planets at their real positions before first frame
    root.add(solar.group);
  } else {
    root.add(buildArSceneContent(type, { loadTexture }));
  }
  scene.add(root);

  let backend: ArBackend | null = null;
  let placed = false;
  let previewShown = false;
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
    // Only the main bodies get a voice (planets + the surface globe) — not every
    // ring band / glow shell / satellite — capped so the chord stays consonant.
    const bodies: THREE.Object3D[] = [];
    root.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh && (m.userData?.planetId || m.name === type)) bodies.push(o);
    });
    const wp = new THREE.Vector3();
    let i = 0;
    for (const o of bodies.slice(0, AR_VOICE_HZ.length)) {
      o.getWorldPosition(wp);
      const source = createSpatialSource([wp.x, wp.y, wp.z]);
      if (!source) continue;
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
    }
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

  // Tilt the /explore ecliptic so the viewer looks down onto the orbits at the
  // flat scene's default elevation, instead of edge-on. Orientation is set once
  // (relative to where the user is looking) and preserved through place().
  function orientEcliptic(pose: { position: [number, number, number] }): void {
    const camPos = new THREE.Vector3(pose.position[0], pose.position[1], pose.position[2]);
    const toCam = camPos.sub(root.position).normalize();
    const up = new THREE.Vector3(0, 1, 0);
    const right = new THREE.Vector3().crossVectors(up, toCam);
    if (right.lengthSq() < 1e-6) right.set(1, 0, 0);
    else right.normalize();
    // Ecliptic normal at (90° − elev) from the line of sight, tilted toward up.
    const angle = Math.PI / 2 - EXPLORE_VIEW_ELEV;
    const nUp = toCam
      .clone()
      .applyQuaternion(new THREE.Quaternion().setFromAxisAngle(right, angle));
    const nDown = toCam
      .clone()
      .applyQuaternion(new THREE.Quaternion().setFromAxisAngle(right, -angle));
    const n = nUp.y >= nDown.y ? nUp : nDown;
    root.quaternion.setFromUnitVectors(up, n);
  }

  // Float the scene in front of the camera as a not-yet-anchored preview.
  function showPreview(pose: { position: [number, number, number]; rotation: number[] }): void {
    const q = new THREE.Quaternion(
      pose.rotation[0],
      pose.rotation[1],
      pose.rotation[2],
      pose.rotation[3],
    );
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(q);
    root.position
      .set(pose.position[0], pose.position[1], pose.position[2])
      .addScaledVector(forward, 0.6);
    if (solar) orientEcliptic(pose);
    root.visible = true;
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
    opts.onPlaced?.();
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
    if (typeof window !== 'undefined') window.addEventListener('resize', resize);
    renderer.setAnimationLoop(() => {
      if (disposed || !backend) return;
      const pose = backend.getCameraPose();
      // Camera B follows the device: WebXR drives renderer.xr's camera; the
      // ARKit path applies the cached backend pose to our camera.
      if (backend.name === 'arkit-capacitor') {
        camera.position.set(...pose.position);
        camera.quaternion.set(...pose.rotation);
      }
      // Immediately float the scene ~0.6 m in front of where the user is looking
      // on the first frame, so entering AR shows the solar system straight away
      // (like the flat view) instead of an empty camera feed. Tapping a surface
      // then anchors it for real (place()). Runs once.
      if (!placed && !previewShown) {
        showPreview(pose);
        previewShown = true;
      }
      // Advance the real orbital motion (planets revolve + spin), unless the OS
      // reduced-motion preference is set — then they hold at their real positions.
      if (solar && animateOrbits) {
        const dt = orbitClock.getDelta();
        simT += EXPLORE_SIM_RATE * dt;
        solar.update(simT, dt);
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
    if (typeof window !== 'undefined') window.removeEventListener('resize', resize);
    narrator?.cancel();
    narrator = null;
    offNarrationEnd?.();
    offNarrationEnd = null;
    detachSpatialAudio();
    disposeHeadphones?.();
    disposeHeadphones = null;
    void backend?.endSession();
    backend = null;
    // Free GPU memory so repeated AR entry/exit doesn't leak textures/geometry.
    solar?.dispose();
    solar = null;
    for (const t of textures) t.dispose();
    textures.length = 0;
    scene.traverse((o) => {
      const m = o as THREE.Mesh;
      m.geometry?.dispose?.();
      const mat = m.material as THREE.Material | THREE.Material[] | undefined;
      if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
      else mat?.dispose?.();
    });
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
