import * as THREE from 'three';

/**
 * Curiosity + Perseverance Tier 1 engineering model — MSL-class rover
 * (PRD-014 / RFC-017 §S4, ADR-062).
 *
 * MSL-class (Curiosity, Perseverance): ~3 m long × 2.7 m wide × 2.2 m
 * tall to the top of the mast head. RTG-powered (no solar panels, the
 * biggest visual departure from MER). 6 wheels on rocker-bogie, large
 * tube-and-spoke 50 cm diameter wheels. Robot arm with drill on the
 * front, mast with Mastcam-Z (Perseverance) or Mastcam (Curiosity).
 *
 * Perseverance variant adds a paired Ingenuity helicopter sitting
 * beside the rover. The `withIngenuity` flag toggles this.
 *
 * Dimensions sourced from NASA RP-2012-MSL Mission Reference Handbook
 * + NASA Perseverance Press Kit (Feb 2021).
 */

const MSL_BODY = 0xa8a8a8;
const RTG_GRAY = 0x4a4a4a;
const TYRE = 0x282828;
const ALU = 0x9a9a9a;
const HELI_BODY = 0xe6e6e6;

function bodyMat(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color: MSL_BODY, metalness: 0.65, roughness: 0.5 });
}
function rtgMat(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: RTG_GRAY,
    metalness: 0.7,
    roughness: 0.4,
    emissive: 0x331111,
    emissiveIntensity: 0.15, // subtle warm glow — the RTG is hot
  });
}
function tyreMat(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color: TYRE, metalness: 0.3, roughness: 0.85 });
}
function aluMat(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color: ALU, metalness: 0.75, roughness: 0.4 });
}
function heliMat(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color: HELI_BODY, metalness: 0.5, roughness: 0.5 });
}

function buildIngenuity(): THREE.Group {
  const g = new THREE.Group();
  // Body — small box on 4 legs.
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.05, 0.07), heliMat());
  body.position.y = 0.05;
  g.add(body);
  // Solar panel on top.
  const solar = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.005, 0.08), bodyMat());
  solar.position.y = 0.09;
  g.add(solar);
  // 4 legs.
  for (const dx of [-0.025, 0.025]) {
    for (const dz of [-0.025, 0.025]) {
      const l = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.05, 4), aluMat());
      l.position.set(dx, 0.025, dz);
      g.add(l);
    }
  }
  // Two stacked rotors (coaxial).
  for (const dy of [0.12, 0.16]) {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.004, 0.01), aluMat());
    blade.position.y = dy;
    g.add(blade);
    const blade2 = blade.clone();
    blade2.rotation.y = Math.PI / 2;
    g.add(blade2);
  }
  return g;
}

export function buildCuriosityClassHotspot(
  accentColor: string,
  options?: { withIngenuity?: boolean },
): THREE.Group {
  const g = new THREE.Group();
  const wheelR = 0.06;
  const withIngenuity = options?.withIngenuity ?? false;

  // Main electronics chassis — the MSL "WEB".
  const web = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.16, 0.32), bodyMat());
  web.position.y = wheelR + 0.1;
  g.add(web);

  // RTG canister on the rear of the rover — distinctive cylindrical
  // bulge protruding rearward. The single most recognisable visual
  // feature distinguishing MSL-class from solar MER.
  const rtg = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.2, 16), rtgMat());
  rtg.rotation.z = Math.PI / 2;
  rtg.position.set(-0.31, wheelR + 0.12, 0);
  g.add(rtg);
  // RTG cooling fins — short radial lamellae.
  for (let i = 0; i < 8; i++) {
    const ang = (i / 8) * Math.PI * 2;
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.005, 0.04), rtgMat());
    fin.position.set(-0.31, wheelR + 0.12, 0);
    fin.rotation.x = ang;
    g.add(fin);
  }

  // 6 wheels — large tube-and-spoke, rocker-bogie suspension.
  for (const dx of [-0.18, 0, 0.18]) {
    for (const dz of [-0.19, 0.19]) {
      const w = new THREE.Mesh(new THREE.CylinderGeometry(wheelR, wheelR, 0.06, 16), tyreMat());
      w.rotation.z = Math.PI / 2;
      w.position.set(dx, wheelR, dz);
      g.add(w);
    }
  }

  // Camera mast — Mastcam(-Z) head on a tall pole.
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.4, 4), aluMat());
  mast.position.set(0.17, wheelR + 0.36, 0);
  g.add(mast);
  // Mastcam head — horizontal cylinder with two "eye" caps + RMI laser.
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.04, 0.04), aluMat());
  head.position.set(0.17, wheelR + 0.58, 0);
  g.add(head);

  // Robot arm + drill on the forward edge — stowed.
  const arm = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.28), aluMat());
  arm.position.set(0.05, wheelR + 0.1, 0.26);
  arm.rotation.x = -0.4;
  g.add(arm);
  // Drill / turret on the end of the arm.
  const turret = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.06, 8), aluMat());
  turret.position.set(0.05, wheelR + 0.0, 0.38);
  g.add(turret);

  // High-gain antenna disc on the rear-port deck.
  const hga = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.01, 12), aluMat());
  hga.position.set(-0.15, wheelR + 0.2, 0.16);
  hga.rotation.x = Math.PI / 2.4;
  g.add(hga);

  if (withIngenuity) {
    const ingenuity = buildIngenuity();
    ingenuity.position.set(0.6, 0, 0.2);
    g.add(ingenuity);
  }

  return g;
}
