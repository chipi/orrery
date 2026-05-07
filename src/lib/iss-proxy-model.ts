/**
 * Diagrammatic ISS assembly for /iss (ADR-040 proxy). Code-built geometry
 * avoids Node GLTF export (GLTFExporter requires browser FileReader).
 * Meshes are pick targets per ADR-041 (`userData.moduleId`, `stationPickable`).
 *
 * V2 layout (Phase 1 visual-fidelity rebuild):
 *   - Pressurised modules form a single line along X (Destiny at origin),
 *     with radial branches at the multi-port nodes (Unity / Tranquility /
 *     Harmony / Zvezda / Zarya).
 *   - Truss runs along Z (perpendicular cross-bar above Destiny zenith)
 *     as a 3-longeron triangular open-frame lattice with diagonal
 *     cross-bracing.
 *   - 8 main solar arrays mount at P4/P6/S4/S6 outboard truss tips;
 *     6 iROSA flexible arrays overlay the originals.
 *   - Scene scale: 1 unit ≈ 12.7 m. All module / array / spacecraft
 *     dimensions derive from this single factor.
 */
import * as THREE from 'three';
import {
  setShadowFlags,
  cylinderBetween,
  makeWingPair,
  makeTwoSectionModule,
  makeRadialDockingPort,
} from './station-geometry';

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
  'poisk',
  'prichal',
  'quest',
  'rassvet',
  'tranquility',
  'unity',
  'zarya',
  'zvezda',
] as const;

export type IssModuleMeshId = (typeof ISS_MODULE_IDS)[number];

type ModuleAxis = 'x' | 'y' | 'z';

/**
 * Per-module geometry record.
 *   [id, x, y, z, length, radius, axis]
 *
 * Positions (1 unit ≈ 12.7 m) computed from real-world dimensions in the
 * §1.0 ratio table of the rebuild plan; main stack centred on Destiny at X=0.
 */
const MODULE_BOXES: [IssModuleMeshId, number, number, number, number, number, ModuleAxis][] = [
  // Russian segment — main stack along X
  ['zvezda', -2.58, 0, 0, 1.03, 0.171, 'x'],
  ['zarya', -1.53, 0, 0, 0.99, 0.161, 'x'],
  // Center stack along X
  ['unity', -0.59, 0, 0, 0.43, 0.18, 'x'],
  ['destiny', 0, 0, 0, 0.67, 0.168, 'x'],
  ['harmony', 0.66, 0, 0, 0.57, 0.173, 'x'],

  // Branches off Zvezda (zenith / nadir)
  ['poisk', -2.58, 0.371, 0, 0.32, 0.1, 'y'],
  ['pirs', -2.58, -0.371, 0, 0.32, 0.1, 'y'],
  ['nauka', -2.58, -1.081, 0, 1.02, 0.167, 'y'],
  ['prichal', -2.58, -1.826, 0, 0.39, 0.13, 'y'],

  // Branches off Zarya (nadir)
  ['rassvet', -1.53, -0.436, 0, 0.47, 0.093, 'y'],

  // Branches off Unity (port = -Z, starboard = +Z)
  ['tranquility', -0.59, 0, -0.485, 0.53, 0.176, 'z'],
  ['quest', -0.59, 0, 0.435, 0.43, 0.157, 'z'],

  // Branches off Tranquility (centred at -0.59, 0, -0.485)
  ['cupola', -0.59, -0.236, -0.485, 0.12, 0.116, 'y'],
  ['beam', -0.59, 0, -0.945, 0.31, 0.126, 'z'],
  ['leonardo', -0.85, -0.236, -0.485, 0.5, 0.18, 'x'],

  // Branches off Harmony
  ['columbus', 0.66, 0, 0.435, 0.54, 0.176, 'z'],
  ['kibo', 0.66, 0, -0.453, 0.88, 0.173, 'z'],

  // Canadarm2 — articulated arm anchored on Destiny zenith (special-cased below)
  ['canadarm2', 0, 0.36, 0, 1.1, 0.04, 'x'],
];

/** Structural PMAs (Pressurised Mating Adapters) — gold MLI cones, not pickable modules. */
const PMAS: {
  id: string;
  x: number;
  y: number;
  z: number;
  len: number;
  r: number;
  axis: ModuleAxis;
}[] = [
  { id: 'pma1', x: -1.0, y: 0, z: 0, len: 0.15, r: 0.085, axis: 'x' },
  { id: 'pma2', x: 1.02, y: 0, z: 0, len: 0.15, r: 0.085, axis: 'x' },
  { id: 'pma3', x: 0.66, y: 0.35, z: 0, len: 0.15, r: 0.085, axis: 'y' },
];

/** Gold MLI thermal blanket wraps at module joints + docking adapters. */
const MLI_WRAPS: {
  host: IssModuleMeshId;
  offset: [number, number, number];
  axis: ModuleAxis;
  radiusFactor: number;
  length: number;
}[] = [
  { host: 'zarya', offset: [0.55, 0, 0], axis: 'x', radiusFactor: 1.18, length: 0.06 },
  { host: 'unity', offset: [-0.25, 0, 0], axis: 'x', radiusFactor: 1.18, length: 0.06 },
  { host: 'harmony', offset: [0.32, 0, 0], axis: 'x', radiusFactor: 1.18, length: 0.06 },
  { host: 'pirs', offset: [0, -0.18, 0], axis: 'y', radiusFactor: 1.22, length: 0.05 },
  { host: 'prichal', offset: [0, -0.22, 0], axis: 'y', radiusFactor: 1.2, length: 0.05 },
];

const HULL_WHITE = 0xe8e8ec;
const RUS_HULL = 0x6f7448;
const RUS_PANEL = 0x202c1a;
const US_WHITE = 0xefefef;
const US_DARK = 0x202028;
const JP_GOLD = 0xc8a04c;
const SOLAR_BLUE = 0x1a3a66;
const MLI_GOLD = 0xc8a04c;
const TRUSS_GREY = 0x8a8e96;
const RADIATOR_WHITE = 0xc8ccd2;
const ARM_GREY = 0x3a3a40;

