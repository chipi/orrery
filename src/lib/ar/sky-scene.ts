// Sky-pointing AR scene (#393). Unlike the tabletop scene (world-anchored 3D on a
// surface), this places a labelled reticle for each Solar-System body along its
// REAL altitude/azimuth direction, computed from the observer's location + time
// via $lib/astronomy. The substrate is a pluggable SkyView (sky-view.ts): an
// ARKit/WebXR session, or the non-XR magic window (camera feed + compass). The
// view supplies the camera pose + maps ENU directions into the render world, so
// this scene is platform-agnostic; markers follow the camera each frame so they
// read as "at infinity".

import * as THREE from 'three';
import { pickSkyView, type SkyView } from './sky-view';
import { skyPosition, skyDirectionENU, SKY_BODIES, type SkyBody } from '../astronomy';
import { getObserverLocation, type ObserverLocation } from '../geolocation';
import {
  resolveStationTle,
  lookAngleForTle,
  nextPassForTle,
  STATION_IDS,
  type StationId,
  type Pass,
  type Tle,
} from '../satellite';

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

const STATION_LABEL: Record<StationId, string> = { iss: 'ISS', tiangong: 'Tiangong' };
const STATION_COLOR: Record<StationId, string> = { iss: '#7cff9e', tiangong: '#ff9edc' };

export interface SkySceneOptions {
  /** Called when the AR session ends. */
  onExit?: () => void;
  /** Pre-resolved observer location (else resolved on start). */
  location?: ObserverLocation;
  /** The next pass for each station, once its fresh TLE resolves (#405). */
  onPass?: (id: StationId, pass: Pass | null) => void;
  /** Inject a substrate (tests); else the best available is picked on start. */
  view?: SkyView;
}

export interface SkySceneHandle {
  start(): Promise<boolean>;
  stop(): void;
  /** The observer location actually used (available after start()). */
  location(): ObserverLocation | null;
}

/** A reticle + label sprite — a canvas texture so it stays crisp. */
function makeMarker(
  label: string,
  color: string,
): { group: THREE.Group; texture: THREE.CanvasTexture } {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

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
  ctx.fillText(label, size / 2, size * 0.74);

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
  // On portrait↔landscape the aspect must be re-derived or the billboarded
  // reticles stretch into ellipses (#51). `orientationchange` fires BEFORE iOS
  // updates the viewport dimensions, so resize now AND after it settles.
  function onOrientationChange(): void {
    resize();
    setTimeout(resize, 300);
  }
  resize();

  const markers = new Map<
    SkyBody,
    { group: THREE.Group; texture: THREE.CanvasTexture; dir: THREE.Vector3 }
  >();
  for (const body of SKY_BODIES) {
    const { group, texture } = makeMarker(BODY_LABEL[body], BODY_COLOR[body]);
    group.visible = false;
    scene.add(group);
    markers.set(body, { group, texture, dir: new THREE.Vector3() });
  }

  // Stations (ISS/Tiangong) — fast-moving; TLEs resolved fresh on start.
  const stationMarkers = new Map<
    StationId,
    { group: THREE.Group; texture: THREE.CanvasTexture; tle: Tle | null; dir: THREE.Vector3 }
  >();
  for (const id of STATION_IDS) {
    const { group, texture } = makeMarker(STATION_LABEL[id], STATION_COLOR[id]);
    group.visible = false;
    scene.add(group);
    stationMarkers.set(id, { group, texture, tle: null, dir: new THREE.Vector3() });
  }

  let view: SkyView | null = null;
  let disposed = false;
  let observer: ObserverLocation | null = opts.location ?? null;
  let lastEphemeris = 0;
  const camPos = new THREE.Vector3();
  const worldDir = new THREE.Vector3(); // scratch: ENU dir → render-world dir

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
    view = opts.view ?? (await pickSkyView());
    if (!view || !(await view.start())) return false;
    observer = observer ?? (await getObserverLocation());
    view.onEnded(() => {
      stop();
      opts.onExit?.();
    });
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', resize);
      window.addEventListener('orientationchange', onOrientationChange);
    }
    recomputeDirections();

    // Resolve fresh TLEs, then surface each station's next visible pass (#405).
    for (const id of STATION_IDS) {
      void resolveStationTle(id).then((tle) => {
        // Exited before the fetch resolved → don't touch the torn-down scene or
        // re-surface the (removed) pass hint.
        if (disposed) return;
        const sm = stationMarkers.get(id);
        if (!sm) return;
        sm.tle = tle;
        if (observer) {
          opts.onPass?.(
            id,
            nextPassForTle(tle, new Date(), observer.latDeg, observer.lonDeg, {
              hoursAhead: 24,
              minMaxAltDeg: 10,
            }),
          );
        }
      });
    }

    renderer.setAnimationLoop(() => {
      if (disposed || !view) return;
      view.updateCamera(camera);
      camPos.copy(camera.position);

      const t = Date.now();
      if (t - lastEphemeris >= EPHEMERIS_INTERVAL_MS) {
        recomputeDirections();
        lastEphemeris = t;
      }
      // Anchor each visible marker at cameraPos + worldDir·R (stays at the
      // correct sky direction regardless of small translation). The view maps
      // the stored ENU direction into the render world (identity for a
      // heading-aligned/compass-corrected substrate, a yaw for raw WebXR).
      for (const { group, dir } of markers.values()) {
        if (!group.visible) continue;
        worldDir.copy(dir);
        view.toWorldDir(worldDir);
        group.position.copy(camPos).addScaledVector(worldDir, MARKER_RADIUS);
      }
      // Stations move fast (deg/s) — recompute every frame from their TLE.
      if (observer) {
        const nowD = new Date(t);
        for (const sm of stationMarkers.values()) {
          if (!sm.tle) {
            sm.group.visible = false;
            continue;
          }
          const la = lookAngleForTle(sm.tle, nowD, observer.latDeg, observer.lonDeg);
          if (la.aboveHorizon) {
            const [x, y, z] = skyDirectionENU(la);
            sm.dir.set(x, y, z);
            worldDir.copy(sm.dir);
            view.toWorldDir(worldDir);
            sm.group.position.copy(camPos).addScaledVector(worldDir, MARKER_RADIUS);
            sm.group.visible = true;
          } else {
            sm.group.visible = false;
          }
        }
      }
      renderer.render(scene, camera);
    });
    return true;
  }

  function stop(): void {
    if (disposed) return;
    disposed = true;
    renderer.setAnimationLoop(null);
    if (typeof window !== 'undefined') {
      window.removeEventListener('resize', resize);
      window.removeEventListener('orientationchange', onOrientationChange);
    }
    view?.stop();
    view = null;
    for (const { texture } of markers.values()) texture.dispose();
    for (const { texture } of stationMarkers.values()) texture.dispose();
    scene.traverse((o) => {
      const s = o as THREE.Sprite;
      s.material?.dispose?.();
    });
    renderer.dispose();
  }

  return { start, stop, location: () => observer };
}
