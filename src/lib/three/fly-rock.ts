/**
 * One look for every small body the /fly flyby cinema shows (asteroids, comet nuclei, Kuiper Belt
 * objects): a lumpy, cratered rock about as big as a sphere of radius 1, stretched to the body's
 * published axis ratios where they are known. Deterministic per id, so a body looks the same on
 * every visit. The flyby review (2026-11-26, F15) found the destinations drawn as smooth spheres
 * and the passing bodies as a stretched icosahedron, two looks for one kind of thing.
 *
 * Axis ratios (long : mid : short) are the commonly published shape-model extents; they shape the
 * stand-in only. The lumps and craters are drawn, not sourced.
 */
import * as THREE from 'three';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const AXES: Record<string, [number, number, number]> = {
  eros: [34.4, 11.2, 11.2],
  itokawa: [535, 294, 209],
  ryugu: [1004, 1004, 876],
  bennu: [565, 535, 508],
  didymos: [851, 849, 620],
  dimorphos: [177, 174, 116],
  '67p': [4.1, 3.3, 1.8],
  halley: [15, 8, 8],
  arrokoth: [36, 20, 10],
  vesta: [572, 557, 446],
  psyche: [278, 238, 171],
  donaldjohanson: [8, 3.5, 3.5],
  leucus: [60, 36, 30],
  gaspra: [18.2, 10.5, 8.9],
  ida: [59.8, 25.4, 18.6],
  mathilde: [66, 48, 46],
  steins: [6.7, 5.8, 4.5],
  lutetia: [121, 101, 75],
  dinkinesh: [0.8, 0.75, 0.7],
};
const ROUND: [number, number, number] = [1, 0.88, 0.8];

function rng(seed: string): () => number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

function randomDir(r: () => number): THREE.Vector3 {
  const z = r() * 2 - 1;
  const a = r() * Math.PI * 2;
  const s = Math.sqrt(1 - z * z);
  return new THREE.Vector3(s * Math.cos(a), z, s * Math.sin(a));
}

/** The radial factor of the rock along a unit direction: lumps, then craters with a raised rim. */
function relief(
  d: THREE.Vector3,
  lumps: [THREE.Vector3, number][],
  craters: [THREE.Vector3, number][],
): number {
  let k = 1;
  for (const [c, a] of lumps) k += a * Math.exp(-(1 - d.dot(c)) / 0.18);
  for (const [c, rad] of craters) {
    const t = Math.acos(Math.min(1, d.dot(c))) / rad;
    if (t < 1) k -= rad * 0.6 * (1 - t * t);
    else if (t < 1.35) k += rad * 0.2 * Math.sin(((t - 1) / 0.35) * Math.PI);
  }
  return k;
}

/** Axis ratios for a body id, normalised so the rock's volume matches a unit sphere's. */
export function rockAxes(id: string): [number, number, number] {
  const [a, b, c] = AXES[id] ?? ROUND;
  const g = Math.cbrt(a * b * c);
  return [a / g, b / g, c / g];
}

/** A rock of about unit radius for `id`: smooth normals, vertex shading by height. */
export function rockGeometry(id: string): THREE.BufferGeometry {
  const r = rng(id);
  const lumps: [THREE.Vector3, number][] = Array.from({ length: 10 }, () => [
    randomDir(r),
    (r() - 0.4) * 0.16,
  ]);
  const craters: [THREE.Vector3, number][] = Array.from({ length: 34 }, () => [
    randomDir(r),
    0.08 + r() ** 2 * 0.3,
  ]);
  const geo = mergeVertices(
    new THREE.IcosahedronGeometry(1, 5).deleteAttribute('normal').deleteAttribute('uv'),
  );
  const [ax, ay, az] = rockAxes(id);
  const p = geo.attributes.position;
  const col = new Float32Array(p.count * 3);
  const d = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    d.fromBufferAttribute(p, i).normalize();
    const k = relief(d, lumps, craters);
    p.setXYZ(i, d.x * k * ax, d.y * k * ay, d.z * k * az);
    const v = THREE.MathUtils.clamp(0.8 + (k - 1) * 2.4, 0.45, 1.15);
    col.set([v, v, v], i * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.computeVertexNormals();
  return geo;
}

/** Small bodies drawn as rocks; planets, Ceres and Pluto stay spheres. */
const ROCKS = new Set([
  ...Object.keys(AXES),
  'eurybates',
  'polymele',
  'orus',
  'patroclus',
  'menoetius',
]);

export function isRockBody(id: string): boolean {
  return ROCKS.has(id);
}
