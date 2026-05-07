/**
 * Diagrammatic Tiangong assembly for /tiangong (ADR-048 proxy). Code-built
 * geometry so each canonical module id from `tiangong-modules.json` /
 * `tiangong-visitors.json` maps to a named pickable mesh
 * (`userData.moduleId`, `userData.stationPickable` per ADR-049).
 *
 * Layout: T-silhouette. Tianhe forms the long axis of the T (along X);
 * Wentian + Mengtian form the perpendicular cross-bar (along Y) attached
 * at Tianhe's forward node. Shenzhou docks at Tianhe's aft port; Tianzhou
 * at the forward-node nadir. Solar wings outboard on each lab.
 */
import * as THREE from 'three';
import { setShadowFlags, cylinderBetween, makeWingPair } from './station-geometry';

export const TIANGONG_MODULE_IDS = ['tianhe', 'wentian', 'mengtian', 'chinarm'] as const;
export type TiangongModuleMeshId = (typeof TIANGONG_MODULE_IDS)[number];

export const TIANGONG_VISITOR_IDS = ['shenzhou', 'tianzhou'] as const;
export type TiangongVisitorId = (typeof TIANGONG_VISITOR_IDS)[number];

const HULL_WHITE = 0xece6dc;
const MLI_GOLD = 0xc8a04c;
const SOLAR_BLUE = 0x1f3e6c;
const ARM_GREY = 0x3a3a40;
const CAPSULE_HULL = 0xd9d2c4;

function makeSolarArrayTexture(): THREE.CanvasTexture {
  const cvs = document.createElement('canvas');
  cvs.width = 64;
  cvs.height = 64;
  const ctx = cvs.getContext('2d')!;
  ctx.fillStyle = '#1f3e6c';
  ctx.fillRect(0, 0, 64, 64);
  ctx.strokeStyle = '#0a1c34';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 64; i += 8) {
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(64, i);
    ctx.stroke();
  }
  for (let i = 0; i <= 64; i += 16) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, 64);
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(80, 130, 200, 0.18)';
  for (let y = 0; y < 64; y += 8) {
    for (let x = 0; x < 64; x += 16) {
      if ((x / 16 + y / 8) % 2 === 0) ctx.fillRect(x + 1, y + 1, 14, 6);
    }
  }
  const tex = new THREE.CanvasTexture(cvs);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

function buildShenzhou(): THREE.Group {
  const g = new THREE.Group();
  g.name = 'visiting_shenzhou';
  const hull = new THREE.MeshStandardMaterial({
    color: CAPSULE_HULL,
    metalness: 0.2,
    roughness: 0.7,
  });
  // Orbital module (forward) — short cylinder
  const orbital = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.12, 12), hull);
  orbital.position.y = 0.32;
  setShadowFlags(orbital);
  g.add(orbital);
  // Descent capsule (mid) — truncated cone
  const descent = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.085, 0.1, 12), hull);
  descent.position.y = 0.18;
  setShadowFlags(descent);
  g.add(descent);
  // Service module (aft) — long cylinder
  const service = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.16, 12), hull);
  service.position.y = 0.04;
  setShadowFlags(service);
  g.add(service);
  // Two wing pairs flanking the service module (Shenzhou has port + starboard arrays).
  const wingPairUpper = new THREE.Group();
  wingPairUpper.position.set(0, 0.04, 0);
  makeWingPair(wingPairUpper, 0.45, 0.18, SOLAR_BLUE);
  g.add(wingPairUpper);
  return g;
}

function buildTianzhou(): THREE.Group {
  const g = new THREE.Group();
  g.name = 'visiting_tianzhou';
  const hull = new THREE.MeshStandardMaterial({
    color: CAPSULE_HULL,
    metalness: 0.2,
    roughness: 0.7,
  });
  // Pressurised cargo section (forward) — large cylinder
  const cargo = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.2, 14), hull);
  cargo.position.y = 0.24;
  setShadowFlags(cargo);
  g.add(cargo);
  // Service module (aft) — slightly smaller cylinder
  const service = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.075, 0.16, 12), hull);
  service.position.y = 0.06;
  setShadowFlags(service);
  g.add(service);
  // One wing pair on service module
  const wingPair = new THREE.Group();
  wingPair.position.set(0, 0.06, 0);
  makeWingPair(wingPair, 0.5, 0.2, SOLAR_BLUE);
  g.add(wingPair);
  return g;
}

