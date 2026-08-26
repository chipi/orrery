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
import { moonPhase } from '../astronomy/moon-observer';
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
import { arrowScreenAngle, arrowEdgePlacement, spreadByAngle } from './find-arrow-layout';

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

// Marker disc radius (canvas px) ~ by brightness, so Venus reads brighter than
// Mars and the dim ice giants stay small (#51 visual).
const BODY_RADIUS: Record<SkyBody, number> = {
  sun: 56,
  moon: 56,
  venus: 48,
  jupiter: 44,
  saturn: 40,
  mars: 36,
  mercury: 34,
  uranus: 27,
  neptune: 25,
};

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

/** Phase shading for the Moon marker (#51 visual). */
export interface MarkerPhase {
  /** 0 (new) → 1 (full). */
  illuminatedFraction: number;
  /** Lit on the leading (right) limb when true. */
  waxing: boolean;
}

/** Draw a glowing body disc + label onto a canvas the sprite maps (#51). The
 *  body reads as its real colour, sized by brightness; the Moon shows its phase.
 *  Returns the redraw fn so the Moon can repaint as its phase updates. */
function drawMarker(
  ctx: CanvasRenderingContext2D,
  size: number,
  label: string,
  color: string,
  bodyRadius: number,
  phase?: MarkerPhase,
): void {
  const cx = size / 2;
  const cy = size * 0.4;
  ctx.clearRect(0, 0, size, size);

  // Soft glow so bright bodies bloom.
  const glow = ctx.createRadialGradient(cx, cy, bodyRadius * 0.4, cx, cy, bodyRadius * 2.6);
  glow.addColorStop(0, color);
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(cx, cy, bodyRadius * 2.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  if (phase) {
    // Moon phase, clipped to the disc: fill the lit half, then the terminator
    // ellipse either CARVES it to a crescent (k<½, erase with the dark shade) or
    // EXTENDS it to a gibbous (k>½, add the lit shade).
    const dark = 'rgba(70,74,86,0.95)';
    ctx.fillStyle = dark;
    ctx.beginPath();
    ctx.arc(cx, cy, bodyRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, bodyRadius, 0, Math.PI * 2);
    ctx.clip();
    const k = Math.max(0, Math.min(1, phase.illuminatedFraction));
    const litRight = phase.waxing;
    const termX = bodyRadius * Math.abs(1 - 2 * k);
    // Lit half.
    ctx.fillStyle = color;
    ctx.fillRect(litRight ? cx : cx - bodyRadius, cy - bodyRadius, bodyRadius, bodyRadius * 2);
    // Terminator ellipse.
    ctx.fillStyle = k < 0.5 ? dark : color;
    ctx.beginPath();
    ctx.ellipse(cx, cy, termX, bodyRadius, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, bodyRadius, 0, Math.PI * 2);
    ctx.stroke();
  } else {
    // Planet/Sun/station: a filled disc with a thin bright rim.
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(cx, cy, bodyRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  // Label.
  ctx.font = '600 30px "Space Mono", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = 'rgba(0,0,0,0.9)';
  ctx.shadowBlur = 6;
  ctx.fillText(label, cx, size * 0.82);
  ctx.shadowBlur = 0;
}

function makeMarker(
  label: string,
  color: string,
  bodyRadius = 40,
  phase?: MarkerPhase,
): { group: THREE.Group; texture: THREE.CanvasTexture; canvas: HTMLCanvasElement; size: number } {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  drawMarker(ctx, size, label, color, bodyRadius, phase);

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
  return { group, texture, canvas, size };
}

/** A crisp text sprite (cardinal marks). */
function makeTextSprite(text: string, color: string): THREE.Sprite {
  const size = 128;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d')!;
  ctx.font = '700 64px "Space Mono", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = color;
  ctx.shadowColor = 'rgba(0,0,0,0.9)';
  ctx.shadowBlur = 8;
  ctx.fillText(text, size / 2, size / 2);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false }),
  );
  sprite.scale.set(3, 3, 1);
  return sprite;
}

