// Iconic spacecraft trajectory renderer (#306 / PRD-023 adjacent).
//
// Builds a Three.js Line2 polyline from a dated heliocentric-AU
// waypoint list for /explore's PATHS layer. Each labeled waypoint
// (Jupiter / Saturn / Uranus / Neptune / Heliopause / Today) gets
// a small marker sphere along the line. The "Today" marker is the
// click target — clicking it opens the spacecraft's MissionPanel.
// While a mission is highlighted each labelled waypoint also shows a milestone box (`n/N ·
// date` over the milestone's name) and the Today marker shows the one mission box. The boxes are
// screen-sized canvas sprites placed by the shared pass in universe/scene-pins.ts (UXD-026).
//
// Trajectory data lives at static/data/trajectories/<id>.json and is
// decoupled from the /fly Lambert simulator's mission-file trajectories.
// This file targets the visual story (heliocentric scale, log-radial
// compression past Neptune) — not ephemeris-grade propagation.

import * as THREE from 'three';
import { Line2 } from 'three/examples/jsm/lines/Line2.js';
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import {
  cameraFov,
  labelRect,
  liftOnScreen,
  newLabelSlot,
  placeLabels,
  projectedPx,
  viewDepth,
  worldPerPx,
  type LabelSlot,
} from '$lib/universe/scene-pins';
import {
  BOX_BODY_LINE,
  BOX_BODY_PX,
  BOX_GAP_PX,
  BOX_HEADER_LINE,
  BOX_HEADER_PX,
  BOX_PAD_X,
  BOX_PAD_Y,
  BOX_ROW_GAP,
  MISSION_BOX_MAX_LINES,
  MISSION_BOX_MAX_W,
  boxHeader,
  layoutBox,
  type BoxLayout,
  type Measure,
} from './iconic-box';

export interface IconicTrajectoryWaypoint {
  date: string;
  /** English label: code matches on it ('Launch', 'Today'), so it never changes. */
  label?: string;
  /** Translated label for display (a locale overlay), when there is one. */
  display_label?: string;
  x: number;
  y: number;
  z: number;
}

export interface IconicTrajectoryData {
  id: string;
  name: string;
  mission_id: string;
  category: 'interstellar-bound' | 'departed' | 'planet-focal';
  color: string;
  current_position_au: [number, number, number];
  current_distance_au: number;
  current_distance_label: string;
  interstellar_since?: string;
  interstellar_since_label?: string;
  /** #410 — operating agency (all current interstellar craft are NASA). */
  agency?: string;
  /** #410 — culture-door object id for the message this craft carries
   *  (e.g. 'voyager' → Golden Record, 'pioneer' → Pioneer Plaque). Absent
   *  when the craft carries no formal message (e.g. New Horizons). */
  culture_object_id?: string;
  /** #410 — the star/constellation this craft is heading toward, for
   *  the mission panel's message section + direction indicator. `star` is null when there is no
   *  close stellar encounter (New Horizons → Sagittarius, no target star). */
  heading?: {
    star: string | null;
    constellation: string;
  };
  waypoints: IconicTrajectoryWaypoint[];
}

/** `userData.kind` of the milestone sprites a click opens a mission from (IM5). */
export const PICK_KINDS = {
  marker: 'iconic-trajectory-marker',
  launch: 'iconic-trajectory-launch',
  label: 'iconic-trajectory-label',
} as const;

