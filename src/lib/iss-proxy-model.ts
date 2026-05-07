/**
 * Diagrammatic ISS assembly for /iss (ADR-040 proxy). Code-built geometry
 * avoids Node GLTF export (GLTFExporter requires browser FileReader).
 * Meshes are pick targets per ADR-041 (`userData.moduleId`, `issPickable`).
 */
import * as THREE from 'three';

export const ISS_MODULE_IDS = [
  'beam',
  'canadarm2',
  'columbus',
  'cupola',
  'destiny',
  'harmony',
  'kibo',
  'leonardo',
  'nauka',
  'pirs',
  'prichal',
  'quest',
  'rassvet',
  'tranquility',
  'unity',
  'zarya',
  'zvezda',
] as const;

export type IssModuleMeshId = (typeof ISS_MODULE_IDS)[number];

/** [id, x, y, z, width, height, depth] — scene units ~109 m → ~10 unit span */
const MODULE_BOXES: [IssModuleMeshId, number, number, number, number, number, number][] = [
  ['zvezda', -4.6, 0.05, 0, 0.55, 0.42, 0.42],
  ['zarya', -3.95, 0, 0, 0.48, 0.38, 0.38],
  ['pirs', -3.45, 0.18, 0.15, 0.22, 0.18, 0.22],
  ['rassvet', -3.35, -0.12, -0.12, 0.2, 0.15, 0.2],
  ['unity', -3.1, 0, 0, 0.38, 0.32, 0.32],
  ['destiny', -2.35, 0.02, 0, 0.52, 0.36, 0.36],
  ['quest', -2.0, 0.22, 0.1, 0.28, 0.22, 0.28],
  ['harmony', -1.45, 0, 0, 0.42, 0.34, 0.34],
  ['columbus', -0.85, 0.2, 0.15, 0.38, 0.28, 0.32],
  ['kibo', -0.15, 0, -0.15, 0.55, 0.36, 0.42],
  ['tranquility', 0.55, -0.08, 0.05, 0.42, 0.34, 0.34],
  ['cupola', 0.62, -0.28, 0.18, 0.22, 0.2, 0.22],
  ['beam', 0.85, 0.12, 0.12, 0.18, 0.18, 0.22],
  ['leonardo', 1.15, 0, 0, 0.4, 0.34, 0.34],
  ['nauka', -5.1, 0.15, 0.12, 0.52, 0.4, 0.4],
  ['prichal', -5.45, 0.12, 0, 0.28, 0.22, 0.28],
  ['canadarm2', -2.0, 0.55, 0.35, 1.1, 0.12, 0.12],
];

/** PMA / docking-adapter wraps that historically carry gold MLI thermal blanketing. */
const MLI_WRAPS: {
  host: IssModuleMeshId;
  offsetX: number;
  radiusFactor: number;
  length: number;
}[] = [
  { host: 'unity', offsetX: -0.21, radiusFactor: 1.18, length: 0.08 },
  { host: 'harmony', offsetX: 0.23, radiusFactor: 1.18, length: 0.08 },
  { host: 'zarya', offsetX: 0.26, radiusFactor: 1.18, length: 0.08 },
  { host: 'prichal', offsetX: -0.16, radiusFactor: 1.2, length: 0.07 },
  { host: 'pirs', offsetX: 0, radiusFactor: 1.22, length: 0.06 },
];

/** EATCS-style radiator panels off the truss spine, perpendicular to solar arrays. */
const RADIATORS: { x: number; z: number }[] = [
  { x: -3.6, z: 1.6 },
  { x: -3.6, z: -1.6 },
  { x: 0.4, z: 1.6 },
  { x: 0.4, z: -1.6 },
  { x: -1.6, z: 1.7 },
  { x: -1.6, z: -1.7 },
];

function makeSolarArrayTexture(): THREE.CanvasTexture {
  const cvs = document.createElement('canvas');
  cvs.width = 64;
  cvs.height = 64;
  const ctx = cvs.getContext('2d')!;
  ctx.fillStyle = '#1a3a66';
  ctx.fillRect(0, 0, 64, 64);
  ctx.strokeStyle = '#0a1a2c';
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

function setShadowFlags(obj: THREE.Object3D) {
  obj.castShadow = true;
  obj.receiveShadow = true;
}

function cylinderBetween(
  p1: THREE.Vector3,
  p2: THREE.Vector3,
  radius: number,
  mat: THREE.Material,
): THREE.Mesh {
  const dir = new THREE.Vector3().subVectors(p2, p1);
  const len = dir.length();
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, len, 8, 1), mat);
  mesh.position.copy(p1).addScaledVector(dir, 0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
  return mesh;
}

