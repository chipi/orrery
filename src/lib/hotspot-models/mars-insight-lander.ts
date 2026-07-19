import * as THREE from 'three';
import { strutBetween } from '../three/model-geom';

/**
 * InSight Tier 1 engineering model — Phoenix-derived stationary lander.
 * (PRD-014 / RFC-017 §S4, ADR-062).
 *
 * InSight (Interior Exploration using Seismic Investigations, Geodesy and
 * Heat Transport) landed Elysium Planitia, 2018. It shares the Lockheed
 * Martin lander bus with Phoenix but differs visually:
 *   1. TWO large decagonal (10-sided) solar panels — roughly 2.2 m dia,
 *      significantly larger / rounder than Phoenix's circular panels.
 *   2. SEIS seismometer: a shallow dome-shaped Wind & Thermal Shield
 *      (WTS) placed on the ground adjacent to the lander, connected by
 *      a tether cable.
 *   3. HP³ "mole" heat probe: a small rectangular module also placed
 *      on the ground, other side from the SEIS dome.
 *   4. Robotic arm (IDA) for deploying SEIS + HP³ to the surface.
 *   5. UHF antenna mast (short stub) for relay to MRO / ODY.
 *
 * Dimensions from NASA InSight Press Kit (Nov 2018) + InSight Instrument
 * Deployment Report (JGR Planets, 2020).
 * Body flat-to-flat: ~1.56 m; modelled ≈ 1.4 u incl. panels.
 */

const PHOENIX_GRAY = 0xb8b8b8;
const SOLAR_BLUE = 0x152040;
const ALU = 0x9a9a9a;
const DOME_TAN = 0xc8b878; // WTS cover is hexagonal tan-coloured fibreglass

function bodyMat(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color: PHOENIX_GRAY, metalness: 0.65, roughness: 0.5 });
}
function solarMat(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: SOLAR_BLUE,
    metalness: 0.4,
    roughness: 0.3,
    emissive: SOLAR_BLUE,
    emissiveIntensity: 0.08,
  });
}
function aluMat(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color: ALU, metalness: 0.75, roughness: 0.4 });
}
function domeMat(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color: DOME_TAN, metalness: 0.2, roughness: 0.75 });
}

export function buildInsightLanderHotspot(accentColor: string): THREE.Group {
  void accentColor; // reserved for future accent-colour theming

  const g = new THREE.Group();
  const groundY = 0.0;
  const bodyY = 0.3; // deck sits ~30 cm off ground on 3 legs

  // ── Hexagonal body (lander deck) ──────────────────────────────────────
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.09, 6), bodyMat());
  body.position.y = bodyY;
  g.add(body);

  // ── 3 landing legs at 120° — use strutBetween so each strut physically
  //    connects the body side to the footpad on the ground. ──────────────
  for (let i = 0; i < 3; i++) {
    const ang = (i / 3) * Math.PI * 2;
    const c = Math.cos(ang);
    const s = Math.sin(ang);

    // Footpad on the ground.
    const padPos = new THREE.Vector3(c * 0.32, groundY + 0.02, s * 0.32);
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.02, 10), aluMat());
    pad.position.copy(padPos);
    g.add(pad);

    // Primary leg strut: body-edge to pad.
    const legTop = new THREE.Vector3(c * 0.17, bodyY - 0.04, s * 0.17);
    g.add(strutBetween(legTop, padPos, 0.017, aluMat(), 6));

    // Diagonal brace for stiffness (connects a mid-body point to the pad).
    const braceTop = new THREE.Vector3(c * 0.09, bodyY - 0.1, s * 0.09);
    g.add(strutBetween(braceTop, padPos, 0.012, aluMat(), 6));
  }

  // ── Two decagonal solar panels (port + starboard) ─────────────────────
  // InSight panels are ~2.2 m dia — modelled as 10-sided discs, larger
  // and more circular than Phoenix's smaller panels.
  for (const dx of [-0.52, 0.52]) {
    const panel = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.009, 10), solarMat());
    panel.position.set(dx, bodyY + 0.04, 0);
    panel.rotation.x = Math.PI / 2;
    g.add(panel);
    // Short arm connecting body to panel.
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.02, 0.03), aluMat());
    arm.position.set(dx / 2, bodyY + 0.04, 0);
    g.add(arm);
  }

  // ── Robotic arm (IDA) — stowed along port-forward deck edge ──────────
  const armUpper = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.24), aluMat());
  armUpper.position.set(-0.04, bodyY + 0.065, 0.19);
  armUpper.rotation.x = -0.3;
  g.add(armUpper);
  // Arm elbow / lower segment.
  const armLower = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.035, 0.14), aluMat());
  armLower.position.set(-0.04, bodyY + 0.0, 0.34);
  armLower.rotation.x = 0.35;
  g.add(armLower);
  // Arm grapple (IDC + IDA end effector).
  const grapple = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.04, 0.04), aluMat());
  grapple.position.set(-0.04, bodyY - 0.02, 0.41);
  g.add(grapple);

  // ── UHF antenna mast ──────────────────────────────────────────────────
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.2, 4), aluMat());
  mast.position.set(0.1, bodyY + 0.15, -0.06);
  g.add(mast);
  const uhfAnt = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.008, 8), aluMat());
  uhfAnt.position.set(0.1, bodyY + 0.26, -0.06);
  g.add(uhfAnt);

  // ── SEIS seismometer (Wind & Thermal Shield dome) on the ground ───────
  // The dome sits on the Martian surface, connected back to the lander by
  // a thin tether cable. It's InSight's most distinctive visual feature.
  const seisPos = new THREE.Vector3(0.38, groundY, 0.28);
  // Dome (SphereGeometry half): shallow hemisphere representing the WTS.
  const seisBase = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.015, 12), domeMat());
  seisBase.position.set(seisPos.x, groundY + 0.01, seisPos.z);
  g.add(seisBase);
  const wts = new THREE.Mesh(
    new THREE.SphereGeometry(0.07, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2),
    domeMat(),
  );
  wts.position.set(seisPos.x, groundY + 0.015, seisPos.z);
  g.add(wts);
  // Tether: thin strut from lander body-edge down to near the dome.
  const tetherStart = new THREE.Vector3(0.17, bodyY - 0.02, 0.1);
  const tetherEnd = new THREE.Vector3(seisPos.x - 0.04, groundY + 0.02, seisPos.z - 0.04);
  g.add(strutBetween(tetherStart, tetherEnd, 0.005, aluMat(), 4));

  // ── HP³ "mole" heat probe module on the ground (opposite side) ────────
  const hp3Pos = new THREE.Vector3(-0.35, groundY, 0.26);
  const hp3Box = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.05, 0.07), aluMat());
  hp3Box.position.set(hp3Pos.x, groundY + 0.025, hp3Pos.z);
  g.add(hp3Box);
  // HP³ mole probe spike protruding down into the ground (tip just visible).
  const mole = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.006, 0.06, 6), aluMat());
  mole.position.set(hp3Pos.x, groundY - 0.01, hp3Pos.z);
  g.add(mole);
  // HP³ tether.
  const hp3TetherStart = new THREE.Vector3(-0.17, bodyY - 0.02, 0.1);
  const hp3TetherEnd = new THREE.Vector3(hp3Pos.x + 0.04, groundY + 0.03, hp3Pos.z - 0.03);
  g.add(strutBetween(hp3TetherStart, hp3TetherEnd, 0.005, aluMat(), 4));

  return g;
}
