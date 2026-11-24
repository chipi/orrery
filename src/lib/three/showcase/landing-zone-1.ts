/**
 * SpaceX Landing Zone 1 (LZ-1), real metres, pad centre at the origin, concrete top at y = 0.
 *
 * Sourced (Wikipedia "Landing Zone 1"; Spaceflight Now): a circular concrete pad 282 ft (86 m)
 * across marked with a stylised X, at the former Launch Complex 13, Cape Canaveral SFS, with
 * roadways and a concrete apron; about 15 km south of pad 39A on the Atlantic coast.
 *
 * ESTIMATED (not sourced): the apron and road dimensions, the X weight, every colour, the
 * scrub ground and the coastline distance in the scene that uses it.
 */
import * as THREE from 'three';
import { xMark } from './drone-ship';

export const LZ1_DIAMETER_M = 86;
/** ESTIMATE: pad slab thickness. */
const SLAB_M = 0.4;

function mat(color: number, rough = 0.9): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0 });
}

export function buildLandingZone1(): THREE.Group {
  const g = new THREE.Group();
  g.name = 'landing-zone-1';
  const r = LZ1_DIAMETER_M / 2;

  // ESTIMATE: a darker square concrete apron around the pad and a road running off to the west.
  const apron = new THREE.Mesh(new THREE.BoxGeometry(140, SLAB_M, 140), mat(0x6f6d68));
  apron.position.y = -SLAB_M / 2 - 0.2; // 0.2 m under the pad top: no z-fight at range
  apron.name = 'apron';
  const road = new THREE.Mesh(new THREE.BoxGeometry(600, SLAB_M, 10), mat(0x55534f));
  road.position.set(-370, -SLAB_M / 2 - 0.3, 0);
  road.name = 'road';

  const pad = new THREE.Mesh(new THREE.CylinderGeometry(r, r, SLAB_M, 96), mat(0xb4b0a6));
  pad.position.y = -SLAB_M / 2;
  pad.name = 'pad';

  const markM = mat(0xe8e8e8, 0.7);
  const ring = new THREE.Mesh(new THREE.RingGeometry(r * 0.62 - 0.7, r * 0.62, 64), markM);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.03;
  ring.name = 'landing-mark';
  const x = xMark(r * 0.5, markM);
  x.position.y = 0.05;
  x.name = 'landing-x';

  g.add(apron, road, pad, ring, x);
  return g;
}

/** ESTIMATE: scrub and sand ground around the pad, `sizeM` square, just under the apron. */
export function buildLandGround(sizeM: number): THREE.Mesh {
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(sizeM, sizeM), mat(0x6b6a48, 0.98));
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -2; // ground extends to the coast; the sea lies lower beyond it
  ground.name = 'ground';
  return ground;
}