// The four cardinal directions as horizon ENU unit vectors (North=−z, East=+x).
const CARDINALS: Array<{ text: string; dir: [number, number, number] }> = [
  { text: 'N', dir: [0, 0, -1] },
  { text: 'E', dir: [1, 0, 0] },
  { text: 'S', dir: [0, 0, 1] },
  { text: 'W', dir: [-1, 0, 0] },
];

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
    // Phase is ~constant over a session, so paint the Moon once at start.
    const phase = body === 'moon' ? moonPhase(new Date()) : undefined;
    const { group, texture } = makeMarker(
      BODY_LABEL[body],
      BODY_COLOR[body],
      BODY_RADIUS[body],
      phase,
    );
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

  // Cardinal marks on the horizon so the sky is oriented (#51 visual).
  const cardinals = CARDINALS.map((c) => {
    const sprite = makeTextSprite(c.text, 'rgba(190,205,225,0.85)');
    scene.add(sprite);
    return { sprite, dir: new THREE.Vector3(...c.dir) };
  });

  // Find-arrows (#51): a DOM overlay pointing to up-bodies outside the current
  // view, so a single narrow field-of-view doesn't hide the rest of the sky.
  const arrowLayer = typeof document !== 'undefined' ? document.createElement('div') : null;
  if (arrowLayer) {
    arrowLayer.className = 'ar-find-arrows';
    arrowLayer.style.cssText = 'position:fixed;inset:0;z-index:9998;pointer-events:none;';
    document.body.appendChild(arrowLayer);
  }
  // Each off-screen body gets one arrow element = a rotating ▲ (points AT the body)
  // + an upright label (so it stays readable regardless of the ▲'s angle).
  type ArrowEl = { el: HTMLDivElement; tri: HTMLSpanElement; lbl: HTMLSpanElement };
  const arrowEls = new Map<string, ArrowEl>();
  const ndc = new THREE.Vector3();
  const viewPos = new THREE.Vector3();
  // Requests collected each frame, then laid out together so labels can be spread
  // apart (a per-body updateArrow can't declutter — it can't see its neighbours).
  type ArrowReq = { key: string; label: string; color: string; world: THREE.Vector3 };
  const arrowReqs: ArrowReq[] = [];
  // Minimum angular gap between two edge arrows so their labels don't stack. ~16°
  // reads clean for the ≤10 sky bodies/stations we ever show at once.
  const MIN_ARROW_GAP = (16 * Math.PI) / 180;

  function ensureArrowEl(key: string): ArrowEl {
    let a = arrowEls.get(key);
    if (a) return a;
    const el = document.createElement('div');
    el.style.cssText =
      'position:absolute;display:flex;align-items:center;gap:5px;' +
      'font:600 12px "Space Mono",monospace;white-space:nowrap;' +
      'text-shadow:0 1px 3px rgba(0,0,0,0.9);will-change:transform,left,top;';
    const tri = document.createElement('span');
    tri.textContent = '▲';
    tri.style.cssText = 'display:inline-block;will-change:transform;';
    const lbl = document.createElement('span');
    el.append(tri, lbl);
    arrowLayer!.appendChild(el);
    a = { el, tri, lbl };
    arrowEls.set(key, a);
    return a;
  }

  // Two-phase: (1) find which bodies are off-screen + their screen-edge angle,
  // (2) spread clustered angles apart, (3) place each. Fixes both the overlap
  // (labels stacking) and the direction (the old single-pass double-negated the
  // vertical axis, so "up" pointed down).
  function layoutArrows(reqs: ArrowReq[]): void {
    if (!arrowLayer) return;
    const w = window.innerWidth;
    const h = window.innerHeight;
    const margin = 46;

    const seen = new Set<string>();
    const cand: { key: string; label: string; color: string; ang: number }[] = [];
    for (const { key, label, color, world } of reqs) {
      seen.add(key);
      viewPos.copy(world).applyMatrix4(camera.matrixWorldInverse); // camera space, −z fwd
      const behind = viewPos.z > 0;
      ndc.copy(world).project(camera);
      const onScreen = !behind && Math.abs(ndc.x) <= 1 && Math.abs(ndc.y) <= 1;
      if (onScreen) {
        arrowEls.get(key)?.el.style.setProperty('display', 'none');
        continue;
      }
      cand.push({ key, label, color, ang: arrowScreenAngle(viewPos.x, viewPos.y) });
    }
    // Hide arrows whose body left the sky this frame (below horizon / no TLE).
    for (const [key, a] of arrowEls) if (!seen.has(key)) a.el.style.display = 'none';

    // Spread clustered arrows so their labels never stack, then place each on the
    // screen-edge rounded rectangle.
    for (const { key, label, color, ang } of spreadByAngle(cand, MIN_ARROW_GAP)) {
      const { el, tri, lbl } = ensureArrowEl(key);
      el.style.display = 'flex';
      el.style.color = color;
      lbl.textContent = label;
      const { px, py, rotDeg, rightSide } = arrowEdgePlacement(ang, w, h, margin);
      // Anchor the ▲ at the edge point; grow the label INWARD so it never runs off
      // the edge. On the right half the label sits left of the ▲, and vice-versa.
      el.style.flexDirection = rightSide ? 'row-reverse' : 'row';
      el.style.left = `${px}px`;
      el.style.top = `${py}px`;
      el.style.transform = `translate(${rightSide ? '-100%' : '0'}, -50%)`;
      tri.style.transform = `rotate(${rotDeg}deg)`;
    }
  }

  let view: SkyView | null = null;
  let disposed = false;
  let observer: ObserverLocation | null = opts.location ?? null;
  let lastEphemeris = 0;
  const camPos = new THREE.Vector3();
  const worldDir = new THREE.Vector3(); // scratch: ENU dir → render-world dir

  // #51 — ARKit's frame.camera.transform is in the device's NATIVE (landscape)
  // frame, so in portrait the sky reads rolled 90° (bodies drift diagonally, the
  // horizon marks tilt). Roll the XR pose onto the current interface: 90° in
  // portrait (screen angle 0), 0° in landscape (90) — i.e. `90 − screenAngle`.
  // Confirmed on-device (iPhone 15 Pro: the level-portrait roll dropped tilt from
  // ~90° to ~0° at this value). The camera (magic-window) path already
  // compensates screen angle inside deviceQuaternion, so this is XR-only.
  const rollAxis = new THREE.Vector3(0, 0, 1);
  const rollQ = new THREE.Quaternion();
  const screenAngle = (): number =>
    (typeof window !== 'undefined' && window.screen?.orientation?.angle) || 0;

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
      // #51: roll the ARKit (landscape-native) pose onto the current interface.
      // Gated on needsInterfaceRoll, NOT kind==='xr' — WebXR is also kind 'xr' but
      // its UA already screen-orients the pose, so rolling it would double-count.
      if (view.needsInterfaceRoll) {
        const rollDeg = 90 - screenAngle();
        if (rollDeg)
          camera.quaternion.multiply(rollQ.setFromAxisAngle(rollAxis, (rollDeg * Math.PI) / 180));
      }
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
      // Cardinal marks ride the horizon at their fixed azimuths.
      for (const { sprite, dir } of cardinals) {
        worldDir.copy(dir);
        view.toWorldDir(worldDir);
        sprite.position.copy(camPos).addScaledVector(worldDir, MARKER_RADIUS);
      }
      camera.updateMatrixWorld();
      // Collect this frame's off-screen arrow requests, then lay them all out at
      // once (layoutArrows declutters + hides anything no longer in the sky).
      arrowReqs.length = 0;
      for (const [body, { group, dir }] of markers) {
        if (!group.visible) continue;
        worldDir.copy(dir);
        view.toWorldDir(worldDir);
        group.position.copy(camPos).addScaledVector(worldDir, MARKER_RADIUS);
        arrowReqs.push({
          key: body,
          label: BODY_LABEL[body],
          color: BODY_COLOR[body],
          world: group.position,
        });
      }
      // Stations move fast (deg/s) — recompute every frame from their TLE.
      if (observer) {
        const nowD = new Date(t);
        for (const [id, sm] of stationMarkers) {
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
            arrowReqs.push({
              key: id,
              label: STATION_LABEL[id],
              color: STATION_COLOR[id],
              world: sm.group.position,
            });
          } else {
            sm.group.visible = false;
          }
        }
      }
      layoutArrows(arrowReqs);
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
    for (const { sprite } of cardinals) (sprite.material.map as THREE.Texture | null)?.dispose();
    arrowLayer?.remove();
    arrowEls.clear();
    scene.traverse((o) => {
      const s = o as THREE.Sprite;
      s.material?.dispose?.();
    });
    renderer.dispose();
  }

  return { start, stop, location: () => observer };
}
