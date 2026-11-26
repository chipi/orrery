/**
 * A landing runway for the W12 winged returns, real metres. The threshold of the landing end is at
 * the origin and the runway runs along +z (the craft lands moving +z), surface at y = 0, x across.
 *
 * Sourced per runway in its winged profile (static/data/winged-profiles/*.json `runway`): length,
 * width and surface. A lakebed runway (Rogers Dry Lake) is a marked strip on the dry lake, not a
 * pavement: the same tan as the lake, edge and centre lines and the threshold bars painted on.
 * ESTIMATED (not sourced): every marking's size and spacing, the colours, the lakebed's extent.
 */
import * as THREE from 'three';
import type { WingedRunway } from '$lib/fly/winged-profile';

const mat = (color: number, rough = 0.95) =>
  new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0 });

/** A flat marking `w` x `l` (m) centred at (x, z), a hair above the surface. */
function paint(g: THREE.Group, m: THREE.Material, x: number, z: number, w: number, l: number) {
  const p = new THREE.Mesh(new THREE.PlaneGeometry(w, l), m);
  p.rotation.x = -Math.PI / 2;
  p.position.set(x, 0.03, z);
  g.add(p);
}

export function buildRunway(rw: Pick<WingedRunway, 'surface' | 'lengthM' | 'widthM'>): THREE.Group {
  const g = new THREE.Group();
  g.name = 'runway';
  const L = rw.lengthM;
  const W = rw.widthM;
  const lake = rw.surface === 'lakebed';

  // The ground: the lakebed itself, or scrub around a concrete strip (ESTIMATE: extent, colour).
  const groundSize = Math.max(40_000, L * 4);
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(groundSize, groundSize),
    mat(lake ? 0xcdbb98 : 0x77745a, 0.98),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, -0.05, L / 2);
  ground.name = 'ground';
  g.add(ground);

  if (!lake) {
    const strip = new THREE.Mesh(new THREE.PlaneGeometry(W, L), mat(0x8b8984, 0.9));
    strip.rotation.x = -Math.PI / 2;
    strip.position.set(0, 0.01, L / 2);
    strip.name = 'strip';
    g.add(strip);
  }

  const white = mat(lake ? 0x4a3f33 : 0xeeeeea, 0.8);
  white.name = 'marking';
  // Edge lines along the whole length; a dashed centre line (30 m dashes, 20 m gaps).
  for (const s of [-1, 1]) paint(g, white, s * (W / 2 - 1), L / 2, 1.5, L);
  for (let z = 60; z + 30 < L - 30; z += 50) paint(g, white, 0, z + 15, 1, 30);
  // Threshold bars at both ends.
  const bars = Math.max(4, Math.floor(W / 6));
  for (const z0 of [0, L - 45]) {
    for (let i = 0; i < bars; i++) {
      const x = -W / 2 + 3 + ((W - 6) * (i + 0.5)) / bars;
      if (Math.abs(x) < 3) continue;
      paint(g, white, x, z0 + 22.5, Math.min(2, (W - 6) / bars / 2), 45);
    }
  }
  g.userData.lengthM = L;
  g.userData.widthM = W;
  return g;
}
