// Sky-pointing AR scene (#393). Unlike the tabletop scene (world-anchored 3D on a
// surface), this places a labelled reticle for each Solar-System body along its
// REAL altitude/azimuth direction, computed from the observer's location + time
// via $lib/astronomy. The substrate is a pluggable SkyView (sky-view.ts): an
// ARKit/WebXR session, or the non-XR magic window (camera feed + compass). The
// view supplies the camera pose + maps ENU directions into the render world, so
// this scene is platform-agnostic; markers follow the camera each frame so they
// read as "at infinity".

import * as THREE from 'three';
import { base } from '$app/paths';
import { pickSkyView, type SkyView } from './sky-view';
import { skyPosition, skyDirectionENU, SKY_BODIES, type SkyBody, julianDay } from '../astronomy';
import { moonPhase } from '../astronomy/moon-observer';
import { getObserverLocation, type ObserverLocation } from '../geolocation';
import {
  equatorialXyzToSkyDir,
  loadConstellationFigures,
  loadBrightStars,
  type ConstellationFigure,
  type BrightStar,
} from './celestial-sky';
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
import { constellationName } from '../universe/iau-constellations';

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
  /** Toggle the constellation-figure layer (RFC-041). Default on. */
  setConstellationsVisible(on: boolean): void;
  /** Toggle the bright-star layer (RFC-041). Default on. */
  setStarsVisible(on: boolean): void;
  /** Toggle the Sun/Moon/planet markers (RFC-041). Default on. */
  setPlanetsVisible(on: boolean): void;
  /** Toggle the ISS/Tiangong station markers (RFC-041). Default on. */
  setStationsVisible(on: boolean): void;
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

/** A text label as a dark PILL + opaque text, sized to the text. The pill is the
 *  key: over the bright additive star/figure glows, plain text washes out and reads
 *  as "behind" even when it's technically on top — the dark backing makes it a
 *  clearly-foreground chip. `worldHeight` is the sprite height in world units; the
 *  width follows the text so the aspect never squishes. */
