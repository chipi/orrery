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
  /** Update line material resolution on canvas resize. */
  onResize: (width: number, height: number) => void;
  /** Dispose all GL resources. */
  dispose: () => void;
  /** Show / hide the entire trajectory (e.g. PATHS layer toggle). */
  setVisible: (visible: boolean) => void;
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
const MARKER_RADIUS_PX = 5;
const CLICK_TARGET_RADIUS_PX = 9;

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
    opacity: 0.9,
    dashed: false,
  });
  lineMaterial.resolution.set(width, height);
  const line = new Line2(lineGeo, lineMaterial);
  line.computeLineDistances();
  line.userData = { kind: 'iconic-trajectory', id: data.id };
  group.add(line);

  // ── Encounter markers ────────────────────────────────────────────
  const markerGeo = new THREE.SphereGeometry(MARKER_RADIUS_PX, 12, 12);
  const markerMaterial = new THREE.MeshBasicMaterial({
    color: new THREE.Color(data.color).getHex(),
    transparent: true,
    opacity: 0.95,
  });
  const labeledWaypoints = data.waypoints
    .map((wp, i) => ({ wp, pos: projected[i] }))
    .filter((entry) => entry.wp.label && entry.wp.label !== 'Today');

  for (const { wp, pos } of labeledWaypoints) {
    const marker = new THREE.Mesh(markerGeo, markerMaterial);
    marker.position.copy(pos);
    marker.userData = { kind: 'iconic-trajectory-marker', id: data.id, label: wp.label };
    group.add(marker);
  }

  // ── "Today" click target — larger, brighter, distinguishes from
  //    encounter markers so the user reads it as the current location. ─
  const todayWp = data.waypoints[data.waypoints.length - 1];
  const todayPos = projected[projected.length - 1];
  const clickTargetGeo = new THREE.SphereGeometry(CLICK_TARGET_RADIUS_PX, 16, 16);
  const clickTargetMaterial = new THREE.MeshBasicMaterial({
    color: new THREE.Color(data.color).getHex(),
    transparent: true,
    opacity: 1.0,
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
    opacity: 0.45,
    side: THREE.DoubleSide,
  });
  const ring = new THREE.Mesh(ringGeo, ringMaterial);
  ring.position.copy(todayPos);
  ring.userData = { kind: 'iconic-trajectory-today-ring', id: data.id };
  group.add(ring);

  return {
    group,
    clickTarget,
    onResize: (w: number, h: number) => {
      lineMaterial.resolution.set(w, h);
    },
    setVisible: (v: boolean) => {
      group.visible = v;
    },
    dispose: () => {
      lineGeo.dispose();
      lineMaterial.dispose();
      markerGeo.dispose();
      markerMaterial.dispose();
      clickTargetGeo.dispose();
      clickTargetMaterial.dispose();
      ringGeo.dispose();
      ringMaterial.dispose();
    },
  };
}