function makeMainArrayTexture(): THREE.CanvasTexture {
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

/** Build one segment of the triangular open-frame truss along its local long axis. */
function buildTrussSegment(
  centerZ: number,
  length: number,
  longeronMat: THREE.Material,
  braceMat: THREE.Material,
): THREE.Group {
  const g = new THREE.Group();
  // 3 longerons at vertices of equilateral triangle inscribed in radius 0.16
  const radius = 0.16;
  const longeronRadius = 0.012;
  const vertices: [number, number][] = [
    [0, radius], // top
    [-radius * Math.cos(Math.PI / 6), -radius * Math.sin(Math.PI / 6)], // bottom-left
    [radius * Math.cos(Math.PI / 6), -radius * Math.sin(Math.PI / 6)], // bottom-right
  ];
  for (const [x, y] of vertices) {
    const long = new THREE.Mesh(
      new THREE.CylinderGeometry(longeronRadius, longeronRadius, length, 6),
      longeronMat,
    );
    // Cylinder default axis is Y; rotate to Z and place
    long.rotation.x = Math.PI / 2;
    long.position.set(x, y, centerZ);
    long.userData.stationPickable = false;
    setShadowFlags(long);
    g.add(long);
  }
  // Cross-braces every ~0.4 units along the segment
  const braceCount = Math.max(1, Math.floor(length / 0.4));
  const braceSpacing = length / braceCount;
  const startZ = centerZ - length / 2 + braceSpacing / 2;
  for (let i = 0; i < braceCount; i++) {
    const z = startZ + i * braceSpacing;
    // Triangle face brace (3 edges of triangle at this Z)
    for (let v = 0; v < 3; v++) {
      const [x1, y1] = vertices[v];
      const [x2, y2] = vertices[(v + 1) % 3];
      const p1 = new THREE.Vector3(x1, y1, z);
      const p2 = new THREE.Vector3(x2, y2, z);
      const brace = cylinderBetween(p1, p2, 0.008, braceMat);
      brace.userData.stationPickable = false;
      setShadowFlags(brace);
      g.add(brace);
    }
  }
  return g;
}

export function buildIssProxyStation(): THREE.Group {
  const root = new THREE.Group();
  root.name = 'iss_proxy_root';

  // ── Truss group along Z, anchored above Destiny ─────────────────────
  const trussGroup = new THREE.Group();
  trussGroup.name = 'truss_main';
  trussGroup.userData.stationPickable = false;
  trussGroup.position.set(0, 0.42, 0); // anchored above Destiny zenith
  root.add(trussGroup);

  const longeronMat = new THREE.MeshStandardMaterial({
    color: TRUSS_GREY,
    metalness: 0.45,
    roughness: 0.55,
  });
  const braceMat = new THREE.MeshStandardMaterial({
    color: 0x6c707a,
    metalness: 0.4,
    roughness: 0.6,
  });

  // Truss segment positions (Z-axis, port = -Z, starboard = +Z)
  // Real lengths from Wikipedia Integrated Truss; 1 unit ≈ 12.7 m
  const TRUSS_SEGMENTS: { id: string; cZ: number; len: number }[] = [
    { id: 's0', cZ: 0, len: 1.06 },
    { id: 'p1', cZ: -1.07, len: 1.08 },
    { id: 's1', cZ: 1.07, len: 1.08 },
    { id: 'p3', cZ: -2.15, len: 1.08 },
    { id: 's3', cZ: 2.15, len: 1.08 },
    { id: 'p4', cZ: -3.23, len: 1.08 },
    { id: 's4', cZ: 3.23, len: 1.08 },
    { id: 'p5', cZ: -3.91, len: 0.27 },
    { id: 's5', cZ: 3.91, len: 0.27 },
    { id: 'p6', cZ: -4.78, len: 1.44 },
    { id: 's6', cZ: 4.78, len: 1.44 },
  ];

  for (const seg of TRUSS_SEGMENTS) {
    const segGroup = buildTrussSegment(seg.cZ, seg.len, longeronMat, braceMat);
    segGroup.name = `truss_${seg.id}`;
    trussGroup.add(segGroup);
  }

  // Z1 truss girder — short triangular lattice along Y connecting Destiny
  // zenith to S0. Built in its own group rotated 90° around X so its long
  // axis lands along Y.
  const z1Group = buildTrussSegment(0, 0.36, longeronMat, braceMat);
  z1Group.name = 'truss_z1';
  z1Group.rotation.x = Math.PI / 2; // rotate Z-aligned segment to Y-aligned
  z1Group.position.set(0, -0.22, 0); // bridging Destiny top (Y=-0.22 below truss origin) to S0 (Y=0)
  trussGroup.add(z1Group);

  // SARJ rotary joints at P3↔P4 and S3↔S4 boundaries
  const sarjMat = new THREE.MeshStandardMaterial({
    color: 0x55585e,
    metalness: 0.6,
    roughness: 0.45,
  });
  const SARJ_POSITIONS: { z: number }[] = [
    { z: -2.69 }, // between P3 (cZ=-2.15) and P4 (cZ=-3.23)
    { z: 2.69 }, // between S3 and S4
  ];
  for (const { z } of SARJ_POSITIONS) {
    const sarj = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.025, 6, 16), sarjMat);
    // Default torus is in XY plane; rotate to face Z (so ring is perpendicular to truss axis)
    sarj.rotation.y = Math.PI / 2;
    sarj.position.set(0, 0, z);
    sarj.userData.stationPickable = false;
    sarj.name = 'sarj';
    setShadowFlags(sarj);
    trussGroup.add(sarj);
  }

  // ── Solar arrays — 8 main wings at P4/P6/S4/S6 outboard tips ────────
  const arrayTex = makeMainArrayTexture();
  arrayTex.repeat.set(8, 1);
  const mainArrayMat = new THREE.MeshStandardMaterial({
    color: SOLAR_BLUE,
    map: arrayTex,
    metalness: 0.3,
    roughness: 0.55,
  });

  // BGA mast material (small grey cylinder between truss and wing root)
  const bgaMat = new THREE.MeshStandardMaterial({
    color: 0x8a8e96,
    metalness: 0.5,
    roughness: 0.45,
  });

  // iROSA gold-bronze flexible array material — smooth, no map
  const irosaMat = new THREE.MeshStandardMaterial({
    color: 0xc8a04c,
    metalness: 0.4,
    roughness: 0.5,
  });

  // Anchors at outboard ends of P4/P6/S4/S6 — each carries 2 wings (fwd + aft)
  const MAIN_ARRAY_ANCHORS: {
    id: string;
    z: number;
    iROSA: { fwd: boolean; aft: boolean };
  }[] = [
    // P6 outboard tip
    { id: 'p6', z: -5.5, iROSA: { fwd: true, aft: true } }, // 1A on P6, 6 on P6
    // P4 outboard tip
    { id: 'p4', z: -3.77, iROSA: { fwd: true, aft: false } }, // 3A on P4
    // S4 outboard tip
    { id: 's4', z: 3.77, iROSA: { fwd: true, aft: true } }, // 2B on S4, 5 on S4
    // S6 outboard tip
    { id: 's6', z: 5.5, iROSA: { fwd: false, aft: true } }, // 4A on S6
  ];

  const wingHalfLen = 1.34; // 2.68 / 2
  const wingDepth = 0.95;
  const irosaHalfLen = 0.75; // 1.50 / 2
  const irosaDepth = 0.47;

  for (const anchor of MAIN_ARRAY_ANCHORS) {
    // BGA mast stub at the anchor (between truss tip and wings).
    // Cylinder default axis is Y; the mast extends a small bit out along
    // ±Y from the truss tip — leave as-is (vertical) for a small "stalk"
    // visual cue.
    const bga = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.14, 10), bgaMat);
    bga.position.set(0, 0, anchor.z);
    bga.userData.stationPickable = false;
    setShadowFlags(bga);
    trussGroup.add(bga);

    // One wing pair per anchor: forward-extending + aft-extending wings,
    // both sharing the same BGA + SADA axis. Group origin sits at the
    // truss-tip world position (0, trussY, anchor.z). Wings extend along
    // ±X (forward/aft of station) — long axis ≡ world X = perpendicular
    // to truss direction (Z). Group rotation around X is the SADA β-rotation
    // that swings the broad face from +Y (zenith) to +Z (along-truss).
    const wingPair = new THREE.Group();
    // Wing pair sits at truss Y level (truss group is at y=0.42 above modules)
    wingPair.position.set(0, 0.42, anchor.z);
    wingPair.userData.tracksSun = true;
    wingPair.userData.sadaAxis = 'x';
    wingPair.userData.baseRotation = 0;

    for (const dir of ['fwd', 'aft'] as const) {
      const xSign = dir === 'fwd' ? 1 : -1;
      // Wing: BoxGeometry(length, thin, depth) — long X, thin Y, depth Z.
      // Broad face is Y-normal (faces zenith at base rotation).
      const wing = new THREE.Mesh(
        new THREE.BoxGeometry(wingHalfLen * 2, 0.02, wingDepth),
        mainArrayMat.clone(),
      );
      wing.position.set(xSign * (wingHalfLen + 0.04), 0, 0);
      if (wing.material instanceof THREE.MeshStandardMaterial) {
        wing.material.map = arrayTex;
        wing.material.needsUpdate = true;
      }
      setShadowFlags(wing);
      wing.userData.stationPickable = false;
      wing.name = `array_${anchor.id}_${dir}`;
      wingPair.add(wing);

      // iROSA overlay (if installed on this side) — parallel to main wing,
      // mounted on the INBOARD portion (closer to BGA / truss center),
      // so the main array visibly extends beyond iROSA on the outboard tip.
      // Slight +Y offset so it sits "on top" of the main wing.
      const irosaInstalled = dir === 'fwd' ? anchor.iROSA.fwd : anchor.iROSA.aft;
      if (irosaInstalled) {
        const irosa = new THREE.Mesh(
          new THREE.BoxGeometry(irosaHalfLen * 2, 0.025, irosaDepth),
          irosaMat,
        );
        // iROSA inboard center: closer to BGA than main wing center.
        // Main wing center is at xSign * (wingHalfLen + 0.04) = ±1.38;
        // iROSA inboard center at xSign * (irosaHalfLen + 0.04) = ±0.79.
        irosa.position.set(xSign * (irosaHalfLen + 0.04), 0.05, 0);
        setShadowFlags(irosa);
        irosa.userData.stationPickable = false;
        irosa.name = `irosa_${anchor.id}_${dir}`;
        wingPair.add(irosa);
      }
    }

    root.add(wingPair);
  }

  // ── Pressurised modules ─────────────────────────────────────────────
  const hullMat = new THREE.MeshStandardMaterial({
    color: HULL_WHITE,
    metalness: 0.15,
    roughness: 0.82,
  });

  const moduleRadius = new Map<IssModuleMeshId, number>();
  const modulePositions = new Map<IssModuleMeshId, [number, number, number]>();

  for (const [id, x, y, z, len, radius, axis] of MODULE_BOXES) {
    moduleRadius.set(id, radius);
    modulePositions.set(id, [x, y, z]);

    if (id === 'canadarm2') {
      const armMat = new THREE.MeshStandardMaterial({
        color: ARM_GREY,
        metalness: 0.4,
        roughness: 0.5,
      });
      const baseP = new THREE.Vector3(x - len / 2, y - 0.04, z);
      const elbowP = new THREE.Vector3(x, y + 0.4, z);
      const tipP = new THREE.Vector3(x + len / 2, y - 0.04, z);

      const baseMount = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.08, 10), armMat);
      baseMount.position.set(baseP.x, baseP.y - 0.04, baseP.z);
      const boomA = cylinderBetween(baseP, elbowP, 0.04, armMat);
      const elbow = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), armMat);
      elbow.position.copy(elbowP);
      const boomB = cylinderBetween(elbowP, tipP, 0.04, armMat);
      const tipEffector = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.08, 10), armMat);
      tipEffector.position.set(tipP.x, tipP.y - 0.04, tipP.z);

      for (const part of [baseMount, boomA, elbow, boomB, tipEffector]) {
        part.userData.moduleId = 'canadarm2';
        part.userData.stationPickable = true;
        setShadowFlags(part);
        root.add(part);
      }
      continue;
    }

    // Two-section modules — built via shared helper (Phase 2 fidelity).
    // Forward (larger) section + aft (narrower) section + gold MLI band.
    const twoSectionSpec: {
      [key: string]: [{ len: number; r: number }, { len: number; r: number }];
    } = {
      zvezda: [
        { len: len * 0.55, r: radius },
        { len: len * 0.45, r: radius * 0.78 },
      ],
      zarya: [
        { len: len * 0.6, r: radius },
        { len: len * 0.4, r: radius * 0.85 },
      ],
      nauka: [
        { len: len * 0.6, r: radius },
        { len: len * 0.4, r: radius * 0.78 },
      ],
      destiny: [
        { len: len * 0.55, r: radius },
        { len: len * 0.45, r: radius * 0.92 },
      ],
      kibo: [
        { len: len * 0.7, r: radius },
        { len: len * 0.3, r: radius * 0.85 },
      ],
      harmony: [
        { len: len * 0.55, r: radius },
        { len: len * 0.45, r: radius * 0.95 },
      ],
    };

    if (twoSectionSpec[id as string]) {
      const sections = twoSectionSpec[id as string];
      const group = makeTwoSectionModule({
        id,
        position: new THREE.Vector3(x, y, z),
        axis,
        sections,
        hullMat: hullMat.clone(),
        mliMat: new THREE.MeshStandardMaterial({
          color: MLI_GOLD,
          metalness: 0.55,
          roughness: 0.42,
        }),
      });
      group.name = id;
      // Tag the group itself so picking can resolve at the group level.
      group.userData.moduleId = id;
      group.userData.stationPickable = true;
      root.add(group);
      // For accessory anchoring below, the children are pre-tagged with
      // moduleId by makeTwoSectionModule. Skip the generic-cylinder path.
      continue;
    }

    let geom: THREE.BufferGeometry;
    if (id === 'cupola') {
      geom = new THREE.SphereGeometry(radius * 1.15, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2);
    } else if (id === 'beam') {
      // Inflatable BEAM module — rounded "balloon" silhouette rather than a
      // straight cylinder. r128 has no CapsuleGeometry per CLAUDE.md, so use
      // a near-spherical bulge.
      geom = new THREE.SphereGeometry(radius * 1.4, 14, 10);
    } else if (id === 'prichal') {
      // Prichal is a spherical 5-port hub, not a cylinder
      geom = new THREE.SphereGeometry(radius, 14, 10);
    } else {
      geom = new THREE.CylinderGeometry(radius, radius, len, 12, 1);
    }
    const mesh = new THREE.Mesh(geom, hullMat.clone());
    // Rotate cylinder to align with declared axis (default cylinder axis is Y)
    if (axis === 'x') mesh.rotation.z = Math.PI / 2;
    else if (axis === 'z') mesh.rotation.x = Math.PI / 2;
    // axis === 'y' → no rotation (default)

    // Cupola dome opens downward (toward -Y) — special
    if (id === 'cupola') mesh.rotation.x = Math.PI;

    mesh.name = id;
    mesh.userData.moduleId = id;
    mesh.userData.stationPickable = true;
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
      ring.userData.stationPickable = true;
      ring.userData.moduleId = 'cupola';
      setShadowFlags(ring);
      root.add(ring);
      // Interior emissive glow — visible through the seven-window dome opening
      const glow = new THREE.Mesh(
        new THREE.CircleGeometry(radius * 0.85, 14),
        new THREE.MeshBasicMaterial({
          color: 0x6ec0ff,
          transparent: true,
          opacity: 0.55,
        }),
      );
      glow.position.set(x, y - radius * 0.55, z);
      glow.rotation.x = Math.PI / 2;
      glow.userData.stationPickable = true;
      glow.userData.moduleId = 'cupola';
      glow.name = 'cupola_glow';
      root.add(glow);
    }
  }

  // ── Gold MLI thermal blanket wraps ──────────────────────────────────
  const mliMat = new THREE.MeshStandardMaterial({
    color: MLI_GOLD,
    metalness: 0.55,
    roughness: 0.42,
  });
  for (const wrap of MLI_WRAPS) {
    const baseR = moduleRadius.get(wrap.host);
    const hostPos = modulePositions.get(wrap.host);
    if (!baseR || !hostPos) continue;
    const wmesh = new THREE.Mesh(
      new THREE.CylinderGeometry(
        baseR * wrap.radiusFactor,
        baseR * wrap.radiusFactor,
        wrap.length,
        12,
        1,
      ),
      mliMat,
    );
    if (wrap.axis === 'x') wmesh.rotation.z = Math.PI / 2;
    else if (wrap.axis === 'z') wmesh.rotation.x = Math.PI / 2;
    wmesh.position.set(
      hostPos[0] + wrap.offset[0],
      hostPos[1] + wrap.offset[1],
      hostPos[2] + wrap.offset[2],
    );
    wmesh.userData.stationPickable = true;
    wmesh.userData.moduleId = wrap.host;
    wmesh.name = `mli_${wrap.host}`;
    setShadowFlags(wmesh);
    root.add(wmesh);
  }

  // ── PMA structural cones (gold MLI truncated cones) ─────────────────
  for (const pma of PMAS) {
    const cone = new THREE.Mesh(
      new THREE.CylinderGeometry(pma.r * 0.7, pma.r, pma.len, 12, 1),
      mliMat,
    );
    if (pma.axis === 'x') cone.rotation.z = Math.PI / 2;
    else if (pma.axis === 'z') cone.rotation.x = Math.PI / 2;
    cone.position.set(pma.x, pma.y, pma.z);
    cone.userData.stationPickable = false;
    cone.name = pma.id;
    setShadowFlags(cone);
    root.add(cone);
  }

  // ── EATCS Heat Rejection Subsystem (HRS) radiators ─────────────────
  // 6 white radiator panels deployed PERPENDICULAR to truss (long axis
  // along ±X, perpendicular to the truss Z-axis), clustered INBOARD
  // along the truss spine (P1/S1 region) on the nadir side. They sit
  // visibly INSIDE the outboard solar-array tips — i.e., closer to S0.
  // Each panel is wider (X-axis) than it is long-along-truss (Z-axis),
  // making them clearly distinct from the parallel-to-X solar arrays.
  const radiatorMat = new THREE.MeshStandardMaterial({
    color: RADIATOR_WHITE,
    metalness: 0.05,
    roughness: 0.9,
  });
  const RADIATORS: { z: number }[] = [
    // 3 port-side (P1 region)
    { z: -0.6 },
    { z: -1.2 },
    { z: -1.8 },
    // 3 starboard-side (S1 region)
    { z: 0.6 },
    { z: 1.2 },
    { z: 1.8 },
  ];
  for (const { z } of RADIATORS) {
    // BoxGeometry(width X, thickness Y, depth Z) — long perpendicular to truss
    const rad = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.02, 0.18), radiatorMat);
    rad.position.set(0, -0.18, z); // slight nadir from truss centre
    rad.userData.stationPickable = false;
    rad.name = 'radiator';
    setShadowFlags(rad);
    trussGroup.add(rad);
  }

  // ── Module-specific accessories ─────────────────────────────────────
  const accessoryMat = hullMat.clone();

  // Quest hatch cap (zenith side of Quest, which sits on Unity starboard)
  const questPos = modulePositions.get('quest');
  if (questPos) {
    const [qx, qy, qz] = questPos;
    const questR = moduleRadius.get('quest') ?? 0.157;
    const hatchCap = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.1, 0.1), accessoryMat);
    hatchCap.position.set(qx, qy + questR + 0.06, qz);
    hatchCap.userData.moduleId = 'quest';
    hatchCap.userData.stationPickable = true;
    hatchCap.name = 'quest_hatch';
    setShadowFlags(hatchCap);
    root.add(hatchCap);
  }

  // Kibo Exposed Facility — flat platform aft of Kibo (port-side aft = -Z direction)
  const kiboPos = modulePositions.get('kibo');
  if (kiboPos) {
    const [kx, ky, kz] = kiboPos;
    const kiboR = moduleRadius.get('kibo') ?? 0.173;
    const expFacility = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.04, 0.22), accessoryMat);
    // Place on port side (-Z) of Kibo, slightly forward
    expFacility.position.set(kx, ky, kz - kiboR - 0.18);
    expFacility.userData.moduleId = 'kibo';
    expFacility.userData.stationPickable = true;
    expFacility.name = 'kibo_ef';
    setShadowFlags(expFacility);
    root.add(expFacility);
  }

  // Columbus EPF mounts — 4 small payload platforms on starboard side
  const columbusPos = modulePositions.get('columbus');
  if (columbusPos) {
    const [cx, cy, cz] = columbusPos;
    const columbusR = moduleRadius.get('columbus') ?? 0.176;
    for (const dx of [-0.12, 0.12]) {
      const mount = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.05, 0.06), accessoryMat);
      mount.position.set(cx + dx, cy, cz + columbusR + 0.04);
      mount.userData.moduleId = 'columbus';
      mount.userData.stationPickable = true;
      mount.name = 'columbus_payload';
      setShadowFlags(mount);
      root.add(mount);
    }
  }

  // Russian docking probes — small cones at radial port stubs
  const dockProbeMat = new THREE.MeshStandardMaterial({
    color: 0xa0a4ac,
    metalness: 0.55,
    roughness: 0.45,
  });
  const PROBES: { host: IssModuleMeshId; offset: [number, number, number] }[] = [
    { host: 'pirs', offset: [0, -0.14, 0] },
    { host: 'rassvet', offset: [0, -0.16, 0] },
    { host: 'prichal', offset: [0, -0.16, 0] },
    { host: 'poisk', offset: [0, 0.14, 0] },
  ];
  for (const probe of PROBES) {
    const baseR = moduleRadius.get(probe.host);
    const hostPos = modulePositions.get(probe.host);
    if (!baseR || !hostPos) continue;
    const cone = new THREE.Mesh(
      new THREE.CylinderGeometry(0, baseR * 0.45, 0.07, 10),
      dockProbeMat,
    );
    cone.position.set(
      hostPos[0] + probe.offset[0],
      hostPos[1] + probe.offset[1],
      hostPos[2] + probe.offset[2],
    );
    if (probe.offset[1] < 0) cone.rotation.x = Math.PI;
    cone.userData.moduleId = probe.host;
    cone.userData.stationPickable = true;
    cone.name = `probe_${probe.host}`;
    setShadowFlags(cone);
    root.add(cone);
  }

  // ── Zvezda aft engine bell + propulsion nozzles (Phase 2b) ─────────
  const zvezdaPos = modulePositions.get('zvezda');
  if (zvezdaPos) {
    const [zx, zy, zz] = zvezdaPos;
    const zR = moduleRadius.get('zvezda') ?? 0.171;
    // The two-section Zvezda already provides the aft transfer compartment
    // via section B. Add the engine bell (propulsion nozzle) beyond it.
    const nozzleMat = new THREE.MeshStandardMaterial({
      color: 0x4a4a52,
      metalness: 0.6,
      roughness: 0.4,
    });
    const bell = new THREE.Mesh(
      new THREE.CylinderGeometry(zR * 0.45, zR * 0.7, 0.12, 14, 1, true),
      nozzleMat,
    );
    bell.rotation.z = Math.PI / 2;
    bell.position.set(zx - 0.6, zy, zz);
    bell.userData.moduleId = 'zvezda';
    bell.userData.stationPickable = true;
    bell.name = 'zvezda_engine_bell';
    setShadowFlags(bell);
    root.add(bell);
    // Two small steerable RCS thruster pods on the side of the aft section
    for (const dz of [-0.12, 0.12]) {
      const rcs = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.05, 8), nozzleMat);
      rcs.position.set(zx - 0.45, zy + zR * 0.6, zz + dz);
      rcs.userData.moduleId = 'zvezda';
      rcs.userData.stationPickable = true;
      rcs.name = 'zvezda_rcs';
      setShadowFlags(rcs);
      root.add(rcs);
    }
  }

  // ── Nauka ERA mount + radiator (Phase 2b) ──────────────────────────
  const naukaPos = modulePositions.get('nauka');
  if (naukaPos) {
    const [nx, ny, nz] = naukaPos;
    const nR = moduleRadius.get('nauka') ?? 0.167;
    // ERA arm base mount — small cylinder stub on Nauka's port side
    const eraMount = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.06, 10), accessoryMat);
    eraMount.position.set(nx, ny, nz - nR - 0.04);
    eraMount.rotation.x = Math.PI / 2;
    eraMount.userData.moduleId = 'nauka';
    eraMount.userData.stationPickable = true;
    eraMount.name = 'nauka_era_mount';
    setShadowFlags(eraMount);
    root.add(eraMount);
    // Small radiator panel on starboard side
    const naukaRadMat = new THREE.MeshStandardMaterial({
      color: RADIATOR_WHITE,
      metalness: 0.05,
      roughness: 0.9,
    });
    const naukaRad = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.5, 0.18), naukaRadMat);
    naukaRad.position.set(nx, ny, nz + nR + 0.12);
    naukaRad.userData.moduleId = 'nauka';
    naukaRad.userData.stationPickable = true;
    naukaRad.name = 'nauka_radiator';
    setShadowFlags(naukaRad);
    root.add(naukaRad);
  }

  // ── Prichal 5-port hub stubs (Phase 2b) ────────────────────────────
  // Real Prichal has 6 hatches: 1 zenith (connects to Nauka above),
  // 4 radial (port/starboard/fwd/aft for visiting craft), 1 nadir.
  // We render 5 visible stubs (skipping the zenith one which connects
  // up into Nauka and would be hidden inside the host).
  const prichalPos = modulePositions.get('prichal');
  if (prichalPos) {
    const [px, py, pz] = prichalPos;
    const pR = moduleRadius.get('prichal') ?? 0.13;
    // 4 equatorial ports
    for (let i = 0; i < 4; i++) {
      const angle = (i * Math.PI) / 2;
      const stub = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.08, 8), accessoryMat);
      stub.position.set(px + Math.cos(angle) * (pR + 0.04), py, pz + Math.sin(angle) * (pR + 0.04));
      stub.rotation.z = Math.PI / 2;
      stub.rotation.y = -angle;
      stub.userData.moduleId = 'prichal';
      stub.userData.stationPickable = true;
      stub.name = `prichal_port_${i}`;
      setShadowFlags(stub);
      root.add(stub);
    }
    // 5th port — nadir (Earth-facing)
    const nadirStub = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.08, 8), accessoryMat);
    nadirStub.position.set(px, py - pR - 0.04, pz);
    nadirStub.rotation.x = Math.PI; // point downward
    nadirStub.userData.moduleId = 'prichal';
    nadirStub.userData.stationPickable = true;
    nadirStub.name = 'prichal_port_nadir';
    setShadowFlags(nadirStub);
    root.add(nadirStub);
  }

  // ── Poisk + Pirs twin-port detail (Phase 2b) ───────────────────────
  // MRM-2 design has port stubs at both ends (zenith for Soyuz/Progress
  // dock + nadir hatch facing parent). Our existing PROBES block adds
  // the visible probe; here we add a small structural ring at the
  // base end so the module reads as a docking compartment, not a plain
  // cylinder.
  for (const id of ['poisk', 'pirs'] as const) {
    const pos = modulePositions.get(id);
    const r = moduleRadius.get(id);
    if (!pos || !r) continue;
    const [mx, my, mz] = pos;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(r * 1.05, 0.012, 6, 14), accessoryMat);
    ring.rotation.x = Math.PI / 2;
    // Place ring at the base (parent-facing) end of the module
    const baseY = id === 'poisk' ? my - 0.18 : my + 0.18;
    ring.position.set(mx, baseY, mz);
    ring.userData.moduleId = id;
    ring.userData.stationPickable = true;
    ring.name = `${id}_base_ring`;
    setShadowFlags(ring);
    root.add(ring);
  }

  // ── Rassvet NESV instrumentation mount (Phase 2b) ──────────────────
  const rassvetPos = modulePositions.get('rassvet');
  if (rassvetPos) {
    const [rx, ry, rz] = rassvetPos;
    const rR = moduleRadius.get('rassvet') ?? 0.093;
    // NESV (Nadir Earth-Sky View) — small instrumentation box on the
    // forward (zenith-facing) end
    const nesv = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.04, 0.06), accessoryMat);
    nesv.position.set(rx, ry + 0.18, rz + rR + 0.02);
    nesv.userData.moduleId = 'rassvet';
    nesv.userData.stationPickable = true;
    nesv.name = 'rassvet_nesv';
    setShadowFlags(nesv);
    root.add(nesv);
  }

  // ── Zarya folded-array stubs (Phase 2b) ────────────────────────────
  // The original Zarya solar arrays were folded back against the hull
  // when the US segment installed its larger arrays. Render them as
  // small longitudinal stubs along the hull.
  const zaryaPos = modulePositions.get('zarya');
  if (zaryaPos) {
    const [zax, zay, zaz] = zaryaPos;
    const zaR = moduleRadius.get('zarya') ?? 0.161;
    for (const dy of [zaR + 0.025, -(zaR + 0.025)]) {
      const stub = new THREE.Mesh(
        new THREE.BoxGeometry(0.45, 0.025, 0.08),
        new THREE.MeshStandardMaterial({
          color: 0x2a3a5a,
          metalness: 0.3,
          roughness: 0.6,
        }),
      );
      stub.position.set(zax + 0.05, zay + dy, zaz);
      stub.userData.moduleId = 'zarya';
      stub.userData.stationPickable = true;
      stub.name = 'zarya_folded_array';
      setShadowFlags(stub);
      root.add(stub);
    }
  }

  buildVisitingFleet(root);

  return root;
}

