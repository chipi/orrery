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
import { heliocentric, geocentricPlanet } from '../astronomy/planets';
import {
  bakePlanetTextures,
  DEFAULT_FRUSTUM_HALF,
  type BakedPlanets,
  type PlanetBakeSpec,
} from './planet-bake';
import { getObserverLocation, type ObserverLocation } from '../geolocation';
import {
  equatorialXyzToSkyDir,
  loadConstellationFigures,
  loadBrightStars,
  loadDeepSky,
  sunRiseSetEvents,
  type ConstellationFigure,
  type BrightStar,
  type DeepSkyObject,
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
  sun: 60,
  moon: 56,
  venus: 48,
  jupiter: 46,
  saturn: 38, // disc; the rings extend it well past this
  mars: 32,
  mercury: 28,
  uranus: 24,
  neptune: 22,
};

// Equirectangular surface maps we ship (static/textures) — baked into the AR
// marker sprites at start (Path B). Venus uses its cloud atlas.
const BODY_TEXTURE: Record<SkyBody, string> = {
  sun: '2k_sun.jpg',
  moon: '2k_moon.jpg',
  mercury: '2k_mercury.jpg',
  venus: '2k_venus_atmosphere.jpg',
  mars: '2k_mars.jpg',
  jupiter: '2k_jupiter.jpg',
  saturn: '2k_saturn.jpg',
  uranus: '2k_uranus.jpg',
  neptune: '2k_neptune.jpg',
};

// Physical mean radius (km) — drives the apparent-diameter size model (advisor §2).
const BODY_RADIUS_KM: Record<SkyBody, number> = {
  sun: 696000,
  moon: 1737,
  mercury: 2440,
  venus: 6052,
  mars: 3390,
  jupiter: 69911,
  saturn: 58232,
  uranus: 25362,
  neptune: 24622,
};
const AU_KM = 149597870.7;

// Typical apparent magnitude — drives the per-body aura (brightness channel).
const BODY_MAGNITUDE: Record<SkyBody, number> = {
  sun: -26.7,
  moon: -12.7,
  venus: -4.2,
  jupiter: -2.2,
  mars: -1.0,
  mercury: -0.2,
  saturn: 0.6,
  uranus: 5.7,
  neptune: 7.8,
};
// Aura opacity from magnitude — brighter bodies (Venus, Jupiter) bloom more;
// the faint ice giants barely glow. Size stays geometry; brightness lives here.
function auraAlpha(mag: number): number {
  return Math.max(0.04, Math.min(0.5, 0.42 - mag * 0.05));
}

// Ortho half-extent each body is baked in. Saturn needs a wider frame so its
// rings (out to 2.3× the disc) aren't clipped; the sprite scale is compensated by
// the same factor (below) so the DISC keeps its apparent-diameter size.
const BODY_FRUSTUM_HALF: Partial<Record<SkyBody, number>> = { saturn: 2.7 };

// World-unit sprite scale from a body's apparent angular diameter (arcsec), log-
// compressed so Neptune (~2.3″) stays legible and the Sun/Moon (~1800″) don't
// blow out — Sun≈Moon (as they truly are), and Mars visibly grows toward
// opposition. Size encodes geometry; brightness lives in the glow, phase in the
// lighting (advisor: one honest quantity per channel).
function markerWorldScale(diamArcsec: number): number {
  const s = 2.6 + 2.4 * Math.log10(Math.max(2.3, diamArcsec) / 2.3);
  return Math.max(2.6, Math.min(7.5, s));
}
function apparentDiameterArcsec(body: SkyBody, distanceAu: number): number {
  return 2 * Math.asin(BODY_RADIUS_KM[body] / (distanceAu * AU_KM)) * 206265;
}

// Phase angle (0 = full/opposition, π = new) from the real Sun–body–Earth geometry.
function bodyPhaseAngle(body: SkyBody, jd: number): number {
  if (body === 'sun') return 0;
  if (body === 'moon') {
    const cosA = 2 * Math.max(0, Math.min(1, moonPhase(new Date()).illuminatedFraction)) - 1;
    return Math.acos(Math.max(-1, Math.min(1, cosA)));
  }
  const helio = heliocentric(body, jd); // planet relative to the Sun
  const geo = geocentricPlanet(body, jd); // planet relative to the Earth
  const hm = Math.hypot(helio.x, helio.y, helio.z) || 1;
  const gm = Math.hypot(geo.x, geo.y, geo.z) || 1;
  const cosA = (helio.x * geo.x + helio.y * geo.y + helio.z * geo.z) / (hm * gm);
  return Math.acos(Math.max(-1, Math.min(1, cosA)));
}

/** Phase of a body for the texture bake: `phaseAngleRad` sets the lit fraction;
 *  `limbAngleRad` is the bright-limb position angle in the observer's sky (from
 *  "up"/zenith, toward the Sun), so the crescent points the right way as seen when
 *  looking at the body. The Moon + inner planets get real crescents. */
function bodyPhase(
  body: SkyBody,
  date: Date,
  latDeg: number,
  lonDeg: number,
): { phaseAngleRad: number; limbAngleRad: number } {
  const jd = julianDay(date);
  const phaseAngleRad = bodyPhaseAngle(body, jd);
  if (body === 'sun') return { phaseAngleRad, limbAngleRad: 0 };
  // Body + Sun unit directions in the render ENU frame [E, Up, −N].
  const db = skyDirectionENU(skyPosition(body, date, latDeg, lonDeg));
  const ds = skyDirectionENU(skyPosition('sun', date, latDeg, lonDeg));
  const dot = (a: number[], b: number[]): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const norm = (a: number[]): number[] => {
    const m = Math.hypot(a[0], a[1], a[2]) || 1;
    return [a[0] / m, a[1] / m, a[2] / m];
  };
  const up = [0, 1, 0];
  // "up" and the Sun direction, each projected into the sky plane at the body.
  const upDot = dot(up, db);
  const upPerp = norm([up[0] - upDot * db[0], up[1] - upDot * db[1], up[2] - upDot * db[2]]);
  const rightPerp = norm([
    upPerp[1] * db[2] - upPerp[2] * db[1],
    upPerp[2] * db[0] - upPerp[0] * db[2],
    upPerp[0] * db[1] - upPerp[1] * db[0],
  ]);
  const sDot = dot(ds, db);
  const dsPerp = [ds[0] - sDot * db[0], ds[1] - sDot * db[1], ds[2] - sDot * db[2]];
  const limbAngleRad = Math.atan2(dot(dsPerp, rightPerp), dot(dsPerp, upPerp));
  return { phaseAngleRad, limbAngleRad };
}

/** Live diagnostics for the AR debug HUD (#54) — helps diagnose #51 on-device. */
export interface SkyDebugData {
  /** Substrate: 'xr' (ARKit/WebXR) or 'camera' (magic window). */
  substrate: string;
  /** Compass heading the camera faces (deg, 0 = N, clockwise). */
  headingDeg: number;
  /** Camera elevation above the horizon (deg). */
  pitchDeg: number;
  /** Interface roll applied to the camera (deg). */
  rollDeg: number;
  /** Observer position. */
  latDeg: number;
  lonDeg: number;
  /** Sun/Moon/planet markers currently above the horizon + shown. */
  upBodies: number;
  /** Camera vertical field of view (deg). */
  fovDeg: number;
}

export interface SkySceneOptions {
  /** Called when the AR session ends. */
  onExit?: () => void;
  /** Pre-resolved observer location (else resolved on start). */
  location?: ObserverLocation;
  /** The next pass for each station, once its fresh TLE resolves (#405). */
  onPass?: (id: StationId, pass: Pass | null) => void;
  /** Inject a substrate (tests); else the best available is picked on start. */
  view?: SkyView;
  /** Live diagnostics tick (~4 Hz) for the debug HUD (#54). */
  onDebug?: (d: SkyDebugData) => void;
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
  /** Toggle the deep-sky (nebula/galaxy/cluster) layer (#488). Default on. */
  setDeepSkyVisible(on: boolean): void;
  /** Toggle today's sunrise/sunset horizon markers (#488). Default on. */
  setSunEventsVisible(on: boolean): void;
  /** Reveal every label (fainter stars + catalog IDs), not just the primary set
   *  (RFC-041 redesign). Default off — the sky stays legible. */
  setAllLabelsVisible(on: boolean): void;
  /** Toggle the Sun/Moon/planet markers (RFC-041). Default on. */
  setPlanetsVisible(on: boolean): void;
  /** Toggle the ISS/Tiangong station markers (RFC-041). Default on. */
  setStationsVisible(on: boolean): void;
  /** Show/hide sub-horizon sky (stars/figures/planets). Default hidden (#488). */
  setBelowHorizonVisible(on: boolean): void;
}

