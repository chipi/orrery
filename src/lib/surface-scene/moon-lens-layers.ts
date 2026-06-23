/**
 * Moon-specific science-lens layers (PRD-024). Both attach to the lunar
 * `planetMesh` (so they track the surface like the tidal-lock overlay):
 *
 *   - 'sub-earth' → the sub-Earth point (local +X, the centre of the
 *     near side) + the libration envelope (the ±~7° wobble that reveals
 *     59% of the surface over a month)
 *   - 'far-side'  → a tint over the −X hemisphere, the face never seen
 *     from Earth until Luna 3 in 1959
 *
 * The near side is the +X hemisphere (matches SurfaceScene's tidal-lock
 * overlay). Each builder returns the Object3D + a dispose callback.
 */
import * as THREE from 'three';
import { onLayerChange, type LayerKey } from '$lib/science-layers';

export interface MoonLayerHandle {
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

/** Convert lunar (longitude about +Y from +X, latitude) to a surface
 *  point at the given radius. (0,0) → +X = the sub-Earth point. */
function lunarPoint(lonDeg: number, latDeg: number, r: number): THREE.Vector3 {
  const lon = lonDeg * DEG;
  const lat = latDeg * DEG;
  const cl = Math.cos(lat);
  return new THREE.Vector3(r * cl * Math.cos(lon), r * Math.sin(lat), r * cl * Math.sin(lon));
}

export interface SubEarthOpts {
  planetRadius: number;
  color: number;
  /** Libration amplitude in degrees (~7° in longitude + latitude). */
  librationDeg?: number;
}

export function buildSubEarthPoint(opts: SubEarthOpts): MoonLayerHandle {
  const R = opts.planetRadius;
  const lib = opts.librationDeg ?? 7;
  const rr = R * 1.02;
  const disposables: Array<{ dispose: () => void }> = [];
  const group = new THREE.Group();

  const mat = new THREE.LineBasicMaterial({
    color: opts.color,
    transparent: true,
    opacity: 0.95,
    depthWrite: false,
  });
  const faint = new THREE.LineBasicMaterial({
    color: opts.color,
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
  });
  disposables.push(mat, faint);

  // Sub-Earth marker: a ring + crosshair tangent to the surface at +X.
  const markR = R * 0.11;
  const ringPts: THREE.Vector3[] = [];
  for (let i = 0; i <= 40; i++) {
    const a = (i / 40) * Math.PI * 2;
    ringPts.push(new THREE.Vector3(rr, Math.cos(a) * markR, Math.sin(a) * markR));
  }
  const ringGeo = new THREE.BufferGeometry().setFromPoints(ringPts);
  disposables.push(ringGeo);
  group.add(new THREE.Line(ringGeo, mat));
  const crossGeo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(rr, -markR * 1.4, 0),
    new THREE.Vector3(rr, markR * 1.4, 0),
    new THREE.Vector3(rr, 0, -markR * 1.4),
    new THREE.Vector3(rr, 0, markR * 1.4),
  ]);
  disposables.push(crossGeo);
  group.add(new THREE.LineSegments(crossGeo, mat));

  // Libration envelope — an ellipse ±lib° in longitude and latitude.
  const libPts: THREE.Vector3[] = [];
  for (let i = 0; i <= 72; i++) {
    const t = (i / 72) * Math.PI * 2;
    libPts.push(lunarPoint(lib * Math.cos(t), lib * Math.sin(t), rr));
  }
  const libGeo = new THREE.BufferGeometry().setFromPoints(libPts);
  disposables.push(libGeo);
  group.add(new THREE.Line(libGeo, faint));

  return gate(group, 'sub-earth', disposables);
}

export interface FarSideOpts {
  planetRadius: number;
  color: number;
  opacity?: number;
}

export function buildFarSideOverlay(opts: FarSideOpts): MoonLayerHandle {
  // −X hemisphere: azimuth from +π/2 through π to 3π/2 (the half opposite
  // the +X near side).
  const geo = new THREE.SphereGeometry(opts.planetRadius * 1.004, 48, 32, Math.PI / 2, Math.PI);
  const mat = new THREE.MeshBasicMaterial({
    color: opts.color,
    transparent: true,
    opacity: opts.opacity ?? 0.16,
    side: THREE.FrontSide,
    depthWrite: false,
  });
  const mesh = new THREE.Mesh(geo, mat);
  return gate(mesh, 'far-side', [geo, mat]);
}
