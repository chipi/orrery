import * as THREE from 'three';

/**
 * Luna 9 Tier 1 engineering model — first soft lunar landing
 * (Oceanus Procellarum, 3 Feb 1966) — PRD-014 / RFC-017 §S7a,
 * ADR-062.
 *
 * The capsule was a 58 cm aluminium sphere ejected from the
 * descent stage moments before impact; it cushioned by airbags,
 * then opened four petal-shaped covers to right itself and reveal
 * the camera + radio. Iconic flower-on-the-regolith silhouette.
 *
 * Dimensions sourced from Lavochkin / Soviet Academy public
 * archives:
 *   - Capsule sphere: 58 cm diameter, ~99 kg.
 *   - 4 petal covers: ~30 cm radius each, springs them open after
 *     landing to expose the imaging head + radio antennas.
 *   - Imaging head: small cylindrical dome on top of the body.
 *   - 2 whip antennas extending from the body sides.
 */

const SOVIET_SILVER = 0xcdd0cc;
const PETAL_GOLD = 0xc5a86a;
const DARK = 0x1f1f1f;

function bodyMat(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color: SOVIET_SILVER, metalness: 0.8, roughness: 0.35 });
}
function petalMat(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: PETAL_GOLD,
    metalness: 0.6,
    roughness: 0.5,
    side: THREE.DoubleSide,
  });
}
function darkMat(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color: DARK, metalness: 0.4, roughness: 0.7 });
}

export function buildLuna9Hotspot(accentColor: string): THREE.Group {
  const g = new THREE.Group();
  // Central capsule body — sphere on the regolith.
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.28, 24, 16), bodyMat());
  body.position.y = 0.28;
  g.add(body);

  // 4 open petals — flat triangular plates angled outward.
  for (let i = 0; i < 4; i++) {
    const ang = (i / 4) * Math.PI * 2;
    const petal = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.4, 3), petalMat());
    petal.position.set(Math.cos(ang) * 0.36, 0.05, Math.sin(ang) * 0.36);
    petal.rotation.y = ang;
    petal.rotation.x = Math.PI / 2;
    g.add(petal);
  }

  // Imaging head on top — small cylindrical dome.
  const head = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.1, 12), bodyMat());
  head.position.y = 0.58;
  g.add(head);
  // Camera lens — small dark disc on the head's side.
  const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.012, 12), darkMat());
  lens.rotation.x = Math.PI / 2;
  lens.position.set(0.08, 0.6, 0);
  g.add(lens);

  // 2 whip antennas (long, thin).
  for (const ang of [Math.PI / 3, -Math.PI / 3]) {
    const whip = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.4, 4), bodyMat());
    whip.rotation.z = ang;
    whip.position.set(Math.sin(ang) * 0.2, 0.45, 0);
    g.add(whip);
  }

  // Agency accent ring around the base.
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.32, 0.012, 6, 24),
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