/** Phase shading for the Moon marker (#51 visual). */
export interface MarkerPhase {
  /** 0 (new) → 1 (full). */
  illuminatedFraction: number;
  /** Lit on the leading (right) limb when true. */
  waxing: boolean;
}

/** Per-planet surface character so the AR markers read like the real bodies
 *  (operator note): a lit sphere with gradient shading, Jupiter/Saturn bands, the
 *  Great Red Spot, Saturn's rings and the Sun's corona — not flat discs. */
interface PlanetStyle {
  light: string; // sunlit highlight
  base: string; // mid tone
  shade: string; // limb / terminator
  /** Horizontal bands: [centre y as fraction of radius (−1 top…1 bottom), half-height frac, colour]. */
  bands?: [number, number, string][];
  /** Great-Red-Spot-style feature: [x frac, y frac, radius frac, colour]. */
  spot?: [number, number, number, string];
  /** Ring system (Saturn): tilt in radians + tint. */
  rings?: { tilt: number; color: string; bright: string };
  /** Polar cap tint (Mars): colour drawn as a small cap at the top. */
  cap?: string;
  /** Corona glow (Sun): colour of the soft outer bloom. */
  corona?: string;
  /** Render as a clean white-gold disc + hairline limb ring (the Sun) — the
   *  eclipse-diagram idiom, legible over a bright daytime camera feed. */
  cleanDisc?: boolean;
}
const PLANET_STYLE: Partial<Record<SkyBody, PlanetStyle>> = {
  sun: { light: '#fff8e0', base: '#ffd24a', shade: '#f0a81e', cleanDisc: true },
  mercury: { light: '#d7cec2', base: '#9a9188', shade: '#5c554d' },
  venus: {
    light: '#fff3d6',
    base: '#e6d3a3',
    shade: '#b0925e',
    bands: [
      [-0.3, 0.14, 'rgba(255,244,214,0.35)'],
      [0.35, 0.16, 'rgba(176,146,94,0.3)'],
    ],
  },
  mars: {
    light: '#e88a55',
    base: '#c25428',
    shade: '#792a12',
    cap: 'rgba(240,240,255,0.7)',
    bands: [[0.15, 0.2, 'rgba(120,44,20,0.35)']],
  },
  jupiter: {
    light: '#f0d8b8',
    base: '#d3aa7c',
    shade: '#9a744c',
    bands: [
      [-0.55, 0.1, 'rgba(120,86,54,0.55)'],
      [-0.2, 0.12, 'rgba(244,226,200,0.5)'],
      [0.12, 0.11, 'rgba(120,86,54,0.6)'],
      [0.45, 0.12, 'rgba(226,196,158,0.45)'],
    ],
    spot: [0.32, 0.16, 0.16, 'rgba(196,86,52,0.85)'],
  },
  saturn: {
    light: '#f2e6bc',
    base: '#d9c07a',
    shade: '#a88f52',
    bands: [
      [-0.3, 0.16, 'rgba(244,232,190,0.4)'],
      [0.28, 0.16, 'rgba(168,143,82,0.4)'],
    ],
    rings: { tilt: -0.42, color: 'rgba(214,196,150,0.75)', bright: 'rgba(244,232,196,0.95)' },
  },
  uranus: {
    light: '#d6f2f6',
    base: '#a4d6e0',
    shade: '#6698a6',
  },
  neptune: {
    light: '#86a0ee',
    base: '#4f6fd0',
    shade: '#2c4392',
    bands: [[0.2, 0.14, 'rgba(134,160,238,0.4)']],
  },
};

/** A soft ring arc (Saturn) — split into a back half (behind the disc) and a front
 *  half (over the disc) so the planet occludes the far side. `a0..a1` is the arc. */
function drawRingArc(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  tilt: number,
  style: NonNullable<PlanetStyle['rings']>,
  a0: number,
  a1: number,
): void {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(tilt);
  const rx = r * 1.7;
  const ry = rx * 0.32;
  const g = ctx.createLinearGradient(-rx, 0, rx, 0);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(0.16, style.color);
  g.addColorStop(0.5, style.bright);
  g.addColorStop(0.84, style.color);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.strokeStyle = g;
  ctx.lineWidth = r * 0.5;
  ctx.beginPath();
  ctx.ellipse(0, 0, rx, ry, 0, a0, a1);
  ctx.stroke();
  // A thin Cassini-gap line just inside.
  ctx.strokeStyle = 'rgba(20,24,32,0.5)';
  ctx.lineWidth = Math.max(1, r * 0.04);
  ctx.beginPath();
  ctx.ellipse(0, 0, rx * 0.86, ry * 0.86, 0, a0, a1);
  ctx.stroke();
  ctx.restore();
}

