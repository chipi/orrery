// Iconic spacecraft trajectory renderer (#306 / PRD-023 adjacent).
//
// Builds a Three.js Line2 polyline from a dated heliocentric-AU
// waypoint list for /explore's PATHS layer. Each labeled waypoint
// (Jupiter / Saturn / Uranus / Neptune / Heliopause / Today) gets
// a small marker sphere along the line. The "Today" marker is the
// click target — clicking it opens the spacecraft's MissionPanel.
//
// Trajectory data lives at static/data/trajectories/<id>.json and is
// decoupled from the /fly Lambert simulator's mission-file trajectories.
// This file targets the visual story (heliocentric scale, log-radial
// compression past Neptune) — not ephemeris-grade propagation.

import * as THREE from 'three';
import { Line2 } from 'three/examples/jsm/lines/Line2.js';
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';

export interface IconicTrajectoryWaypoint {
  date: string;
  label?: string;
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
  waypoints: IconicTrajectoryWaypoint[];
}

export interface IconicTrajectoryHandle {
  /** Root group holding the line + markers. Add to scene. */
  group: THREE.Group;
  /** The click-target marker (Today position). Use for raycaster hit-tests. */
  clickTarget: THREE.Mesh;
  /** Every clickable / hover-able object on this trajectory — Today
   *  marker plus every encounter sprite — each tagged with missionId
   *  so the page's raycaster can resolve mission identity in one pass. */
  hoverTargets: THREE.Object3D[];
  /** Mission ID this trajectory belongs to — used for hover-highlight pairing. */
  missionId: string;
  /** Update line material resolution on canvas resize. */
  onResize: (width: number, height: number) => void;
  /** Dispose all GL resources. */
  dispose: () => void;
  /** Show / hide the entire trajectory (e.g. PATHS layer toggle). */
  setVisible: (visible: boolean) => void;
  /** Brighten (true) or dim (false) the line + markers. Default: dim. */
  setHighlight: (highlighted: boolean) => void;
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
const LABEL_TEXTURE_W = 256;
const LABEL_TEXTURE_H = 104;
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
// Sprite scale in scene units. The /explore log-AU scale puts the
// inner planets at ~50-130 units and the outer giants at ~250-400, so
// 70 lands a label about the width of a Jupiter-orbit gap — readable
// without dominating the scene. Sprites always camera-face.
const LABEL_SPRITE_SCALE_X = 70;
const LABEL_SPRITE_SCALE_Y = 28;
const LABEL_PIXEL_OFFSET = 10;

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

/**
 * Build a canvas-backed sprite texture for a single waypoint label.
 * Two lines (label / date) with a thin outline so the text reads on
 * any background. The texture is regenerated per waypoint — cheap
 * (~10 labels × ~256×80 px = ~200 KB total) and keeps disposal
 * trivial (one texture per sprite, freed in `dispose()`).
 */
function buildLabelSprite(
  missionName: string,
  label: string,
  date: string,
  color: string,
): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = LABEL_TEXTURE_W;
  canvas.height = LABEL_TEXTURE_H;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Subtle pill background so labels stay legible over the colored
    // trajectory line + planet orbit rings.
    ctx.fillStyle = 'rgba(15, 18, 35, 0.78)';
    const padX = 8;
    const padY = 6;
    const rectW = canvas.width - padX * 2;
    const rectH = canvas.height - padY * 2;
    const r = 10;
    ctx.beginPath();
    ctx.moveTo(padX + r, padY);
    ctx.lineTo(padX + rectW - r, padY);
    ctx.quadraticCurveTo(padX + rectW, padY, padX + rectW, padY + r);
    ctx.lineTo(padX + rectW, padY + rectH - r);
    ctx.quadraticCurveTo(padX + rectW, padY + rectH, padX + rectW - r, padY + rectH);
    ctx.lineTo(padX + r, padY + rectH);
    ctx.quadraticCurveTo(padX, padY + rectH, padX, padY + rectH - r);
    ctx.lineTo(padX, padY + r);
    ctx.quadraticCurveTo(padX, padY, padX + r, padY);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    // Mission name (small caps, uppercased) — anchors which path the
    // waypoint belongs to. Slightly muted so the eye lands on the
    // encounter label below.
    ctx.fillStyle = 'rgba(221, 228, 255, 0.7)';
    ctx.font = 'bold 14px "Space Mono", monospace';
    ctx.fillText(missionName.toUpperCase(), padX + 12, padY + 14);
    // Encounter label (primary) — mission color, bold, anchors the
    // visual link to the trajectory line.
    ctx.fillStyle = color;
    ctx.font = 'bold 22px "Space Mono", monospace';
    ctx.fillText(label, padX + 12, padY + 42);
    // Date (secondary) — muted, smaller.
    ctx.fillStyle = 'rgba(221, 228, 255, 0.78)';
    ctx.font = '15px "Space Mono", monospace';
    ctx.fillText(date, padX + 12, padY + 72);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.anisotropy = 4;
  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: false,
    depthWrite: false,
  });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(LABEL_SPRITE_SCALE_X, LABEL_SPRITE_SCALE_Y, 1);
  sprite.renderOrder = 10;
  return sprite;
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
  const labelSprites: THREE.Sprite[] = [];
  const markerTextures: THREE.CanvasTexture[] = [];
  const markerMaterials: THREE.SpriteMaterial[] = [];
  const hoverTargets: THREE.Object3D[] = [];
  const labelGroup = new THREE.Group();
  labelGroup.visible = false;
  labelGroup.userData = { kind: 'iconic-trajectory-labels', id: data.id };
  group.add(labelGroup);

  const labeledWaypoints = data.waypoints
    .map((wp, i) => ({ wp, pos: projected[i] }))
    .filter((entry) => entry.wp.label && entry.wp.label !== 'Today');

  for (const { wp, pos } of labeledWaypoints) {
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
      kind: isLaunch ? 'iconic-trajectory-launch' : 'iconic-trajectory-marker',
      id: data.id,
      missionId: data.mission_id,
      label: wp.label,
      date: wp.date,
    };
    group.add(markerSprite);
    markerTextures.push(texture);
    markerMaterials.push(material);
    hoverTargets.push(markerSprite);

    if (wp.label) {
      const sprite = buildLabelSprite(data.name, wp.label, wp.date, data.color);
      // Offset the sprite slightly off the line so it doesn't sit on
      // top of the marker. Use the ecliptic-up direction (+Y) so the
      // label floats above the line at typical viewing angles.
      sprite.position.set(pos.x, pos.y + LABEL_PIXEL_OFFSET, pos.z);
      labelGroup.add(sprite);
      labelSprites.push(sprite);
    }
  }

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

  return {
    group,
    clickTarget,
    hoverTargets,
    missionId: data.mission_id,
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
      labelGroup.visible = highlighted;
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
      for (const sprite of labelSprites) {
        sprite.material.map?.dispose();
        sprite.material.dispose();
      }
    },
  };
}