function buildSoyuz(): THREE.Group {
  const g = new THREE.Group();
  g.name = 'visiting_soyuz';
  const hull = new THREE.MeshStandardMaterial({
    color: RUS_HULL,
    metalness: 0.2,
    roughness: 0.7,
  });
  // Real Soyuz: 7.48 m × 2.72 m → 0.59 × 0.107 in scene units
  // Orbital module (front - docks at station). Spherical, ~2.3m diameter.
  const orbital = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 8), hull);
  orbital.position.y = 0.09;
  setShadowFlags(orbital);
  g.add(orbital);
  // Descent module (truncated cone, ~2.2m).
  const descent = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.107, 0.18, 12), hull);
  descent.position.y = 0.27;
  setShadowFlags(descent);
  g.add(descent);
  // Service module (cylindrical, ~2.6m).
  const service = new THREE.Mesh(new THREE.CylinderGeometry(0.107, 0.107, 0.21, 12), hull);
  service.position.y = 0.47;
  setShadowFlags(service);
  g.add(service);
  // Solar wings — rectangular blue silicon panels on service module
  const wings = new THREE.Group();
  wings.position.y = 0.47;
  wings.rotation.x = Math.PI / 2;
  wings.userData.tracksSun = true;
  wings.userData.sadaAxis = 'x';
  wings.userData.baseRotation = Math.PI / 2;
  makeWingPair(wings, 0.29, 0.14, RUS_PANEL);
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
  // Real Progress: 7.23 m × 2.72 m → 0.57 × 0.107 in scene units
  // Cargo module (front - docks at station, ~2.4m).
  const cargo = new THREE.Mesh(new THREE.CylinderGeometry(0.107, 0.107, 0.19, 12), hull);
  cargo.position.y = 0.095;
  setShadowFlags(cargo);
  g.add(cargo);
  // Refueling module (mid, ~1.0m).
  const refuel = new THREE.Mesh(new THREE.CylinderGeometry(0.105, 0.105, 0.08, 12), hull);
  refuel.position.y = 0.23;
  setShadowFlags(refuel);
  g.add(refuel);
  // Service module (~2.6m).
  const service = new THREE.Mesh(new THREE.CylinderGeometry(0.107, 0.107, 0.21, 12), hull);
  service.position.y = 0.43;
  setShadowFlags(service);
  g.add(service);
  // Solar wings — rectangular blue silicon panels
  const wings = new THREE.Group();
  wings.position.y = 0.43;
  wings.rotation.x = Math.PI / 2;
  wings.userData.tracksSun = true;
  wings.userData.sadaAxis = 'x';
  wings.userData.baseRotation = Math.PI / 2;
  makeWingPair(wings, 0.29, 0.14, RUS_PANEL);
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
  // Real Crew Dragon: 8.10 m capsule + 2.70 m trunk = 10.8 m × 4.0 m
  // Scene: 0.85 × 0.157 → capsule height 0.638 of 0.85, trunk 0.213
  // Capsule (front - docks at station)
  const capsule = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.157, 0.45, 14), hull);
  capsule.position.y = 0.225;
  setShadowFlags(capsule);
  g.add(capsule);
  // Capsule nose cone (crew only)
  if (crew) {
    const nose = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.085, 0.08, 12),
      new THREE.MeshStandardMaterial({ color: US_DARK, metalness: 0.3, roughness: 0.6 }),
    );
    nose.position.y = 0.49;
    setShadowFlags(nose);
    g.add(nose);
  }
  // Trunk (cylinder behind capsule) — extends into space
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.157, 0.157, 0.21, 14), hull);
  trunk.position.y = 0.625;
  setShadowFlags(trunk);
  g.add(trunk);
  // Body-mounted PV panel band on trunk surface (NO deployable wings)
  const trunkPanel = new THREE.Mesh(
    new THREE.CylinderGeometry(0.158, 0.158, 0.18, 14, 1, true),
    new THREE.MeshStandardMaterial({
      color: SOLAR_BLUE,
      metalness: 0.3,
      roughness: 0.55,
      side: THREE.DoubleSide,
    }),
  );
  trunkPanel.position.y = 0.625;
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
  // Real Cygnus enhanced: 6.71 m × 3.07 m → 0.53 × 0.121 in scene units
  // Pressurised cargo module (front - docks at station, ~5.2m)
  const pcm = new THREE.Mesh(new THREE.CylinderGeometry(0.121, 0.121, 0.41, 14), hull);
  pcm.position.y = 0.205;
  setShadowFlags(pcm);
  g.add(pcm);
  // Service module (~1.5m, smaller diameter)
  const service = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.12, 12), hull);
  service.position.y = 0.47;
  setShadowFlags(service);
  g.add(service);
  // 2 ROUND UltraFlex solar arrays — DISTINCTIVE Cygnus feature
  // Each is ~3.8m diameter → 0.30 unit radius
  // Build with alternating dark-blue radial slices to suggest the fan-fold
  const ultraflexBase = new THREE.MeshStandardMaterial({
    color: SOLAR_BLUE,
    metalness: 0.3,
    roughness: 0.55,
    side: THREE.DoubleSide,
  });
  const ultraflexSlice = new THREE.MeshStandardMaterial({
    color: 0x0a1a2c,
    metalness: 0.3,
    roughness: 0.6,
    side: THREE.DoubleSide,
  });
  for (const sign of [-1, 1]) {
    const arrayGroup = new THREE.Group();
    arrayGroup.position.set(sign * 0.18, 0.47, 0);
    arrayGroup.rotation.y = Math.PI / 2;
    // Base disc
    const base = new THREE.Mesh(new THREE.CircleGeometry(0.3, 18), ultraflexBase);
    setShadowFlags(base);
    arrayGroup.add(base);
    // 8-sector fan-fold pattern via thin radial slices on top
    for (let i = 0; i < 8; i += 2) {
      const startAngle = (i * Math.PI) / 4;
      const slice = new THREE.Mesh(
        new THREE.CircleGeometry(0.295, 8, startAngle, Math.PI / 4),
        ultraflexSlice,
      );
      slice.position.z = 0.001;
      setShadowFlags(slice);
      arrayGroup.add(slice);
    }
    arrayGroup.userData.tracksSun = true;
    arrayGroup.userData.sadaAxis = 'z';
    arrayGroup.userData.baseRotation = Math.PI / 2;
    g.add(arrayGroup);
  }
  return g;
}