export interface IconicTrajectoryHandle {
  /** Root group holding the line + markers. Add to scene. */
  group: THREE.Group;
  /** The click-target marker (Today position). Use for raycaster hit-tests. */
  clickTarget: THREE.Mesh;
  /** Every clickable / hover-able object on this trajectory — Today
   *  marker plus every encounter sprite — each tagged with missionId
   *  so the page's raycaster can resolve mission identity in one pass. */
  hoverTargets: THREE.Object3D[];
  /** The milestone markers and boxes a click opens the mission from (IM5). The pick contract,
   *  kept by every skin of these sprites: `userData.kind` is one of `PICK_KINDS` and
   *  `userData.missionId` is the mission to open. */
  pickTargets: THREE.Object3D[];
  /** Mission ID this trajectory belongs to — used for hover-highlight pairing. */
  missionId: string;
  /** Update line material resolution on canvas resize. */
  onResize: (width: number, height: number) => void;
  /** Dispose all GL resources. */
  dispose: () => void;
  /** Show / hide the entire trajectory (e.g. PATHS layer toggle). */
  setVisible: (visible: boolean) => void;
  /** The "→ <star>" pill of a craft heading for a named star, null for the others. Shown with the highlight. */
  directionLabel: THREE.Sprite | null;
  /** The star's catalogue name as the data has it (the pill's text before it is localised). */
  headingStar: string | null;
  /** Brighten (true) or dim (false) the line + markers. Default: dim. */
  setHighlight: (highlighted: boolean) => void;
  /** Per-frame size and placement of the milestone boxes and the mission box (UXD-026). Each
   *  box is `BOX_*` CSS px wherever the camera is (sized from the view depth), lifted a steady
   *  distance above its marker along screen-up, and run through the shared placement pass
   *  (scene-pins.ts `placeLabels`): a box that would overlap a higher-priority one is hidden
   *  and returns when there is room. Launch comes first, the rest by index; the hovered
   *  milestone's box is always shown. No-op unless the mission is highlighted. */
  relayoutLabels: (camera: THREE.PerspectiveCamera, canvasHeight: number) => void;
  /** The milestone whose marker (or box) the pointer is over, or null: its box is forced
   *  visible so a box the placement pass hid can be read from its marker. */
  setHoveredMilestone: (obj: THREE.Object3D | null) => void;
  /** Read-only probe for the e2e (`window.__iconicBoxes`): every box as drawn, canvas px. */
  snapshotBoxes: (camera: THREE.Camera, canvasW: number, canvasH: number) => IconicBoxSnapshot[];
}

export interface IconicBoxSnapshot {
  missionId: string;
  kind: 'milestone' | 'mission';
  /** Milestone number and the count of labelled milestones; 0 for the mission box. */
  n: number;
  total: number;
  header: string;
  /** The lines as drawn (a long name wraps to two; the full text stays in `userData.label`). */
  lines: string[];
  shown: boolean;
  /** Rectangle as drawn in canvas px (left, top, size). */
  x: number;
  y: number;
  w: number;
  h: number;
  /** Body text height in CSS px; 12 at every zoom. */
  textPx: number;
}

export interface BuildIconicTrajectoryOpts {
  data: IconicTrajectoryData;
  /** AU → scene-units mapping. /explore passes its `auToPx` log-radial scale. */
  auToPx: (au: number) => number;
  /** Canvas dimensions for LineMaterial.resolution. */
  width: number;
  height: number;
  /** Line stroke width in screen pixels (Line2 honours this regardless of GL). */
  lineWidth?: number;
  /** Default visibility (PATHS layer is off by default). */
  visible?: boolean;
}

const DEFAULT_LINE_WIDTH = 2.5;
const CLICK_TARGET_RADIUS_PX = 6;
const MARKER_TEXTURE_PX = 64;
// Marker sprite stays in scene units; small enough not to dominate the
// inner-system but readable at any zoom. Encounter markers get a slim
// chevron crown around the central dot to read as "trajectory event"
// rather than "small body".
const MARKER_SPRITE_SCALE = 18;
// Launch + current-position markers are the trajectory's endpoints —
// kept visually small and styled differently from the chevron encounter
// markers so the eye instantly reads "this is the start" / "this is
// where the spacecraft is now".
const ENDPOINT_TEXTURE_PX = 48;
const ENDPOINT_SPRITE_SCALE = 12;

