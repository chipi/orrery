import * as THREE from 'three';

/**
 * Beresheet Tier 1 — SpaceIL Israeli lunar lander, crashed at Mare
 * Serenitatis on 11 Apr 2019. PRD-014 / RFC-017 §S7c, ADR-062.
 *
 * Crashed-site visual treatment per resolved decision #7: tilted
 * geometry + scattered fragments around the impact site. Engineering-
 * accurate per published crash analysis (Beresheet impacted at ~135
 * m/s; LROC NAC imagery shows a small dark splat surrounded by
 * ejecta).
 *
 * "FAILED LANDING — Apr 2019" caption is added in the detail panel
 * (handled by the route, not this builder).
 */

const SPACEIL_GOLD = 0xc7a04e;
const TANK_DARK = 0x282828;
const ALU = 0x7a7a7a;

function bodyMat(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: SPACEIL_GOLD,
    metalness: 0.6,
    roughness: 0.55,
    emissive: SPACEIL_GOLD,
    emissiveIntensity: 0.04,
  });
}
function darkMat(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color: TANK_DARK, metalness: 0.4, roughness: 0.7 });
}
function aluMat(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color: ALU, metalness: 0.7, roughness: 0.5 });
}

export function buildBeresheetHotspot(accentColor: string): THREE.Group {
  const g = new THREE.Group();
  // Lander body — tilted ~45° to suggest the impact pose.
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.28, 0.18, 8), bodyMat());
  body.position.set(0.05, 0.14, 0);
  body.rotation.z = -Math.PI / 4;
  g.add(body);
  // 2-3 visible legs (the rest crumpled on impact).
  for (let i = 0; i < 3; i++) {
    const ang = (i / 4) * Math.PI * 2 + Math.PI / 3;
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.18, 6), aluMat());
    leg.position.set(Math.cos(ang) * 0.24, 0.08, Math.sin(ang) * 0.24);
    // Bent / random angles — crashed pose.
    leg.rotation.z = -Math.cos(ang) * 1.2;
    leg.rotation.x = Math.sin(ang) * 0.8;
    g.add(leg);
  }
  // Scattered ejecta — 5-6 small dark fragments around the impact.
  for (let i = 0; i < 6; i++) {
    const ang = (i / 6) * Math.PI * 2 + Math.PI / 7;
    const dist = 0.35 + Math.random() * 0.2;
    const frag = new THREE.Mesh(
      new THREE.BoxGeometry(0.04 + Math.random() * 0.04, 0.02, 0.04 + Math.random() * 0.04),
      darkMat(),
    );
    frag.position.set(Math.cos(ang) * dist, 0.015, Math.sin(ang) * dist);
    frag.rotation.y = Math.random() * Math.PI;
    g.add(frag);
  }
  // Subtle dark "splat" disc at the impact origin.
  const splat = new THREE.Mesh(
    new THREE.CircleGeometry(0.32, 32),
    new THREE.MeshStandardMaterial({
      color: 0x2a2424,
      metalness: 0.1,
      roughness: 0.95,
      transparent: true,
      opacity: 0.5,
    }),
  );
  splat.rotation.x = -Math.PI / 2;
  splat.position.y = 0.005;
  g.add(splat);
  // Accent ring — kept (still an attempt; deserves the marker
  // dignity) but ✕ overlay handled by the route's marker layer.
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.3, 0.01, 6, 24),
    new THREE.MeshStandardMaterial({
      color: accentColor,
      metalness: 0.4,
      roughness: 0.4,
      emissive: accentColor,
      emissiveIntensity: 0.2,
      transparent: true,
      opacity: 0.7,
    }),
  );
  ring.position.y = 0.04;
  ring.rotation.x = Math.PI / 2;
  g.add(ring);
  return g;
}
