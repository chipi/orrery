import * as THREE from 'three';

/**
 * Mars Pathfinder + Sojourner Tier 1 engineering model — paired
 * (PRD-014 / RFC-017 §S4, ADR-062).
 *
 * Pathfinder = tetrahedral lander with 4 hinged petals (one base +
 * three petals folded down on the regolith after airbag bounce-
 * delivery, July 1997). Sojourner = the small 6-wheel rover that
 * drove off the petal ramp. They're shown together at the same
 * site — Sojourner parked beside the lander base.
 *
 * Dimensions sourced from public NASA technical reports:
 *   - Pathfinder petals: each ~1.5 m × 1.5 m, deployed flat on
 *     surface (NASA Reference Publication 1404).
 *   - Pathfinder body sits ~0.5 m above surface at the petal hinge.
 *   - High-gain antenna + low-gain antenna + ASI/MET mast on top.
 *   - Sojourner: 65 cm × 48 cm × 30 cm, 6 wheels, solar-panel top.
 *
 * Engineering-blueprint aesthetic. Sojourner is tiny relative to
 * Pathfinder — at Tier 1 zoom it reads as a small accent beside the
 * triangular petal lander.
 */

const PATH_GRAY = 0xa6a6a0;
const PETAL_BEIGE = 0xc4b896;
const SOLAR_BLUE = 0x152040;
const ALU = 0x9a9a9a;

function bodyMat(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color: PATH_GRAY, metalness: 0.65, roughness: 0.5 });
}
function petalMat(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: PETAL_BEIGE,
    metalness: 0.5,
    roughness: 0.6,
    side: THREE.DoubleSide,
  });
}
function solarMat(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: SOLAR_BLUE,
    metalness: 0.4,
    roughness: 0.3,
    emissive: SOLAR_BLUE,
    emissiveIntensity: 0.1,
  });
}
function aluMat(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color: ALU, metalness: 0.75, roughness: 0.4 });
}

function buildSojourner(): THREE.Group {
  const g = new THREE.Group();
  // Body — small slab with solar-panel top.
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.04, 0.11), bodyMat());
  body.position.y = 0.04;
  g.add(body);
  const solar = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.005, 0.13), solarMat());
  solar.position.y = 0.07;
  g.add(solar);
  // 6 wheels (3 per side).
  for (const dx of [-0.05, 0, 0.05]) {
    for (const dz of [-0.055, 0.055]) {
      const w = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.015, 8), aluMat());
      w.rotation.z = Math.PI / 2;
      w.position.set(dx, 0.018, dz);
      g.add(w);
    }
  }
  return g;
}

export function buildPathfinderSojournerHotspot(accentColor: string): THREE.Group {
  const g = new THREE.Group();

  // Base body (the lower tetrahedron section sitting on the regolith).
  const base = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.18, 0.4), bodyMat());
  base.position.y = 0.16;
  g.add(base);

  // 3 deployed petals — flat triangular plates angled down to the
  // surface on three sides. Use plain triangles via BufferGeometry
  // would be cleanest but BoxGeometry rotated to look petal-like is
  // close enough at Tier 1 scale.
  for (let i = 0; i < 3; i++) {
    const ang = (i / 3) * Math.PI * 2;
    const petal = new THREE.Mesh(new THREE.ConeGeometry(0.36, 0.42, 3), petalMat());
    petal.position.set(Math.cos(ang) * 0.34, 0.04, Math.sin(ang) * 0.34);
    petal.rotation.y = ang + Math.PI / 6;
    petal.rotation.x = Math.PI / 2;
    g.add(petal);
  }

  // High-gain antenna stowed mast + dish on top.
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.32, 4), aluMat());
  mast.position.set(0, 0.42, 0);
  g.add(mast);
  const dish = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.01, 16), aluMat());
  dish.position.set(0, 0.6, 0);
  dish.rotation.x = Math.PI / 3;
  g.add(dish);

  // ASI/MET mast — sparse Mars-meteorology pole on the side.
  const metMast = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.28, 4), aluMat());
  metMast.position.set(0.16, 0.39, 0.1);
  g.add(metMast);

  // Sojourner — parked off one petal.
  const sojourner = buildSojourner();
  sojourner.position.set(0.5, 0.0, 0.15);
  g.add(sojourner);

  // Agency accent ring around the base.
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.42, 0.012, 6, 24),
    new THREE.MeshStandardMaterial({
      color: accentColor,
      metalness: 0.4,
      roughness: 0.4,
      emissive: accentColor,
      emissiveIntensity: 0.3,
    }),
  );
  ring.position.y = 0.08;
  ring.rotation.x = Math.PI / 2;
  g.add(ring);
  return g;
}
