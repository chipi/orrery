/**
 * SpaceX autonomous spaceport drone ship "Just Read the Instructions" (JRTI), real metres,
 * deck top at y = 0, long axis along x, blast wall and containers at the stern (-x).
 *
 * Sourced (Wikipedia "Autonomous spaceport drone ship"; docs/wip/2026-11-24-booster-landings-sourced.md):
 * landing deck 91 x 52 m including the wing extensions; Marmac 300-series deck barge hull
 * (JRTI = Marmac 303); four azimuth thrusters; landing pad = a circle
 * enclosing the stylised SpaceX "X"; the "Octagrabber" low tracked robot parks at the deck side.
 *
 * ESTIMATED (not sourced): the stern blast wall (sourced for OCISLY, not JRTI) and containers; hull ~91 x 30 m with steel wing extensions out to 52 m; freeboard ~3 m;
 * dark hull; dark-grey deck; container-sized equipment boxes; railings and bollards; thruster
 * pod positions and sizes; all colours and the blast-wall height.
 */
import * as THREE from 'three';

export const DECK_LENGTH_M = 91;
export const DECK_WIDTH_M = 52;
const HULL_BEAM_M = 30;
export const FREEBOARD_M = 3;
const HULL_DEPTH_M = 5.5;

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

/** Stylised "X": two crossed bars of different weight, laid flat in the x-z plane. */
export function xMark(radius: number, m: THREE.Material): THREE.Group {
  const g = new THREE.Group();
  const len = radius * 1.55;
  const a = box(len, 0.06, radius * 0.16, m, 0, 0, 0);
  a.rotation.y = Math.PI / 4;
  const b = box(len, 0.06, radius * 0.1, m, 0, 0, 0);
  b.rotation.y = -Math.PI / 4;
  g.add(a, b);
  return g;
}

export function buildDroneShip(): THREE.Group {
  const ship = new THREE.Group();
  ship.name = 'drone-ship';

  const hullM = mat(0x1b2230, 0.85, 0.3);
  const deckM = mat(0x3a3f47, 0.9, 0.1);
  const steelM = mat(0x555b64, 0.7, 0.4);
  const wallM = mat(0x6a6f76, 0.75, 0.3);
  const markM = mat(0xe8e8e8, 0.7, 0);
  const railM = mat(0xd9a521, 0.6, 0.2);
  const podM = mat(0x2a2f38, 0.6, 0.5);

  // Barge hull below the deck; the wing extensions are a thin steel deck out to 52 m wide.
  ship.add(
    box(DECK_LENGTH_M, HULL_DEPTH_M, HULL_BEAM_M, hullM, 0, -HULL_DEPTH_M / 2 - 0.2, 0, 'hull'),
  );
  ship.add(box(DECK_LENGTH_M, 0.2, DECK_WIDTH_M, deckM, 0, -0.1, 0, 'deck'));
  for (const s of [-1, 1]) {
    // Underside trusses of the wing extensions.
    ship.add(box(DECK_LENGTH_M - 4, 0.9, 0.5, steelM, 0, -0.65, s * (HULL_BEAM_M / 2 + 3)));
    ship.add(box(DECK_LENGTH_M - 4, 0.9, 0.5, steelM, 0, -0.65, s * (DECK_WIDTH_M / 2 - 0.4)));
    ship.add(
      box(
        2.5,
        HULL_DEPTH_M,
        HULL_BEAM_M - 4,
        hullM,
        s * (DECK_LENGTH_M / 2 + 1.2),
        -HULL_DEPTH_M / 2 - 0.2,
        0,
      ),
    );
  }

  // Landing pad: ring + X, forward of midship.
  const padX = 8;
  const padR = 16;
  const ring = new THREE.Mesh(new THREE.RingGeometry(padR - 0.7, padR, 64), markM);
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(padX, 0.03, 0);
  ring.name = 'landing-mark';
  ship.add(ring);
  const xm = xMark(padR * 0.8, markM);
  xm.position.set(padX, 0.05, 0);
  xm.name = 'landing-x';
  ship.add(xm);

  // Stern (estimate): blast wall across the hull width, container-sized equipment boxes behind it.
  const sternX = -DECK_LENGTH_M / 2;
  ship.add(box(1.2, 7, HULL_BEAM_M - 2, wallM, sternX + 14, 3.5, 0, 'blast-wall'));
  const boxColors = [0x8a2e2a, 0x2e5a8a, 0x8a8a8a, 0xb88a2e];
  for (let i = 0; i < 4; i++) {
    const c = box(12.2, 2.6, 2.44, mat(boxColors[i], 0.7, 0.3), sternX + 8, 1.3, -9 + i * 5);
    c.name = `container-${i}`;
    ship.add(c);
  }
  ship.add(box(9, 3.2, 6, steelM, sternX + 5, 1.6, 11, 'equipment-house'));

  // Octagrabber: low tracked robot parked at the deck side.
  const octa = new THREE.Group();
  octa.name = 'octagrabber';
  octa.add(box(4, 0.5, 2.6, mat(0xc8c8c8, 0.6, 0.3), 0, 0.55, 0));
  for (const s of [-1, 1]) octa.add(box(4.6, 0.5, 0.7, mat(0x15171b, 0.9, 0), 0, 0.25, s * 1.5));
  octa.position.set(30, 0, -21);
  ship.add(octa);

  // Low railings along the long edges and bollards near the corners.
  const railY = 0.55;
  for (const s of [-1, 1]) {
    const z = s * (DECK_WIDTH_M / 2 - 0.3);
    ship.add(box(DECK_LENGTH_M, 0.08, 0.08, railM, 0, railY * 2, z));
    ship.add(box(DECK_LENGTH_M, 0.08, 0.08, railM, 0, railY, z));
    for (let px = -DECK_LENGTH_M / 2 + 1; px <= DECK_LENGTH_M / 2; px += 6) {
      ship.add(box(0.08, railY * 2, 0.08, railM, px, railY, z));
    }
  }
  for (const sx of [-1, 1])
    for (const sz of [-1, 1]) {
      const b = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.35, 0.7, 12), steelM);
      b.position.set(sx * (DECK_LENGTH_M / 2 - 1.5), 0.35, sz * (HULL_BEAM_M / 2 - 1));
      ship.add(b);
    }

  // Four azimuth thruster pods at the hull corners, hanging at and below the waterline.
  let i = 0;
  for (const sx of [-1, 1])
    for (const sz of [-1, 1]) {
      const pod = new THREE.Group();
      pod.name = `thruster-${i++}`;
      const body = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 2.4, 20), podM);
      const nozzle = new THREE.Mesh(
        new THREE.CylinderGeometry(0.55, 0.55, 2.6, 20, 1, true),
        steelM,
      );
      nozzle.rotation.x = Math.PI / 2;
      nozzle.position.y = -0.9;
      pod.add(body, nozzle);
      pod.position.set(
        sx * (DECK_LENGTH_M / 2 - 7),
        -FREEBOARD_M - 1.8,
        sz * (HULL_BEAM_M / 2 - 3),
      );
      ship.add(pod);
    }

  return ship;
}

