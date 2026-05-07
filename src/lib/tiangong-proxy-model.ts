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
// Tiangong station modules (Tianhe / Wentian / Mengtian) use flexible
// gallium-arsenide arrays with an amber-gold backing. Visiting craft
// (Shenzhou / Tianzhou) use traditional crystalline-silicon arrays
// which read as deep blue in photographs — so the station and its
// docked vehicles carry distinctly different array colours.
const SOLAR_GOLD = 0xb8954a;
const SOLAR_BLUE = 0x1f3e6c;
const ARM_GREY = 0x3a3a40;
const CAPSULE_HULL = 0xd9d2c4;

function makeSolarArrayTexture(): THREE.CanvasTexture {
  const cvs = document.createElement('canvas');
  cvs.width = 64;
  cvs.height = 64;
  const ctx = cvs.getContext('2d')!;
  // Honey-gold base — matches the GaAs-cell Tiangong arrays.
  ctx.fillStyle = '#b8954a';
  ctx.fillRect(0, 0, 64, 64);
  // Darker amber grid for the cell separators.
  ctx.strokeStyle = '#5c4220';
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
  // Subtle warm sheen on alternating cells (specular highlight feel).
  ctx.fillStyle = 'rgba(220, 180, 90, 0.22)';
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
  // Two wing pairs flanking the service module (Shenzhou has port +
  // starboard arrays). Shenzhou uses traditional crystalline-silicon
  // cells which appear deep blue — distinct from the station's
  // gallium-arsenide gold.
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
  // One wing pair on service module — Tianzhou uses crystalline-silicon
  // cells (deep blue), same as Shenzhou and unlike the station's
  // gallium-arsenide gold arrays.
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

  // Forward node module — the spherical multi-port hub where Tianhe,
  // Wentian, Mengtian, and visiting vehicles all converge. Real
  // Tiangong's node module has 5 docking ports (forward axial + 4
  // radial) and reads as a rounded spherical hub in CMSA renders, not
  // a flat cylinder. Sized larger than Tianhe radius so it visibly
  // dominates the junction.
  const forwardNode = new THREE.Mesh(
    new THREE.SphereGeometry(tianheRadius * 1.55, 18, 14),
    hullMat,
  );
  forwardNode.position.set(tianheLen / 2 + 0.18, 0, 0);
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

  // Forward-node forward axial docking adapter (gold MLI) — where
  // Tianzhou cargo docks, on the opposite end of the station from
  // Shenzhou (which is at Tianhe's aft port). This is the canonical
  // long-axis configuration: cargo at one end, crew at the other.
  const forwardAxialAdapter = new THREE.Mesh(
    new THREE.CylinderGeometry(tianheRadius * 0.9, tianheRadius * 0.9, 0.16, 12),
    mliMat,
  );
  forwardAxialAdapter.rotation.z = Math.PI / 2;
  forwardAxialAdapter.position.set(tianheLen / 2 + 0.18 + tianheRadius * 1.55 + 0.05, 0, 0);
  forwardAxialAdapter.userData.stationPickable = true;
  forwardAxialAdapter.userData.moduleId = 'tianhe';
  setShadowFlags(forwardAxialAdapter);
  root.add(forwardAxialAdapter);

  // Forward-node zenith docking adapter (gold MLI) — where the second
  // Shenzhou attaches during crew handover periods (the canonical
  // 3-spacecraft configuration shown in CMSA station diagrams).
  const zenithAdapter = new THREE.Mesh(
    new THREE.CylinderGeometry(tianheRadius * 0.85, tianheRadius * 0.85, 0.18, 12),
    mliMat,
  );
  zenithAdapter.position.set(tianheLen / 2 + 0.18, 0, tianheRadius * 1.55 + 0.05);
  zenithAdapter.rotation.x = Math.PI / 2;
  zenithAdapter.userData.stationPickable = true;
  zenithAdapter.userData.moduleId = 'tianhe';
  setShadowFlags(zenithAdapter);
  root.add(zenithAdapter);

  // ── Tianhe's own solar arrays — TWO pairs (4 wings total) per the
  // real station after the array-relocation campaign. Both pairs deploy
  // perpendicular to Tianhe's X-axis along ±Y, with face normal ±Z so
  // they're sun-facing. Mounted at two stations along Tianhe's body
  // (one closer to aft, one closer to the forward node). ──────────────
  //
  // Real Tiangong proportions: Tianhe is 16.6 m long; each Tianhe array
  // is ~12.6 m × 4.65 m. Per-side wing length ≈ 0.76 × core length, ~2.7:1
  // long-thin aspect. Inlined (rather than using makeWingPair) because
  // Tianhe's wings extend along ±Y (perpendicular to Tianhe's X-axis,
  // in-plane with the labs' cross-bar) rather than along ±X.
  const tianheArrayMat = new THREE.MeshStandardMaterial({
    color: SOLAR_GOLD,
    metalness: 0.3,
    roughness: 0.55,
  });
  const tianheArrayTex = makeSolarArrayTexture();
  tianheArrayTex.repeat.set(1, 4);
  // Two mast positions along Tianhe's X axis. Both clustered in the aft
  // half of the core module (well separated from the forward-node hub
  // at the +X end), matching real Tiangong where Tianhe's array masts
  // sit near the cylindrical aft section.
  const tianheMastXs = [-tianheLen / 2 + 0.35, -tianheLen / 2 + 0.95];
  for (const mastX of tianheMastXs) {
    for (const sign of [-1, 1]) {
      const wing = new THREE.Mesh(
        // X = depth (0.4), Y = length (2.0), Z = thin (0.01) → face ±Z
        new THREE.BoxGeometry(0.4, 2.0, 0.01),
        tianheArrayMat.clone(),
      );
      wing.position.set(mastX, sign * (1.0 + 0.04), 0);
      if (wing.material instanceof THREE.MeshStandardMaterial) {
        wing.material.map = tianheArrayTex;
        wing.material.needsUpdate = true;
      }
      setShadowFlags(wing);
      wing.userData.stationPickable = false;
      wing.name = 'tianhe_solar_array';
      root.add(wing);
    }
  }

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

  // Wentian outboard solar mast — TWO parallel pairs (4 wings total) at
  // the +Y far end. Real Tiangong: each lab carries two SADA-mounted
  // pair assemblies side-by-side at the outboard tip, so 4 long gold
  // panels are visible per lab.
  //
  // Real proportions: each array ~27 m × 4.6 m; lab is ~17.9 m. Arrays
  // are 1.51× lab length per side and ~6:1 long-thin. They're the
  // dominant visual feature of the station.
  //
  // Geometry: makeWingPair gives wings along ±X with thin axis Y (face
  // normal Y). For sun-facing panels we need face normal Z, so each
  // group gets `rotation.x = π/2`. The two pairs are offset slightly
  // along the lab's outboard +Y axis (parallel rows). ─────────────────
  const arrayTex = makeSolarArrayTexture();
  arrayTex.repeat.set(6, 1);
  const labArrayDy = 0.45; // separation between the two parallel pairs
  for (const dy of [-labArrayDy / 2, +labArrayDy / 2]) {
    const pair = new THREE.Group();
    pair.position.set(tianheLen / 2 + 0.14, wentianBaseY + labLen + 0.04 + dy, 0);
    pair.rotation.x = Math.PI / 2;
    makeWingPair(pair, 3.6, 0.6, SOLAR_GOLD);
    root.add(pair);
    pair.traverse((c) => {
      if (c instanceof THREE.Mesh && c.material instanceof THREE.MeshStandardMaterial) {
        c.material = c.material.clone();
        c.material.map = arrayTex;
        c.material.needsUpdate = true;
      }
    });
  }

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

  // Mengtian outboard solar mast — TWO parallel pairs (4 wings total),
  // mirrored to -Y. Same dimensions and orientation as Wentian.
  for (const dy of [-labArrayDy / 2, +labArrayDy / 2]) {
    const pair = new THREE.Group();
    pair.position.set(tianheLen / 2 + 0.14, -(wentianBaseY + labLen + 0.04 + dy), 0);
    pair.rotation.x = Math.PI / 2;
    makeWingPair(pair, 3.6, 0.6, SOLAR_GOLD);
    root.add(pair);
    pair.traverse((c) => {
      if (c instanceof THREE.Mesh && c.material instanceof THREE.MeshStandardMaterial) {
        c.material = c.material.clone();
        c.material.map = arrayTex;
        c.material.needsUpdate = true;
      }
    });
  }

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
    // Tianzhou docks at the forward-node forward axial port (+X end),
    // OPPOSITE Shenzhou — the long-axis cargo/crew configuration shown
    // in canonical CMSA station diagrams.
    {
      id: 'tianzhou',
      build: buildTianzhou,
      port: [tianheLen / 2 + 0.18 + tianheRadius * 1.55 + 0.25, 0, 0],
      out: 'plusX',
    },
    // Second Shenzhou at the forward-node zenith port (+Z radial) —
    // the canonical 3-spacecraft configuration during crew handover.
    // Same pickable id as the aft Shenzhou; both meshes belong to the
    // shenzhou panel (visiting-fleet pattern from /iss).
    {
      id: 'shenzhou',
      build: buildShenzhou,
      port: [tianheLen / 2 + 0.18, 0, tianheRadius * 1.55 + 0.4],
      out: 'plusZ',
    },
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
