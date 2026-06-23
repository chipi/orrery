/**
 * Mars-specific science-lens layers (PRD-024):
 *
 *   - 'dead-dynamo' → patchy crustal-magnetism loops in the southern
 *     highlands — the fossil of a global field that died ~4 Gyr ago,
 *     leaving the air to be stripped by the solar wind
 *   - 'polar-caps'  → seasonal CO₂/H₂O ice caps at both poles
 *   - 'mars-moons'  → Phobos + Deimos orbit rings + markers
 *
 * Crustal loops + caps attach to planetMesh (track the surface); the
 * moon rings attach to the scene (inertial). Each builder returns the
 * Object3D + a dispose callback.
 */
import * as THREE from 'three';
import { onLayerChange, type LayerKey } from '$lib/science-layers';

export interface MarsLayerHandle {
  object: THREE.Object3D;
  dispose: () => void;
}

const DEG = Math.PI / 180;

function gate(object: THREE.Object3D, key: LayerKey, disposables: Array<{ dispose: () => void }>) {
  object.userData.layerKey = key;
  object.visible = false;
  const stop = onLayerChange(key, (on) => {
    object.visible = on;
  });
  return {
    object,
    dispose: () => {
      stop?.();
      for (const d of disposables) d.dispose();
    },
  };
}

function sphPoint(lonDeg: number, latDeg: number, r: number): THREE.Vector3 {
  const lon = lonDeg * DEG;
  const lat = latDeg * DEG;
  const cl = Math.cos(lat);
  return new THREE.Vector3(r * cl * Math.cos(lon), r * Math.sin(lat), r * cl * Math.sin(lon));
}

export interface CrustalFieldOpts {
  planetRadius: number;
  color: number;
}

/** A scatter of small magnetic-loop arcs over the southern highlands —
 *  patchy remnants, deliberately NOT a global cage. */
export function buildCrustalField(opts: CrustalFieldOpts): MarsLayerHandle {
  const R = opts.planetRadius;
  const disposables: Array<{ dispose: () => void }> = [];
  const group = new THREE.Group();
  const mat = new THREE.LineBasicMaterial({
    color: opts.color,
    transparent: true,
    opacity: 0.8,
    depthWrite: false,
  });
  disposables.push(mat);

  // Deterministic scatter of patches in the southern hemisphere
  // (lat −20°…−75°). Each patch is a small upward loop (a "mini arch").
  const patches = [
    [30, -35],
    [70, -50],
    [110, -28],
    [150, -60],
    [-160, -40],
    [-120, -55],
    [-80, -32],
    [-40, -48],
    [10, -68],
    [190, -45],
  ];
  for (const [lon, lat] of patches) {
    const base = sphPoint(lon, lat, R);
    const up = base.clone().normalize();
    // Tangent basis at the patch.
    const t1 = new THREE.Vector3(0, 1, 0).cross(up).normalize();
    const span = R * 0.16;
    const h = R * 0.18;
    const pts: THREE.Vector3[] = [];
    const N = 20;
    for (let i = 0; i <= N; i++) {
      const u = -1 + 2 * (i / N);
      const arch = Math.sqrt(Math.max(0, 1 - u * u)); // semicircle profile
      pts.push(
        base
          .clone()
          .addScaledVector(t1, u * span)
          .addScaledVector(up, arch * h),
      );
    }
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    disposables.push(geo);
    group.add(new THREE.Line(geo, mat));
  }

  return gate(group, 'dead-dynamo', disposables);
}

export interface PolarCapsOpts {
  planetRadius: number;
  color: number;
  /** Cap half-angle from each pole, degrees. */
  capDeg?: number;
}

export function buildPolarCaps(opts: PolarCapsOpts): MarsLayerHandle {
  const R = opts.planetRadius;
  const cap = (opts.capDeg ?? 26) * DEG;
  const mat = new THREE.MeshBasicMaterial({
    color: opts.color,
    transparent: true,
    opacity: 0.6,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const group = new THREE.Group();
  // North cap: phi 0…cap. South cap: phi (π−cap)…π.
  const north = new THREE.SphereGeometry(R * 1.004, 48, 20, 0, Math.PI * 2, 0, cap);
  const south = new THREE.SphereGeometry(R * 1.004, 48, 20, 0, Math.PI * 2, Math.PI - cap, cap);
  group.add(new THREE.Mesh(north, mat));
  group.add(new THREE.Mesh(south, mat));
  return gate(group, 'polar-caps', [north, south, mat]);
}

export interface MarsMoonsOpts {
  planetRadius: number;
  color: number;
}

/** Phobos + Deimos as small markers on their orbit rings. Distances are
 *  compressed from the real 2.77 / 6.9 body-radii so both fit the frame. */
export function buildMarsMoons(opts: MarsMoonsOpts): MarsLayerHandle {
  const R = opts.planetRadius;
  const disposables: Array<{ dispose: () => void }> = [];
  const group = new THREE.Group();
  const ringMat = new THREE.LineBasicMaterial({
    color: opts.color,
    transparent: true,
    opacity: 0.45,
    depthWrite: false,
  });
  const moonMat = new THREE.MeshBasicMaterial({ color: 0xb8a890 });
  disposables.push(ringMat, moonMat);

  const moons = [
    { dist: 2.0 * R, size: R * 0.05, ang: 0.6 }, // Phobos (closer)
    { dist: 3.1 * R, size: R * 0.035, ang: 3.4 }, // Deimos (farther)
  ];
  for (const mn of moons) {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 96; i++) {
      const a = (i / 96) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(a) * mn.dist, 0, Math.sin(a) * mn.dist));
    }
    const rg = new THREE.BufferGeometry().setFromPoints(pts);
    disposables.push(rg);
    group.add(new THREE.Line(rg, ringMat));
    const sg = new THREE.SphereGeometry(mn.size, 12, 12);
    disposables.push(sg);
    const m = new THREE.Mesh(sg, moonMat);
    m.position.set(Math.cos(mn.ang) * mn.dist, 0, Math.sin(mn.ang) * mn.dist);
    group.add(m);
  }

  return gate(group, 'mars-moons', disposables);
}
