import * as THREE from 'three';

/**
 * ESA Beagle 2 Tier 1 — Isidis Planitia, Mars. Landed 25 Dec 2003,
 * lost contact; located in HiRISE imagery Jan 2015 (~12-year
 * mystery). Partial-deploy status per resolved decision #7: 3 of 4
 * solar panels deployed; the 4th remained closed, blocking the
 * antenna and preventing communication.
 *
 * Distinctive UFO-disc silhouette: small clamshell body (~65 cm
 * diameter) with hinged petals. Rendered with 3 petals open + 1
 * closed, showing the engineering-accurate partial deployment.
 */

const BEAGLE_SILVER = 0xc8c8c8;
const SOLAR_BLUE = 0x152040;

function bodyMat(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color: BEAGLE_SILVER, metalness: 0.75, roughness: 0.4 });
}
function solarMat(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: SOLAR_BLUE,
    metalness: 0.4,
    roughness: 0.3,
    emissive: SOLAR_BLUE,
    emissiveIntensity: 0.06,
    side: THREE.DoubleSide,
  });
}

export function buildBeagle2Hotspot(_accentColor: string): THREE.Group {
  const g = new THREE.Group();
  // Central body — small clamshell base.
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.18, 0.05, 16), bodyMat());
  body.position.y = 0.04;
  g.add(body);

  // 4 hinged petal solar panels — 3 OPEN (flat on surface), 1 CLOSED
  // (still folded over the body). This is the editorial point: the
  // engineering-accurate partial deployment that prevented
  // communication.
  for (let i = 0; i < 4; i++) {
    const ang = (i / 4) * Math.PI * 2;
    const isClosed = i === 3; // The 4th petal stays folded.
    const petal = new THREE.Mesh(new THREE.CircleGeometry(0.16, 16, 0, Math.PI), solarMat());
    if (isClosed) {
      // Folded over the body — vertical.
      petal.position.set(Math.cos(ang) * 0.04, 0.16, Math.sin(ang) * 0.04);
      petal.rotation.y = ang;
      petal.rotation.x = -Math.PI / 8;
    } else {
      // Open — flat on the surface beside the body.
      petal.position.set(Math.cos(ang) * 0.2, 0.015, Math.sin(ang) * 0.2);
      petal.rotation.x = -Math.PI / 2;
      petal.rotation.z = ang + Math.PI / 2;
    }
    g.add(petal);
  }

  return g;
}
