import * as THREE from 'three';
import { strutBetween } from '../three/model-geom';
import { heroSolar } from '../three/hero-materials';

/**
 * Phoenix + InSight Tier 1 engineering model — Phoenix-class lander
 * (PRD-014 / RFC-017 §S4, ADR-062).
 *
 * Phoenix (Vastitas Borealis, 2008) and InSight (Elysium Planitia,
 * 2018) shared the same Lockheed Martin lander bus design. Static
 * (no wheels): hexagonal body on 3 splayed legs, two circular solar
 * panels deployed left + right, a robotic arm with scoop / SEIS seismometer
 * + heat probe (HP³), high-gain dish on a mast.
 *
 * Dimensions sourced from NASA SP-2009-13 (Phoenix Mission Reference
 * Handbook) + NASA InSight Press Kit (Nov 2018).
 */

const PHOENIX_GRAY = 0xb8b8b8;
const ALU = 0x9a9a9a;

function bodyMat(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color: PHOENIX_GRAY, metalness: 0.65, roughness: 0.5 });
}
function solarMat(): THREE.MeshStandardMaterial {
  return heroSolar();
}
function aluMat(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color: ALU, metalness: 0.75, roughness: 0.4 });
}

export function buildPhoenixClassHotspot(_accentColor: string): THREE.Group {
  const g = new THREE.Group();

  // Hex body — the "deck" carrying instruments.
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.08, 6), bodyMat());
  body.position.y = 0.28;
  g.add(body);

  // 3 splayed legs (120° apart).
  for (let i = 0; i < 3; i++) {
    const ang = (i / 3) * Math.PI * 2;
    const c = Math.cos(ang);
    const s = Math.sin(ang);
    const padPos = new THREE.Vector3(c * 0.3, 0.03, s * 0.3);
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.02, 10), aluMat());
    pad.position.copy(padPos);
    g.add(pad);
    // Leg strut + brace, both physically connecting the body to the pad.
    g.add(strutBetween(new THREE.Vector3(c * 0.16, 0.22, s * 0.16), padPos, 0.016, aluMat(), 6));
    g.add(strutBetween(new THREE.Vector3(c * 0.08, 0.1, s * 0.08), padPos, 0.012, aluMat(), 6));
  }

  // Two circular solar panels (port + starboard).
  for (const dx of [-0.42, 0.42]) {
    const panel = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.008, 24), solarMat());
    panel.position.set(dx, 0.34, 0);
    panel.rotation.x = Math.PI / 2;
    g.add(panel);
    // Solar-panel arm — short strut from the body to the panel centre.
    const armToPanel = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.02, 0.03), aluMat());
    armToPanel.position.set(dx / 2, 0.34, 0);
    g.add(armToPanel);
  }

  // Robotic arm with scoop / instrument turret stowed along the body's
  // forward edge.
  const arm = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.26), aluMat());
  arm.position.set(0, 0.34, 0.18);
  arm.rotation.x = -0.4;
  g.add(arm);
  // Scoop / instrument turret.
  const scoop = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.04, 0.04), aluMat());
  scoop.position.set(0, 0.22, 0.34);
  g.add(scoop);

  // SEIS / HP³ instruments on the deck (small cylindrical bulges
  // — the seismometer dome + heat-probe block; InSight had both,
  // Phoenix had a different mix but the same silhouette reads).
  const seis = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.03, 12), aluMat());
  seis.position.set(-0.08, 0.34, -0.04);
  g.add(seis);
  const hp3 = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.03, 0.06), aluMat());
  hp3.position.set(0.08, 0.34, -0.04);
  g.add(hp3);

  // High-gain antenna on a vertical mast.
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.24, 4), aluMat());
  mast.position.set(0, 0.46, 0);
  g.add(mast);
  const dish = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.008, 16), aluMat());
  dish.position.set(0, 0.6, 0);
  dish.rotation.x = Math.PI / 3;
  g.add(dish);

  return g;
}