export function buildIssProxyStation(): THREE.Group {
  const root = new THREE.Group();
  root.name = 'iss_proxy_root';

  const trussMat = new THREE.MeshStandardMaterial({
    color: 0x3a3a48,
    metalness: 0.25,
    roughness: 0.75,
  });

  const trussGroup = new THREE.Group();
  trussGroup.name = 'truss_merged';
  trussGroup.userData.issPickable = false;
  trussGroup.position.set(-0.35, 0.32, 0);
  root.add(trussGroup);

  const SEGMENTS = 13;
  const totalSpan = 11;
  const gap = 0.06;
  const segWidth = (totalSpan - gap * (SEGMENTS - 1)) / SEGMENTS;
  const startX = -totalSpan / 2 + segWidth / 2;
  for (let i = 0; i < SEGMENTS; i++) {
    const seg = new THREE.Mesh(new THREE.BoxGeometry(segWidth, 0.12, 2.4), trussMat);
    seg.position.set(startX + i * (segWidth + gap), 0, 0);
    seg.userData.issPickable = false;
    setShadowFlags(seg);
    trussGroup.add(seg);
  }
  for (let i = 1; i < SEGMENTS; i += 3) {
    const brace = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.32, 2.2), trussMat);
    brace.position.set(startX + i * (segWidth + gap) - segWidth / 2 - gap / 2, 0, 0);
    brace.userData.issPickable = false;
    setShadowFlags(brace);
    trussGroup.add(brace);
  }

  const radiatorMat = new THREE.MeshStandardMaterial({
    color: 0xb8bcc4,
    metalness: 0.05,
    roughness: 0.9,
  });
  for (const { x, z } of RADIATORS) {
    const rad = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.02, 1.2), radiatorMat);
    rad.position.set(x, 0, z);
    rad.userData.issPickable = false;
    rad.name = 'radiator';
    setShadowFlags(rad);
    trussGroup.add(rad);
  }

  const arrayTex = makeSolarArrayTexture();
  arrayTex.repeat.set(4, 2);
  const arrayMat = new THREE.MeshStandardMaterial({
    color: 0x4a6a96,
    map: arrayTex,
    metalness: 0.35,
    roughness: 0.55,
  });
  const wingHalfLen = 1.4;
  const wingDepth = 1.0;
  const wingY = 0.42;
  const wingPairs: [number, number][] = [
    [2.8, 1.15],
    [2.8, -1.15],
    [-5.5, 1.0],
    [-5.5, -1.0],
  ];
  for (const [centerX, z] of wingPairs) {
    for (const sign of [-1, 1]) {
      const wing = new THREE.Mesh(new THREE.BoxGeometry(wingHalfLen, 0.04, wingDepth), arrayMat);
      wing.position.set(centerX + sign * (wingHalfLen / 2 + 0.04), wingY, z);
      wing.userData.issPickable = false;
      wing.name = 'solar_array';
      setShadowFlags(wing);
      root.add(wing);
    }
  }

  const sarjMat = new THREE.MeshStandardMaterial({
    color: 0x55585e,
    metalness: 0.6,
    roughness: 0.45,
  });
  for (const [centerX, z] of wingPairs) {
    const sarj = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.04, 6, 16), sarjMat);
    sarj.rotation.y = Math.PI / 2;
    sarj.position.set(centerX, wingY, z);
    sarj.userData.issPickable = false;
    sarj.name = 'sarj';
    setShadowFlags(sarj);
    root.add(sarj);
  }

  const hullMat = new THREE.MeshStandardMaterial({
    color: 0xe8e8ec,
    metalness: 0.15,
    roughness: 0.82,
  });

  const moduleRadius = new Map<IssModuleMeshId, number>();

  for (const [id, x, y, z, w, h, d] of MODULE_BOXES) {
    const radius = (h + d) / 4;
    moduleRadius.set(id, radius);

    if (id === 'canadarm2') {
      const armMat = hullMat.clone();
      const baseP = new THREE.Vector3(x - w / 2, y, z);
      const elbowP = new THREE.Vector3(x, y + 0.4, z);
      const tipP = new THREE.Vector3(x + w / 2, y, z);

      const baseMount = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06, 0.06, 0.08, 10),
        armMat,
      );
      baseMount.position.set(baseP.x, baseP.y - 0.04, baseP.z);
      const boomA = cylinderBetween(baseP, elbowP, 0.04, armMat);
      const elbow = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), armMat);
      elbow.position.copy(elbowP);
      const boomB = cylinderBetween(elbowP, tipP, 0.04, armMat);
      const tipEffector = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06, 0.06, 0.08, 10),
        armMat,
      );
      tipEffector.position.set(tipP.x, tipP.y - 0.04, tipP.z);

      for (const part of [baseMount, boomA, elbow, boomB, tipEffector]) {
        part.userData.moduleId = 'canadarm2';
        part.userData.issPickable = true;
        setShadowFlags(part);
        root.add(part);
      }
      continue;
    }

    let geom: THREE.BufferGeometry;
    let rotZ = Math.PI / 2;
    if (id === 'cupola') {
      geom = new THREE.SphereGeometry(radius * 1.15, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2);
      rotZ = Math.PI;
    } else {
      geom = new THREE.CylinderGeometry(radius, radius, w, 12, 1);
    }
    const mesh = new THREE.Mesh(geom, hullMat.clone());
    mesh.rotation.z = rotZ;
    mesh.name = id;
    mesh.userData.moduleId = id;
    mesh.userData.issPickable = true;
    mesh.position.set(x, y, z);
    setShadowFlags(mesh);
    root.add(mesh);

    if (id === 'cupola') {
      const ringMat = new THREE.MeshStandardMaterial({
        color: 0x707078,
        metalness: 0.4,
        roughness: 0.55,
      });
      const ring = new THREE.Mesh(new THREE.TorusGeometry(radius * 1.15, 0.012, 6, 14), ringMat);
      ring.rotation.x = Math.PI / 2;
      ring.position.set(x, y, z);
      ring.userData.issPickable = true;
      ring.userData.moduleId = 'cupola';
      setShadowFlags(ring);
      root.add(ring);
    }
  }

  const mliMat = new THREE.MeshStandardMaterial({
    color: 0xc8a04c,
    metalness: 0.55,
    roughness: 0.42,
  });
  for (const { host, offsetX, radiusFactor, length } of MLI_WRAPS) {
    const baseR = moduleRadius.get(host);
    const hostBox = MODULE_BOXES.find((b) => b[0] === host);
    if (!baseR || !hostBox) continue;
    const [, hx, hy, hz] = hostBox;
    const wrap = new THREE.Mesh(
      new THREE.CylinderGeometry(baseR * radiusFactor, baseR * radiusFactor, length, 12, 1),
      mliMat,
    );
    wrap.rotation.z = Math.PI / 2;
    wrap.position.set(hx + offsetX, hy, hz);
    wrap.userData.issPickable = true;
    wrap.userData.moduleId = host;
    wrap.name = `mli_${host}`;
    setShadowFlags(wrap);
    root.add(wrap);
  }

  const accessoryMat = hullMat.clone();
  const questBox = MODULE_BOXES.find((b) => b[0] === 'quest');
  if (questBox) {
    const [, qx, qy, qz] = questBox;
    const hatchCap = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.12, 0.18), accessoryMat);
    hatchCap.position.set(qx, qy + 0.18, qz);
    hatchCap.userData.moduleId = 'quest';
    hatchCap.userData.issPickable = true;
    hatchCap.name = 'quest_hatch';
    setShadowFlags(hatchCap);
    root.add(hatchCap);
  }

  const kiboBox = MODULE_BOXES.find((b) => b[0] === 'kibo');
  if (kiboBox) {
    const [, kx, ky, kz, kw] = kiboBox;
    const expFacility = new THREE.Mesh(
      new THREE.BoxGeometry(0.22, 0.04, 0.42),
      accessoryMat,
    );
    expFacility.position.set(kx + kw / 2 - 0.05, ky, kz - 0.34);
    expFacility.userData.moduleId = 'kibo';
    expFacility.userData.issPickable = true;
    expFacility.name = 'kibo_ef';
    setShadowFlags(expFacility);
    root.add(expFacility);
  }

  const columbusBox = MODULE_BOXES.find((b) => b[0] === 'columbus');
  if (columbusBox) {
    const [, cx, cy, cz] = columbusBox;
    for (const dx of [-0.1, 0.1]) {
      const mount = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.05, 0.06), accessoryMat);
      mount.position.set(cx + dx, cy + 0.18, cz);
      mount.userData.moduleId = 'columbus';
      mount.userData.issPickable = true;
      mount.name = 'columbus_payload';
      setShadowFlags(mount);
      root.add(mount);
    }
  }

  buildVisitingFleet(root);

  return root;
}

