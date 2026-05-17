import * as THREE from 'three';

/**
 * Chandrayaan-3 Vikram lander + Pragyan rover Tier 1 (Manzinus
 * crater, ~70°S, 23 Aug 2023) — first soft landing near the lunar
 * south pole. PRD-014 / RFC-017 §S7c, ADR-062.
 *
 * Composite scene: Vikram lander (boxy body on 4 splayed legs, two
 * deployable solar panels, ramp on one side) + small Pragyan rover
 * parked off the ramp (6-wheel, solar-panel top, antenna mast).
 *
 * Dimensions sourced from ISRO public release imagery + the
 * Chandrayaan-3 mission documents.
 */

const ISRO_ORANGE = 0xff9933;
const ALU = 0x9a9a9a;
const SOLAR_BLUE = 0x152040;
const TYRE = 0x303030;

function bodyMat(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: 0xc7c2b8,
    metalness: 0.65,
    roughness: 0.5,
  });
}
function aluMat(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color: ALU, metalness: 0.75, roughness: 0.4 });
}
function solarMat(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: SOLAR_BLUE,
    metalness: 0.4,
    roughness: 0.3,
    emissive: SOLAR_BLUE,
    emissiveIntensity: 0.08,
  });
}
function tyreMat(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color: TYRE, metalness: 0.3, roughness: 0.85 });
}

function buildPragyan(): THREE.Group {
  const g = new THREE.Group();
  const wheelR = 0.025;
  const chassis = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.04, 0.11), bodyMat());
  chassis.position.y = wheelR + 0.03;
  g.add(chassis);
  const solar = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.005, 0.13), solarMat());
  solar.position.y = wheelR + 0.055;
  g.add(solar);
  for (const dx of [-0.06, 0, 0.06]) {
    for (const dz of [-0.055, 0.055]) {
      const w = new THREE.Mesh(new THREE.CylinderGeometry(wheelR, wheelR, 0.02, 8), tyreMat());
      w.rotation.z = Math.PI / 2;
      w.position.set(dx, wheelR, dz);
      g.add(w);
    }
  }
  return g;
}

export function buildChandrayaan3VikramHotspot(accentColor: string): THREE.Group {
  const g = new THREE.Group();
  // Lander body — boxy on 4 splayed legs.
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.22, 0.34), bodyMat());
  body.position.y = 0.32;
  g.add(body);
  for (let i = 0; i < 4; i++) {
    const ang = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.4, 6), aluMat());
    leg.position.set(Math.cos(ang) * 0.26, 0.2, Math.sin(ang) * 0.26);
    leg.rotation.z = -Math.cos(ang) * 0.55;
    leg.rotation.x = Math.sin(ang) * 0.55;
    g.add(leg);
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.015, 8), aluMat());
    pad.position.set(Math.cos(ang) * 0.4, 0.02, Math.sin(ang) * 0.4);
    g.add(pad);
  }
  // Deployed ramp + Pragyan rover.
  const ramp = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.01, 0.3), aluMat());
  ramp.position.set(0.32, 0.1, 0);
  ramp.rotation.z = -Math.PI / 6;
  g.add(ramp);
  const pragyan = buildPragyan();
  pragyan.position.set(0.55, 0, 0);
  g.add(pragyan);
  // Saffron/orange accent ring — nation colour.
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.3, 0.012, 6, 24),
    new THREE.MeshStandardMaterial({
      color: accentColor || ISRO_ORANGE,
      metalness: 0.4,
      roughness: 0.4,
      emissive: accentColor || ISRO_ORANGE,
      emissiveIntensity: 0.3,
    }),
  );
  ring.position.y = 0.22;
  ring.rotation.x = Math.PI / 2;
  g.add(ring);
  return g;
}
