/**
 * MSL's landing hardware, at the detail of the central models (operator 2026-11-23: the sky
 * crane was a box, the rover "not proportional"): the descent stage that lowered Curiosity
 * (and Perseverance) on its bridles. In metres, origin at the bridle-umbilical device (BUD) on
 * the stage's belly, +y up.
 *
 * What makes it read as the sky crane: eight Mars Landing Engines in four canted pairs on
 * outriggers at the corners; the three big propellant spheres and two pressurant tanks on the
 * frame; the gold blanket on the deck; the BUD under the middle; the six-antenna Terminal
 * Descent Sensor on its bracket.
 */
import * as THREE from 'three';
import { add, box, crinkle, foilSheet, lathe, mat, strut, type Mat } from './kit';

const V = (x: number, y: number, z: number): THREE.Vector3 => new THREE.Vector3(x, y, z);

/** Span across the engine pairs, metres (the stage is about 3.2 m across its engines). */
export const MSL_DESCENT_STAGE_SPAN_M = 3.2;

export function buildMslDescentStage(): THREE.Group {
  const M: Record<string, Mat> = {
    frame: mat(0xa7aab0, 0.6, 0.45),
    dark: mat(0x2a2c30, 0.4, 0.6),
    gold: mat(0xcf9e3c, 0.55, 0.4, true),
    silver: mat(0xc9ccd1, 0.6, 0.35, true),
    tank: mat(0xd2d4d8, 0.65, 0.3),
    bell: mat(0x3d3a36, 0.6, 0.5, true),
    bellIn: mat(0x1f1d1b, 0.5, 0.7, true),
  };
  const g = new THREE.Group();

  // Frame: a flat octagonal deck under gold blanket, its edge beam in bare aluminium.
  const deckY = 0.35;
  const oct = new THREE.Shape(
    Array.from({ length: 8 }, (_, i) => {
      const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
      return new THREE.Vector2(Math.cos(a) * 1.25, Math.sin(a) * 1.25);
    }),
  );
  const deck = new THREE.Mesh(
    new THREE.ExtrudeGeometry(oct, { depth: 0.22, bevelEnabled: false }),
    M.frame,
  );
  deck.rotation.x = -Math.PI / 2;
  deck.position.y = deckY;
  add(g, deck);
  const blanket = new THREE.Mesh(
    crinkle(new THREE.CircleGeometry(1.2, 8, Math.PI / 8), 0.025),
    M.gold,
  );
  blanket.rotation.x = -Math.PI / 2;
  blanket.position.y = deckY + 0.225;
  add(g, blanket);
  const belly = foilSheet(M.silver, 1.9, 1.9, 0.02);
  belly.rotation.x = Math.PI / 2;
  belly.position.y = deckY - 0.005;
  add(g, belly);

  // Three propellant spheres and two pressurant tanks on the deck.
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + Math.PI / 6;
    const t = add(g, new THREE.Mesh(new THREE.SphereGeometry(0.42, 28, 18), M.tank));
    t.position.set(Math.cos(a) * 0.62, deckY + 0.62, Math.sin(a) * 0.62);
    // Mounting ring at the equator.
    const ring = add(g, new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.025, 6, 28), M.frame));
    ring.rotation.x = Math.PI / 2;
    ring.position.copy(t.position);
  }
  for (const a of [Math.PI / 2 + 0.3, -Math.PI / 2 - 0.3]) {
    const p = add(g, new THREE.Mesh(new THREE.SphereGeometry(0.2, 20, 12), M.tank));
    p.position.set(Math.cos(a) * 0.95, deckY + 0.42, Math.sin(a) * 0.95);
  }

  // Eight Mars Landing Engines: four pairs on outriggers at the diagonals, canted outward.
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const out = V(Math.cos(a), 0, Math.sin(a));
    const side = V(-Math.sin(a), 0, Math.cos(a));
    const root = out
      .clone()
      .multiplyScalar(1.1)
      .setY(deckY + 0.1);
    const tip = out
      .clone()
      .multiplyScalar(1.45)
      .setY(deckY + 0.05);
    strut(g, M.frame, root, tip, 0.05, 8);
    box(g, M.gold, 0.32, 0.18, 0.5, tip.x, tip.y + 0.05, tip.z).rotation.y = -a;
    for (const s of [-1, 1]) {
      const eng = new THREE.Group();
      eng.position.copy(tip).add(side.clone().multiplyScalar(s * 0.16));
      // Canted ~20° outward so the plumes miss the rover hanging below.
      eng.quaternion.setFromUnitVectors(
        V(0, -1, 0),
        V(0, -1, 0).add(out.clone().multiplyScalar(0.36)).normalize(),
      );
      lathe(eng, M.bell, [
        [0.06, 0],
        [0.08, -0.08],
        [0.13, -0.3],
        [0.15, -0.42],
      ]);
      lathe(eng, M.bellIn, [
        [0.145, -0.42],
        [0.125, -0.3],
        [0.075, -0.08],
        [0.055, 0],
      ]);
      // The engine's exhaust, hidden until a scene lights it (named 'mlePlume').
      for (const [r, h, c, o] of [
        [0.34, 1.9, 0xff8a3c, 0.18],
        [0.2, 1.3, 0xffd08a, 0.42],
      ] as const) {
        const plume = new THREE.Mesh(
          new THREE.ConeGeometry(r, h, 16, 1, true),
          new THREE.MeshBasicMaterial({
            color: c,
            transparent: true,
            opacity: o,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            side: THREE.DoubleSide,
          }),
        );
        plume.position.y = -0.42 - h / 2;
        plume.name = 'mlePlume';
        plume.visible = false;
        eng.add(plume);
      }
      add(g, eng);
    }
  }

  // Bridle-umbilical device under the middle (the origin), and the Terminal Descent Sensor:
  // six radar antennas on a bracket under one side.
  const bud = add(g, new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.24, 0.3, 20), M.dark));
  bud.position.y = 0.15;
  const tds = new THREE.Group();
  tds.position.set(0.85, deckY - 0.12, -0.35);
  add(g, tds);
  box(tds, M.frame, 0.6, 0.05, 0.42, 0, 0, 0);
  for (let i = 0; i < 6; i++) {
    const c = add(tds, new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.05, 12), M.dark));
    c.position.set(-0.2 + (i % 3) * 0.2, -0.05, i < 3 ? -0.11 : 0.11);
  }
  return g;
}
