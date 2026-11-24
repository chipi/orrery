/**
 * Procedural shapes for the five small bodies of the /fly descent (Itokawa, Ryugu, Bennu, Eros,
 * 67P): a unit sphere pushed out along each direction to the body's surface (a radial function or
 * a smooth union of ellipsoids found by bisection), vertex-coloured, with the boulders in one
 * InstancedMesh. Units are km, as the scene's. Geometry is built about a point inside the body (the
 * "origin"); the landing point is the surface along `landDir` from it, so the scene can sink the
 * mesh by `landR` and put the touchdown exactly at y = 0.
 *
 * Dimensions (the commonly published figures; "estimate" = drawn, not sourced):
 *  - Itokawa 535 x 294 x 209 m (Fujiwara et al. 2006); the lobe split is an estimate.
 *  - Ryugu 1004 x 1004 x 876 m (Watanabe et al. 2019); ridge height is an estimate.
 *  - Bennu ~490 m mean diameter (Lauretta et al. 2019); axis ratios and ridge are estimates.
 *  - Eros 34.4 x 11.2 x 11.2 km (Zuber et al. 2000); the bend (saddle) is an estimate.
 *  - 67P big lobe 4.1 x 3.3 x 1.8 km, small lobe 2.6 x 2.3 x 1.8 km (Sierks et al. 2015); the neck
 *    blend is an estimate.
 * Albedos: Itokawa ~0.25-0.3, Ryugu ~0.05, Bennu ~0.045, Eros ~0.25, 67P ~0.06.
 */
import * as THREE from 'three';
import type { DescentBody } from '$lib/physics/descent/descent-physics';

export type SmallBodyId = Extract<
  DescentBody,
  'comet_67p' | 'itokawa' | 'ryugu' | 'bennu' | 'eros'
>;

type V3 = [number, number, number];

interface Spec {
  /** A point inside the body the rays start from (km, shape coordinates). */
  o: V3;
  /** Direction from `o` to the touchdown point. */
  land: V3;
  /** Shape radius along a unit direction from `o`. */
  radial: (d: THREE.Vector3) => number;
  rmax: number;
  /** Surface relief amplitude (km) and its spatial frequency (cycles per radian-ish). */
  rough: number;
  freq: number;
  craters: number;
  craterAng: [number, number];
  craterDepth: number;
  /** Linear albedo (the vertex colour, a grey) and a warm tint multiplier. */
  albedo: number;
  tint: V3;
  boulders: number;
  boulderM: [number, number];
  /** Km radius around the landing point that gets 60% of the boulders. */
  localKm: number;
  /** 0..1 smooth-ground weight at a surface point (km, shape coordinates): no relief, no boulders. */
  smooth?: (p: THREE.Vector3) => number;
  cliffs?: boolean;
}

const ell = (p: THREE.Vector3, c: V3, a: V3): number => {
  const x = (p.x - c[0]) / a[0];
  const y = (p.y - c[1]) / a[1];
  const z = (p.z - c[2]) / a[2];
  const k0 = Math.hypot(x, y, z);
  const k1 = Math.hypot(x / a[0], y / a[1], z / a[2]);
  return k1 < 1e-9 ? -Math.min(...a) : (k0 * (k0 - 1)) / k1;
};
const smin = (a: number, b: number, k: number): number => {
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.min(a, b) - h * h * k * 0.25;
};

/** Radial distance to the zero of an SDF, bisecting along a ray from a point inside. */
const marchRadial =
  (o: V3, sdf: (p: THREE.Vector3) => number, rmax: number) =>
  (d: THREE.Vector3): number => {
    const p = new THREE.Vector3();
    let lo = 0;
    let hi = rmax;
    for (let i = 0; i < 22; i++) {
      const mid = (lo + hi) / 2;
      p.set(o[0] + d.x * mid, o[1] + d.y * mid, o[2] + d.z * mid);
      if (sdf(p) < 0) lo = mid;
      else hi = mid;
    }
    return lo;
  };

