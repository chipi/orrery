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

export function buildIssProxyStation(): THREE.Group {
  const root = new THREE.Group();
  root.name = 'iss_proxy_root';

  const trussMat = new THREE.MeshStandardMaterial({
    color: 0x3a3a48,
    metalness: 0.25,
    roughness: 0.75,
  });
  const truss = new THREE.Mesh(new THREE.BoxGeometry(11, 0.12, 2.4), trussMat);
  truss.name = 'truss_merged';
  truss.userData.issPickable = false;
  truss.position.set(-0.35, 0.32, 0);
  root.add(truss);

  const arrayMat = new THREE.MeshStandardMaterial({
    color: 0x224466,
    metalness: 0.3,
    roughness: 0.5,
  });
  for (const [xz, zz] of [
    [2.8, 1.15],
    [2.8, -1.15],
    [-5.5, 1.0],
    [-5.5, -1.0],
  ] as const) {
    const wing = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.04, 1.0), arrayMat);
    wing.position.set(xz, 0.42, zz);
    wing.userData.issPickable = false;
    wing.name = 'solar_array';
    root.add(wing);
  }

  const hullMat = new THREE.MeshStandardMaterial({
    color: 0xe8e8ec,
    metalness: 0.15,
    roughness: 0.82,
  });

  for (const [id, x, y, z, w, h, d] of MODULE_BOXES) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), hullMat.clone());
    mesh.name = id;
    mesh.userData.moduleId = id;
    mesh.userData.issPickable = true;
    mesh.position.set(x, y, z);
    root.add(mesh);
  }

  return root;
}
