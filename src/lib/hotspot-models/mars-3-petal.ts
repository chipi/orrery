import * as THREE from 'three';

/**
 * Mars 2 / Mars 3 / Mars 6 Tier 1 — Soviet petal-lander silhouette
 * (PRD-014 / RFC-017 §S7a, ADR-062).
 *
 * Mars 3 (Dec 1971) was the first soft Mars landing — survived
 * ~14.5 seconds before contact lost. Petal design: spherical
 * pressure capsule (~1.2 m diameter) inside a tetrahedral aeroshell;
 * 4 hinged petals deploy after touchdown to right the capsule and
 * expose the camera + radio.
 *
 * Dimensions sourced from Lavochkin / Soviet Academy public
 * archives. Mars 3 landing coordinates are uncertain (±10 km); the
 * detail panel surfaces this via the location_uncertainty_m field.
 */

const SOVIET_SILVER = 0xcdd0cc;
const PETAL_GREY = 0x8a8a85;

function bodyMat(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color: SOVIET_SILVER, metalness: 0.75, roughness: 0.4 });
}
function petalMat(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: PETAL_GREY,
    metalness: 0.6,
    roughness: 0.5,
    side: THREE.DoubleSide,
  });
}

export function buildMars3PetalHotspot(accentColor: string): THREE.Group {
  const g = new THREE.Group();
  // Central capsule sphere.
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.3, 24, 16), bodyMat());
  body.position.y = 0.3;
  g.add(body);

  // 4 deployed petals — large triangular plates fanned out on the
  // surface, with their hinges at the equator of the capsule.
  for (let i = 0; i < 4; i++) {
    const ang = (i / 4) * Math.PI * 2;
    const petal = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.5, 3), petalMat());
    petal.position.set(Math.cos(ang) * 0.34, 0.04, Math.sin(ang) * 0.34);
    petal.rotation.y = ang + Math.PI / 6;
    petal.rotation.x = Math.PI / 2;
    g.add(petal);
  }

  // Camera mast — short cylindrical antenna on top.
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.22, 4), bodyMat());
  mast.position.y = 0.7;
  g.add(mast);

  // Agency accent ring around the base capsule.
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.34, 0.012, 6, 24),
    new THREE.MeshStandardMaterial({
      color: accentColor,
      metalness: 0.4,
      roughness: 0.4,
      emissive: accentColor,
      emissiveIntensity: 0.3,
    }),
  );
  ring.position.y = 0.08;
  ring.rotation.x = Math.PI / 2;
  g.add(ring);
  return g;
}
