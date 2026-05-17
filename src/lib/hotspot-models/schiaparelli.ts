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

const ESA_BLUE = 0x003299;
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

export function buildSchiaparelliHotspot(accentColor: string): THREE.Group {
  const g = new THREE.Group();
  // Heat-shield disc — landed separately ~1 km away. Renders as a
  // dark disc offset from the lander.
  const heatShield = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 0.04, 16), darkMat());
  heatShield.position.set(-0.5, 0.02, 0.2);
  heatShield.rotation.x = Math.PI / 6;
  g.add(heatShield);
  // Parachute — discarded near the heat shield. Rendered as a
  // crumpled white sheet.
  const parachute = new THREE.Mesh(
    new THREE.CylinderGeometry(0.16, 0.05, 0.08, 16),
    parachuteMat(),
  );
  parachute.position.set(-0.6, 0.04, -0.1);
  parachute.rotation.z = Math.PI / 4;
  g.add(parachute);

  // Crashed lander body — small disc-shaped capsule, tilted +
  // dented from impact.
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 0.16, 8), bodyMat());
  body.position.set(0, 0.08, 0);
  body.rotation.z = Math.PI / 6;
  body.rotation.x = -Math.PI / 8;
  g.add(body);

  // 3 broken-off legs/struts.
  for (let i = 0; i < 3; i++) {
    const ang = (i / 3) * Math.PI * 2 + Math.PI / 3;
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.16, 6), aluMat());
    leg.position.set(Math.cos(ang) * 0.22, 0.06, Math.sin(ang) * 0.22);
    leg.rotation.z = -Math.cos(ang) * 1.0;
    leg.rotation.x = Math.sin(ang) * 0.6;
    g.add(leg);
  }

  // Dark impact crater + ejecta.
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
  crater.position.y = 0.005;
  g.add(crater);

  // Accent ring with reduced opacity (matches Beresheet pattern).
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.28, 0.01, 6, 24),
    new THREE.MeshStandardMaterial({
      color: accentColor || ESA_BLUE,
      metalness: 0.4,
      roughness: 0.4,
      emissive: accentColor || ESA_BLUE,
      emissiveIntensity: 0.2,
      transparent: true,
      opacity: 0.7,
    }),
  );
  ring.position.y = 0.03;
  ring.rotation.x = Math.PI / 2;
  g.add(ring);
  return g;
}
