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

export function buildMars3PetalHotspot(_accentColor: string): THREE.Group {
  const g = new THREE.Group();
  // Central capsule sphere.
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.3, 24, 16), bodyMat());
  body.position.y = 0.3;
  g.add(body);

  // 4 deployed petals — flat triangular plates hinged at the sphere equator,
  // fanning outward and tilted up ~28°. Identical pivot approach to Luna 9
  // but scaled for Mars 3's larger capsule (radius 0.3 vs 0.28).
  for (let i = 0; i < 4; i++) {
    const ang = (i / 4) * Math.PI * 2;
    const pivot = new THREE.Group();
    // Hinge point: sphere surface at equator height.
    pivot.position.set(Math.cos(ang) * 0.16, 0.16, Math.sin(ang) * 0.16);
    // Rotate pivot so its local +x axis points radially outward.
    pivot.rotation.y = -ang;

    const geo = new THREE.ConeGeometry(0.16, 0.36, 3);
    // Apex at origin → base at pivot origin, apex points outward along +x.
    geo.rotateZ(-Math.PI / 2);
    geo.translate(0.18, 0, 0);

    const mesh = new THREE.Mesh(geo, petalMat());
    // Flatten into a thin plate.
    mesh.scale.y = 0.14;
    // Tilt outer edge up ~28°.
    mesh.rotation.z = 0.5;
    pivot.add(mesh);
    g.add(pivot);
  }

  // Camera mast — short cylindrical antenna on top.
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.22, 4), bodyMat());
  mast.position.y = 0.7;
  g.add(mast);

  return g;
}