/** Spinning top about Y: an ellipsoid with a narrow equatorial ridge. */
const top =
  (a: number, c: number, ridge: number) =>
  (d: THREE.Vector3): number => {
    const re = 1 / Math.sqrt((d.x * d.x + d.z * d.z) / (a * a) + (d.y * d.y) / (c * c));
    const lat = Math.asin(THREE.MathUtils.clamp(d.y, -1, 1));
    return re * (1 + ridge * Math.exp(-((lat / 0.24) ** 2)));
  };

const ITOKAWA_O: V3 = [0.085, 0, 0];
const itokawaSdf = (p: THREE.Vector3): number =>
  smin(
    ell(p, [-0.083, 0, 0], [0.185, 0.147, 0.105]),
    ell(p, [0.168, 0, 0], [0.1, 0.088, 0.085]),
    0.05,
  );

const P67_O: V3 = [0.78, 0, 0];
const p67Sdf = (p: THREE.Vector3): number =>
  smin(ell(p, [-1.1, 0, 0], [2.05, 1.65, 0.9]), ell(p, [1.9, 0.1, 0], [1.3, 1.15, 0.9]), 0.45);

const erosSdf = (p: THREE.Vector3): number => {
  const q = new THREE.Vector3(p.x, p.y - 0.0045 * p.x * p.x, p.z);
  return ell(q, [0, 0, 0], [17.2, 5.6, 5.6]);
};

const SPECS: Record<SmallBodyId, Spec> = {
  itokawa: {
    o: ITOKAWA_O,
    land: [0, 1, 0],
    radial: marchRadial(ITOKAWA_O, itokawaSdf, 0.4),
    rmax: 0.4,
    rough: 0.006,
    freq: 14,
    craters: 8,
    craterAng: [0.12, 0.3],
    craterDepth: 0.008,
    albedo: 0.3,
    tint: [1, 0.95, 0.86],
    boulders: 900,
    boulderM: [1, 7],
    localKm: 0.1,
    // Muses Sea: the smooth, boulder-free pond at the neck.
    smooth: (p) => Math.max(0, 1 - Math.abs(p.x - 0.085) / 0.05),
  },
  ryugu: {
    o: [0, 0, 0],
    land: [1, -0.12, 0],
    radial: top(0.502, 0.438, 0.07),
    rmax: 0.7,
    rough: 0.01,
    freq: 9,
    craters: 14,
    craterAng: [0.08, 0.25],
    craterDepth: 0.014,
    albedo: 0.06,
    tint: [1, 1, 1],
    boulders: 1100,
    boulderM: [1.5, 9],
    localKm: 0.15,
  },
  bennu: {
    o: [0, 0, 0],
    land: [0.559, 0.829, 0],
    radial: top(0.255, 0.238, 0.08),
    rmax: 0.4,
    rough: 0.008,
    freq: 10,
    craters: 8,
    craterAng: [0.1, 0.3],
    craterDepth: 0.008,
    albedo: 0.05,
    tint: [1, 1, 1.02],
    boulders: 1300,
    boulderM: [1.5, 12],
    localKm: 0.12,
  },
  eros: {
    o: [0, 0, 0],
    land: [0.15, 1, 0.1],
    radial: marchRadial([0, 0, 0], erosSdf, 22),
    rmax: 22,
    rough: 0.08,
    freq: 12,
    craters: 60,
    craterAng: [0.03, 0.2],
    craterDepth: 0.35,
    albedo: 0.28,
    tint: [1, 0.93, 0.78],
    boulders: 700,
    boulderM: [3, 20],
    localKm: 0.5,
  },
  comet_67p: {
    o: P67_O,
    land: [1.1, 1.1, 0],
    radial: marchRadial(P67_O, p67Sdf, 6),
    rmax: 6,
    rough: 0.05,
    freq: 7,
    craters: 18,
    craterAng: [0.05, 0.2],
    craterDepth: 0.02,
    albedo: 0.06,
    tint: [1, 0.98, 0.96],
    boulders: 900,
    boulderM: [2, 14],
    localKm: 0.3,
    cliffs: true,
  },
};

const rng = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const fbm = (x: number, y: number, z: number): number => {
  let a = 0;
  let amp = 0.5;
  let f = 1;
  for (let i = 0; i < 4; i++) {
    a +=
      amp *
      Math.sin(x * f * 1.31 + y * f * 2.17 + i) *
      Math.sin(y * f * 1.73 + z * f * 0.97 + 2 * i) *
      Math.cos(z * f * 2.11 + x * f * 1.07 + i * 3);
    amp *= 0.5;
    f *= 2.03;
  }
  return a;
};