function buildStarliner(): THREE.Group {
  const g = new THREE.Group();
  g.name = 'visiting_starliner';
  const hull = new THREE.MeshStandardMaterial({
    color: US_WHITE,
    metalness: 0.15,
    roughness: 0.6,
  });
  const accent = new THREE.MeshStandardMaterial({
    color: 0x1c3a72,
    metalness: 0.3,
    roughness: 0.5,
  });
  // Real Starliner: 5.03 m × 4.56 m → 0.40 × 0.180 in scene units
  // Crew capsule (front - docks at station)
  const capsule = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.18, 0.22, 14), hull);
  capsule.position.y = 0.11;
  setShadowFlags(capsule);
  g.add(capsule);
  // Top docking adapter
  const dockTip = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.09, 0.06, 12), hull);
  dockTip.position.y = 0.25;
  setShadowFlags(dockTip);
  g.add(dockTip);
  // Service module — body-mounted PV on aft dome surface
  const service = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.18, 14), hull);
  service.position.y = 0.31;
  setShadowFlags(service);
  g.add(service);
  // Boeing blue accent ring at capsule/service junction
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.012, 6, 16), accent);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.22;
  setShadowFlags(ring);
  g.add(ring);
  // Aft dome with solar PV (body-mounted, no deployable arrays)
  const aftDome = new THREE.Mesh(
    new THREE.SphereGeometry(0.18, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshStandardMaterial({
      color: SOLAR_BLUE,
      metalness: 0.3,
      roughness: 0.55,
    }),
  );
  aftDome.rotation.x = Math.PI;
  aftDome.position.y = 0.4;
  setShadowFlags(aftDome);
  g.add(aftDome);
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
  // Real HTV-X: 8.0 m × 4.4 m → 0.63 × 0.173 in scene units
  // Pressurised cargo (front - docks at station, ~5.0m)
  const pressurized = new THREE.Mesh(new THREE.CylinderGeometry(0.173, 0.173, 0.39, 14), white);
  pressurized.position.y = 0.195;
  setShadowFlags(pressurized);
  g.add(pressurized);
  // Service module (gold MLI, ~3.0m)
  const service = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.24, 14), gold);
  service.position.y = 0.51;
  setShadowFlags(service);
  g.add(service);
  // 2 rectangular blue solar wings on service module (replacing original HTV's body-mounted)
  const wings = new THREE.Group();
  wings.position.y = 0.51;
  wings.rotation.x = Math.PI / 2;
  wings.userData.tracksSun = true;
  wings.userData.sadaAxis = 'x';
  wings.userData.baseRotation = Math.PI / 2;
  makeWingPair(wings, 0.4, 0.18, SOLAR_BLUE);
  g.add(wings);
  return g;
}