const RUS_HULL = 0x6f7448;
const RUS_PANEL = 0x202c1a;
const US_WHITE = 0xefefef;
const US_DARK = 0x202028;
const JP_GOLD = 0xc8a04c;
const SOLAR_BLUE = 0x1a3a66;

function makeWingPair(parent: THREE.Group, span: number, depth: number, color: number) {
  const mat = new THREE.MeshStandardMaterial({
    color,
    metalness: 0.3,
    roughness: 0.55,
  });
  for (const sign of [-1, 1]) {
    const wing = new THREE.Mesh(new THREE.BoxGeometry(span, 0.01, depth), mat);
    wing.position.set(sign * (span / 2 + 0.04), 0, 0);
    setShadowFlags(wing);
    parent.add(wing);
  }
}

function buildSoyuz(): THREE.Group {
  const g = new THREE.Group();
  g.name = 'visiting_soyuz';
  const hull = new THREE.MeshStandardMaterial({
    color: RUS_HULL,
    metalness: 0.2,
    roughness: 0.7,
  });
  const orbital = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 8), hull);
  orbital.position.y = 0.22;
  setShadowFlags(orbital);
  g.add(orbital);
  const descent = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 0.1, 12), hull);
  descent.position.y = 0.11;
  setShadowFlags(descent);
  g.add(descent);
  const service = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.18, 12), hull);
  service.position.y = -0.03;
  setShadowFlags(service);
  g.add(service);
  const wings = new THREE.Group();
  wings.position.y = -0.03;
  makeWingPair(wings, 0.36, 0.14, RUS_PANEL);
  g.add(wings);
  return g;
}

