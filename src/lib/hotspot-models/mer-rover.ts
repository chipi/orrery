import * as THREE from 'three';

/**
 * Mars Exploration Rover Tier 1 model — Spirit + Opportunity
 * (PRD-014 / RFC-017 §S4, ADR-062).
 *
 * Spirit (Gusev Crater, 2004-2010) and Opportunity (Meridiani Planum,
 * 2004-2018) were identical twins: 1.5 m × 2.3 m × 1.5 m, six wheels
 * on a rocker-bogie suspension, flat solar panels arrayed across the
 * top deck, single camera mast with the Pancam pair + Mini-TES, robot
 * arm (IDD) on the front.
 *
 * Dimensions sourced from NASA RP-2006-1421 (Mars Exploration Rover
 * Mission Reference Handbook).
 */

const MER_BODY = 0xb0b0b0;
const SOLAR_BLUE = 0x152040;
const TYRE = 0x303030;
const ALU = 0x9a9a9a;

function bodyMat(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color: MER_BODY, metalness: 0.6, roughness: 0.55 });
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
  return new THREE.MeshStandardMaterial({ color: TYRE, metalness: 0.2, roughness: 0.9 });
}
function aluMat(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color: ALU, metalness: 0.75, roughness: 0.4 });
}

export function buildMERRoverHotspot(accentColor: string): THREE.Group {
  const g = new THREE.Group();
  const wheelR = 0.04;

  // Warm electronics box (WEB) — main body, sits at chassis height.
  const web = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.12, 0.22), bodyMat());
  web.position.y = wheelR + 0.07;
  g.add(web);

  // Solar panels — flat array across the top deck, slightly wider
  // than the body (real MERs had panels with deployable side wings).
  const solar = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.008, 0.32), solarMat());
  solar.position.y = wheelR + 0.135;
  g.add(solar);

  // 6 wheels on rocker-bogie. Front-front + middle + rear-rear pairs.
  for (const dx of [-0.16, 0, 0.16]) {
    for (const dz of [-0.13, 0.13]) {
      const w = new THREE.Mesh(new THREE.CylinderGeometry(wheelR, wheelR, 0.04, 12), tyreMat());
      w.rotation.z = Math.PI / 2;
      w.position.set(dx, wheelR, dz);
      g.add(w);
    }
  }

  // Camera mast — Pancam pair on top. Vertical pole rises ~30 cm
  // above the solar deck.
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.26, 4), aluMat());
  mast.position.set(0.06, wheelR + 0.27, 0);
  g.add(mast);
  // Pancam head — small horizontal cylinder with two "eye" caps.
  const pancam = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.06, 8), aluMat());
  pancam.rotation.z = Math.PI / 2;
  pancam.position.set(0.06, wheelR + 0.4, 0);
  g.add(pancam);

  // Robot arm (IDD) stowed along the forward edge.
  const arm = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.18), aluMat());
  arm.position.set(0, wheelR + 0.07, 0.18);
  arm.rotation.x = -0.3;
  g.add(arm);

  // High-gain antenna disc on the rear-port corner of the deck.
  const hga = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.01, 12), aluMat());
  hga.position.set(-0.1, wheelR + 0.14, 0.13);
  hga.rotation.x = Math.PI / 2;
  g.add(hga);

  // Agency accent ring around the body.
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.32, 0.01, 6, 24),
    new THREE.MeshStandardMaterial({
      color: accentColor,
      metalness: 0.4,
      roughness: 0.4,
      emissive: accentColor,
      emissiveIntensity: 0.3,
    }),
  );
  ring.position.y = wheelR + 0.07;
  ring.rotation.x = Math.PI / 2;
  g.add(ring);
  return g;
}