// Dim / bright opacity pairs. The PATHS layer renders every iconic
// trajectory simultaneously, so the default is *very* dim — paths
// recede into the background and act as subtle context lines until
// the user singles one out by hovering its legend row or any waypoint
// marker. The bright state pops to full intensity for high contrast
// against its now-faded siblings.
const LINE_OPACITY_DIM = 0.1;
const LINE_OPACITY_BRIGHT = 0.95;
// Encounter + Launch markers vanish almost completely when dim — the
// PATHS layer reads as faint heliocentric lines until a mission is
// hovered, at which point its markers + labels surge in. Hover
// detection still hits the markers because their sprite bounding box
// is raycastable regardless of pixel opacity.
const MARKER_OPACITY_DIM = 0.1;
const MARKER_OPACITY_BRIGHT = 1.0;
// Today's click target stays a hair more visible than the encounter
// markers — it's the anchor "current position" pip per mission, also
// the click target for opening the inline MissionPanel.
const CLICK_TARGET_OPACITY_DIM = 0.32;
const CLICK_TARGET_OPACITY_BRIGHT = 1.0;
const RING_OPACITY_DIM = 0.08;
const RING_OPACITY_BRIGHT = 0.55;

/**
 * Project a heliocentric-ecliptic AU waypoint into scene units via the
 * route's radial-log scale. The scale function compresses outer
 * distances so Neptune (30 AU) and Voyager 2's current position
 * (138 AU) both fit in the same view. We apply the scale to the
 * radial magnitude and re-scale the unit direction vector so the
 * trajectory's angular shape is preserved.
 */
function projectWaypoint(
  p: IconicTrajectoryWaypoint,
  auToPx: (au: number) => number,
): THREE.Vector3 {
  // /explore's ecliptic plane maps to Three.js (x, z), with y = inclination.
  const r = Math.sqrt(p.x * p.x + p.y * p.y + p.z * p.z);
  if (r < 1e-6) return new THREE.Vector3(0, 0, 0);
  const scaled = auToPx(r);
  return new THREE.Vector3((p.x / r) * scaled, (p.y / r) * scaled, (p.z / r) * scaled);
}

/**
 * Build a 2D sprite for the LAUNCH endpoint — small filled dot inside
 * a hollow square outline. The square shape distinguishes "start of
 * trajectory" from the round encounter markers and the soon-to-arrive
 * current-position marker.
 */
function buildLaunchMarkerSprite(color: string): {
  sprite: THREE.Sprite;
  texture: THREE.CanvasTexture;
  material: THREE.SpriteMaterial;
} {
  const canvas = document.createElement('canvas');
  canvas.width = ENDPOINT_TEXTURE_PX;
  canvas.height = ENDPOINT_TEXTURE_PX;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const cx = ENDPOINT_TEXTURE_PX / 2;
    const cy = ENDPOINT_TEXTURE_PX / 2;
    // Hollow square outline — "departure box" / origin frame.
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    const half = 10;
    ctx.strokeRect(cx - half, cy - half, half * 2, half * 2);
    // Small filled center dot.
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(cx, cy, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    opacity: MARKER_OPACITY_DIM,
    depthTest: false,
    depthWrite: false,
  });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(ENDPOINT_SPRITE_SCALE, ENDPOINT_SPRITE_SCALE, 1);
  sprite.renderOrder = 9;
  return { sprite, texture, material };
}

/**
 * Build a 2D sprite for an encounter marker — a small filled dot at
 * the center with four outward-pointing chevrons arranged at the
 * diagonals. Reads as "trajectory event / deflection point" without
 * looking like a small planet (the previous sphere + halo combo did).
 * Pure 2D screen-facing.
 */