function buildProgress(): THREE.Group {
  const g = new THREE.Group();
  g.name = 'visiting_progress';
  const hull = new THREE.MeshStandardMaterial({
    color: RUS_HULL,
    metalness: 0.2,
    roughness: 0.7,
  });
  const cargo = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.16, 12), hull);
  cargo.position.y = 0.16;
  setShadowFlags(cargo);
  g.add(cargo);
  const service = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.14, 12), hull);
  service.position.y = 0.01;
  setShadowFlags(service);
  g.add(service);
  const wings = new THREE.Group();
  wings.position.y = 0.01;
  makeWingPair(wings, 0.36, 0.14, RUS_PANEL);
  g.add(wings);
  return g;
}

function buildDragon(crew: boolean): THREE.Group {
  const g = new THREE.Group();
  g.name = crew ? 'visiting_crew_dragon' : 'visiting_cargo_dragon';
  const hull = new THREE.MeshStandardMaterial({
    color: US_WHITE,
    metalness: 0.1,
    roughness: 0.7,
  });
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.14, 14), hull);
  trunk.position.y = -0.02;
  setShadowFlags(trunk);
  g.add(trunk);
  const capsule = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.07, 0.1, 14), hull);
  capsule.position.y = 0.1;
  setShadowFlags(capsule);
  g.add(capsule);
  if (crew) {
    const nose = new THREE.Mesh(
      new THREE.CylinderGeometry(0.02, 0.04, 0.04, 12),
      new THREE.MeshStandardMaterial({ color: US_DARK, metalness: 0.3, roughness: 0.6 }),
    );
    nose.position.y = 0.17;
    setShadowFlags(nose);
    g.add(nose);
  }
  const trunkPanel = new THREE.Mesh(
    new THREE.CylinderGeometry(0.071, 0.071, 0.08, 14, 1, true),
    new THREE.MeshStandardMaterial({
      color: SOLAR_BLUE,
      metalness: 0.3,
      roughness: 0.55,
      side: THREE.DoubleSide,
    }),
  );
  trunkPanel.position.y = -0.04;
  setShadowFlags(trunkPanel);
  g.add(trunkPanel);
  return g;
}