/** Draw a planet as a shaded, banded sphere (with rings / corona / cap per style). */
function drawPlanet(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  style: PlanetStyle,
): void {
  // Clean solar disc: a white-gold radial + a hairline limb ring. No corona (a
  // fuzzy bloom washes out over a bright daytime feed and clipped the canvas).
  if (style.cleanDisc) {
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0, style.light);
    g.addColorStop(0.55, style.base);
    g.addColorStop(1, style.shade);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,246,220,0.85)';
    ctx.lineWidth = Math.max(1.5, r * 0.03);
    ctx.beginPath();
    ctx.arc(cx, cy, r - ctx.lineWidth, 0, Math.PI * 2);
    ctx.stroke();
    return;
  }
  // Corona bloom (Sun) behind everything.
  if (style.corona) {
    const cg = ctx.createRadialGradient(cx, cy, r * 0.7, cx, cy, r * 2.8);
    cg.addColorStop(0, style.corona);
    cg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = cg;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 2.8, 0, Math.PI * 2);
    ctx.fill();
  }
  // Back half of the rings (behind the disc).
  if (style.rings) drawRingArc(ctx, cx, cy, r, style.rings.tilt, style.rings, Math.PI, Math.PI * 2);

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();
  // Lit-ball base: highlight offset toward the upper-left, shading to the limb.
  const ball = ctx.createRadialGradient(cx - r * 0.34, cy - r * 0.34, r * 0.1, cx, cy, r * 1.08);
  ball.addColorStop(0, style.light);
  ball.addColorStop(0.5, style.base);
  ball.addColorStop(1, style.shade);
  ctx.fillStyle = ball;
  ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  // Bands (drawn semi-transparent so the shading shows through).
  if (style.bands)
    for (const [yf, hf, col] of style.bands) {
      ctx.fillStyle = col;
      ctx.fillRect(cx - r, cy + yf * r - hf * r, r * 2, hf * 2 * r);
    }
  // Mars polar cap.
  if (style.cap) {
    ctx.fillStyle = style.cap;
    ctx.beginPath();
    ctx.ellipse(cx, cy - r * 0.82, r * 0.5, r * 0.28, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // Great-Red-Spot-style feature.
  if (style.spot) {
    const [sx, sy, sr, col] = style.spot;
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.ellipse(cx + sx * r, cy + sy * r, sr * r, sr * 0.7 * r, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // Limb darkening to restore roundness over the bands.
  const limb = ctx.createRadialGradient(cx, cy, r * 0.55, cx, cy, r);
  limb.addColorStop(0, 'rgba(0,0,0,0)');
  limb.addColorStop(1, 'rgba(0,0,0,0.4)');
  ctx.fillStyle = limb;
  ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  // Specular highlight.
  const spec = ctx.createRadialGradient(
    cx - r * 0.36,
    cy - r * 0.4,
    0,
    cx - r * 0.36,
    cy - r * 0.4,
    r * 0.9,
  );
  spec.addColorStop(0, 'rgba(255,255,255,0.28)');
  spec.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = spec;
  ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  ctx.restore();

  // Front half of the rings (over the disc).
  if (style.rings) drawRingArc(ctx, cx, cy, r, style.rings.tilt, style.rings, 0, Math.PI);
}

/** Draw a glowing body disc + label onto a canvas the sprite maps (#51). The
 *  body reads as its real colour, sized by brightness; the Moon shows its phase.
 *  Returns the redraw fn so the Moon can repaint as its phase updates. */
function drawMarker(
  ctx: CanvasRenderingContext2D,
  size: number,
  color: string,
  bodyRadius: number,
  phase?: MarkerPhase,
  style?: PlanetStyle,
): void {
  const cx = size / 2;
  const cy = size / 2; // disc centred on the marker direction (label is a sibling now)
  ctx.clearRect(0, 0, size, size);

  // Planets/Sun render as shaded, banded spheres (Saturn rings, Sun corona).
  if (style && !phase) {
    drawPlanet(ctx, cx, cy, bodyRadius, style);
    return;
  }

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
    // Planet/Sun/station: a filled disc with a bright core and a soft edge (no
    // hard white rim — that read as a map pin).
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(cx, cy, bodyRadius, 0, Math.PI * 2);
    ctx.fill();
    // A small bright core so the body reads as luminous.
    const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, bodyRadius);
    core.addColorStop(0, 'rgba(255,255,255,0.5)');
    core.addColorStop(0.5, 'rgba(255,255,255,0.08)');
    core.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = core;
    ctx.beginPath();
    ctx.arc(cx, cy, bodyRadius, 0, Math.PI * 2);
    ctx.fill();
  }
}

function makeMarker(
  color: string,
  bodyRadius = 40,
  phase?: MarkerPhase,
  style?: PlanetStyle,
): {
  group: THREE.Group;
  sprite: THREE.Sprite;
  texture: THREE.CanvasTexture;
  canvas: HTMLCanvasElement;
  size: number;
} {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  drawMarker(ctx, size, color, bodyRadius, phase, style);

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
  return { group, sprite, texture, canvas, size };
}

/** A station marker (ISS/Tiangong) — a line-art spacecraft glyph, not a planet disc. */
function makeStationMarker(
  color: string,
  id: StationId,
): {
  group: THREE.Group;
  sprite: THREE.Sprite;
  texture: THREE.CanvasTexture;
} {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  drawStationGlyph(canvas.getContext('2d')!, size, color, id);
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
  sprite.scale.set(4, 4, 1);
  const group = new THREE.Group();
  group.add(sprite);
  return { group, sprite, texture };
}

// Label tiers (RFC-041 redesign) — typography does the hierarchy, not boxes.
// Every label is UPPERCASE Space Mono with a dark shadow-halo (the /fly milestone
// idiom), tracked out like a printed star atlas. Constellations whisper (faint,
// wide); stars sit small; planets are the only bold display tier. Sizes are world
// heights; `tracking` is inter-letter spacing as a fraction of the cap height.
type LabelTier = 'constellation' | 'star' | 'deepsky' | 'display' | 'cardinal' | 'sun';
interface LabelStyle {
  color: string;
  worldHeight: number;
  weight: number;
  tracking: number; // fraction of font px added between letters
}
const LABEL_TIERS: Record<LabelTier, LabelStyle> = {
  // Cartographic area-labels: low-contrast blue, widely tracked, light weight.
  constellation: { color: 'rgba(170,200,235,0.55)', worldHeight: 1.4, weight: 400, tracking: 0.34 },
  // Star names: small caps, brighter than the figures, flush under the dot.
  star: { color: 'rgba(214,228,255,0.92)', worldHeight: 1.15, weight: 400, tracking: 0.14 },
  // Deep-sky: an ice-blue whisper, quietest of the field labels.
  deepsky: { color: 'rgba(150,206,232,0.7)', worldHeight: 1.0, weight: 400, tracking: 0.2 },
  // The headline tier — planets/Sun/Moon. Bold, bright, the only weight-700 labels.
  display: { color: '#ffffff', worldHeight: 1.85, weight: 700, tracking: 0.16 },
  // Compass ticks: quiet, tracked, sit on the horizon ring.
  cardinal: { color: 'rgba(200,214,236,0.62)', worldHeight: 1.6, weight: 400, tracking: 0.28 },
  // Solar events — gold caption on the horizon.
  sun: { color: 'rgba(255,206,128,0.95)', worldHeight: 1.35, weight: 600, tracking: 0.22 },
};

/** A text label sprite in the given tier — UPPERCASE, tracked, with a dark
 *  shadow-halo (a soft blurred outline) so it reads clearly over the bright
 *  additive glows WITHOUT a chip box. No pill: legibility comes from the halo,
 *  the editorial idiom the rest of the app uses (/fly milestone labels). `opts`
 *  overrides the tier colour (per-body ticks, gold vs orange sun) and height. */
function makeTextSprite(
  text: string,
  tier: LabelTier,
  opts: { color?: string; worldHeight?: number } = {},
): THREE.Sprite {
  const style = LABEL_TIERS[tier];
  const color = opts.color ?? style.color;
  const worldHeight = opts.worldHeight ?? style.worldHeight;
  const upper = text.toUpperCase();
  const SS = 2; // supersample for crisp text
  const fontPx = 46 * SS;
  const track = fontPx * style.tracking; // px between letters
  const font = `${style.weight} ${fontPx}px "Space Mono", monospace`;

  // Measure the tracked string (per-char so we control spacing exactly).
  const meas = document.createElement('canvas').getContext('2d')!;
  meas.font = font;
  const chars = [...upper];
  const widths = chars.map((ch) => meas.measureText(ch).width);
  const textW = widths.reduce((a, b) => a + b, 0) + track * Math.max(0, chars.length - 1);
  // Generous padding for the shadow blur + dark stroke so nothing clips.
  const pad = Math.ceil(fontPx * 0.5);
  const w = Math.ceil(textW) + pad * 2;
  const h = fontPx + pad * 2;

  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  ctx.font = font;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';

  // Draw each glyph: a dark blurred stroke (the halo + outline) then the crisp
  // coloured fill on top. The stroke carries the shadow so the fill stays sharp.
  let x = (w - textW) / 2;
  const y = h / 2 + SS;
  ctx.lineWidth = Math.max(2 * SS, fontPx * 0.11);
  ctx.strokeStyle = 'rgba(6,9,18,0.92)';
  ctx.shadowColor = 'rgba(6,9,18,0.95)';
  ctx.shadowBlur = fontPx * 0.16;
  for (let i = 0; i < chars.length; i++) {
    ctx.strokeText(chars[i], x, y);
    x += widths[i] + track;
  }
  ctx.shadowBlur = 0;
  x = (w - textW) / 2;
  ctx.fillStyle = color;
  for (let i = 0; i < chars.length; i++) {
    ctx.fillText(chars[i], x, y);
    x += widths[i] + track;
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false }),
  );
  sprite.scale.set(worldHeight * (w / h), worldHeight, 1);
  // Text labels draw in the FOREGROUND (everything is depth-test-off, so
  // renderOrder is the only z — lines/dots/stars sit well below). Display tier
  // (planets) sits slightly above the field labels.
  sprite.renderOrder = tier === 'display' ? 22 : 20;
  return sprite;
}

/** A star point with a HARD bright core + a fast-falloff halo (RFC-041 redesign) —
 *  reads as a photographic star, not the old fuzzy cotton-ball. Shared by the star
 *  sprites AND the constellation vertex dots. */
