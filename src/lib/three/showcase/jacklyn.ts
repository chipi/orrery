/**
 * Blue Origin's landing platform vessel Jacklyn (LPV1), real metres, deck top at y = 0,
 * long axis along x, bow at +x, deckhouse row at the stern (-x).
 *
 * Sourced (docs/wip/2026-11-24-booster-landings-sourced.md; Wikipedia "Jacklyn (LPV1)"; Universe Today):
 * 115.9 m long, 45.72 m beam, 6.7 m depth; an UNPOWERED flat barge (towed: no thrusters, no bridge);
 * autonomous systems; a recovery ROV that connects to the booster's aft.
 *
 * ESTIMATED (not sourced): freeboard ~3 m (the sea plane from drone-ship.ts sits at -3 m); dark grey/black deck and hull; the landing target
 * (a plain circle, Blue Origin's own marking is not sourced); the low deckhouse/equipment row;
 * bollards, edge railings and tow bitts; the ROV's shape and parking spot; all colours.
 */
import * as THREE from 'three';
import { buildSeaPlane } from './drone-ship';

export const JACKLYN_LENGTH_M = 115.9;
export const JACKLYN_BEAM_M = 45.72;
const DEPTH_M = 6.7;

function mat(color: number, rough = 0.8, metal = 0.2): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal });
}

function box(
  w: number,
  h: number,
  d: number,
  m: THREE.Material,
  x: number,
  y: number,
  z: number,
  name?: string,
): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
  mesh.position.set(x, y, z);
  if (name) mesh.name = name;
  return mesh;
}

export function buildJacklyn(): THREE.Group {
  const ship = new THREE.Group();
  ship.name = 'jacklyn';

  const hullM = mat(0x14181f, 0.85, 0.3);
  const deckM = mat(0x25282d, 0.9, 0.1);
  const houseM = mat(0x6a6f76, 0.75, 0.3);
  const markM = mat(0xe8e8e8, 0.7, 0);
  const railM = mat(0xd9a521, 0.6, 0.2);
  const bollardM = mat(0x111317, 0.6, 0.5);

  // Flat barge: hull from the keel up to the deck, then a thin deck slab whose top is y = 0.
  ship.add(
    box(
      JACKLYN_LENGTH_M,
      DEPTH_M - 0.2,
      JACKLYN_BEAM_M,
      hullM,
      0,
      -(DEPTH_M - 0.2) / 2 - 0.2,
      0,
      'hull',
    ),
  );
  ship.add(box(JACKLYN_LENGTH_M, 0.2, JACKLYN_BEAM_M, deckM, 0, -0.1, 0, 'deck'));

  // Landing target: a plain circle, centred a little forward of midship.
  const padR = 18;
  const ring = new THREE.Mesh(new THREE.RingGeometry(padR - 0.8, padR, 72), markM);
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(8, 0.03, 0);
  ring.name = 'landing-mark';
  ship.add(ring);

  // Stern deckhouse / equipment row, kept low so the booster's plume clears it.
  const sternX = -JACKLYN_LENGTH_M / 2;
  ship.add(box(7, 3.2, 30, houseM, sternX + 6, 1.6, 0, 'deckhouse'));
  for (let i = 0; i < 3; i++) {
    ship.add(
      box(5, 2.2, 6, mat(0x8a8f96, 0.7, 0.3), sternX + 13, 1.1, -10 + i * 10, `equipment-${i}`),
    );
  }

  // Recovery ROV: low tracked vehicle parked at the deck edge.
  const rov = new THREE.Group();
  rov.name = 'rov';
  rov.add(box(4.5, 0.7, 2.8, mat(0xd9a521, 0.6, 0.3), 0, 0.65, 0));
  for (const s of [-1, 1]) rov.add(box(5.2, 0.5, 0.8, mat(0x15171b, 0.9, 0), 0, 0.25, s * 1.6));
  rov.position.set(26, 0, -JACKLYN_BEAM_M / 2 + 4);
  ship.add(rov);

  // Edge railings, bollards and bow tow bitts.
  const railY = 0.55;
  for (const s of [-1, 1]) {
    const z = s * (JACKLYN_BEAM_M / 2 - 0.3);
    ship.add(box(JACKLYN_LENGTH_M, 0.08, 0.08, railM, 0, railY * 2, z));
    ship.add(box(JACKLYN_LENGTH_M, 0.08, 0.08, railM, 0, railY, z));
    for (let px = -JACKLYN_LENGTH_M / 2 + 1; px <= JACKLYN_LENGTH_M / 2; px += 6) {
      ship.add(box(0.08, railY * 2, 0.08, railM, px, railY, z));
    }
  }
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const b = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.45, 0.8, 12), bollardM);
      b.position.set(sx * (JACKLYN_LENGTH_M / 2 - 3), 0.4, sz * (JACKLYN_BEAM_M / 2 - 2));
      ship.add(b);
    }
  }
  for (const sz of [-1, 1]) {
    const bit = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.6, 1.4, 12), bollardM);
    bit.position.set(JACKLYN_LENGTH_M / 2 - 2, 0.7, sz * 3);
    bit.name = 'tow-bitt';
    ship.add(bit);
  }
  return ship;
}

/** Jacklyn with its sea, as the New Glenn landing frames it. */
export function buildJacklynScene(sizeM = 220): THREE.Group {
  const g = new THREE.Group();
  g.add(buildJacklyn(), buildSeaPlane(sizeM));
  return g;
}