/** Procedural ripple normal map; null where there is no DOM (unit tests in node). */
function rippleNormalMap(): THREE.Texture | null {
  if (typeof document === 'undefined') return null;
  const N = 256;
  const cv = document.createElement('canvas');
  cv.width = cv.height = N;
  const ctx = cv.getContext('2d');
  if (!ctx) return null;
  const img = ctx.createImageData(N, N);
  const T = Math.PI * 2;
  const h = (u: number, v: number) =>
    Math.sin(u * T * 3 + Math.sin(v * T * 2) * 1.3) * 0.5 +
    Math.sin(v * T * 5 + u * T * 2) * 0.3 +
    Math.sin((u + v) * T * 7) * 0.2;
  const e = 1 / N;
  for (let y = 0; y < N; y++)
    for (let xp = 0; xp < N; xp++) {
      const u = xp / N;
      const v = y / N;
      const dx = (h(u + e, v) - h(u - e, v)) * 0.6;
      const dy = (h(u, v + e) - h(u, v - e)) * 0.6;
      const len = Math.hypot(dx, dy, 1);
      const o = (y * N + xp) * 4;
      img.data[o] = ((-dx / len) * 0.5 + 0.5) * 255;
      img.data[o + 1] = ((-dy / len) * 0.5 + 0.5) * 255;
      img.data[o + 2] = ((1 / len) * 0.5 + 0.5) * 255;
      img.data[o + 3] = 255;
    }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.NoColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

/** Sea surface at y = -freeboard, `sizeM` square, with a foam strip around the hull waterline. */
export function buildSeaPlane(sizeM: number): THREE.Mesh {
  const normalMap = rippleNormalMap();
  if (normalMap) normalMap.repeat.set(sizeM / 40, sizeM / 40);
  const sea = new THREE.Mesh(
    new THREE.PlaneGeometry(sizeM, sizeM),
    new THREE.MeshStandardMaterial({
      color: 0x0c2a45,
      roughness: 0.25,
      metalness: 0.1,
      normalMap,
      normalScale: new THREE.Vector2(0.5, 0.5),
    }),
  );
  sea.rotation.x = -Math.PI / 2;
  sea.position.y = -FREEBOARD_M;
  sea.name = 'sea';

  // Foam: a pale band hugging the hull. Child of the sea, so it lies in the sea's local xy plane.
  const ow = DECK_LENGTH_M + 8;
  const od = HULL_BEAM_M + 8;
  const shape = new THREE.Shape();
  shape.moveTo(-ow / 2, -od / 2);
  shape.lineTo(ow / 2, -od / 2);
  shape.lineTo(ow / 2, od / 2);
  shape.lineTo(-ow / 2, od / 2);
  shape.closePath();
  const iw = DECK_LENGTH_M / 2 + 1;
  const id = HULL_BEAM_M / 2 + 0.5;
  const hole = new THREE.Path();
  hole.moveTo(-iw, -id);
  hole.lineTo(-iw, id);
  hole.lineTo(iw, id);
  hole.lineTo(iw, -id);
  hole.closePath();
  shape.holes.push(hole);
  const foam = new THREE.Mesh(
    new THREE.ShapeGeometry(shape),
    new THREE.MeshStandardMaterial({
      color: 0xe6f0f4,
      roughness: 0.9,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
    }),
  );
  foam.name = 'foam';
  foam.position.z = 0.05;
  sea.add(foam);
  return sea;
}