function makeStarDotTexture(): THREE.CanvasTexture {
  const s = 64;
  const c = document.createElement('canvas');
  c.width = c.height = s;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.12, 'rgba(255,255,255,0.95)');
  g.addColorStop(0.3, 'rgba(255,255,255,0.25)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, s, s);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** A very soft round glow (wide falloff) for the per-body brightness aura. */
function makeSoftGlowTexture(): THREE.CanvasTexture {
  const s = 128;
  const c = document.createElement('canvas');
  c.width = c.height = s;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  g.addColorStop(0, 'rgba(255,255,255,0.9)');
  g.addColorStop(0.25, 'rgba(255,255,255,0.35)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, s, s);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** A line-art spacecraft glyph per station (ISS = central truss + 4 solar-array
 *  wings; Tiangong = T-shaped core + 2 panels), drawn in the station colour with
 *  a dark halo for legibility. Stations are hardware, not worlds, so they read as
 *  a stylised craft, not a planet disc (advisor §8; operator's pick). */
function drawStationGlyph(
  ctx: CanvasRenderingContext2D,
  size: number,
  color: string,
  id: StationId,
): void {
  const cx = size / 2;
  const cy = size / 2;
  ctx.clearRect(0, 0, size, size);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = Math.max(2.5, size * 0.026);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.shadowColor = 'rgba(4,8,16,0.95)';
  ctx.shadowBlur = size * 0.06;

  // A solar-array panel: outlined rectangle with a centre cell line.
  const panel = (x: number, y: number, w: number, h: number, vertical: boolean) => {
    ctx.strokeRect(x - w / 2, y - h / 2, w, h);
    ctx.beginPath();
    if (vertical) {
      ctx.moveTo(x, y - h / 2);
      ctx.lineTo(x, y + h / 2);
    } else {
      ctx.moveTo(x - w / 2, y);
      ctx.lineTo(x + w / 2, y);
    }
    ctx.stroke();
  };

  if (id === 'iss') {
    const t = size * 0.33; // half truss length
    // Horizontal integrated truss.
    ctx.beginPath();
    ctx.moveTo(cx - t, cy);
    ctx.lineTo(cx + t, cy);
    ctx.stroke();
    // Four solar-array wings — a pair above + below at each truss end.
    const pw = size * 0.2;
    const ph = size * 0.13;
    for (const sx of [-1, 1])
      for (const sy of [-1, 1]) panel(cx + sx * t * 0.72, cy + sy * ph * 1.05, pw, ph, false);
    // Central pressurised-module stack.
    ctx.beginPath();
    ctx.ellipse(cx, cy, size * 0.05, size * 0.11, 0, 0, Math.PI * 2);
    ctx.stroke();
  } else {
    // Tiangong — T-shaped core (Tianhe + two lab modules) + a panel each side.
    const core = size * 0.11;
    // Horizontal core module.
    ctx.strokeRect(cx - size * 0.2, cy - core / 2, size * 0.4, core);
    // Perpendicular module (the T stem).
    ctx.strokeRect(cx - core / 2, cy, core, size * 0.2);
    // A solar panel off each end of the core.
    panel(cx - size * 0.31, cy, size * 0.12, size * 0.16, true);
    panel(cx + size * 0.31, cy, size * 0.12, size * 0.16, true);
  }
  ctx.shadowBlur = 0;
  // A bright centre dot so the craft still has a locatable point.
  ctx.beginPath();
  ctx.arc(cx, cy, size * 0.028, 0, Math.PI * 2);
  ctx.fill();
}

/** Like the star dot but with thin 4-point diffraction spikes — used only for the
 *  handful of brightest named stars so the field gets a little astrophoto sparkle. */
function makeStarSpikeTexture(): THREE.CanvasTexture {
  const s = 128;
  const c = document.createElement('canvas');
  c.width = c.height = s;
  const ctx = c.getContext('2d')!;
  const m = s / 2;
  const g = ctx.createRadialGradient(m, m, 0, m, m, s * 0.28);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.14, 'rgba(255,255,255,0.95)');
  g.addColorStop(0.32, 'rgba(255,255,255,0.25)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, s, s);
  // Four thin spikes (vertical + horizontal), each a soft linear gradient.
  for (const vertical of [false, true]) {
    const lg = vertical
      ? ctx.createLinearGradient(m, 0, m, s)
      : ctx.createLinearGradient(0, m, s, m);
    lg.addColorStop(0, 'rgba(255,255,255,0)');
    lg.addColorStop(0.5, 'rgba(255,255,255,0.7)');
    lg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = lg;
    if (vertical) ctx.fillRect(m - 1, 0, 2, s);
    else ctx.fillRect(0, m - 1, s, 2);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** World-unit sprite scale for a star of apparent magnitude `mag` — steeper than
 *  before so bright stars pop and the faint field stays small; clamped tight. */
function starScale(mag: number): number {
  return Math.max(0.32, Math.min(2.0, 1.5 - mag * 0.55));
}

/** A cool glow colour per deep-sky category (RFC-041 redesign) — an ice-blue
 *  family that sits with the star/figure palette instead of the old loud pink;
 *  only emission nebulae keep a faint lilac whisper. */
function deepSkyColor(category: string): number {
  if (/galaxy/.test(category)) return 0x9ab4ff; // cool blue
  if (/globular|cluster/.test(category)) return 0xcfe6ff; // white-cyan
  if (/planetary/.test(category)) return 0x8af0dc; // teal ring
  if (/supernova/.test(category)) return 0xbcd0ff; // pale blue (was pink)
  if (/dark/.test(category)) return 0x9a8aa0; // dusty grey-purple
  return 0xcbb8df; // emission nebula — a lilac whisper, not hot pink
}

/** One deep-sky category key for the shaped-texture cache. */
function deepSkyShape(category: string): 'galaxy' | 'cluster' | 'planetary' | 'nebula' {
  if (/galaxy/.test(category)) return 'galaxy';
  if (/globular|cluster/.test(category)) return 'cluster';
  if (/planetary/.test(category)) return 'planetary';
  return 'nebula';
}

// Fixed speckle offsets (unit disc) so a cluster texture is deterministic.
const CLUSTER_SPECKLES: [number, number, number][] = [
  [0, 0, 1],
  [0.28, -0.12, 0.7],
  [-0.22, 0.18, 0.7],
  [0.12, 0.34, 0.6],
  [-0.34, -0.2, 0.6],
  [0.4, 0.22, 0.5],
  [-0.1, -0.38, 0.5],
  [0.22, -0.36, 0.45],
  [-0.4, 0.08, 0.45],
  [0.05, 0.14, 0.55],
  [0.34, -0.02, 0.4],
  [-0.16, 0.42, 0.4],
];

/** A shaped, believable deep-sky glow texture (white alpha; tinted by the sprite
 *  material colour). galaxy = tilted ellipse, cluster = speckle of micro-stars,
 *  planetary = soft ring, nebula = two offset overlapping clouds. */
function makeDeepSkyTexture(
  shape: 'galaxy' | 'cluster' | 'planetary' | 'nebula',
): THREE.CanvasTexture {
  const s = 128;
  const m = s / 2;
  const c = document.createElement('canvas');
  c.width = c.height = s;
  const ctx = c.getContext('2d')!;
  const soft = (
    cx: number,
    cy: number,
    r: number,
    a0: number,
    stops?: [number, number][],
  ): void => {
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    if (stops) for (const [o, a] of stops) g.addColorStop(o, `rgba(255,255,255,${a})`);
    else {
      g.addColorStop(0, `rgba(255,255,255,${a0})`);
      g.addColorStop(0.5, `rgba(255,255,255,${a0 * 0.4})`);
      g.addColorStop(1, 'rgba(255,255,255,0)');
    }
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, s, s);
  };

  if (shape === 'galaxy') {
    ctx.save();
    ctx.translate(m, m);
    ctx.rotate(0.5);
    ctx.scale(1, 0.42); // flatten to an inclined disc
    ctx.translate(-m, -m);
    soft(m, m, s * 0.48, 0.9);
    ctx.restore();
  } else if (shape === 'cluster') {
    soft(m, m, s * 0.42, 0.22); // faint unresolved haze
    for (const [dx, dy, a] of CLUSTER_SPECKLES) soft(m + dx * m, m + dy * m, s * 0.05, a);
  } else if (shape === 'planetary') {
    // A soft ring (bright shell, dim centre).
    soft(m, m, s * 0.46, 0, [
      [0, 0.14],
      [0.5, 0.1],
      [0.72, 0.6],
      [0.86, 0.18],
      [1, 0],
    ]);
  } else {
    // Emission nebula — two offset overlapping clouds, irregular.
    soft(m * 0.86, m * 0.92, s * 0.4, 0.55);
    soft(m * 1.18, m * 1.1, s * 0.32, 0.42);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// A bare catalog designation (NGC 3351, IC 1101, M 42, Lalande 21185, …) rather
// than a real name — dropped from the default label set (reads as debug output).
const CATALOG_ID = /^(ngc|ic|m|messier|pgc|ugc|caldwell|lalande|hd|hip|sao|hr)\s?\d/i;
function isCatalogName(name: string): boolean {
  return CATALOG_ID.test(name.trim());
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

  // Body/station display labels ride this camPos-anchored group (so a label's
  // local position is worldDir·R, the same convention the declutter pass uses).
  const bodyLabelGroup = new THREE.Group();
  scene.add(bodyLabelGroup);
  const glowTexture = makeSoftGlowTexture(); // per-body brightness aura

  const markers = new Map<
    SkyBody,
    {
      group: THREE.Group;
      sprite: THREE.Sprite;
      texture: THREE.CanvasTexture;
      dir: THREE.Vector3;
      /** Brightness aura sprite behind the disc (magnitude-scaled). */
      glow?: THREE.Sprite;
      /** Display-tier name label (P9) — sibling sprite, decluttered like the rest. */
      label?: THREE.Sprite | null;
      /** True when the body is up (or below-horizon shown) + the layer is on. */
      labelEligible?: boolean;
    }
  >();
  for (const body of SKY_BODIES) {
    // Phase is ~constant over a session, so paint the Moon once at start.
    const phase = body === 'moon' ? moonPhase(new Date()) : undefined;
    const { group, sprite, texture } = makeMarker(
      BODY_COLOR[body],
      BODY_RADIUS[body],
      phase,
      PLANET_STYLE[body],
    );
    // Brightness aura behind the disc (added first → renders behind).
    const glow = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: glowTexture,
        color: new THREE.Color(BODY_COLOR[body]),
        transparent: true,
        opacity: auraAlpha(BODY_MAGNITUDE[body]),
        depthTest: false,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    glow.renderOrder = -1; // behind the disc (sprite renderOrder 0)
    group.add(glow);
    group.visible = false;
    scene.add(group);
    // Display-tier name label (P9) — a sibling in the camPos-anchored label group,
    // positioned below the disc each frame + decluttered against everything else.
    const label = makeTextSprite(BODY_LABEL[body], 'display');
    label.visible = false;
    bodyLabelGroup.add(label);
    markers.set(body, { group, sprite, glow, texture, dir: new THREE.Vector3(), label });
  }

  // Stations (ISS/Tiangong) — fast-moving; TLEs resolved fresh on start.
  const stationMarkers = new Map<
    StationId,
    {
      group: THREE.Group;
      sprite: THREE.Sprite;
      texture: THREE.CanvasTexture;
      tle: Tle | null;
      dir: THREE.Vector3;
      label?: THREE.Sprite | null;
      labelEligible?: boolean;
    }
  >();
  for (const id of STATION_IDS) {
    const { group, sprite, texture } = makeStationMarker(STATION_COLOR[id], id);
    group.visible = false;
    scene.add(group);
    const label = makeTextSprite(STATION_LABEL[id], 'display');
    label.visible = false;
    bodyLabelGroup.add(label);
    stationMarkers.set(id, { group, sprite, texture, tle: null, dir: new THREE.Vector3(), label });
  }

  // Cardinal marks on the horizon so the sky is oriented (#51 visual).
  const cardinals = CARDINALS.map((c) => {
    const sprite = makeTextSprite(c.text, 'cardinal');
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

  // Shared hard-core star texture for the star sprites AND the constellation
  // vertex points (without a map, THREE.Points renders as squares); a spike
  // variant for the brightest few; and a per-shape cache for the deep-sky glows.
  const dotTexture = makeStarDotTexture();
  const spikeTexture = makeStarSpikeTexture();
  const deepSkyTexCache = new Map<string, THREE.CanvasTexture>();
  const deepSkyTexture = (category: string): THREE.CanvasTexture => {
    const shape = deepSkyShape(category);
    let t = deepSkyTexCache.get(shape);
    if (!t) {
      t = makeDeepSkyTexture(shape);
      deepSkyTexCache.set(shape, t);
    }
    return t;
  };

  // Constellation vertex dots (#488) — a highlighted star at each figure vertex so
  // the lines read as connected stars (Big/Little Bear). One THREE.Points over the
  // deduped figure vertices, part of the constellations layer.
  let constellationStarXyz: number[] = []; // unique equatorial XYZ triples
  let constellationDotPositions: Float32Array | null = null;
  const constellationDots = new THREE.Points(
    new THREE.BufferGeometry(),
    new THREE.PointsMaterial({
      size: 0.9,
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
  const constellationLabels: {
    sprite: THREE.Sprite;
    x: number;
    y: number;
    z: number;
    above?: boolean;
  }[] = [];

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
        color: 0x2f4a63, // colder ink-teal, quieter than before
        transparent: true,
        opacity: 0.32,
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
  let showBelowHorizon = false; // #488 — hide sub-horizon sky by default (toggleable)
  // Label budget (RFC-041 redesign): by default only "primary" labels show — the
  // brightest star names + famous deep-sky names — so the sky isn't a wall of text.
  // The "All names" toggle reveals the rest (fainter stars, catalog IDs).
  let showAllLabels = false;

  // Per-layer cross-fade (P12): a toggle sets a fade target (0/1); the render loop
  // lerps the current value and scales each layer's material opacity by it, so a
  // layer fades in/out over ~220 ms instead of popping. Reduced-motion snaps.
  type FadeKey = 'planets' | 'constellations' | 'stars' | 'deepsky' | 'sun' | 'stations';
  const FADE_KEYS: FadeKey[] = ['planets', 'constellations', 'stars', 'deepsky', 'sun', 'stations'];
  const FADE_MS = 220;
  const reduceMotion =
    typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const layerFade: Record<FadeKey, { target: number; current: number }> = {
    planets: { target: 1, current: 1 },
    constellations: { target: 1, current: 1 },
    stars: { target: 1, current: 1 },
    deepsky: { target: 1, current: 1 },
    sun: { target: 1, current: 1 },
    stations: { target: 1, current: 1 },
  };
  let lastFrameMs = 0;
  // Debug HUD (#54): throttled diagnostics emit + scratch vectors.
  let lastDebugMs = 0;
  const _dbgFwd = new THREE.Vector3();
  const _dbgUp = new THREE.Vector3();
  const _dbgExp = new THREE.Vector3();
  const _dbgCross = new THREE.Vector3();
  const starSprites: {
    sprite: THREE.Sprite;
    label: THREE.Sprite | null;
    x: number;
    y: number;
    z: number;
    above?: boolean;
    /** Bright enough to name by default (mag < 1.5). */
    primary?: boolean;
  }[] = [];
  const _starDir = new THREE.Vector3();
  const starDotMaterial = new THREE.SpriteMaterial({
    map: dotTexture,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  // The brightest named stars get diffraction spikes (a little astrophoto sparkle).
  const starSpikeMaterial = new THREE.SpriteMaterial({
    map: spikeTexture,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  // Deep-sky layer (#488) — nebulae, galaxies, clusters as soft colour glows +
  // name labels, so there are "big clouds in the distance" to orient by. Own group
  // (rides the camera), own toggle, hidden below the horizon like the stars.
  const deepSkyGroup = new THREE.Group();
  deepSkyGroup.visible = false;
  scene.add(deepSkyGroup);
  let showDeepSky = true;
  const deepSkyObjects: {
    sprite: THREE.Sprite;
    label: THREE.Sprite | null;
    x: number;
    y: number;
    z: number;
    above?: boolean;
    /** Has a real name (not a bare catalog ID) → labelled by default. */
    primary?: boolean;
  }[] = [];
  const _dsDir = new THREE.Vector3();

  // Sunrise/sunset markers (#488) — where the Sun crosses the horizon today, as
  // two glowing points that ride the horizon ring at their rise/set azimuth. Own
  // group + toggle; rebuilt only when the calendar day rolls over.
  const sunEventGroup = new THREE.Group();
  scene.add(sunEventGroup);
  let showSunEvents = true;
  let sunEventsDay = '';
  const sunEventMarkers: {
    sprite: THREE.Sprite;
    label: THREE.Sprite;
    dir: THREE.Vector3;
  }[] = [];
  const _seDir = new THREE.Vector3();

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

  // Baked planet textures (Path B) — filled once the maps load; disposed on stop().
  let bakedPlanets: BakedPlanets | null = null;
  function loadTexture(file: string): Promise<THREE.Texture> {
    return new Promise((resolve, reject) => {
      new THREE.TextureLoader().load(
        `${base}/textures/${file}`,
        (t) => {
          t.colorSpace = THREE.SRGBColorSpace;
          resolve(t);
        },
        undefined,
        reject,
      );
    });
  }
  async function bakePlanets(): Promise<void> {
    try {
      const obs = observer;
      if (!obs) return;
      const now = new Date();
      // The Sun keeps its procedural clean disc (daytime legibility) — bake the rest.
      const loaded = await Promise.all(
        SKY_BODIES.filter((b) => b !== 'sun').map(async (b) => ({
          b,
          tex: await loadTexture(BODY_TEXTURE[b]),
        })),
      );
      if (disposed) {
        for (const { tex } of loaded) tex.dispose();
        return;
      }
      const specs: PlanetBakeSpec[] = loaded.map(({ b, tex }) => {
        const ph = bodyPhase(b, now, obs.latDeg, obs.lonDeg);
        return {
          key: b,
          texture: tex,
          phaseAngleRad: ph.phaseAngleRad,
          limbAngleRad: ph.limbAngleRad,
          rings: b === 'saturn',
          frustumHalf: BODY_FRUSTUM_HALF[b],
        };
      });
      bakedPlanets = bakePlanetTextures(renderer, specs);
      for (const { b, tex } of loaded) {
        const baked = bakedPlanets.get(b);
        const m = markers.get(b);
        if (baked && m) {
          m.sprite.material.map = baked;
          m.sprite.material.needsUpdate = true;
        }
        tex.dispose(); // the source map is baked into the target now
      }
    } catch {
      /* keep the procedural canvas markers as the fallback */
    }
  }

  function recomputeDirections(): void {
    if (!observer) return;
    const now = new Date();
    for (const body of SKY_BODIES) {
      const pos = skyPosition(body, now, observer.latDeg, observer.lonDeg);
      const m = markers.get(body)!;
      if ((pos.aboveHorizon || showBelowHorizon) && showPlanets) {
        const [x, y, z] = skyDirectionENU(pos);
        m.dir.set(x, y, z);
        m.group.visible = true;
        // Apparent-diameter size model (advisor §2) — repaint scale only on a
        // meaningful change (distances move over weeks; Mars grows at opposition).
        // Bodies baked in a wider frame (Saturn, for its rings) are compensated so
        // the DISC keeps the same apparent size as the tightly-framed bodies.
        const base = markerWorldScale(apparentDiameterArcsec(body, pos.distanceAu));
        const comp = (BODY_FRUSTUM_HALF[body] ?? DEFAULT_FRUSTUM_HALF) / DEFAULT_FRUSTUM_HALF;
        const target = base * comp;
        if (Math.abs(m.sprite.scale.x - target) > 0.05) m.sprite.scale.set(target, target, 1);
        // Aura tracks the disc's on-screen size (glow fills its own sprite, so it
        // uses the un-compensated base — uniform ~1.8× the disc across bodies).
        if (m.glow) {
          const gs = base * 1.35;
          if (Math.abs(m.glow.scale.x - gs) > 0.05) m.glow.scale.set(gs, gs, 1);
        }
      } else {
        m.group.visible = false; // below the horizon (layer off / below-horizon off)
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
    // Lines are LineSegments (every 2 verts = 1 drawn segment). Pack only the
    // segments to draw at the front + setDrawRange, so below-horizon segments are
    // dropped without leaving stray geometry (#488). A segment is dropped if
    // either endpoint is below the horizon (unless the below-horizon layer is on).
    const pos = constellationPositions;
    let w = 0;
    for (const fig of constellationFigures) {
      const v = fig.vertices;
      for (let k = 0; k + 5 < v.length; k += 6) {
        const a = equatorialXyzToSkyDir(v[k], v[k + 1], v[k + 2], jd, latRad, lonRad);
        const b = equatorialXyzToSkyDir(v[k + 3], v[k + 4], v[k + 5], jd, latRad, lonRad);
        if (!showBelowHorizon && (a[1] <= 0 || b[1] <= 0)) continue;
        _cstDir.set(a[0], a[1], a[2]);
        view.toWorldDir(_cstDir);
        pos[w++] = _cstDir.x * MARKER_RADIUS;
        pos[w++] = _cstDir.y * MARKER_RADIUS;
        pos[w++] = _cstDir.z * MARKER_RADIUS;
        _cstDir.set(b[0], b[1], b[2]);
        view.toWorldDir(_cstDir);
        pos[w++] = _cstDir.x * MARKER_RADIUS;
        pos[w++] = _cstDir.y * MARKER_RADIUS;
        pos[w++] = _cstDir.z * MARKER_RADIUS;
      }
    }
    constellationLines.geometry.setDrawRange(0, w / 3);
    constellationLines.geometry.attributes.position.needsUpdate = true;

    // The vertex dots (#488) — same conversion over the deduped figure stars, with
    // the same draw-range pack for below-horizon culling.
    if (constellationDotPositions) {
      const dp = constellationDotPositions;
      const s = constellationStarXyz;
      let j = 0;
      for (let k = 0; k + 2 < s.length; k += 3) {
        const [e, u, n] = equatorialXyzToSkyDir(s[k], s[k + 1], s[k + 2], jd, latRad, lonRad);
        if (!showBelowHorizon && u <= 0) continue;
        _cstDir.set(e, u, n);
        view.toWorldDir(_cstDir);
        dp[j++] = _cstDir.x * MARKER_RADIUS;
        dp[j++] = _cstDir.y * MARKER_RADIUS;
        dp[j++] = _cstDir.z * MARKER_RADIUS;
      }
      constellationDots.geometry.setDrawRange(0, j / 3);
      constellationDots.geometry.attributes.position.needsUpdate = true;
    }

    // Figure name labels — at the centroid direction; remember above/below horizon
    // so the per-frame cull can drop the below-horizon ones.
    for (const l of constellationLabels) {
      const [e, u, n] = equatorialXyzToSkyDir(l.x, l.y, l.z, jd, latRad, lonRad);
      l.above = u > 0;
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
      const above = u > 0;
      s.above = above;
      s.sprite.visible = above || showBelowHorizon; // hide sub-horizon stars (#488)
      _starDir.set(e, u, n);
      view.toWorldDir(_starDir);
      const px = _starDir.x * MARKER_RADIUS;
      const py = _starDir.y * MARKER_RADIUS;
      const pz = _starDir.z * MARKER_RADIUS;
      s.sprite.position.set(px, py, pz);
      if (s.label) s.label.position.set(px, py + 1.2, pz); // just above the star
    }
  }

  // Deep-sky objects — same placement + below-horizon gating as the stars.
  function recomputeDeepSky(): void {
    if (!observer || !view || !deepSkyObjects.length) return;
    const jd = julianDay(new Date());
    const latRad = (observer.latDeg * Math.PI) / 180;
    const lonRad = (observer.lonDeg * Math.PI) / 180;
    for (const o of deepSkyObjects) {
      const [e, u, n] = equatorialXyzToSkyDir(o.x, o.y, o.z, jd, latRad, lonRad);
      o.above = u > 0;
      o.sprite.visible = u > 0 || showBelowHorizon;
      _dsDir.set(e, u, n);
      view.toWorldDir(_dsDir);
      const px = _dsDir.x * MARKER_RADIUS;
      const py = _dsDir.y * MARKER_RADIUS;
      const pz = _dsDir.z * MARKER_RADIUS;
      o.sprite.position.set(px, py, pz);
      if (o.label) o.label.position.set(px, py + 1.4, pz);
    }
  }

  // Sunrise/sunset markers — rebuilt only when the day changes (the rise/set
  // azimuths barely move within a day). Each marker sits on the horizon ring at
  // its crossing azimuth; positions are re-anchored every frame in the loop.
  function buildSunEvents(): void {
    if (!observer) return;
    const day = new Date().toDateString();
    if (day === sunEventsDay && sunEventMarkers.length) return;
    sunEventsDay = day;
    for (const m of sunEventMarkers) {
      (m.sprite.material as THREE.Material).dispose();
      (m.label.material.map as THREE.Texture | null)?.dispose();
    }
    sunEventGroup.clear();
    sunEventMarkers.length = 0;
    const events = sunRiseSetEvents(new Date(), observer.latDeg, observer.lonDeg);
    for (const ev of events) {
      const gold = ev.kind === 'sunrise' ? 0xffd27f : 0xff8a3c;
      const sprite = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: dotTexture,
          color: gold,
          transparent: true,
          depthTest: false,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        }),
      );
      sprite.scale.set(3, 3, 1);
      sprite.renderOrder = -5;
      sunEventGroup.add(sprite);
      const label = makeTextSprite(ev.kind === 'sunrise' ? 'Sunrise' : 'Sunset', 'sun', {
        color: ev.kind === 'sunrise' ? 'rgba(255,214,150,0.96)' : 'rgba(255,158,96,0.96)',
      });
      sunEventGroup.add(label);
      sunEventMarkers.push({ sprite, label, dir: new THREE.Vector3(...ev.dir) });
    }
    sunEventGroup.visible = showSunEvents && sunEventMarkers.length > 0;
  }

  // Hide a label when its anchor is behind the camera or near the screen edge, so
  // it never clips off the edge (and the view stays legible). Group is at camPos,
  // so the label's world position is camPos + its local (dir·R) position.
  // Screen-space label declutter (RFC-041 redesign, P4). Every eligible label is
  // projected to NDC; higher-priority ones are placed first and any later label
  // whose box overlaps a kept one is hidden. Fixes the Orion's-belt label smear +
  // edge-clip (a wide name near the edge is dropped, not cut). Priority: planets >
  // sun > bright stars > stations > constellation names > deep-sky.
  const _labelNdc = new THREE.Vector3();
  const _cands: { sprite: THREE.Sprite; prio: number }[] = [];
  const _boxes: { x: number; y: number; hw: number; hh: number }[] = [];
  function pushCand(sprite: THREE.Sprite | null, eligible: boolean, prio: number): void {
    if (!sprite) return;
    if (!eligible) {
      sprite.visible = false;
      return;
    }
    _cands.push({ sprite, prio });
  }
  function declutterLabels(): void {
    _cands.length = 0;
    if (showConstellations)
      for (const l of constellationLabels) pushCand(l.sprite, l.above || showBelowHorizon, 2);
    else for (const l of constellationLabels) l.sprite.visible = false;
    if (showStars)
      for (const s of starSprites)
        pushCand(s.label, (s.above || showBelowHorizon) && (!!s.primary || showAllLabels), 4);
    else for (const s of starSprites) if (s.label) s.label.visible = false;
    if (showDeepSky)
      for (const o of deepSkyObjects)
        pushCand(o.label, (o.above || showBelowHorizon) && (!!o.primary || showAllLabels), 1);
    else for (const o of deepSkyObjects) if (o.label) o.label.visible = false;
    if (showSunEvents) for (const m of sunEventMarkers) pushCand(m.label, true, 5);
    else for (const m of sunEventMarkers) m.label.visible = false;
    // Planet/station display labels — top priority (the headline objects).
    for (const [, m] of markers) if (m.label) pushCand(m.label, m.labelEligible === true, 6);
    for (const [, m] of stationMarkers) if (m.label) pushCand(m.label, m.labelEligible === true, 3);

    _cands.sort((a, b) => b.prio - a.prio);
    _boxes.length = 0;
    const k = MARKER_RADIUS * Math.tan((camera.fov * Math.PI) / 360);
    for (const { sprite } of _cands) {
      _labelNdc.copy(sprite.position).add(camPos).project(camera);
      const hh = (sprite.scale.y * 0.5) / k;
      const hw = (sprite.scale.x * 0.5) / (k * camera.aspect);
      // Behind camera or the whole box doesn't fit on-screen → hide (no edge clip).
      if (_labelNdc.z >= 1 || Math.abs(_labelNdc.x) + hw > 1 || Math.abs(_labelNdc.y) + hh > 1) {
        sprite.visible = false;
        continue;
      }
      let clash = false;
      for (const b of _boxes)
        if (Math.abs(_labelNdc.x - b.x) < hw + b.hw && Math.abs(_labelNdc.y - b.y) < hh + b.hh) {
          clash = true;
          break;
        }
      if (clash) {
        sprite.visible = false;
        continue;
      }
      sprite.visible = true;
      _boxes.push({ x: _labelNdc.x, y: _labelNdc.y, hw, hh });
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

    // Bake the real planet textures into the marker sprites (Path B). Async +
    // non-blocking: the procedural canvas markers show until the textures land,
    // then each sprite upgrades to its lit, textured, correctly-phased self.
    void bakePlanets();

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
      // One name label per CONSTELLATION (aggregate all figures that share a code,
      // e.g. the two Serpens halves), at the combined vertex centroid.
      const byCon = new Map<string, { cx: number; cy: number; cz: number; n: number }>();
      for (const f of figs) {
        const v = f.vertices;
        let acc = byCon.get(f.con);
        if (!acc) byCon.set(f.con, (acc = { cx: 0, cy: 0, cz: 0, n: 0 }));
        for (let k = 0; k + 2 < v.length; k += 3) {
          acc.cx += v[k];
          acc.cy += v[k + 1];
          acc.cz += v[k + 2];
          acc.n++;
        }
      }
      for (const [con, a] of byCon) {
        if (a.n === 0) continue;
        const label = makeTextSprite(constellationName(con), 'constellation');
        constellationLabelGroup.add(label);
        constellationLabels.push({ sprite: label, x: a.cx / a.n, y: a.cy / a.n, z: a.cz / a.n });
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
        // Brightest few get spikes; the rest are hard-core dots.
        const sprite = new THREE.Sprite(st.mag < 0.5 ? starSpikeMaterial : starDotMaterial);
        const sc = starScale(st.mag) * (st.mag < 0.5 ? 1.6 : 1);
        sprite.scale.set(sc, sc, 1);
        starGroup.add(sprite);
        // Label EVERY named star (operator: "each star clearly labeled") — the 62
        // catalog stars all have proper names; the anonymous figure-vertex dots
        // can't be named, so the constellation NAME labels below cover those areas.
        let label: THREE.Sprite | null = null;
        if (st.proper) {
          label = makeTextSprite(st.proper, 'star');
          starGroup.add(label); // sibling, not child — so it doesn't inherit `sc`
        }
        // The ~15 brightest stars are named by default; the rest wait for "All names".
        starSprites.push({ sprite, label, x: st.x, y: st.y, z: st.z, primary: st.mag < 1.5 });
      }
      recomputeStars();
      starGroup.visible = showStars;
    });

    // Load the deep-sky objects (#488) — a soft colour glow + name label each.
    void loadDeepSky(base).then((objs: DeepSkyObject[]) => {
      if (disposed || !objs.length) return;
      for (const o of objs) {
        const sprite = new THREE.Sprite(
          new THREE.SpriteMaterial({
            map: deepSkyTexture(o.category), // shaped per category (ellipse/speckle/ring/cloud)
            color: deepSkyColor(o.category),
            transparent: true,
            // Faint additive so they read as delicate clouds, not lens dirt.
            opacity: 0.32,
            depthTest: false,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
          }),
        );
        // Small, believable glows (brighter/lower-mag ones a touch larger) — no
        // more multi-degree smudges bigger than the constellations themselves.
        const sc = Math.max(1.5, Math.min(3, 3 - o.mag * 0.14));
        sprite.scale.set(sc, sc, 1);
        sprite.renderOrder = -6; // behind stars, above constellation lines
        deepSkyGroup.add(sprite);
        let label: THREE.Sprite | null = null;
        if (o.name) {
          label = makeTextSprite(o.name, 'deepsky');
          deepSkyGroup.add(label);
        }
        // Real-named objects (Orion Nebula, Andromeda) label by default; bare
        // catalog IDs (NGC 3351) wait for "All names" so they don't read as debug.
        deepSkyObjects.push({
          sprite,
          label,
          x: o.x,
          y: o.y,
          z: o.z,
          primary: !!o.name && !isCatalogName(o.name),
        });
      }
      recomputeDeepSky();
      deepSkyGroup.visible = showDeepSky;
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
      // Per-layer cross-fade step (clamp dt so a backgrounded tab doesn't jump).
      const dtMs = lastFrameMs ? Math.min(50, t - lastFrameMs) : 16;
      lastFrameMs = t;
      stepFades(dtMs);
      if (t - lastEphemeris >= EPHEMERIS_INTERVAL_MS) {
        recomputeDirections();
        recomputeConstellations();
        recomputeStars();
        recomputeDeepSky();
        buildSunEvents();
        lastEphemeris = t;
      }
      // The constellation figures + dots + stars + horizon are baked as directions·R
      // in their own frame; each rides the camera so it stays "at infinity".
      constellationLines.position.copy(camPos);
      constellationDots.position.copy(camPos);
      constellationLabelGroup.position.copy(camPos);
      horizonLine.position.copy(camPos);
      starGroup.position.copy(camPos);
      deepSkyGroup.position.copy(camPos);
      sunEventGroup.position.copy(camPos);
      bodyLabelGroup.position.copy(camPos);
      // Re-anchor the sunrise/sunset marks on the horizon at their azimuth.
      for (const m of sunEventMarkers) {
        _seDir.copy(m.dir);
        view.toWorldDir(_seDir);
        const sx = _seDir.x * MARKER_RADIUS;
        const sy = _seDir.y * MARKER_RADIUS;
        const sz = _seDir.z * MARKER_RADIUS;
        m.sprite.position.set(sx, sy, sz);
        m.label.position.set(sx, sy + 1.6, sz);
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

      // Declutter every label in one screen-space pass (priority + overlap +
      // edge-fit + the primary/all-names budget) — see declutterLabels.
      declutterLabels();

      // Debug HUD diagnostics (#54) — ~4 Hz. Heading/pitch from the camera
      // forward; roll = signed angle of the camera's up from level about forward.
      if (opts.onDebug && t - lastDebugMs >= 250) {
        lastDebugMs = t;
        camera.getWorldDirection(_dbgFwd);
        const headingDeg = ((Math.atan2(_dbgFwd.x, -_dbgFwd.z) * 180) / Math.PI + 360) % 360;
        const pitchDeg = (Math.asin(Math.max(-1, Math.min(1, _dbgFwd.y))) * 180) / Math.PI;
        _dbgUp.set(0, 1, 0).applyQuaternion(camera.quaternion);
        const upDot = _dbgFwd.y; // worldUp · fwd = fwd.y
        _dbgExp.set(-upDot * _dbgFwd.x, 1 - upDot * _dbgFwd.y, -upDot * _dbgFwd.z).normalize();
        _dbgCross.copy(_dbgExp).cross(_dbgUp);
        const rollDeg = (Math.atan2(_dbgCross.dot(_dbgFwd), _dbgExp.dot(_dbgUp)) * 180) / Math.PI;
        let up = 0;
        for (const { group } of markers.values()) if (group.visible) up++;
        opts.onDebug({
          substrate: view.kind,
          headingDeg,
          pitchDeg,
          rollDeg,
          latDeg: observer?.latDeg ?? 0,
          lonDeg: observer?.lonDeg ?? 0,
          upBodies: up,
          fovDeg: camera.fov,
        });
      }

      // Collect this frame's off-screen arrow requests, then lay them all out at
      // once (layoutArrows declutters + hides anything no longer in the sky).
      arrowReqs.length = 0;
      for (const [body, m] of markers) {
        if (!m.group.visible) {
          m.labelEligible = false;
          if (m.label) m.label.visible = false;
          continue;
        }
        worldDir.copy(m.dir);
        view.toWorldDir(worldDir);
        m.group.position.copy(camPos).addScaledVector(worldDir, MARKER_RADIUS);
        if (m.label) {
          // Local = worldDir·R (bodyLabelGroup is at camPos), nudged below the disc.
          m.label.position.copy(worldDir).multiplyScalar(MARKER_RADIUS);
          m.label.position.y -= 3.6;
          m.labelEligible = true;
        }
        arrowReqs.push({
          key: body,
          label: BODY_LABEL[body],
          color: BODY_COLOR[body],
          world: m.group.position,
        });
      }
      // Stations move fast (deg/s) — recompute every frame from their TLE.
      if (observer) {
        const nowD = new Date(t);
        for (const [id, sm] of stationMarkers) {
          if (!sm.tle || !showStations) {
            sm.group.visible = false;
            sm.labelEligible = false;
            if (sm.label) sm.label.visible = false;
            continue;
          }
          const la = lookAngleForTle(sm.tle, nowD, observer.latDeg, observer.lonDeg);
          if (la.aboveHorizon || showBelowHorizon) {
            const [x, y, z] = skyDirectionENU(la);
            sm.dir.set(x, y, z);
            worldDir.copy(sm.dir);
            view.toWorldDir(worldDir);
            sm.group.position.copy(camPos).addScaledVector(worldDir, MARKER_RADIUS);
            sm.group.visible = true;
            if (sm.label) {
              sm.label.position.copy(worldDir).multiplyScalar(MARKER_RADIUS);
              sm.label.position.y -= 3.6;
              sm.labelEligible = true;
            }
            arrowReqs.push({
              key: id,
              label: STATION_LABEL[id],
              color: STATION_COLOR[id],
              world: sm.group.position,
            });
          } else {
            sm.group.visible = false;
            sm.labelEligible = false;
            if (sm.label) sm.label.visible = false;
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
    for (const o of deepSkyObjects) {
      (o.sprite.material as THREE.Material).dispose();
      (o.label?.material.map as THREE.Texture | null)?.dispose();
    }
    for (const m of sunEventMarkers) {
      (m.sprite.material as THREE.Material).dispose();
      (m.label.material.map as THREE.Texture | null)?.dispose();
    }
    for (const m of markers.values()) (m.label?.material.map as THREE.Texture | null)?.dispose();
    for (const sm of stationMarkers.values())
      (sm.label?.material.map as THREE.Texture | null)?.dispose();
    bakedPlanets?.dispose();
    dotTexture.dispose();
    spikeTexture.dispose();
    glowTexture.dispose();
    for (const t of deepSkyTexCache.values()) t.dispose();
    starDotMaterial.dispose();
    starSpikeMaterial.dispose();
    arrowLayer?.remove();
    arrowEls.clear();
    scene.traverse((o) => {
      const s = o as THREE.Sprite;
      s.material?.dispose?.();
    });
    renderer.dispose();
  }

  // Collect a layer's materials so the fade can scale their opacity uniformly.
  function layerMaterials(key: FadeKey): THREE.Material[] {
    const out: THREE.Material[] = [];
    const push = (m?: THREE.Material | null): void => {
      if (m) out.push(m);
    };
    if (key === 'planets')
      for (const m of markers.values()) {
        push(m.sprite.material);
        if (m.glow) push(m.glow.material);
        if (m.label) push(m.label.material);
      }
    else if (key === 'constellations') {
      push(constellationLines.material as THREE.Material);
      push(constellationDots.material as THREE.Material);
      for (const l of constellationLabels) push(l.sprite.material);
    } else if (key === 'stars') {
      push(starDotMaterial);
      push(starSpikeMaterial);
      for (const s of starSprites) if (s.label) push(s.label.material);
    } else if (key === 'deepsky')
      for (const o of deepSkyObjects) {
        push(o.sprite.material);
        if (o.label) push(o.label.material);
      }
    else if (key === 'sun')
      for (const m of sunEventMarkers) {
        push(m.sprite.material);
        push(m.label.material);
      }
    else
      for (const sm of stationMarkers.values()) {
        push(sm.sprite.material);
        if (sm.label) push(sm.label.material);
      }
    return out;
  }

  // Scale each material's opacity by `f`, capturing its design opacity once (the
  // first apply is always at full opacity, so the captured base is unscaled).
  function applyLayerOpacity(key: FadeKey, f: number): void {
    for (const m of layerMaterials(key)) {
      const mm = m as THREE.Material & { opacity: number };
      if (mm.userData.baseOpacity === undefined) mm.userData.baseOpacity = mm.opacity;
      mm.opacity = (mm.userData.baseOpacity as number) * f;
      mm.transparent = true;
    }
  }

  // Flip a layer's LOGIC flag (drives recompute + declutter) + its group visibility.
  function setLayerLogicOn(key: FadeKey, on: boolean): void {
    if (key === 'planets') {
      showPlanets = on;
      if (!on) for (const { group } of markers.values()) group.visible = false;
      else recomputeDirections();
    } else if (key === 'stations') {
      showStations = on;
      if (!on) for (const { group } of stationMarkers.values()) group.visible = false;
    } else if (key === 'constellations') {
      showConstellations = on;
      constellationLines.visible = on && !!constellationPositions;
      constellationDots.visible = on && !!constellationDotPositions;
      constellationLabelGroup.visible = on && constellationLabels.length > 0;
    } else if (key === 'stars') {
      showStars = on;
      starGroup.visible = on && starSprites.length > 0;
    } else if (key === 'deepsky') {
      showDeepSky = on;
      deepSkyGroup.visible = on && deepSkyObjects.length > 0;
    } else {
      showSunEvents = on;
      sunEventGroup.visible = on && sunEventMarkers.length > 0;
    }
  }

  // Toggle a layer with a cross-fade. On enable: render immediately + fade opacity
  // up. On disable: keep the layer logically on (so recompute/declutter keep
  // placing it) and fade opacity down; the loop flips it fully off at 0.
  function fadeLayer(key: FadeKey, on: boolean): void {
    if (reduceMotion) {
      setLayerLogicOn(key, on);
      layerFade[key].current = layerFade[key].target = on ? 1 : 0;
      applyLayerOpacity(key, on ? 1 : 0);
      return;
    }
    if (on) setLayerLogicOn(key, true);
    layerFade[key].target = on ? 1 : 0;
  }

  // Step every layer's fade toward its target; hide a layer once fully faded out.
  function stepFades(dtMs: number): void {
    for (const key of FADE_KEYS) {
      const fd = layerFade[key];
      if (fd.current === fd.target) continue;
      const dir = Math.sign(fd.target - fd.current);
      fd.current += dir * (dtMs / FADE_MS);
      if ((dir > 0 && fd.current >= fd.target) || (dir < 0 && fd.current <= fd.target))
        fd.current = fd.target;
      applyLayerOpacity(key, fd.current);
      if (fd.current === 0) setLayerLogicOn(key, false);
    }
  }

  function setConstellationsVisible(on: boolean): void {
    fadeLayer('constellations', on);
  }

  function setStarsVisible(on: boolean): void {
    fadeLayer('stars', on);
  }

  function setDeepSkyVisible(on: boolean): void {
    fadeLayer('deepsky', on);
  }

  function setSunEventsVisible(on: boolean): void {
    fadeLayer('sun', on);
  }

  function setAllLabelsVisible(on: boolean): void {
    showAllLabels = on; // declutterLabels() re-evaluates eligibility next frame
  }

  function setPlanetsVisible(on: boolean): void {
    fadeLayer('planets', on);
  }

  function setStationsVisible(on: boolean): void {
    fadeLayer('stations', on);
  }

  function setBelowHorizonVisible(on: boolean): void {
    showBelowHorizon = on;
    // Re-pack / re-evaluate visibility across every layer immediately.
    recomputeDirections();
    recomputeConstellations();
    recomputeStars();
    recomputeDeepSky();
  }

  return {
    start,
    stop,
    location: () => observer,
    setConstellationsVisible,
    setStarsVisible,
    setDeepSkyVisible,
    setSunEventsVisible,
    setAllLabelsVisible,
    setPlanetsVisible,
    setStationsVisible,
    setBelowHorizonVisible,
  };
}