export const ISS_VISITOR_IDS = [
  'soyuz_ms',
  'progress_ms',
  'crew_dragon',
  'cargo_dragon',
  'cygnus',
  'htv_x',
  'starliner',
] as const;

export type IssVisitorId = (typeof ISS_VISITOR_IDS)[number];

interface DockedShip {
  id: IssVisitorId;
  build: () => THREE.Group;
  /** Position of the docking port on the host module. */
  port: [number, number, number];
  /** Direction the vehicle extends out from the port. */
  out: 'plusY' | 'minusY' | 'plusZ' | 'minusZ' | 'plusX' | 'minusX';
}

function buildVisitingFleet(root: THREE.Group) {
  // Dock locations adjusted for new module positions.
  // Russian segment: Soyuz / Progress at Pirs/Rassvet/Poisk ports.
  // US segment: Crew Dragon at Harmony forward (PMA-2), Cargo Dragon at Harmony zenith (PMA-3),
  // Cygnus at Unity nadir, HTV-X at Harmony nadir, Starliner at Harmony forward backup port.
  const fleet: DockedShip[] = [
    // Soyuz at Rassvet nadir (Zarya nadir port)
    { id: 'soyuz_ms', build: buildSoyuz, port: [-1.53, -0.65, 0], out: 'minusY' },
    // Progress at Poisk zenith (Zvezda zenith port)
    { id: 'progress_ms', build: buildProgress, port: [-2.58, 0.65, 0], out: 'plusY' },
    // Crew Dragon at PMA-2 (Harmony forward, +X)
    { id: 'crew_dragon', build: buildDragon.bind(null, true), port: [1.18, 0, 0], out: 'plusX' },
    // Cargo Dragon at PMA-3 (Harmony zenith, +Y)
    {
      id: 'cargo_dragon',
      build: buildDragon.bind(null, false),
      port: [0.66, 0.6, 0],
      out: 'plusY',
    },
    // Cygnus at Unity nadir (-Y) — historical Unity nadir berth
    { id: 'cygnus', build: buildCygnus, port: [-0.59, -0.4, 0], out: 'minusY' },
    // HTV-X at Harmony nadir (-Y)
    { id: 'htv_x', build: buildHtvX, port: [0.66, -0.4, 0], out: 'minusY' },
    // Starliner at PMA-2 backup spot (slightly offset to not overlap Crew Dragon visually)
    { id: 'starliner', build: buildStarliner, port: [0.66, 0, 0.6], out: 'plusZ' },
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

    // Faint dotted approach corridor extending past the vehicle in the
    // out-direction — suggests the rendezvous trajectory.
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
    const end = start.clone().addScaledVector(dir, 1.8);
    const lineGeom = new THREE.BufferGeometry().setFromPoints([start, end]);
    const line = new THREE.Line(lineGeom, corridorMat);
    line.computeLineDistances();
    line.userData.stationPickable = false;
    line.name = `corridor_${ship.id}`;
    root.add(line);
  }
}
