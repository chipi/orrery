import * as THREE from 'three';

/**
 * JAXA SLIM (Smart Lander for Investigating Moon) + LEV-1 + LEV-2
 * Tier 1 — Shioli crater, 20 Jan 2024. PRD-014 / RFC-017 §S7c,
 * ADR-062.
 *
 * SLIM landed tipped over (its main engine failed seconds before
 * touchdown). The iconic post-landing image shows the lander lying
 * on its side — recognisable "Moon Sniper" pose. Two small LEV
 * hoppers (LEV-1, LEV-2) deployed from SLIM during descent and
 * imaged the lander from the surface.
 *
 * Dimensions sourced from JAXA public release imagery.
 */

const JAXA_GOLD = 0xc6a046;
const ALU = 0x9a9a9a;

function bodyMat(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: JAXA_GOLD,
    metalness: 0.7,
    roughness: 0.45,
    emissive: JAXA_GOLD,
    emissiveIntensity: 0.05,
  });
}
function aluMat(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color: ALU, metalness: 0.75, roughness: 0.4 });
}

export function buildSLIMPrecisionLanderHotspot(accentColor: string): THREE.Group {
  const g = new THREE.Group();
  // Boxy body tilted on its side (the iconic post-landing pose).
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.18, 0.22), bodyMat());
  body.rotation.z = -Math.PI / 3.5;
  body.position.set(0, 0.16, 0);
  g.add(body);
  // 5 legs in pentagonal arrangement (SLIM had a 5-leg pad system).
  // After the failed landing, the lander is propped on its forward
  // legs; render them at slightly varied angles.
  for (let i = 0; i < 5; i++) {
    const ang = (i / 5) * Math.PI * 2 + Math.PI / 5;
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.22, 6), aluMat());
    leg.position.set(Math.cos(ang) * 0.16, 0.12, Math.sin(ang) * 0.16);
    leg.rotation.z = -Math.cos(ang) * 0.4;
    leg.rotation.x = Math.sin(ang) * 0.4;
    g.add(leg);
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.01, 8), aluMat());
    pad.position.set(Math.cos(ang) * 0.22, 0.01, Math.sin(ang) * 0.22);
    g.add(pad);
  }
  // 2 small LEV hoppers nearby (LEV-1 spherical, LEV-2 baseball-
  // shaped). Tiny — read as small grey orbs beside the larger lander.
  const lev1 = new THREE.Mesh(new THREE.SphereGeometry(0.04, 12, 8), aluMat());
  lev1.position.set(0.35, 0.04, 0.1);
  g.add(lev1);
  const lev2 = new THREE.Mesh(new THREE.SphereGeometry(0.03, 12, 8), aluMat());
  lev2.position.set(0.32, 0.03, -0.12);
  g.add(lev2);
  // Agency accent ring around the lander.
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.22, 0.01, 6, 24),
    new THREE.MeshStandardMaterial({
      color: accentColor,
      metalness: 0.4,
      roughness: 0.4,
      emissive: accentColor,
      emissiveIntensity: 0.3,
    }),
  );
  ring.position.y = 0.06;
  ring.rotation.x = Math.PI / 2;
  g.add(ring);
  return g;
}