export function buildTiangongProxyStation(): THREE.Group {
  const root = new THREE.Group();
  root.name = 'tiangong_proxy_root';

  const hullMat = new THREE.MeshStandardMaterial({
    color: HULL_WHITE,
    metalness: 0.15,
    roughness: 0.82,
  });
  const mliMat = new THREE.MeshStandardMaterial({
    color: MLI_GOLD,
    metalness: 0.55,
    roughness: 0.32,
  });
  const armMat = new THREE.MeshStandardMaterial({
    color: ARM_GREY,
    metalness: 0.4,
    roughness: 0.5,
  });

  // ── Tianhe core (along X-axis, forward node at +X = +1.0) ────────────
  const tianheLen = 2.6;
  const tianheRadius = 0.22;
  const tianhe = new THREE.Mesh(
    new THREE.CylinderGeometry(tianheRadius, tianheRadius, tianheLen, 16),
    hullMat,
  );
  tianhe.rotation.z = Math.PI / 2; // align long axis to X
  tianhe.position.set(0, 0, 0);
  tianhe.userData.stationPickable = true;
  tianhe.userData.moduleId = 'tianhe';
  setShadowFlags(tianhe);
  root.add(tianhe);

  // Tianhe forward node — slightly larger cylinder at the +X end where the
  // T-junction radial ports live.
  const forwardNode = new THREE.Mesh(
    new THREE.CylinderGeometry(tianheRadius * 1.18, tianheRadius * 1.18, 0.28, 14),
    hullMat,
  );
  forwardNode.rotation.z = Math.PI / 2;
  forwardNode.position.set(tianheLen / 2 + 0.14, 0, 0);
  forwardNode.userData.stationPickable = true;
  forwardNode.userData.moduleId = 'tianhe';
  setShadowFlags(forwardNode);
  root.add(forwardNode);

  // Gold MLI band at the aft end (where Shenzhou docks).
  const aftMli = new THREE.Mesh(
    new THREE.CylinderGeometry(tianheRadius * 1.1, tianheRadius * 1.1, 0.1, 14),
    mliMat,
  );
  aftMli.rotation.z = Math.PI / 2;
  aftMli.position.set(-tianheLen / 2 - 0.05, 0, 0);
  aftMli.userData.stationPickable = true;
  aftMli.userData.moduleId = 'tianhe';
  setShadowFlags(aftMli);
  root.add(aftMli);

  // Forward-node nadir docking adapter (gold MLI) — where Tianzhou attaches.
  const nadirAdapter = new THREE.Mesh(
    new THREE.CylinderGeometry(tianheRadius * 0.85, tianheRadius * 0.85, 0.18, 12),
    mliMat,
  );
  nadirAdapter.position.set(tianheLen / 2 + 0.14, -0.28, 0);
  nadirAdapter.userData.stationPickable = true;
  nadirAdapter.userData.moduleId = 'tianhe';
  setShadowFlags(nadirAdapter);
  root.add(nadirAdapter);

  // ── Wentian lab (along +Y from forward node) ────────────────────────
  const labLen = 2.4;
  const labRadius = 0.24;
  const wentianBaseY = 0.45;
  const wentianCenterY = wentianBaseY + labLen / 2;

  const wentian = new THREE.Mesh(
    new THREE.CylinderGeometry(labRadius, labRadius, labLen, 16),
    hullMat,
  );
  wentian.position.set(tianheLen / 2 + 0.14, wentianCenterY, 0);
  wentian.userData.stationPickable = true;
  wentian.userData.moduleId = 'wentian';
  setShadowFlags(wentian);
  root.add(wentian);

  // Wentian outboard solar mast + wing pair (at the +Y far end).
  const wentianWingPair = new THREE.Group();
  wentianWingPair.position.set(tianheLen / 2 + 0.14, wentianBaseY + labLen + 0.04, 0);
  wentianWingPair.rotation.z = Math.PI / 2; // wings perpendicular to lab axis
  makeWingPair(wentianWingPair, 1.2, 0.95, SOLAR_BLUE);
  root.add(wentianWingPair);
  // Apply solar texture to wing meshes for visual richness.
  const arrayTex = makeSolarArrayTexture();
  arrayTex.repeat.set(3, 2);
  wentianWingPair.traverse((c) => {
    if (c instanceof THREE.Mesh && c.material instanceof THREE.MeshStandardMaterial) {
      c.material = c.material.clone();
      c.material.map = arrayTex;
      c.material.needsUpdate = true;
    }
  });

  // ── Mengtian lab (along -Y from forward node) ───────────────────────
  const mengtianCenterY = -(wentianBaseY + labLen / 2);
  const mengtian = new THREE.Mesh(
    new THREE.CylinderGeometry(labRadius, labRadius, labLen, 16),
    hullMat,
  );
  mengtian.position.set(tianheLen / 2 + 0.14, mengtianCenterY, 0);
  mengtian.userData.stationPickable = true;
  mengtian.userData.moduleId = 'mengtian';
  setShadowFlags(mengtian);
  root.add(mengtian);

  const mengtianWingPair = new THREE.Group();
  mengtianWingPair.position.set(tianheLen / 2 + 0.14, -(wentianBaseY + labLen + 0.04), 0);
  mengtianWingPair.rotation.z = Math.PI / 2;
  makeWingPair(mengtianWingPair, 1.2, 0.95, SOLAR_BLUE);
  root.add(mengtianWingPair);
  mengtianWingPair.traverse((c) => {
    if (c instanceof THREE.Mesh && c.material instanceof THREE.MeshStandardMaterial) {
      c.material = c.material.clone();
      c.material.map = arrayTex;
      c.material.needsUpdate = true;
    }
  });

  // ── Chinarm — 5-segment articulated arm based on the forward node ───
  // baseMount on Tianhe forward-node side (-Z), elbow above, tip extending +Z.
  const baseP = new THREE.Vector3(tianheLen / 2 + 0.04, 0.18, 0.22);
  const elbowP = new THREE.Vector3(tianheLen / 2 + 0.04, 0.55, 0.7);
  const tipP = new THREE.Vector3(tianheLen / 2 + 0.04, 0.32, 1.25);

  const baseMount = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.08, 10), armMat);
  baseMount.position.set(baseP.x, baseP.y - 0.04, baseP.z);
  const boomA = cylinderBetween(baseP, elbowP, 0.035, armMat);
  const elbow = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 8), armMat);
  elbow.position.copy(elbowP);
  const boomB = cylinderBetween(elbowP, tipP, 0.035, armMat);
  const tipEffector = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.08, 10), armMat);
  tipEffector.position.set(tipP.x, tipP.y - 0.02, tipP.z);

  for (const part of [baseMount, boomA, elbow, boomB, tipEffector]) {
    part.userData.moduleId = 'chinarm';
    part.userData.stationPickable = true;
    setShadowFlags(part);
    root.add(part);
  }

  // ── Visiting fleet ─────────────────────────────────────────────────
  type Out = 'plusY' | 'minusY' | 'plusZ' | 'minusZ' | 'plusX' | 'minusX';
  const fleet: {
    id: TiangongVisitorId;
    build: () => THREE.Group;
    port: [number, number, number];
    out: Out;
  }[] = [
    // Shenzhou docks at Tianhe aft port (-X end), nose pointed away (-X).
    { id: 'shenzhou', build: buildShenzhou, port: [-(tianheLen / 2 + 0.2), 0, 0], out: 'minusX' },
    // Tianzhou docks at the forward-node nadir port (-Y from forward node).
    { id: 'tianzhou', build: buildTianzhou, port: [tianheLen / 2 + 0.14, -0.5, 0], out: 'minusY' },
  ];

  for (const ship of fleet) {
    const g = ship.build();
    g.position.set(ship.port[0], ship.port[1], ship.port[2]);
    if (ship.out === 'minusY') g.rotation.x = Math.PI;
    else if (ship.out === 'plusZ') g.rotation.x = -Math.PI / 2;
    else if (ship.out === 'minusZ') g.rotation.x = Math.PI / 2;
    else if (ship.out === 'plusX') g.rotation.z = -Math.PI / 2;
    else if (ship.out === 'minusX') g.rotation.z = Math.PI / 2;
    g.userData.stationPickable = true;
    g.userData.moduleId = ship.id;
    g.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.userData.stationPickable = true;
        child.userData.moduleId = ship.id;
      }
    });
    root.add(g);

    // Faint dotted approach corridor — same convention as ISS.
    const corridorMat = new THREE.LineDashedMaterial({
      color: 0x4ecdc4,
      transparent: true,
      opacity: 0.35,
      dashSize: 0.08,
      gapSize: 0.06,
    });
    const dir = new THREE.Vector3(0, 0, 0);
    if (ship.out === 'plusY') dir.set(0, 1, 0);
    else if (ship.out === 'minusY') dir.set(0, -1, 0);
    else if (ship.out === 'plusZ') dir.set(0, 0, 1);
    else if (ship.out === 'minusZ') dir.set(0, 0, -1);
    else if (ship.out === 'plusX') dir.set(1, 0, 0);
    else if (ship.out === 'minusX') dir.set(-1, 0, 0);
    const start = new THREE.Vector3(...ship.port).addScaledVector(dir, 0.4);
    const end = start.clone().addScaledVector(dir, 1.6);
    const lineGeom = new THREE.BufferGeometry().setFromPoints([start, end]);
    const line = new THREE.Line(lineGeom, corridorMat);
    line.computeLineDistances();
    line.userData.stationPickable = false;
    line.name = `corridor_${ship.id}`;
    root.add(line);
  }

  return root;
}