function buildEncounterMarkerSprite(color: string): {
  sprite: THREE.Sprite;
  texture: THREE.CanvasTexture;
  material: THREE.SpriteMaterial;
} {
  const canvas = document.createElement('canvas');
  canvas.width = MARKER_TEXTURE_PX;
  canvas.height = MARKER_TEXTURE_PX;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const cx = MARKER_TEXTURE_PX / 2;
    const cy = MARKER_TEXTURE_PX / 2;
    // Center dot — solid mission color.
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(cx, cy, 5.5, 0, Math.PI * 2);
    ctx.fill();
    // Four outward chevrons at NE / NW / SE / SW. The angled stroke
    // suggests momentum / deflection rather than a closed planet
    // ring. Thin line, round caps for a clean minimalist read.
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    const angles = [Math.PI / 4, (3 * Math.PI) / 4, (5 * Math.PI) / 4, (7 * Math.PI) / 4];
    const tipR = 22;
    const armLen = 5.5;
    const armSpread = 2.4; // radians between chevron arms
    for (const a of angles) {
      const tx = cx + tipR * Math.cos(a);
      const ty = cy + tipR * Math.sin(a);
      const a1 = a + Math.PI - armSpread / 2;
      const a2 = a + Math.PI + armSpread / 2;
      const x1 = tx + armLen * Math.cos(a1);
      const y1 = ty + armLen * Math.sin(a1);
      const x2 = tx + armLen * Math.cos(a2);
      const y2 = ty + armLen * Math.sin(a2);
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(tx, ty);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    opacity: MARKER_OPACITY_DIM,
    depthTest: false,
    depthWrite: false,
  });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(MARKER_SPRITE_SCALE, MARKER_SPRITE_SCALE, 1);
  sprite.renderOrder = 9;
  return { sprite, texture, material };
}

// ── Milestone and mission boxes (UXD-026) ────────────────────────────
// A box is a canvas sprite drawn once, at the device pixel ratio, in the size `layoutBox` gives
// it in CSS px; every frame `relayoutLabels` sizes the sprite so those CSS px stay CSS px at any
// zoom (a world-sized sprite was the blur and the too-small-far-away of the first skin).

/** Texture scale: 2 at least, so 12 px type is drawn from 24 px glyphs (the pins' rule). */
function boxDpr(): number {
  return Math.max(2, Math.min(3, typeof window === 'undefined' ? 2 : window.devicePixelRatio || 1));
}

const BOX_FONT_HEADER = `bold ${BOX_HEADER_PX}px "Space Mono", monospace`;
const BOX_FONT_BODY = `bold ${BOX_BODY_PX}px "Space Mono", monospace`;

/** `measureText` of a font; without a canvas (a unit test's jsdom) a monospace estimate. */
function boxMeasure(font: string, px: number): Measure {
  const ctx =
    typeof document === 'undefined' ? null : document.createElement('canvas').getContext('2d');
  if (!ctx) return (text) => text.length * px * 0.6;
  ctx.font = font;
  return (text) => ctx.measureText(text).width;
}

function drawBox(layout: BoxLayout, color: string, rtl: boolean): THREE.CanvasTexture {
  const dpr = boxDpr();
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(layout.w * dpr);
  canvas.height = Math.ceil(layout.h * dpr);
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.scale(dpr, dpr);
    ctx.fillStyle = 'rgba(15, 18, 35, 0.86)';
    ctx.beginPath();
    ctx.roundRect(0.75, 0.75, layout.w - 1.5, layout.h - 1.5, 6);
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.textBaseline = 'middle';
    const x = rtl ? layout.w - BOX_PAD_X : BOX_PAD_X;
    // The header is digits and an ISO date (or a Latin mission name): always left-to-right,
    // whatever the page direction; in a right-to-left box it sits at the right edge like the body.
    ctx.direction = 'ltr';
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(221, 228, 255, 0.78)';
    ctx.font = BOX_FONT_HEADER;
    const headerX = rtl ? x - ctx.measureText(layout.header).width : x;
    ctx.fillText(layout.header, headerX, BOX_PAD_Y + BOX_HEADER_LINE / 2);
    ctx.direction = rtl ? 'rtl' : 'ltr';
    ctx.textAlign = rtl ? 'right' : 'left';
    ctx.fillStyle = color;
    ctx.font = BOX_FONT_BODY;
    layout.lines.forEach((line, i) => {
      ctx.fillText(
        line,
        x,
        BOX_PAD_Y + BOX_HEADER_LINE + BOX_ROW_GAP + i * BOX_BODY_LINE + BOX_BODY_LINE / 2,
      );
    });
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.generateMipmaps = false;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  return texture;
}

/** A box sprite with no texture yet: it is drawn the first time its mission is highlighted. */
function buildBoxSprite(): THREE.Sprite {
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ transparent: true, depthTest: false, depthWrite: false }),
  );
  sprite.renderOrder = 10;
  return sprite;
}

