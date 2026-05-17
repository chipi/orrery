import * as THREE from 'three';

/**
 * Lunokhod 1 / Lunokhod 2 Tier 1 — first remote-controlled rovers on
 * another world (Luna 17, 1970; Luna 21, 1973). PRD-014 / RFC-017
 * §S7a, ADR-062.
 *
 * The "bathtub on wheels" silhouette: bathtub-shaped pressure body
 * with the hinged lid open showing the solar panel underside,
 * 8-wheel articulated suspension (4 per side), conical laser
 * retroreflector + antennas on top.
 *
 * Dimensions sourced from Soviet Academy public archives:
 *   - Body: 2.15 m long × 1.6 m wide × 0.7 m tall (lid closed).
 *   - 8 wheels, 51 cm diameter, wire-mesh construction.
 *   - Hinged lid carries the upper-side solar panels (opened in
 *     lunar day, closed in lunar night to retain heat).
 *   - Cone-shaped laser retroreflector + 2 antennas on top.
 */

const SOVIET_SILVER = 0xcdd0cc;
const SOLAR_DARK = 0x1a2a40;
const TYRE = 0x303030;
const ALU = 0x9a9a9a;

function bodyMat(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color: SOVIET_SILVER, metalness: 0.75, roughness: 0.4 });
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
function tyreMat(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color: TYRE, metalness: 0.3, roughness: 0.85 });
}
function aluMat(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color: ALU, metalness: 0.8, roughness: 0.3 });
}

export function buildLunokhodHotspot(accentColor: string): THREE.Group {
  const g = new THREE.Group();
  const wheelR = 0.045;

  // Bathtub body — wider than tall, slightly tapered at the front.
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.12, 0.28), bodyMat());
  body.position.y = wheelR + 0.07;
  g.add(body);

  // 8 wheels — 4 per side, evenly spaced.
  for (const dx of [-0.18, -0.06, 0.06, 0.18]) {
    for (const dz of [-0.16, 0.16]) {
      const w = new THREE.Mesh(new THREE.CylinderGeometry(wheelR, wheelR, 0.035, 12), tyreMat());
      w.rotation.z = Math.PI / 2;
      w.position.set(dx, wheelR, dz);
      g.add(w);
    }
  }

  // Hinged solar-panel lid (opened state, angled up + back to catch
  // sun). Lid rotates around the rear hinge by ~30° back from
  // horizontal.
  const lid = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.01, 0.26), solarMat());
  lid.position.set(0.04, wheelR + 0.15, 0);
  lid.rotation.z = Math.PI / 8;
  g.add(lid);

  // Conical laser retroreflector on top — the French-built
  // retroreflector used for laser ranging from Earth.
  const reflector = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.07, 8), aluMat());
  reflector.position.set(-0.12, wheelR + 0.16, 0);
  g.add(reflector);

  // 2 antennas — one short whip + one taller dish-mount.
  const whip = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.16, 4), aluMat());
  whip.position.set(0.18, wheelR + 0.16, 0.1);
  g.add(whip);
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.2, 4), aluMat());
  mast.position.set(0.18, wheelR + 0.18, -0.1);
  g.add(mast);

  // Agency accent ring around the body.
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.3, 0.01, 6, 24),
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
