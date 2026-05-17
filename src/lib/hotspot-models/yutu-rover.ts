import * as THREE from 'three';

/**
 * Yutu / Yutu-2 Tier 1 — CNSA lunar rover (deployed from Chang'e 3 /
 * Chang'e 4 respectively). PRD-014 / RFC-017 §S7b, ADR-062.
 *
 * Yutu = 6-wheel rocker-bogie chassis, 1.5 m × 1 m × 1.1 m, deployable
 * solar panel "wings" that fold down at lunar night to retain heat,
 * mast with stereo cameras + spectrometer. Yutu-2 is the same chassis
 * with minor instrument changes for far-side operation.
 *
 * Dimensions sourced from CMSA public releases. Used as a paired
 * builder beside Chang'e 3 / Chang'e 4 landers (not deployed as a
 * separate site marker).
 */

const CMSA_GOLD = 0xc7a04e;
const SOLAR_DARK = 0x152040;
const TYRE = 0x303030;
const ALU = 0x9a9a9a;

function bodyMat(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: CMSA_GOLD,
    metalness: 0.7,
    roughness: 0.45,
    emissive: CMSA_GOLD,
    emissiveIntensity: 0.05,
  });
}
function solarMat(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: SOLAR_DARK,
    metalness: 0.4,
    roughness: 0.3,
    emissive: SOLAR_DARK,
    emissiveIntensity: 0.08,
  });
}
function tyreMat(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color: TYRE, metalness: 0.3, roughness: 0.85 });
}
function aluMat(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color: ALU, metalness: 0.75, roughness: 0.4 });
}

export function buildYutuRoverHotspot(accentColor: string): THREE.Group {
  const g = new THREE.Group();
  const wheelR = 0.04;

  // Chassis box.
  const chassis = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.08, 0.18), bodyMat());
  chassis.position.y = wheelR + 0.06;
  g.add(chassis);

  // 6 wheels (3 per side).
  for (const dx of [-0.1, 0, 0.1]) {
    for (const dz of [-0.11, 0.11]) {
      const w = new THREE.Mesh(new THREE.CylinderGeometry(wheelR, wheelR, 0.035, 12), tyreMat());
      w.rotation.z = Math.PI / 2;
      w.position.set(dx, wheelR, dz);
      g.add(w);
    }
  }

  // 2 deployable solar wings (deployed = horizontal).
  for (const dx of [-0.24, 0.24]) {
    const wing = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.005, 0.16), solarMat());
    wing.position.set(dx, wheelR + 0.13, 0);
    g.add(wing);
  }

  // Camera mast — vertical pole with horizontal stereo head.
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.2, 4), aluMat());
  mast.position.set(0.06, wheelR + 0.2, 0);
  g.add(mast);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.025, 0.025), aluMat());
  head.position.set(0.06, wheelR + 0.32, 0);
  g.add(head);

  // Agency accent ring.
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.18, 0.008, 6, 24),
    new THREE.MeshStandardMaterial({
      color: accentColor,
      metalness: 0.4,
      roughness: 0.4,
      emissive: accentColor,
      emissiveIntensity: 0.3,
    }),
  );
  ring.position.y = wheelR + 0.06;
  ring.rotation.x = Math.PI / 2;
  g.add(ring);
  return g;
}
