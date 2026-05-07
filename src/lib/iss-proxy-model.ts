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
const MLI_WRAPS: { host: IssModuleMeshId; offsetX: number; radiusFactor: number; length: number }[] = [
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
      const wing = new THREE.Mesh(
        new THREE.BoxGeometry(wingHalfLen, 0.04, wingDepth),
        arrayMat,
      );
      wing.position.set(centerX + sign * (wingHalfLen / 2 + 0.04), wingY, z);
      wing.userData.issPickable = false;
      wing.name = 'solar_array';
      setShadowFlags(wing);
      root.add(wing);
    }
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

  return root;
}
