import * as THREE from 'three';

/**
 * ESA Schiaparelli EDM Tier 1 — crashed near Meridiani Planum, Mars,
 * 19 Oct 2016. PRD-014 / RFC-017 §S7c, ADR-062.
 *
 * Schiaparelli's IMU released parachute + retrorockets prematurely
 * at ~3.7 km altitude (instead of waiting for the planned 1.2 km).
 * Lander fell rest of the way under gravity; impacted at ~150 m/s.
 * Visible in HiRISE as a dark crater + ejecta + the dropped
 * parachute + heat shield ~1 km away.
 *
 * Crashed-site visual treatment per resolved decision #7.
 */

const PARACHUTE_WHITE = 0xe0e0e0;
const TANK_DARK = 0x282828;
const ALU = 0x9a9a9a;

function bodyMat(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: 0xb8b8b8,
    metalness: 0.65,
    roughness: 0.5,
  });
}
function parachuteMat(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: PARACHUTE_WHITE,
    metalness: 0.1,
    roughness: 0.9,
    side: THREE.DoubleSide,
  });
}
function darkMat(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color: TANK_DARK, metalness: 0.4, roughness: 0.7 });
}
function aluMat(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color: ALU, metalness: 0.7, roughness: 0.5 });
}

export function buildSchiaparelliHotspot(_accentColor: string): THREE.Group {
  const g = new THREE.Group();

  // Dark impact crater — wide scorched disc under everything.
  const crater = new THREE.Mesh(
    new THREE.CircleGeometry(0.28, 32),
    new THREE.MeshStandardMaterial({
      color: 0x2a2424,
      metalness: 0.1,
      roughness: 0.95,
      transparent: true,
      opacity: 0.55,
    }),
  );
  crater.rotation.x = -Math.PI / 2;
  crater.position.y = 0.001;
  g.add(crater);

  // Crashed capsule body — disc half-embedded in the crater, tilted
  // as if it slammed in nose-first and came to rest canted.
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 0.16, 8), bodyMat());
  // Lower it so the bottom half is below ground = embedded in crater.
  body.position.set(0, 0.05, 0);
  body.rotation.z = Math.PI / 10;
  body.rotation.x = -Math.PI / 12;
  g.add(body);

  // 3 broken struts — consistently bent outward at low angles, like
  // landing legs that crumpled and splayed on impact.
  for (let i = 0; i < 3; i++) {
    const ang = (i / 3) * Math.PI * 2 + Math.PI / 3;
    const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.009, 0.18, 6), aluMat());
    // Root at capsule edge; lean outward and down to touch the ground.
    strut.position.set(Math.cos(ang) * 0.2, 0.04, Math.sin(ang) * 0.2);
    // Consistent outward splay: always tilting away from centre.
    strut.rotation.z = Math.cos(ang) * 0.7;
    strut.rotation.x = -Math.sin(ang) * 0.7;
    g.add(strut);
  }

  // Heat shield — flat dark disc lying face-down on the ground, offset
  // as if it separated during descent and slid to rest nearby.
  const heatShield = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 0.03, 16), darkMat());
  heatShield.position.set(-0.48, 0.015, 0.18);
  // Rotation.x = 0 → flat on the ground (face-down disc).
  g.add(heatShield);

  // Parachute — crumpled white dome lying flat on the ground near the
  // heat shield, connected to the capsule by two thin shroud lines.
  const chute = new THREE.Mesh(
    new THREE.SphereGeometry(0.14, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.45),
    parachuteMat(),
  );
  // Flip so the open face is down (lying on the ground like a draped
  // sheet), squash it to look crumpled.
  chute.rotation.x = Math.PI;
  chute.scale.y = 0.22;
  chute.position.set(-0.54, 0.015, -0.14);
  g.add(chute);

  // Shroud lines: two thin cords from parachute back to capsule.
  for (const side of [-1, 1]) {
    const lineGeo = new THREE.CylinderGeometry(0.003, 0.003, 0.48, 3);
    // Lay the cylinder between chute centre and capsule edge.
    // Midpoint and angle computed from the two endpoints.
    const mx = (-0.54 + side * 0.1 * 0.5) * 0.5; // crude midpoint x
    const mz = -0.14 * 0.5;
    const line = new THREE.Mesh(lineGeo, parachuteMat());
    line.position.set(mx - 0.06, 0.04, mz);
    line.rotation.z = 0.9;
    line.rotation.y = side * 0.35;
    g.add(line);
  }

  return g;
}
