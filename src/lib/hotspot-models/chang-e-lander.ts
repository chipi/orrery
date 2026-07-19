import * as THREE from 'three';
import { strutBetween } from '../three/model-geom';

/**
 * Chang'e 3 / 4 / 5 / 6 Tier 1 — CNSA lunar lander silhouette
 * (PRD-014 / RFC-017 §S7b, ADR-062).
 *
 * Chang'e landers share a common bus design: rectangular electronics
 * bay on 4 splayed legs, deployable solar panels (Chang'e 3/4 had
 * two; Chang'e 5/6 added the ascent stage), high-gain dish on a
 * vertical mast. The variant flag toggles the ascent stage for the
 * sample-return missions (5, 6).
 *
 * Dimensions sourced from CMSA public release imagery + Chinese
 * Academy of Sciences papers:
 *   - Lander body: 1.5 m × 1.5 m × 1.1 m tall.
 *   - 4 splayed legs, 2.5 m diameter footprint.
 *   - 2 solar panel arrays deploy left + right.
 *   - Ascent stage (5/6 only): cylindrical body + spherical
 *     capsule that returns to lunar orbit + Earth.
 */

const CMSA_GOLD = 0xc7a04e;
const SILVER = 0xc0c0c0;
const SOLAR_DARK = 0x152040;
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
function silverMat(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color: SILVER, metalness: 0.85, roughness: 0.3 });
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
function aluMat(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color: ALU, metalness: 0.75, roughness: 0.4 });
}

export function buildChangeLanderHotspot(
  accentColor: string,
  options?: { withAscentStage?: boolean },
): THREE.Group {
  const g = new THREE.Group();
  const withAscent = options?.withAscentStage ?? false;

  // Hex/rectangular body — slightly tapered on top to suggest the
  // angled top face of the real lander.
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.22, 0.36), bodyMat());
  body.position.y = 0.32;
  g.add(body);

  // 4 splayed legs.
  for (let i = 0; i < 4; i++) {
    const ang = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const c = Math.cos(ang);
    const s = Math.sin(ang);
    const padPos = new THREE.Vector3(c * 0.44, 0.03, s * 0.44);
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.02, 10), aluMat());
    pad.position.copy(padPos);
    g.add(pad);
    // Leg strut + brace connecting the body to the pad.
    g.add(strutBetween(new THREE.Vector3(c * 0.26, 0.26, s * 0.26), padPos, 0.018, aluMat(), 6));
    g.add(strutBetween(new THREE.Vector3(c * 0.15, 0.12, s * 0.15), padPos, 0.013, aluMat(), 6));
  }

  // 2 deployed solar-panel wings.
  for (const dx of [-0.46, 0.46]) {
    const wing = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.008, 0.32), solarMat());
    wing.position.set(dx, 0.4, 0);
    g.add(wing);
    // Arm connecting body to wing.
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.02, 0.04), aluMat());
    arm.position.set(dx / 2, 0.4, 0);
    g.add(arm);
  }

  // High-gain antenna dish on a mast.
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.32, 4), aluMat());
  mast.position.set(0, withAscent ? 0.7 : 0.6, 0);
  g.add(mast);
  const dish = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.008, 16), silverMat());
  dish.position.set(0, withAscent ? 0.86 : 0.76, 0);
  dish.rotation.x = Math.PI / 3;
  g.add(dish);

  // Ascent stage for sample-return missions (Chang'e 5, 6).
  if (withAscent) {
    const ascent = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.18, 12), bodyMat());
    ascent.position.y = 0.55;
    g.add(ascent);
    const capsule = new THREE.Mesh(new THREE.SphereGeometry(0.08, 16, 12), silverMat());
    capsule.position.y = 0.7;
    g.add(capsule);
  }

  // Agency accent ring (CNSA red typically).
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.3, 0.012, 6, 24),
    new THREE.MeshStandardMaterial({
      color: accentColor,
      metalness: 0.4,
      roughness: 0.4,
      emissive: accentColor,
      emissiveIntensity: 0.3,
    }),
  );
  ring.position.y = 0.22;
  ring.rotation.x = Math.PI / 2;
  g.add(ring);
  return g;
}