interface Box {
  sprite: THREE.Sprite;
  /** The marker the box hangs from (the Today marker for the mission box). */
  base: THREE.Vector3;
  kind: 'milestone' | 'mission';
  n: number;
  total: number;
  header: string;
  body: string;
  maxW?: number;
  maxLines?: number;
  layout: BoxLayout | null;
  slot: LabelSlot;
  /** The milestone's marker: the pointer over it forces this box. */
  marker: THREE.Object3D | null;
}

// #410 — one-line "→ <star>" heading label for the direction indicator at a
// craft's Today endpoint. Smaller + lighter than the encounter labels. Hidden until its
// owner is hovered or selected (UXD-021): the heading craft's pill with its highlight,
// ʻOumuamua's with the body, so no unexplained pill sits on the scene at load.
const DIR_LABEL_TEXTURE_W = 224;
const DIR_LABEL_TEXTURE_H = 56;
const DIR_LABEL_SCALE_X = 60;
const DIR_LABEL_SCALE_Y = 15;
// Length (scene units) of the short arrow continuing past Today along the
// craft's final heading — enough to read as "onward", short enough not to
// collide with neighbouring trajectories in the outer scene.
const DIR_ARROW_LEN = 62;

function drawDirectionLabel(canvas: HTMLCanvasElement, text: string, color: string): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = 'rgba(15, 18, 35, 0.7)';
  const padX = 8;
  const padY = 6;
  ctx.beginPath();
  ctx.roundRect(padX, padY, canvas.width - padX * 2, canvas.height - padY * 2, 8);
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillStyle = color;
  ctx.font = 'bold 20px "Space Mono", monospace';
  ctx.fillText(text, padX + 12, canvas.height / 2 + 1);
}

/** A direction pill. Both callers hide it; its owner shows it (hover, selection). */
export function buildDirectionLabelSprite(text: string, color: string): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = DIR_LABEL_TEXTURE_W;
  canvas.height = DIR_LABEL_TEXTURE_H;
  drawDirectionLabel(canvas, text, color);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false,
      depthWrite: false,
    }),
  );
  sprite.scale.set(DIR_LABEL_SCALE_X, DIR_LABEL_SCALE_Y, 1);
  sprite.renderOrder = 10;
  sprite.userData = { directionLabel: { text, color } };
  return sprite;
}

/** Redraw a direction pill with new text (the star name once its localised form has loaded). */
export function setDirectionLabelText(sprite: THREE.Sprite, text: string): void {
  const state = sprite.userData.directionLabel as { text: string; color: string } | undefined;
  const map = sprite.material.map;
  if (!state || !(map instanceof THREE.CanvasTexture)) return;
  state.text = text;
  drawDirectionLabel(map.image as HTMLCanvasElement, text, state.color);
  map.needsUpdate = true;
}