function buildCygnus(): THREE.Group {
  const g = new THREE.Group();
  g.name = 'visiting_cygnus';
  const hull = new THREE.MeshStandardMaterial({
    color: US_WHITE,
    metalness: 0.1,
    roughness: 0.7,
  });
  const pcm = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.2, 14), hull);
  pcm.position.y = 0.1;
  setShadowFlags(pcm);
  g.add(pcm);
  const service = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.06, 12), hull);
  service.position.y = -0.03;
  setShadowFlags(service);
  g.add(service);
  const ultraflexMat = new THREE.MeshStandardMaterial({
    color: US_DARK,
    metalness: 0.3,
    roughness: 0.55,
    side: THREE.DoubleSide,
  });
  for (const sign of [-1, 1]) {
    const disc = new THREE.Mesh(new THREE.CircleGeometry(0.14, 18), ultraflexMat);
    disc.position.set(sign * 0.18, -0.03, 0);
    disc.rotation.y = Math.PI / 2;
    setShadowFlags(disc);
    g.add(disc);
  }
  return g;
}

function buildHtvX(): THREE.Group {
  const g = new THREE.Group();
  g.name = 'visiting_htvx';
  const gold = new THREE.MeshStandardMaterial({
    color: JP_GOLD,
    metalness: 0.55,
    roughness: 0.42,
  });
  const white = new THREE.MeshStandardMaterial({
    color: US_WHITE,
    metalness: 0.1,
    roughness: 0.7,
  });
  const pressurized = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.18, 14), white);
  pressurized.position.y = 0.13;
  setShadowFlags(pressurized);
  g.add(pressurized);
  const unpressurized = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.1, 14), gold);
  unpressurized.position.y = 0;
  setShadowFlags(unpressurized);
  g.add(unpressurized);
  const panelMat = new THREE.MeshStandardMaterial({
    color: SOLAR_BLUE,
    metalness: 0.3,
    roughness: 0.55,
    side: THREE.DoubleSide,
  });
  for (let i = 0; i < 4; i++) {
    const angle = (i * Math.PI) / 2 + Math.PI / 4;
    const panel = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.005, 0.06), panelMat);
    panel.position.set(Math.cos(angle) * 0.13, 0, Math.sin(angle) * 0.13);
    panel.rotation.y = angle;
    setShadowFlags(panel);
    g.add(panel);
  }
  return g;
}

interface DockedShip {
  build: () => THREE.Group;
  /** Position of the docking port on the host module. */
  port: [number, number, number];
  /** Direction the vehicle extends out from the port (+Y is default vehicle orientation). */
  out: 'plusY' | 'minusY' | 'plusZ' | 'minusZ' | 'plusX' | 'minusX';
}

function buildVisitingFleet(root: THREE.Group) {
  const fleet: DockedShip[] = [
    { build: buildSoyuz, port: [-3.35, -0.21, -0.12], out: 'minusY' },
    { build: buildProgress, port: [-3.45, 0.27, 0.15], out: 'plusY' },
    { build: buildDragon.bind(null, true), port: [-1.45, 0.21, 0], out: 'plusY' },
    { build: buildDragon.bind(null, false), port: [0.55, 0.21, 0.05], out: 'plusY' },
    { build: buildCygnus, port: [-3.1, -0.21, 0], out: 'minusY' },
    { build: buildHtvX, port: [-1.45, -0.21, 0.34], out: 'minusY' },
  ];
  for (const ship of fleet) {
    const g = ship.build();
    g.position.set(ship.port[0], ship.port[1], ship.port[2]);
    if (ship.out === 'minusY') g.rotation.x = Math.PI;
    else if (ship.out === 'plusZ') g.rotation.x = -Math.PI / 2;
    else if (ship.out === 'minusZ') g.rotation.x = Math.PI / 2;
    else if (ship.out === 'plusX') g.rotation.z = -Math.PI / 2;
    else if (ship.out === 'minusX') g.rotation.z = Math.PI / 2;
    g.userData.issPickable = false;
    root.add(g);
  }
}
