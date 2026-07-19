import * as THREE from 'three';
import { strutBetween } from '../three/model-geom';

/**
 * Viking 1 + Viking 2 Tier 1 engineering model (PRD-014 / RFC-017 §S4,
 * ADR-062).
 *
 * Both Viking landers were structurally identical — a hexagonal body
 * on three splayed legs with two RTG canisters, a single high-gain
 * dish antenna, a sample-acquisition arm, and a meteorology mast.
 *
 * Dimensions sourced from public NASA technical reports:
 *   - Hex body: 1.5 m diagonal × 0.46 m tall (NASA TM X-72792 Viking
 *     Lander System Reference Handbook).
 *   - Leg span: ~2.2 m tip-to-tip on the regolith.
 *   - RTG canisters: 2 × ~0.6 m long, mounted top-right and top-left.
 *   - High-gain dish: 0.91 m diameter on a tilt-stowed mast.
 *   - Sample arm: 3 m extended reach, tucked along the body in
 *     stowed pose.
 *
 * Used for both viking1-lander and viking2-lander site ids — no
 * variant needed.
 */

const VIKING_GOLD = 0xb89556;
const RTG_GRAY = 0x666666;
const ALU = 0x9a9a9a;
const SILVER = 0xc0c0c0;

function bodyMat(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: VIKING_GOLD,
    metalness: 0.7,
    roughness: 0.4,
    emissive: VIKING_GOLD,
    emissiveIntensity: 0.05,
  });
}

function rtgMat(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color: RTG_GRAY, metalness: 0.6, roughness: 0.6 });
}

function aluMat(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color: ALU, metalness: 0.7, roughness: 0.45 });
}

function silverMat(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color: SILVER, metalness: 0.85, roughness: 0.3 });
}

export function buildVikingTripodHotspot(_accentColor: string): THREE.Group {
  const g = new THREE.Group();
  // Hex body — CylinderGeometry with 6 segments.
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.18, 6), bodyMat());
  body.position.y = 0.22;
  g.add(body);

  // 3 splayed legs spaced 120° apart.
  for (let i = 0; i < 3; i++) {
    const ang = (i / 3) * Math.PI * 2;
    const c = Math.cos(ang);
    const s = Math.sin(ang);
    // Footpad on the surface.
    const padPos = new THREE.Vector3(c * 0.44, 0.03, s * 0.44);
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.025, 10), aluMat());
    pad.position.copy(padPos);
    g.add(pad);
    // Primary leg strut — body edge → pad (physically connected).
    g.add(strutBetween(new THREE.Vector3(c * 0.24, 0.24, s * 0.24), padPos, 0.018, aluMat(), 6));
    // A-frame brace — lower inboard point → pad.
    g.add(strutBetween(new THREE.Vector3(c * 0.14, 0.1, s * 0.14), padPos, 0.013, aluMat(), 6));
  }

  // Two RTG canisters mounted on top.
  for (const dx of [-0.15, 0.15]) {
    const rtg = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.22, 8), rtgMat());
    rtg.position.set(dx, 0.42, -0.18);
    rtg.rotation.x = Math.PI / 2;
    g.add(rtg);
  }

  // High-gain dish on a vertical mast.
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.32, 4), aluMat());
  mast.position.set(0.18, 0.46, 0);
  g.add(mast);
  const dish = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.012, 16), silverMat());
  dish.position.set(0.18, 0.6, 0);
  dish.rotation.x = Math.PI / 3;
  g.add(dish);

  // Sample-acquisition arm — stowed along the body's leading edge.
  const arm = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.32), aluMat());
  arm.position.set(0, 0.34, 0.2);
  arm.rotation.x = -0.3;
  g.add(arm);

  // Meteorology mast — short vertical pole with a small sensor block.
  const metMast = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.16, 4), aluMat());
  metMast.position.set(-0.22, 0.4, 0);
  g.add(metMast);
  const metHead = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 0.03), aluMat());
  metHead.position.set(-0.22, 0.5, 0);
  g.add(metHead);

  return g;
}