export function buildIconicTrajectory(opts: BuildIconicTrajectoryOpts): IconicTrajectoryHandle {
  const { data, auToPx, width, height, lineWidth = DEFAULT_LINE_WIDTH, visible = false } = opts;

  const group = new THREE.Group();
  group.name = `iconic-trajectory:${data.id}`;
  group.visible = visible;

  // ── Line geometry ────────────────────────────────────────────────
  const positions: number[] = [];
  const projected: THREE.Vector3[] = [];
  for (const wp of data.waypoints) {
    const v = projectWaypoint(wp, auToPx);
    projected.push(v);
    positions.push(v.x, v.y, v.z);
  }
  const lineGeo = new LineGeometry();
  lineGeo.setPositions(positions);

  const lineMaterial = new LineMaterial({
    color: new THREE.Color(data.color).getHex(),
    linewidth: lineWidth,
    transparent: true,
    opacity: LINE_OPACITY_DIM,
    dashed: false,
  });
  lineMaterial.resolution.set(width, height);
  const line = new Line2(lineGeo, lineMaterial);
  line.computeLineDistances();
  line.userData = { kind: 'iconic-trajectory', id: data.id };
  group.add(line);

  // ── Encounter markers ────────────────────────────────────────────
  // Each labeled waypoint gets a 2D sprite — center dot + four
  // outward chevrons — and a hidden label sprite that fades in on
  // highlight. Sprites always face the camera, so the marker reads
  // the same from every angle the user orbits around.
  const boxes: Box[] = [];
  const markerTextures: THREE.CanvasTexture[] = [];
  const markerMaterials: THREE.SpriteMaterial[] = [];
  const hoverTargets: THREE.Object3D[] = [];
  const pickTargets: THREE.Object3D[] = [];
  const labelGroup = new THREE.Group();
  labelGroup.visible = false;
  labelGroup.userData = { kind: 'iconic-trajectory-labels', id: data.id };
  group.add(labelGroup);

  const labeledWaypoints = data.waypoints
    .map((wp, i) => ({ wp, pos: projected[i] }))
    .filter((entry) => entry.wp.label && entry.wp.label !== 'Today');

  labeledWaypoints.forEach(({ wp, pos }, index) => {
    // Launch waypoint gets the square endpoint marker; everything else
    // (gravity assists, encounters, intermediate fixes) gets the chevron
    // encounter marker. We detect Launch by label content rather than
    // index because some trajectories have an unlabeled launch-day
    // waypoint before the labeled "Launch (vehicle)" entry.
    const isLaunch = !!wp.label?.toLowerCase().includes('launch');
    const builder = isLaunch ? buildLaunchMarkerSprite : buildEncounterMarkerSprite;
    const { sprite: markerSprite, texture, material } = builder(data.color);
    markerSprite.position.copy(pos);
    markerSprite.userData = {
      kind: isLaunch ? PICK_KINDS.launch : PICK_KINDS.marker,
      id: data.id,
      missionId: data.mission_id,
      label: wp.display_label ?? wp.label,
      date: wp.date,
    };
    group.add(markerSprite);
    markerTextures.push(texture);
    markerMaterials.push(material);
    hoverTargets.push(markerSprite);
    pickTargets.push(markerSprite);

    // The box: `n/N · date` over the milestone's name, no mission name (the arc's colour and
    // the mission box carry it). Pick contract unchanged: the sprite is a pick target.
    const label = wp.display_label ?? wp.label ?? '';
    const sprite = buildBoxSprite();
    sprite.userData = {
      kind: PICK_KINDS.label,
      id: data.id,
      missionId: data.mission_id,
      label,
      date: wp.date,
    };
    pickTargets.push(sprite);
    labelGroup.add(sprite);
    boxes.push({
      sprite,
      base: pos,
      kind: 'milestone',
      n: index + 1,
      total: labeledWaypoints.length,
      header: boxHeader(index + 1, labeledWaypoints.length, wp.date),
      body: label,
      layout: null,
      // Launch first, then by index: the placement pass hides the later of two that collide.
      slot: newLabelSlot(sprite, 1, isLaunch ? 0 : index + 1),
      marker: markerSprite,
    });
  });

  // ── "Today" click target — small filled sphere + thin halo ring.
  //    Round + glowing visually distinguishes "current position" from
  //    the square Launch marker + the chevron encounter markers. The
  //    halo ring also reads as a click affordance on hover. ─
  const todayWp = data.waypoints[data.waypoints.length - 1];
  const todayPos = projected[projected.length - 1];
  const clickTargetGeo = new THREE.SphereGeometry(CLICK_TARGET_RADIUS_PX, 16, 16);
  const clickTargetMaterial = new THREE.MeshBasicMaterial({
    color: new THREE.Color(data.color).getHex(),
    transparent: true,
    opacity: CLICK_TARGET_OPACITY_DIM,
  });
  const clickTarget = new THREE.Mesh(clickTargetGeo, clickTargetMaterial);
  clickTarget.position.copy(todayPos);
  clickTarget.userData = {
    kind: 'iconic-trajectory-today',
    id: data.id,
    missionId: data.mission_id,
    date: todayWp.date,
    label: data.current_distance_label,
  };
  group.add(clickTarget);

  // Subtle ring around the Today marker for "this is interactive" affordance.
  const ringGeo = new THREE.RingGeometry(
    CLICK_TARGET_RADIUS_PX + 2,
    CLICK_TARGET_RADIUS_PX + 4,
    32,
  );
  const ringMaterial = new THREE.MeshBasicMaterial({
    color: new THREE.Color(data.color).getHex(),
    transparent: true,
    opacity: RING_OPACITY_DIM,
    side: THREE.DoubleSide,
  });
  const ring = new THREE.Mesh(ringGeo, ringMaterial);
  ring.position.copy(todayPos);
  ring.userData = { kind: 'iconic-trajectory-today-ring', id: data.id };
  group.add(ring);
  hoverTargets.push(clickTarget);

  // ── #410 heading indicator ───────────────────────────────────────
  //    For an interstellar-bound craft, a short arrow continues past
  //    Today along its final heading, capped by a "→ <star>" label.
  //    This is the honest substitute for a to-scale line into the
  //    stellar neighbourhood: at parsec scale these craft (~0.001 pc
  //    out) would be a dot on the Sun, so we point rather than draw.
  let dirLineGeo: THREE.BufferGeometry | null = null;
  let dirLineMat: THREE.LineBasicMaterial | null = null;
  let dirLabel: THREE.Sprite | null = null;
  if (data.heading?.star && projected.length >= 2) {
    const prev = projected[projected.length - 2];
    const dir = new THREE.Vector3().subVectors(todayPos, prev).normalize();
    const tip = new THREE.Vector3().copy(todayPos).addScaledVector(dir, DIR_ARROW_LEN);
    dirLineGeo = new THREE.BufferGeometry().setFromPoints([todayPos.clone(), tip]);
    dirLineMat = new THREE.LineBasicMaterial({
      color: new THREE.Color(data.color).getHex(),
      transparent: true,
      opacity: 0.55,
    });
    const dirLine = new THREE.Line(dirLineGeo, dirLineMat);
    dirLine.userData = { kind: 'iconic-trajectory-heading', id: data.id };
    group.add(dirLine);
    dirLabel = buildDirectionLabelSprite(`→ ${data.heading.star}`, data.color);
    dirLabel.visible = false;
    dirLabel.position.copy(tip);
    group.add(dirLabel);
  }

  // ── The one mission box (IM3): the name once, with where the craft is now. Drawn with the
  //    highlight, at the Today marker; first in the placement pass, so it is never the one hidden.
  //    Not a pick target: Today's own sphere opens the mission.
  if (data.current_distance_label) {
    const sprite = buildBoxSprite();
    labelGroup.add(sprite);
    boxes.push({
      sprite,
      base: todayPos,
      kind: 'mission',
      n: 0,
      total: 0,
      header: data.name,
      body: data.current_distance_label,
      maxW: MISSION_BOX_MAX_W,
      maxLines: MISSION_BOX_MAX_LINES,
      layout: null,
      slot: newLabelSlot(sprite, 1, -1),
      marker: null,
    });
  }
  const slots = boxes.map((b) => b.slot);
  const boxTextures: THREE.CanvasTexture[] = [];

  /** Lays out and draws every box, once, when the mission is first highlighted: the 18 builds at
   *  load stay cheap (perf-explore-iconic-clicks) and the font is loaded by then. */
  const ensureBoxes = (): void => {
    if (boxes.length === 0 || boxes[0].layout) return;
    const measureHeader = boxMeasure(BOX_FONT_HEADER, BOX_HEADER_PX);
    const measureBody = boxMeasure(BOX_FONT_BODY, BOX_BODY_PX);
    const rtl = typeof document !== 'undefined' && document.documentElement.dir === 'rtl';
    for (const b of boxes) {
      b.layout = layoutBox({
        header: b.kind === 'mission' ? b.header.toUpperCase() : b.header,
        body: b.body,
        measureHeader,
        measureBody,
        maxW: b.maxW,
        maxLines: b.maxLines,
      });
      const texture = drawBox(b.layout, data.color, rtl);
      boxTextures.push(texture);
      b.sprite.material.map = texture;
      b.sprite.material.needsUpdate = true;
    }
  };

  let forced: Box | null = null;
  const tmp = new THREE.Vector3();

  return {
    group,
    clickTarget,
    hoverTargets,
    pickTargets,
    missionId: data.mission_id,
    directionLabel: dirLabel,
    headingStar: data.heading?.star ?? null,
    onResize: (w: number, h: number) => {
      lineMaterial.resolution.set(w, h);
    },
    setVisible: (v: boolean) => {
      group.visible = v;
    },
    setHighlight: (highlighted: boolean) => {
      lineMaterial.opacity = highlighted ? LINE_OPACITY_BRIGHT : LINE_OPACITY_DIM;
      for (const m of markerMaterials)
        m.opacity = highlighted ? MARKER_OPACITY_BRIGHT : MARKER_OPACITY_DIM;
      clickTargetMaterial.opacity = highlighted
        ? CLICK_TARGET_OPACITY_BRIGHT
        : CLICK_TARGET_OPACITY_DIM;
      ringMaterial.opacity = highlighted ? RING_OPACITY_BRIGHT : RING_OPACITY_DIM;
      if (highlighted) ensureBoxes();
      else forced = null;
      labelGroup.visible = highlighted;
      if (dirLabel) dirLabel.visible = highlighted;
    },
    setHoveredMilestone: (obj: THREE.Object3D | null) => {
      forced = obj ? (boxes.find((b) => b.marker === obj || b.sprite === obj) ?? null) : null;
    },
    relayoutLabels: (camera: THREE.PerspectiveCamera, canvasHeight: number) => {
      if (!labelGroup.visible) return;
      camera.updateMatrixWorld();
      const fov = cameraFov(camera);
      for (const b of boxes) {
        const layout = b.layout;
        if (!layout) continue;
        const depth = viewDepth(camera, b.base);
        const slot = b.slot;
        slot.force = b === forced;
        if (depth <= 0.01) {
          slot.visible = false;
          continue;
        }
        const wpp = worldPerPx(depth, fov, canvasHeight);
        liftOnScreen(b.sprite.position, b.base, camera, (layout.h / 2 + BOX_GAP_PX) * wpp);
        b.sprite.scale.set(layout.w * wpp, layout.h * wpp, 1);
        slot.visible = labelRect(b.sprite, camera, slot.rect, tmp);
      }
      placeLabels(slots);
    },
    snapshotBoxes: (camera: THREE.Camera, canvasW: number, canvasH: number) => {
      camera.updateMatrixWorld();
      const out: IconicBoxSnapshot[] = [];
      for (const b of boxes) {
        if (!b.layout) continue;
        const s = b.sprite;
        s.getWorldPosition(tmp);
        const pw = projectedPx(camera, tmp, s.scale.x, 0, canvasW);
        const ph = projectedPx(camera, tmp, s.scale.y, 1, canvasH);
        tmp.project(camera);
        const cx = ((tmp.x + 1) / 2) * canvasW;
        const cy = ((1 - tmp.y) / 2) * canvasH;
        out.push({
          missionId: data.mission_id,
          kind: b.kind,
          n: b.n,
          total: b.total,
          header: b.layout.header,
          lines: b.layout.lines,
          shown: labelGroup.visible && group.visible && s.visible,
          x: cx - s.center.x * pw,
          y: cy - (1 - s.center.y) * ph,
          w: pw,
          h: ph,
          textPx: (BOX_BODY_PX * ph) / b.layout.h,
        });
      }
      return out;
    },
    dispose: () => {
      lineGeo.dispose();
      lineMaterial.dispose();
      for (const t of markerTextures) t.dispose();
      for (const m of markerMaterials) m.dispose();
      clickTargetGeo.dispose();
      clickTargetMaterial.dispose();
      ringGeo.dispose();
      ringMaterial.dispose();
      for (const t of boxTextures) t.dispose();
      for (const b of boxes) b.sprite.material.dispose();
      dirLineGeo?.dispose();
      dirLineMat?.dispose();
      dirLabel?.material.map?.dispose();
      dirLabel?.material.dispose();
    },
  };
}
