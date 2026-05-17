import * as THREE from 'three';

/**
 * Luna 16 / 20 / 24 Tier 1 — first robotic lunar sample return
 * (PRD-014 / RFC-017 §S7a, ADR-062).
 *
 * Two-stage stack: descent stage with 4 splayed legs + propellant
 * tanks + drill arm, topped by the ascent stage with the sample-
 * return capsule. The descent stage stays on the surface (which is
 * what LROC sees today); the ascent stage launches the capsule
 * back to Earth.
 *
 * Dimensions sourced from Lavochkin / Soviet Academy public
 * archives:
 *   - Descent stage: ~4 m tall × ~4 m wide.
 *   - Sample-extraction drill: extends ~0.9 m from the rotating arm.
 *   - Ascent stage: cylindrical body + spherical capsule at the top.
 */

const SOVIET_SILVER = 0xcdd0cc;
const TANK_GREEN = 0x4e5a44;
const ALU = 0x9a9a9a;

function bodyMat(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color: SOVIET_SILVER, metalness: 0.75, roughness: 0.4 });
}
function tankMat(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color: TANK_GREEN, metalness: 0.5, roughness: 0.5 });
}
function aluMat(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color: ALU, metalness: 0.8, roughness: 0.3 });
}

export function buildLunaSampleReturnHotspot(accentColor: string): THREE.Group {
  const g = new THREE.Group();
  // Descent stage — cylindrical core with 4 spherical propellant
  // tanks at the cardinal positions.
  const core = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.3, 12), bodyMat());
  core.position.y = 0.3;
  g.add(core);
  for (let i = 0; i < 4; i++) {
    const ang = (i / 4) * Math.PI * 2;
    const tank = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 8), tankMat());
    tank.position.set(Math.cos(ang) * 0.26, 0.28, Math.sin(ang) * 0.26);
    g.add(tank);
  }

  // 4 splayed legs.
  for (let i = 0; i < 4; i++) {
    const ang = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.42, 6), aluMat());
    leg.position.set(Math.cos(ang) * 0.3, 0.18, Math.sin(ang) * 0.3);
    leg.rotation.z = -Math.cos(ang) * 0.6;
    leg.rotation.x = Math.sin(ang) * 0.6;
    g.add(leg);
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.015, 8), aluMat());
    pad.position.set(Math.cos(ang) * 0.5, 0.02, Math.sin(ang) * 0.5);
    g.add(pad);
  }

  // Sample-extraction drill arm — rotates out from one side.
  const armBase = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.04), aluMat());
  armBase.position.set(0.26, 0.4, 0);
  g.add(armBase);
  const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.32, 6), aluMat());
  arm.rotation.z = -Math.PI / 3;
  arm.position.set(0.42, 0.32, 0);
  g.add(arm);
  // Drill bit at the end.
  const drill = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.06, 8), aluMat());
  drill.rotation.x = Math.PI;
  drill.position.set(0.56, 0.16, 0);
  g.add(drill);

  // Ascent stage cylindrical body — sits on top of the descent core.
  const ascent = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.22, 12), bodyMat());
  ascent.position.y = 0.62;
  g.add(ascent);
  // Sample return capsule — spherical, on top of the ascent stage.
  const capsule = new THREE.Mesh(new THREE.SphereGeometry(0.1, 16, 12), aluMat());
  capsule.position.y = 0.82;
  g.add(capsule);

  // Agency accent ring.
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.28, 0.012, 6, 24),
    new THREE.MeshStandardMaterial({
      color: accentColor,
      metalness: 0.4,
      roughness: 0.4,
      emissive: accentColor,
      emissiveIntensity: 0.3,
    }),
  );
  ring.position.y = 0.3;
  ring.rotation.x = Math.PI / 2;
  g.add(ring);
  return g;
}
