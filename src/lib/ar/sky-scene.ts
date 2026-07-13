// Sky-pointing AR scene (#393). Unlike the tabletop scene (world-anchored 3D on a
// surface), this places a labelled reticle for each Solar-System body along its
// REAL altitude/azimuth direction, computed from the observer's location + time
// via $lib/astronomy. It relies on an ARKit session started with
// worldAlignment = .gravityAndHeading, so the ENU direction maps straight to the
// world frame; markers follow the camera each frame so they read as "at infinity".
//
// Needs an AR-capable, heading-aligned device — verify on iPhone.

import * as THREE from 'three';
import { getArBackend, type ArBackend } from '../ar';
import { skyPosition, skyDirectionENU, SKY_BODIES, type SkyBody } from '../astronomy';
import { getObserverLocation, type ObserverLocation } from '../geolocation';

// How far (metres) to place the markers. Far enough to read as sky; re-anchored
// to the camera each frame so walking doesn't shift the angular direction.
const MARKER_RADIUS = 30;
// Recompute alt/az at ~2 Hz — the sky moves ~15°/hour, imperceptible per frame.
const EPHEMERIS_INTERVAL_MS = 500;

const BODY_COLOR: Record<SkyBody, string> = {
  sun: '#ffd24a',
  moon: '#e8ecf2',
  mercury: '#b5b5b5',
  venus: '#e8cda0',
  mars: '#c1440e',
  jupiter: '#d8a878',
  saturn: '#d9c07a',
  uranus: '#9fd4e0',
  neptune: '#5b7bd4',
};
const BODY_LABEL: Record<SkyBody, string> = {
  sun: 'Sun',
  moon: 'Moon',
  mercury: 'Mercury',
  venus: 'Venus',
  mars: 'Mars',
  jupiter: 'Jupiter',
  saturn: 'Saturn',
  uranus: 'Uranus',
  neptune: 'Neptune',
};

export interface SkySceneOptions {
  /** Called when the AR session ends. */
  onExit?: () => void;
  /** Pre-resolved observer location (else resolved on start). */
  location?: ObserverLocation;
}

export interface SkySceneHandle {
  start(): Promise<boolean>;
  stop(): void;
  /** The observer location actually used (available after start()). */
  location(): ObserverLocation | null;
}

/** A reticle + label sprite for one body — a canvas texture so it stays crisp. */
function makeMarker(body: SkyBody): { group: THREE.Group; texture: THREE.CanvasTexture } {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const color = BODY_COLOR[body];

  // Reticle ring + centre dot.
  ctx.strokeStyle = color;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(size / 2, size * 0.38, 46, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(size / 2, size * 0.38, 8, 0, Math.PI * 2);
  ctx.fill();

  // Label.
  ctx.font = '600 34px "Space Mono", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = 'rgba(0,0,0,0.85)';
  ctx.shadowBlur = 6;
  ctx.fillText(BODY_LABEL[body], size / 2, size * 0.74);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false,
      depthWrite: false,
    }),
  );
  sprite.scale.set(6, 6, 1);
  const group = new THREE.Group();
  group.add(sprite);
  return { group, texture };
}

export function createSkyScene(
  canvas: HTMLCanvasElement,
  opts: SkySceneOptions = {},
): SkySceneHandle {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setClearColor(0x000000, 0); // transparent → camera shows through
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(70, 1, 0.1, 1000);

  function resize(): void {
    const w = canvas.clientWidth || (typeof window !== 'undefined' ? window.innerWidth : 1);
    const h = canvas.clientHeight || (typeof window !== 'undefined' ? window.innerHeight : 1);
    if (typeof window !== 'undefined')
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resize();

  const markers = new Map<
    SkyBody,
    { group: THREE.Group; texture: THREE.CanvasTexture; dir: THREE.Vector3 }
  >();
  for (const body of SKY_BODIES) {
    const { group, texture } = makeMarker(body);
    group.visible = false;
    scene.add(group);
    markers.set(body, { group, texture, dir: new THREE.Vector3() });
  }

  let backend: ArBackend | null = null;
  let disposed = false;
  let observer: ObserverLocation | null = opts.location ?? null;
  let lastEphemeris = 0;
  const camPos = new THREE.Vector3();

  function recomputeDirections(): void {
    if (!observer) return;
    const now = new Date();
    for (const body of SKY_BODIES) {
      const pos = skyPosition(body, now, observer.latDeg, observer.lonDeg);
      const m = markers.get(body)!;
      if (pos.aboveHorizon) {
        const [x, y, z] = skyDirectionENU(pos);
        m.dir.set(x, y, z);
        m.group.visible = true;
      } else {
        m.group.visible = false; // below the horizon
      }
    }
  }

  async function start(): Promise<boolean> {
    backend = await getArBackend();
    if (!backend || !(await backend.isSupported())) return false;
    observer = observer ?? (await getObserverLocation());
    backend.on('session-ended', () => {
      stop();
      opts.onExit?.();
    });
    await backend.startSession({ headingAligned: true });
    if (typeof window !== 'undefined') window.addEventListener('resize', resize);
    recomputeDirections();

    renderer.setAnimationLoop(() => {
      if (disposed || !backend) return;
      const pose = backend.getCameraPose();
      camera.position.set(...pose.position);
      camera.quaternion.set(...pose.rotation);
      camPos.set(...pose.position);

      const t = Date.now();
      if (t - lastEphemeris >= EPHEMERIS_INTERVAL_MS) {
        recomputeDirections();
        lastEphemeris = t;
      }
      // Anchor each visible marker at cameraPos + direction·R (stays at the
      // correct sky direction regardless of small translation).
      for (const { group, dir } of markers.values()) {
        if (!group.visible) continue;
        group.position.copy(camPos).addScaledVector(dir, MARKER_RADIUS);
      }
      renderer.render(scene, camera);
    });
    return true;
  }

  function stop(): void {
    if (disposed) return;
    disposed = true;
    renderer.setAnimationLoop(null);
    if (typeof window !== 'undefined') window.removeEventListener('resize', resize);
    void backend?.endSession();
    backend = null;
    for (const { texture } of markers.values()) texture.dispose();
    scene.traverse((o) => {
      const s = o as THREE.Sprite;
      s.material?.dispose?.();
    });
    renderer.dispose();
  }

  return { start, stop, location: () => observer };
}