export interface SmallBody {
  mesh: THREE.Mesh;
  boulders: THREE.InstancedMesh;
  /** Unit direction from the geometry origin to the touchdown point. */
  landDir: THREE.Vector3;
  /** Local surface normal at the touchdown point: the scene stands this up as +Y. */
  up: THREE.Vector3;
  /** Distance from the geometry origin to the touchdown point (km). */
  landR: number;
}

export function buildSmallBody(id: SmallBodyId): SmallBody {
  const s = SPECS[id];
  const rand = rng(id.length * 7919 + id.charCodeAt(0));
  const o = new THREE.Vector3(...s.o);
  const landDir = new THREE.Vector3(...s.land).normalize();

  const craters = Array.from({ length: s.craters }, () => {
    const u = rand() * 2 - 1;
    const a = rand() * Math.PI * 2;
    const r = Math.sqrt(1 - u * u);
    return {
      dir: new THREE.Vector3(Math.cos(a) * r, u, Math.sin(a) * r),
      ang: s.craterAng[0] + rand() * (s.craterAng[1] - s.craterAng[0]),
      depth: s.craterDepth * (0.4 + rand() * 0.6),
    };
  });

  // Surface radius along d: the shape, relief, craters; relief fades under a smooth patch.
  const tmp = new THREE.Vector3();
  const surfaceR = (d: THREE.Vector3): number => {
    const base = s.radial(d);
    let w = 1;
    if (s.smooth) {
      tmp.copy(d).multiplyScalar(base).add(o);
      w = 1 - s.smooth(tmp);
    }
    let r = base + w * s.rough * fbm(d.x * s.freq, d.y * s.freq, d.z * s.freq);
    for (const c of craters) {
      const ang = Math.acos(Math.min(1, d.dot(c.dir)));
      if (ang < c.ang) r -= w * c.depth * (1 - (ang / c.ang) ** 2);
    }
    return r;
  };

  const geo = new THREE.SphereGeometry(1, 176, 120);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const dirs: THREE.Vector3[] = [];
  const dir = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    dir.set(pos.getX(i), pos.getY(i), pos.getZ(i)).normalize();
    dirs.push(dir.clone());
    const r = surfaceR(dir);
    pos.setXYZ(i, dir.x * r, dir.y * r, dir.z * r);
  }
  // Vertices are about the ray origin so the mesh pivots there; the scene sinks it by landR.
  geo.computeVertexNormals();
  const nrm = geo.attributes.normal as THREE.BufferAttribute;
  // The sphere's seam and poles are duplicated vertices that each see half their faces: average
  // their normals, or the seam meridian shades as a long bright/dark line across the ground.
  const sum = new Map<string, THREE.Vector3>();
  const keyOf = (i: number) =>
    `${Math.round(dirs[i].x * 1e4)},${Math.round(dirs[i].y * 1e4)},${Math.round(dirs[i].z * 1e4)}`;
  for (let i = 0; i < pos.count; i++) {
    const k = keyOf(i);
    const v = sum.get(k) ?? new THREE.Vector3();
    v.add(new THREE.Vector3(nrm.getX(i), nrm.getY(i), nrm.getZ(i)));
    sum.set(k, v);
  }
  for (let i = 0; i < pos.count; i++) {
    const v = sum.get(keyOf(i))!.clone().normalize();
    nrm.setXYZ(i, v.x, v.y, v.z);
  }
  const col = new Float32Array(pos.count * 3);
  const n = new THREE.Vector3();
  const pt = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    n.set(nrm.getX(i), nrm.getY(i), nrm.getZ(i));
    pt.set(pos.getX(i), pos.getY(i), pos.getZ(i));
    const d = dirs[i];
    let k = 0.82 + 0.36 * (0.5 + fbm(d.x * 23 + 4, d.y * 23, d.z * 23));
    if (s.cliffs) k *= 1 + Math.max(0, 1 - n.dot(pt.clone().normalize()) - 0.18) * 3;
    if (s.smooth) {
      const sm = s.smooth(pt.clone().add(o));
      k = k * (1 - sm) + 1.25 * sm;
    }
    const v = s.albedo * k;
    col[i * 3] = v * s.tint[0];
    col[i * 3 + 1] = v * s.tint[1];
    col[i * 3 + 2] = v * s.tint[2];
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const mesh = new THREE.Mesh(
    geo,
    new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 0 }),
  );

  // Boulders: 60% near the landing point (where the camera is), the rest across the body.
  // The drawn mesh (a coarse grid) is what the craft rests on: take its height along the ray.
  mesh.updateMatrixWorld(true);
  const hit = new THREE.Raycaster(new THREE.Vector3(), landDir, 0, 50).intersectObject(mesh)[0];
  const landR = hit ? hit.distance : surfaceR(landDir);
  const landPt = landDir.clone().multiplyScalar(landR);
  // A rounded, lumpy rock: a subdivided icosphere (smooth normals) with its vertices nudged.
  const rock = new THREE.IcosahedronGeometry(1, 2);
  const rp = rock.attributes.position;
  for (let i = 0; i < rp.count; i++) {
    const k = 1 + 0.18 * fbm(rp.getX(i) * 2.1, rp.getY(i) * 2.1, rp.getZ(i) * 2.1);
    rp.setXYZ(i, rp.getX(i) * k, rp.getY(i) * k, rp.getZ(i) * k);
  }
  const inst = new THREE.InstancedMesh(
    rock,
    new THREE.MeshStandardMaterial({
      color: new THREE.Color().setScalar(Math.min(1, s.albedo * 0.9)),
      roughness: 1,
      metalness: 0,
    }),
    s.boulders,
  );
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const sc = new THREE.Vector3();
  const bp = new THREE.Vector3();
  const bd = new THREE.Vector3();
  let placed = 0;
  for (let tries = 0; placed < s.boulders && tries < s.boulders * 6; tries++) {
    const local = rand() < 0.45;
    if (local) {
      bd.set(rand() - 0.5, rand() - 0.5, rand() - 0.5)
        .multiplyScalar(2 * (s.localKm / Math.max(landR, 1e-3)))
        .add(landDir)
        .normalize();
    } else {
      const u = rand() * 2 - 1;
      const a = rand() * Math.PI * 2;
      const r = Math.sqrt(1 - u * u);
      bd.set(Math.cos(a) * r, u, Math.sin(a) * r);
    }
    const r = surfaceR(bd);
    bp.copy(bd).multiplyScalar(r);
    const dl = bp.distanceTo(landPt);
    if (dl < 0.02) continue; // keep the craft's footprint clear
    if (dl < 0.06 && rand() < 0.6) continue; // thin the camera's near field
    if (s.smooth && s.smooth(bp.clone().add(o)) > 0.2) continue;
    // Diameter in m: near the site mostly 0.5-5 m (a rare 10 m); the big ones lie further out.
    const diaM = local
      ? rand() < 0.03
        ? 5 + rand() * 5
        : 0.5 + 4.5 * rand() ** 3
      : s.boulderM[0] + (s.boulderM[1] * 2 - s.boulderM[0]) * rand() ** 2;
    const size = diaM / 2000;
    sc.set(size * (0.7 + rand() * 0.6), size * (0.5 + rand() * 0.4), size * (0.7 + rand() * 0.6));
    e.set(rand() * 6.28, rand() * 6.28, rand() * 6.28);
    q.setFromEuler(e);
    // Half-buried: centre a little under the surface.
    bp.addScaledVector(bd, -size * 0.25);
    m.compose(bp, q, sc);
    inst.setMatrixAt(placed++, m);
  }
  inst.count = placed;
  inst.instanceMatrix.needsUpdate = true;
  mesh.add(inst);
  // The ground under the craft faces its own normal, not the ray: average the nearby vertex normals.
  const up = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    if (dirs[i].dot(landDir) > Math.cos(0.02)) {
      up.add(new THREE.Vector3(nrm.getX(i), nrm.getY(i), nrm.getZ(i)));
    }
  }
  up.normalize();
  if (up.lengthSq() < 0.5 || up.dot(landDir) < 0.5) up.copy(landDir);
  return { mesh, boulders: inst, landDir, up, landR };
}