function makeTextSprite(text: string, color: string, worldHeight = 2.4): THREE.Sprite {
  const SS = 2; // supersample for crisp text
  const fontPx = 52 * SS;
  const padX = 18 * SS;
  const padY = 9 * SS;
  const meas = document.createElement('canvas').getContext('2d')!;
  meas.font = `700 ${fontPx}px "Space Mono", monospace`;
  const tw = Math.ceil(meas.measureText(text).width);
  const w = tw + padX * 2;
  const h = fontPx + padY * 2;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  ctx.font = `700 ${fontPx}px "Space Mono", monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  // Dark rounded pill so the label reads over bright glows.
  ctx.fillStyle = 'rgba(4,8,16,0.68)';
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(0, 0, w, h, h * 0.3);
  else ctx.rect(0, 0, w, h);
  ctx.fill();
  ctx.fillStyle = color;
  ctx.fillText(text, w / 2, h / 2 + SS);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false }),
  );
  sprite.scale.set(worldHeight * (w / h), worldHeight, 1);
  // Text labels always draw in the FOREGROUND (everything is depth-test-off, so
  // renderOrder is the only z — the lines/dots/stars sit well below this).
  sprite.renderOrder = 20;
  return sprite;
}

/** A soft round white dot (radial gradient) shared by every star sprite (S2). */
function makeStarDotTexture(): THREE.CanvasTexture {
  const s = 64;
  const c = document.createElement('canvas');
  c.width = c.height = s;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.35, 'rgba(255,255,255,0.8)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, s, s);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** World-unit sprite scale for a star of apparent magnitude `mag` — brighter
 *  (lower mag) reads bigger; clamped so nothing dominates or vanishes. */
function starScale(mag: number): number {
  return Math.max(0.5, Math.min(2.2, 1.7 - mag * 0.5));
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
    const sprite = makeTextSprite(c.text, 'rgba(210,224,245,1)', 3.2);
    scene.add(sprite);
    return { sprite, dir: new THREE.Vector3(...c.dir) };
  });

  // Constellation figures (RFC-041 S1) — the real constellations on the same sky
  // as the planets. One THREE.LineSegments for all 89 figures; positions are
  // recomputed at the ephemeris cadence (§below) and the whole group rides the
  // camera like the markers. Subtle, depth-test-off so it draws over the passthrough
  // and behind the body markers.
  let constellationFigures: ConstellationFigure[] = [];
  let constellationPositions: Float32Array | null = null;
  let showConstellations = true;
  const constellationLines = new THREE.LineSegments(
    new THREE.BufferGeometry(),
    new THREE.LineBasicMaterial({
      // Match the /explore ConstellationFinder panel: rgba(120,190,230,0.7) — a
      // clear blue tinge, stronger than the first pass which read as barely-there.
      color: 0x78bee6,
      transparent: true,
      opacity: 0.7,
      depthTest: false,
      depthWrite: false,
    }),
  );
  constellationLines.renderOrder = -8; // background (labels are foreground, +20)
  constellationLines.frustumCulled = false;
  constellationLines.visible = false; // until the data loads
  scene.add(constellationLines);
  const _cstDir = new THREE.Vector3(); // scratch for the per-vertex conversion

  // Shared soft round-dot texture for the star sprites AND the constellation
  // vertex points (without a map, THREE.Points renders as squares).
  const dotTexture = makeStarDotTexture();

  // Constellation vertex dots (#488) — a highlighted star at each figure vertex so
  // the lines read as connected stars (Big/Little Bear). One THREE.Points over the
  // deduped figure vertices, part of the constellations layer.
  let constellationStarXyz: number[] = []; // unique equatorial XYZ triples
  let constellationDotPositions: Float32Array | null = null;
  const constellationDots = new THREE.Points(
    new THREE.BufferGeometry(),
    new THREE.PointsMaterial({
      size: 1.6,
      map: dotTexture, // round, not the default square point
      sizeAttenuation: true,
      transparent: true,
      alphaTest: 0.02,
      depthTest: false,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      color: 0xc8dcff, // rgba(200,220,255) — the panel's star colour
    }),
  );
  constellationDots.renderOrder = -7;
  constellationDots.frustumCulled = false;
  constellationDots.visible = false;
  scene.add(constellationDots);

  // Constellation NAME labels (#488) — the figure name (Orion, Gemini, Ursa Major)
  // at each figure's centroid, so the well-known shapes are called out and the
  // anonymous figure stars have context. Their own group (tied to the constellations
  // layer) rides the camera like the star group.
  const constellationLabelGroup = new THREE.Group();
  constellationLabelGroup.visible = false;
  scene.add(constellationLabelGroup);
  const constellationLabels: { sprite: THREE.Sprite; x: number; y: number; z: number }[] = [];

  // Horizon line (#488) — the altitude-0 circle. It is STATIC in the ENU frame
  // (same at any time/place, and a compass yaw maps the circle onto itself), so
  // build it once; the group just rides the camera. A soft ring for orientation.
  const horizonLine = (() => {
    const N = 96;
    const pts = new Float32Array((N + 1) * 3);
    for (let i = 0; i <= N; i++) {
      const az = (i / N) * Math.PI * 2;
      pts[i * 3] = Math.sin(az) * MARKER_RADIUS;
      pts[i * 3 + 1] = 0;
      pts[i * 3 + 2] = -Math.cos(az) * MARKER_RADIUS;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pts, 3));
    return new THREE.Line(
      g,
      new THREE.LineBasicMaterial({
        color: 0x4a6a92,
        transparent: true,
        opacity: 0.5,
        depthTest: false,
        depthWrite: false,
      }),
    );
  })();
  horizonLine.renderOrder = -9;
  horizonLine.frustumCulled = false;
  scene.add(horizonLine);

  // Bright named stars (RFC-041 S2) — Sirius, Vega, … on the same sky. One shared
  // soft-dot texture (additive glow), one Sprite per star scaled by magnitude, and
  // a name label on the brightest few only (clutter guard). Positions bake at the
  // ephemeris cadence like the constellations; the group rides the camera.
  const starGroup = new THREE.Group();
  starGroup.visible = false; // until the data loads
  scene.add(starGroup);
  let showStars = true;
  let showPlanets = true; // Sun / Moon / planets markers
  let showStations = true; // ISS / Tiangong markers
  const starSprites: {
    sprite: THREE.Sprite;
    label: THREE.Sprite | null;
    x: number;
    y: number;
    z: number;
  }[] = [];
  const _starDir = new THREE.Vector3();
  const starDotMaterial = new THREE.SpriteMaterial({
    map: dotTexture,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
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
      if (pos.aboveHorizon && showPlanets) {
        const [x, y, z] = skyDirectionENU(pos);
        m.dir.set(x, y, z);
        m.group.visible = true;
      } else {
        m.group.visible = false; // below the horizon, or the layer is off
      }
    }
  }

  // Bake every constellation vertex into the LineSegments buffer as
  // toWorldDir(ENU)·R, in the constellation group's local frame (the group itself
  // is re-anchored to the camera each frame). Done at the ephemeris cadence, so
  // it's cheap; the field tracks sidereal rotation. On the heading-aligned (ARKit)
  // substrate toWorldDir is identity; on the compass paths it carries the live yaw
  // (up to one interval stale, imperceptible for the slow star field).
  function recomputeConstellations(): void {
    if (!observer || !view || !constellationPositions || !constellationFigures.length) return;
    const jd = julianDay(new Date());
    const latRad = (observer.latDeg * Math.PI) / 180;
    const lonRad = (observer.lonDeg * Math.PI) / 180;
    const pos = constellationPositions;
    let i = 0;
    for (const fig of constellationFigures) {
      const v = fig.vertices;
      for (let k = 0; k + 2 < v.length; k += 3) {
        const [e, u, n] = equatorialXyzToSkyDir(v[k], v[k + 1], v[k + 2], jd, latRad, lonRad);
        _cstDir.set(e, u, n);
        view.toWorldDir(_cstDir);
        pos[i++] = _cstDir.x * MARKER_RADIUS;
        pos[i++] = _cstDir.y * MARKER_RADIUS;
        pos[i++] = _cstDir.z * MARKER_RADIUS;
      }
    }
    constellationLines.geometry.attributes.position.needsUpdate = true;

    // The vertex dots (#488) — same conversion over the deduped figure stars.
    if (constellationDotPositions) {
      const dp = constellationDotPositions;
      const s = constellationStarXyz;
      let j = 0;
      for (let k = 0; k + 2 < s.length; k += 3) {
        const [e, u, n] = equatorialXyzToSkyDir(s[k], s[k + 1], s[k + 2], jd, latRad, lonRad);
        _cstDir.set(e, u, n);
        view.toWorldDir(_cstDir);
        dp[j++] = _cstDir.x * MARKER_RADIUS;
        dp[j++] = _cstDir.y * MARKER_RADIUS;
        dp[j++] = _cstDir.z * MARKER_RADIUS;
      }
      constellationDots.geometry.attributes.position.needsUpdate = true;
    }

    // Figure name labels — at the centroid direction.
    for (const l of constellationLabels) {
      const [e, u, n] = equatorialXyzToSkyDir(l.x, l.y, l.z, jd, latRad, lonRad);
      _cstDir.set(e, u, n);
      view.toWorldDir(_cstDir);
      l.sprite.position.set(
        _cstDir.x * MARKER_RADIUS,
        _cstDir.y * MARKER_RADIUS,
        _cstDir.z * MARKER_RADIUS,
      );
    }
  }

  // Re-place each bright-star sprite at toWorldDir(dir)·R (relative to the star
  // group, which rides the camera). Same cadence + substrate mapping as the
  // constellations. Cheap — ≤~62 stars.
  function recomputeStars(): void {
    if (!observer || !view || !starSprites.length) return;
    const jd = julianDay(new Date());
    const latRad = (observer.latDeg * Math.PI) / 180;
    const lonRad = (observer.lonDeg * Math.PI) / 180;
    for (const s of starSprites) {
      const [e, u, n] = equatorialXyzToSkyDir(s.x, s.y, s.z, jd, latRad, lonRad);
      _starDir.set(e, u, n);
      view.toWorldDir(_starDir);
      const px = _starDir.x * MARKER_RADIUS;
      const py = _starDir.y * MARKER_RADIUS;
      const pz = _starDir.z * MARKER_RADIUS;
      s.sprite.position.set(px, py, pz);
      if (s.label) s.label.position.set(px, py + 1.2, pz); // just above the star
    }
  }

  // Hide a label when its anchor is behind the camera or near the screen edge, so
  // it never clips off the edge (and the view stays legible). Group is at camPos,
  // so the label's world position is camPos + its local (dir·R) position.
  const _labelNdc = new THREE.Vector3();
  function cullLabel(sprite: THREE.Sprite): void {
    _labelNdc.copy(sprite.position).add(camPos).project(camera);
    sprite.visible =
      _labelNdc.z < 1 && Math.abs(_labelNdc.x) < 0.88 && Math.abs(_labelNdc.y) < 0.84;
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

    // Load the constellation figures (RFC-041 S1) + size the shared buffer. Async,
    // non-blocking: the sky is usable immediately and the figures pop in when ready.
    void loadConstellationFigures(base).then((figs) => {
      if (disposed) return;
      constellationFigures = figs;
      const totalVerts = figs.reduce((s, f) => s + Math.floor(f.vertices.length / 3), 0);
      if (totalVerts === 0) return;
      constellationPositions = new Float32Array(totalVerts * 3);
      constellationLines.geometry.setAttribute(
        'position',
        new THREE.BufferAttribute(constellationPositions, 3),
      );
      // Dedup the figure vertices into unique stars for the dots (#488). Vertices
      // at the same star share XYZ exactly (shared segment endpoints), so a rounded
      // key collapses them.
      const seen = new Set<string>();
      const uniq: number[] = [];
      for (const f of figs) {
        const v = f.vertices;
        for (let k = 0; k + 2 < v.length; k += 3) {
          const key = `${v[k].toFixed(1)},${v[k + 1].toFixed(1)},${v[k + 2].toFixed(1)}`;
          if (seen.has(key)) continue;
          seen.add(key);
          uniq.push(v[k], v[k + 1], v[k + 2]);
        }
      }
      constellationStarXyz = uniq;
      constellationDotPositions = new Float32Array(uniq.length);
      constellationDots.geometry.setAttribute(
        'position',
        new THREE.BufferAttribute(constellationDotPositions, 3),
      );
      // One name label per figure, at the vertex centroid.
      for (const f of figs) {
        const v = f.vertices;
        if (v.length < 3) continue;
        let cx = 0;
        let cy = 0;
        let cz = 0;
        let n = 0;
        for (let k = 0; k + 2 < v.length; k += 3) {
          cx += v[k];
          cy += v[k + 1];
          cz += v[k + 2];
          n++;
        }
        const label = makeTextSprite(constellationName(f.con), 'rgba(170,212,245,1)', 2.6);
        constellationLabelGroup.add(label);
        constellationLabels.push({ sprite: label, x: cx / n, y: cy / n, z: cz / n });
      }
      recomputeConstellations();
      constellationLines.visible = showConstellations;
      constellationDots.visible = showConstellations;
      constellationLabelGroup.visible = showConstellations;
    });

    // Load the bright named stars (RFC-041 S2) + build one sprite each (+ a label
    // on the brightest). Async, non-blocking, same as the figures.
    void loadBrightStars(base).then((stars: BrightStar[]) => {
      if (disposed || !stars.length) return;
      for (const st of stars) {
        const sprite = new THREE.Sprite(starDotMaterial);
        const sc = starScale(st.mag);
        sprite.scale.set(sc, sc, 1);
        starGroup.add(sprite);
        // Label EVERY named star (operator: "each star clearly labeled") — the 62
        // catalog stars all have proper names; the anonymous figure-vertex dots
        // can't be named, so the constellation NAME labels below cover those areas.
        let label: THREE.Sprite | null = null;
        if (st.proper) {
          label = makeTextSprite(st.proper, 'rgba(224,234,255,1)', 1.9);
          starGroup.add(label); // sibling, not child — so it doesn't inherit `sc`
        }
        starSprites.push({ sprite, label, x: st.x, y: st.y, z: st.z });
      }
      recomputeStars();
      starGroup.visible = showStars;
    });

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
        recomputeConstellations();
        recomputeStars();
        lastEphemeris = t;
      }
      // The constellation figures + dots + stars + horizon are baked as directions·R
      // in their own frame; each rides the camera so it stays "at infinity".
      constellationLines.position.copy(camPos);
      constellationDots.position.copy(camPos);
      constellationLabelGroup.position.copy(camPos);
      horizonLine.position.copy(camPos);
      starGroup.position.copy(camPos);
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

      // Cull labels that fall near/off the screen edge so they don't clip (the
      // operator's cut-off-labels note) + it thins the clutter. Project each
      // label's world position (group is at camPos, label local = dir·R).
      if (showConstellations) for (const l of constellationLabels) cullLabel(l.sprite);
      if (showStars) for (const s of starSprites) if (s.label) cullLabel(s.label);

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
          if (!sm.tle || !showStations) {
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
    constellationLines.geometry.dispose();
    (constellationLines.material as THREE.Material).dispose();
    constellationDots.geometry.dispose();
    (constellationDots.material as THREE.Material).dispose();
    horizonLine.geometry.dispose();
    (horizonLine.material as THREE.Material).dispose();
    for (const l of constellationLabels) (l.sprite.material.map as THREE.Texture | null)?.dispose();
    for (const s of starSprites) (s.label?.material.map as THREE.Texture | null)?.dispose();
    dotTexture.dispose();
    starDotMaterial.dispose();
    arrowLayer?.remove();
    arrowEls.clear();
    scene.traverse((o) => {
      const s = o as THREE.Sprite;
      s.material?.dispose?.();
    });
    renderer.dispose();
  }

  function setConstellationsVisible(on: boolean): void {
    showConstellations = on;
    // Only actually show once the buffer is populated (visible stays false until load).
    constellationLines.visible = on && !!constellationPositions;
    constellationDots.visible = on && !!constellationDotPositions;
    constellationLabelGroup.visible = on && constellationLabels.length > 0;
  }

  function setStarsVisible(on: boolean): void {
    showStars = on;
    starGroup.visible = on && starSprites.length > 0;
  }

  function setPlanetsVisible(on: boolean): void {
    showPlanets = on;
    if (!on) for (const { group } of markers.values()) group.visible = false;
    else recomputeDirections(); // re-apply above-horizon visibility
  }

  function setStationsVisible(on: boolean): void {
    showStations = on;
    if (!on) for (const { group } of stationMarkers.values()) group.visible = false;
    // when re-enabled the render loop re-shows above-horizon stations next frame
  }

  return {
    start,
    stop,
    location: () => observer,
    setConstellationsVisible,
    setStarsVisible,
    setPlanetsVisible,
    setStationsVisible,
  };
}
