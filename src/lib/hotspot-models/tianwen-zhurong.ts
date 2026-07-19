import * as THREE from 'three';
import { strutBetween } from '../three/model-geom';
import { heroSolar } from '../three/hero-materials';

/**
 * Tianwen-1 lander + Zhurong rover Tier 1 (Utopia Planitia, 14 May
 * 2021) — first Chinese Mars landing. PRD-014 / RFC-017 §S7b,
 * ADR-062.
 *
 * Composite scene: rectangular lander on 4 splayed legs (sits on the
 * surface where the rover deployed from), Zhurong rover (~3 m long,
 * 6 wheels, large square solar panels) parked beside it.
 *
 * Dimensions sourced from CMSA + Chinese Academy of Sciences public
 * imagery.
 */

const CMSA_GOLD = 0xc7a04e;
const TYRE = 0x303030;
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
function solarMat(): THREE.MeshStandardMaterial {
  return heroSolar();
}
function tyreMat(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color: TYRE, metalness: 0.3, roughness: 0.85 });
}
function aluMat(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color: ALU, metalness: 0.75, roughness: 0.4 });
}

function buildZhurong(): THREE.Group {
  const g = new THREE.Group();
  const wheelR = 0.045;
  // Chassis.
  const chassis = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.08, 0.2), bodyMat());
  chassis.position.y = wheelR + 0.07;
  g.add(chassis);
  // 6 wheels.
  for (const dx of [-0.13, 0, 0.13]) {
    for (const dz of [-0.13, 0.13]) {
      const w = new THREE.Mesh(new THREE.CylinderGeometry(wheelR, wheelR, 0.045, 12), tyreMat());
      w.rotation.z = Math.PI / 2;
      w.position.set(dx, wheelR, dz);
      g.add(w);
    }
  }
  // 4 large square butterfly solar panels (Zhurong's distinctive
  // feature — 4 wings deployed from chassis like flower petals).
  for (let i = 0; i < 4; i++) {
    const ang = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const wing = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.005, 0.16), solarMat());
    wing.position.set(Math.cos(ang) * 0.2, wheelR + 0.16, Math.sin(ang) * 0.2);
    g.add(wing);
  }
  // Camera mast.
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.2, 4), aluMat());
  mast.position.set(0.08, wheelR + 0.22, 0);
  g.add(mast);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.025, 0.025), aluMat());
  head.position.set(0.08, wheelR + 0.34, 0);
  g.add(head);
  return g;
}

export function buildTianwenZhurongHotspot(_accentColor: string): THREE.Group {
  const g = new THREE.Group();

  // Tianwen-1 lander — boxy body on 4 legs (similar form factor to
  // Chang'e but on Mars instead of Moon).
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.2, 0.34), bodyMat());
  body.position.y = 0.32;
  g.add(body);
  for (let i = 0; i < 4; i++) {
    const ang = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const c = Math.cos(ang);
    const s = Math.sin(ang);
    const padPos = new THREE.Vector3(c * 0.42, 0.03, s * 0.42);
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.02, 10), aluMat());
    pad.position.copy(padPos);
    g.add(pad);
    // Leg strut + brace, both physically connecting the body to the pad.
    g.add(strutBetween(new THREE.Vector3(c * 0.22, 0.3, s * 0.22), padPos, 0.018, aluMat(), 6));
    g.add(strutBetween(new THREE.Vector3(c * 0.12, 0.16, s * 0.12), padPos, 0.013, aluMat(), 6));
  }
  // Deployment ramp — slanted plate on one side (Zhurong drove down
  // this).
  const ramp = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.01, 0.3), aluMat());
  ramp.position.set(0.35, 0.1, 0);
  ramp.rotation.z = -Math.PI / 6;
  g.add(ramp);

  // Zhurong rover parked off the ramp.
  const zhurong = buildZhurong();
  zhurong.position.set(0.7, 0, 0);
  g.add(zhurong);

  return g;
}
