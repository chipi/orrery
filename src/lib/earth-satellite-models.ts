import * as THREE from 'three';

/**
 * Per-spacecraft 3D model builders for the /earth scene.
 *
 * Each builder approximates the silhouette + surface treatment of a
 * real spacecraft using Three.js primitives. v0.1.7 upgrade: PBR
 * materials (`MeshStandardMaterial` with real metalness/roughness)
 * replace the flat-shaded `MeshPhongMaterial` defaults so reflective
 * surfaces (silver bodies, gold MLI) actually sheen against the
 * scene's directional sunlight.
 *
 * Reference shapes verified against:
 *   - NASA 3D Resources (https://nasa3d.arc.nasa.gov)
 *   - ESA spacecraft factsheets
 *   - CMSA Tiangong public-release imagery
 *
 * Real spacecraft color palette (most are white-MLI bodies with a
 * coloured accent panel + gold thermal blanketing where heat must
 * leave fast; solar arrays are deep navy with mid-roughness):
 *   - body: near-white MLI for most thermal blankets
 *   - gold: kapton MLI on JWST, parts of LRO, etc.
 *   - dark navy: solar-array silicon
 *   - silver: bare aluminium structural elements (truss, antennas)
 *
 * The `color` parameter (from earth-objects.json) tints accent panels
 * + emissive glow rings only — keeps nation/agency colour visible at
 * the small render scale without painting the entire body in flag
 * colours (which would look unrealistic).
 */

const PANEL_COLOR = 0x0b1840; // solar-array deep navy
const MLI_WHITE = 0xeeeeee; // multi-layer insulation thermal blanket
const SILVER = 0xb8b8b8; // bare aluminium / structural
const GOLD = 0xd4af37; // kapton thermal blanket
const DARK = 0x1a1a1a; // sensor apertures, anti-reflective coatings

function bodyMat(color: string): THREE.MeshStandardMaterial {
  // PBR body material: near-white MLI thermal blanket with a subtle
  // tint of the spacecraft's accent colour. Keeps the body realistic
  // while the accent ring (drawn separately) carries the nation-code
  // signal.
  return new THREE.MeshStandardMaterial({
    color: MLI_WHITE,
    metalness: 0.15,
    roughness: 0.55,
    emissive: color,
    emissiveIntensity: 0.06,
  });
}

function accentMat(color: string): THREE.MeshStandardMaterial {
  // Bright accent piece — small panels, instrument boxes — coloured
  // by the spacecraft's nation tint to keep agency identity visible.
  return new THREE.MeshStandardMaterial({
    color,
    metalness: 0.25,
    roughness: 0.45,
    emissive: color,
    emissiveIntensity: 0.18,
  });
}

function panelMat(): THREE.MeshStandardMaterial {
  // Solar arrays — deep navy, mid-rough, slightly metallic for cell
  // glint.
  return new THREE.MeshStandardMaterial({
    color: PANEL_COLOR,
    metalness: 0.35,
    roughness: 0.3,
  });
}

function silverMat(): THREE.MeshStandardMaterial {
  // Bare aluminium / steel — high metalness, low roughness.
  return new THREE.MeshStandardMaterial({
    color: SILVER,
    metalness: 0.85,
    roughness: 0.25,
  });
}

function goldMat(): THREE.MeshStandardMaterial {
  // Kapton-gold thermal blanket — high metalness, mid roughness.
  return new THREE.MeshStandardMaterial({
    color: GOLD,
    metalness: 0.9,
    roughness: 0.35,
    emissive: GOLD,
    emissiveIntensity: 0.08,
  });
}

function darkMat(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: DARK,
    metalness: 0.4,
    roughness: 0.6,
  });
}

// ─── Per-spacecraft builders ────────────────────────────────────────

/** ISS — long truss with cylindrical pressurised modules clustered at
 *  the center, four pairs of huge gold solar wings to port and
 *  starboard. The truss is the dominant silhouette. */
function buildISS(color: string): THREE.Group {
  const g = new THREE.Group();
  const mat = bodyMat(color);
  // Central truss — long horizontal box.
  const truss = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.08, 0.08), mat);
  g.add(truss);
  // Pressurised modules — 3 cylinders at center, perpendicular to truss.
  for (const dz of [-0.18, 0, 0.18]) {
    const mod = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.5, 12), silverMat());
    mod.rotation.x = Math.PI / 2;
    mod.position.set(0, 0, dz);
    g.add(mod);
  }
  // Solar arrays — 4 pairs of large flat panels along the truss.
  const arrayPositions = [-0.95, -0.65, 0.65, 0.95];
  for (const dx of arrayPositions) {
    for (const dy of [-0.32, 0.32]) {
      const wing = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.02, 0.55), panelMat());
      wing.position.set(dx, dy, 0);
      g.add(wing);
    }
  }
  // Radiator panels — small white panels above truss.
  for (const dx of [-0.4, 0.4]) {
    const rad = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 0.02, 0.4),
      new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.4, roughness: 0.5 }),
    );
    rad.position.set(dx, 0.18, 0);
    g.add(rad);
  }
  // Nation-coloured accent stripe along the truss centreline — keeps
  // agency colour visible against the white-MLI station body.
  const accent = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.05, 0.05), accentMat(color));
  g.add(accent);
  return g;
}

/** Tiangong — T-shape: cylindrical Tianhe core module along one axis,
 *  perpendicular Wentian + Mengtian lab modules forming the cross-bar.
 *  Two long solar wings deployed from the core. */
function buildTiangong(color: string): THREE.Group {
  const g = new THREE.Group();
  const mat = bodyMat(color);
  const moduleMat = silverMat();
  // Core module (Tianhe) — long cylinder along X.
  const core = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 1.2, 16), mat);
  core.rotation.z = Math.PI / 2;
  g.add(core);
  // Lab modules (Wentian, Mengtian) — perpendicular cylinders forming cross.
  for (const dz of [-0.5, 0.5]) {
    const lab = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.9, 16), moduleMat);
    lab.position.set(0, 0, dz);
    g.add(lab);
  }
  // Solar wings — 2 large arrays from the core.
  for (const dx of [-1.05, 1.05]) {
    const wing = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.03, 0.45), panelMat());
    wing.position.set(dx, 0, 0);
    g.add(wing);
  }
  return g;
}

/** Hubble — silver elongated cylinder (~13 m × 4 m, ratio 3:1), aperture
 *  door at front, gold solar wings along sides, small high-gain antenna. */
function buildHubble(color: string): THREE.Group {
  const g = new THREE.Group();
  const mat = bodyMat(color);
  // Main tube — silver-tinted cylinder.
  const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 1.0, 16), silverMat());
  tube.rotation.z = Math.PI / 2;
  g.add(tube);
  // Aperture door — slightly conical at one end.
  const door = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.22, 0.1, 16), darkMat());
  door.rotation.z = Math.PI / 2;
  door.position.x = 0.55;
  g.add(door);
  // Gold solar arrays — flat panels along sides.
  for (const dy of [-0.28, 0.28]) {
    const wing = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.02, 0.5), goldMat());
    wing.position.y = dy;
    g.add(wing);
  }
  // High-gain antenna boom.
  const boom = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.4, 4), mat);
  boom.position.set(-0.4, 0, 0.3);
  g.add(boom);
  const dish = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.03, 12), mat);
  dish.position.set(-0.4, 0, 0.5);
  dish.rotation.x = Math.PI / 2;
  g.add(dish);
  return g;
}

/** JWST — iconic. Hexagonal gold mirror floating above a large
 *  pentagonal silver sunshield (5-layer kite shape). Secondary mirror
 *  tripod above the primary. */
function buildJWST(color: string): THREE.Group {
  const g = new THREE.Group();
  // Sunshield — pentagonal silver kite (large, flat).
  // Five-sided cylinder rendered nearly flat = pentagonal disc.
  const shield = new THREE.Mesh(
    new THREE.CylinderGeometry(0.85, 0.95, 0.04, 5),
    new THREE.MeshStandardMaterial({
      color: SILVER,
      metalness: 0.95,
      roughness: 0.18,
      side: THREE.DoubleSide,
    }),
  );
  shield.position.y = -0.1;
  g.add(shield);
  // Primary mirror — hexagonal gold disc above the sunshield.
  const mirror = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.04, 6), goldMat());
  mirror.position.y = 0.25;
  g.add(mirror);
  // Secondary mirror tripod — 3 thin cylinders converging above primary.
  const tripodMat = silverMat();
  for (let i = 0; i < 3; i++) {
    const ang = (i / 3) * Math.PI * 2;
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.5, 4), tripodMat);
    leg.position.set(Math.cos(ang) * 0.25, 0.45, Math.sin(ang) * 0.25);
    leg.rotation.z = Math.atan2(Math.cos(ang) * 0.25, 0.2);
    leg.rotation.x = Math.atan2(Math.sin(ang) * 0.25, 0.2);
    g.add(leg);
  }
  // Secondary mirror at top.
  const secondary = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), bodyMat(color));
  secondary.position.y = 0.65;
  g.add(secondary);
  return g;
}

/** Chandra X-ray Observatory — long thin pointed cylinder (telescope
 *  with grazing-incidence optics — narrowest end is the aperture),
 *  large solar arrays, dark thermal coating. */
function buildChandra(color: string): THREE.Group {
  const g = new THREE.Group();
  const mat = bodyMat(color);
  // Telescope tube — long cone-cylinder taper (wider at instrument end).
  const tube = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.18, 1.4, 16),
    new THREE.MeshStandardMaterial({ color: 0x1a1a2e, metalness: 0.55, roughness: 0.55 }),
  );
  tube.rotation.z = Math.PI / 2;
  g.add(tube);
  // Solar arrays — 2 long flat wings.
  for (const dy of [-0.4, 0.4]) {
    const wing = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.02, 0.4), panelMat());
    wing.position.set(0.1, dy, 0);
    g.add(wing);
  }
  // Aperture marker — small dark circle at narrow end.
  const aperture = new THREE.Mesh(
    new THREE.CylinderGeometry(0.09, 0.09, 0.04, 12),
    new THREE.MeshStandardMaterial({ color: 0x000000, metalness: 0.0, roughness: 0.95 }),
  );
  aperture.rotation.z = Math.PI / 2;
  aperture.position.x = 0.72;
  g.add(aperture);
  // High-gain antenna at instrument end.
  const dish = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.03, 12), mat);
  dish.position.set(-0.85, 0, 0.15);
  dish.rotation.x = Math.PI / 2;
  g.add(dish);
  return g;
}

/** XMM-Newton — long white telescope tube with 4 solar panels
 *  arranged in a cross at one end, smaller and more compact than
 *  Chandra. */
function buildXMM(color: string): THREE.Group {
  const g = new THREE.Group();
  const mat = bodyMat(color);
  // Telescope tube — long white cylinder.
  const tube = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.18, 1.1, 16),
    new THREE.MeshStandardMaterial({ color: 0xeeeeee, metalness: 0.5, roughness: 0.4 }),
  );
  tube.rotation.z = Math.PI / 2;
  g.add(tube);
  // 4 solar panels arranged as cross at one end.
  for (let i = 0; i < 4; i++) {
    const ang = (i / 4) * Math.PI * 2;
    const wing = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.02, 0.18), panelMat());
    wing.position.set(-0.45, Math.cos(ang) * 0.28, Math.sin(ang) * 0.28);
    wing.rotation.x = ang;
    g.add(wing);
  }
  // Optical bench at far end.
  const bench = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.32, 0.32), mat);
  bench.position.x = 0.6;
  g.add(bench);
  return g;
}

/** Gaia — large circular sunshade disc with cylindrical instrument
 *  body on top. Distinctive UFO silhouette. */
function buildGaia(color: string): THREE.Group {
  const g = new THREE.Group();
  const mat = bodyMat(color);
  // Sunshade — large flat circular disc, multi-layer silver foil.
  const shade = new THREE.Mesh(
    new THREE.CylinderGeometry(0.85, 0.85, 0.04, 32),
    new THREE.MeshStandardMaterial({
      color: SILVER,
      metalness: 0.95,
      roughness: 0.18,
      side: THREE.DoubleSide,
    }),
  );
  g.add(shade);
  // Instrument body — cylindrical drum on top of sunshade.
  const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.4, 16), mat);
  drum.position.y = 0.22;
  g.add(drum);
  // Top of drum (telescope apertures, 2 visible from above).
  for (const dz of [-0.15, 0.15]) {
    const aperture = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.05, 12), darkMat());
    aperture.position.set(0, 0.45, dz);
    g.add(aperture);
  }
  return g;
}

/** LRO — boxy bus with a single folding solar array deployed at an
 *  angle, prominent high-gain dish antenna, small Mini-RF antenna. */
function buildLRO(color: string): THREE.Group {
  const g = new THREE.Group();
  const mat = bodyMat(color);
  // Bus — main box body.
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.5, 0.3), mat);
  g.add(body);
  // Folding solar array — large rectangle at an angle.
  const wing = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.7, 0.5), panelMat());
  wing.position.set(0.4, 0.05, 0);
  wing.rotation.z = -0.3; // slight tilt
  g.add(wing);
  // High-gain dish — parabolic antenna on a boom.
  const boom = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.3, 4), mat);
  boom.position.set(-0.25, 0.25, 0);
  boom.rotation.z = Math.PI / 4;
  g.add(boom);
  const dish = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.04, 16), silverMat());
  dish.position.set(-0.4, 0.4, 0);
  dish.rotation.x = Math.PI / 2;
  g.add(dish);
  return g;
}

/** GEO comsat — large box body with parabolic communications dish
 *  facing earthward, two long horizontal solar wings. Generic
 *  geostationary architecture. */
function buildGEOComsat(color: string): THREE.Group {
  const g = new THREE.Group();
  const mat = bodyMat(color);
  // Main bus.
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.4), mat);
  g.add(body);
  // Parabolic dish — earthward-facing.
  const dish = new THREE.Mesh(
    new THREE.SphereGeometry(0.32, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2.3),
    new THREE.MeshStandardMaterial({
      color: SILVER,
      metalness: 0.85,
      roughness: 0.3,
      side: THREE.DoubleSide,
    }),
  );
  dish.position.y = -0.3;
  dish.rotation.x = Math.PI;
  g.add(dish);
  // Solar wings — long horizontal panels.
  for (const dx of [-0.85, 0.85]) {
    const wing = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.02, 0.4), panelMat());
    wing.position.set(dx, 0, 0);
    g.add(wing);
  }
  // Small omni antenna on top.
  const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.3, 4), mat);
  antenna.position.y = 0.35;
  g.add(antenna);
  return g;
}

/** Nav-constellation cluster — 6 dots arranged on an inclined ring,
 *  representing the 24–30-satellite constellation as a cluster.
 *  Used for GPS, Galileo, GLONASS, BeiDou (visually identical; the
 *  difference is altitude + nation color, both conveyed elsewhere). */
function buildConstellation(color: string): THREE.Group {
  const g = new THREE.Group();
  const mat = bodyMat(color);
  const ringR = 0.5;
  for (let i = 0; i < 6; i++) {
    const ang = (i / 6) * Math.PI * 2;
    // Each "dot" is actually a tiny sat: small box body + 2 wings.
    const subGroup = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.12), mat);
    subGroup.add(body);
    for (const dx of [-0.12, 0.12]) {
      const wing = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.015, 0.08), panelMat());
      wing.position.x = dx;
      subGroup.add(wing);
    }
    subGroup.position.set(Math.cos(ang) * ringR, Math.sin(ang) * ringR * 0.6, 0);
    g.add(subGroup);
  }
  return g;
}

/** Generic orbiter silhouette — hex bus body + symmetric solar
 *  wings + small high-gain dish. Distinct enough from the LRO
 *  asymmetric single-wing shape that you can read it as a
 *  different mission but recognisably an orbiter. Used both as
 *  the fallback for unknown ids in `buildSatelliteModel` and as
 *  the dedicated shape for the v0.4 lunar-orbiter backfill (Luna
 *  10, Clementine, Lunar Prospector, SMART-1, Chang'e 1/2,
 *  Chandrayaan-1). Exported so /moon and /mars can call it
 *  directly when rendering orbital markers. */
export function buildGenericOrbiter(color: string): THREE.Group {
  const g = new THREE.Group();
  const mat = bodyMat(color);
  // Hexagonal bus body — typical small-orbiter form.
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.3, 6), mat);
  g.add(body);
  // Two symmetric solar wings.
  for (const dx of [-0.5, 0.5]) {
    const wing = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.02, 0.32), panelMat());
    wing.position.set(dx, 0, 0);
    g.add(wing);
  }
  // Small high-gain dish on a short boom (Earth-facing comm).
  const boom = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.18, 4), mat);
  boom.position.set(0, 0.22, 0);
  g.add(boom);
  const dish = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.03, 14), silverMat());
  dish.position.set(0, 0.32, 0);
  dish.rotation.x = Math.PI / 2;
  g.add(dish);
  // Accent ring around the body so the agency colour is visible at scale.
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.012, 6, 24), accentMat(color));
  ring.rotation.x = Math.PI / 2;
  g.add(ring);
  return g;
}

// ─── Dispatch ───────────────────────────────────────────────────────

const BUILDERS: Record<string, (color: string) => THREE.Group> = {
  iss: buildISS,
  tiangong: buildTiangong,
  hubble: buildHubble,
  jwst: buildJWST,
  chandra: buildChandra,
  xmm: buildXMM,
  gaia: buildGaia,
  lro: buildLRO,
  geo: buildGEOComsat,
  gps: buildConstellation,
  galileo: buildConstellation,
  glonass: buildConstellation,
  beidou: buildConstellation,
  // v0.4 lunar-orbiter backfill — all share the generic-lunar-orbiter
  // silhouette (hex bus + symmetric wings + accent ring); their agency
  // colour distinguishes them. A future iteration can give the more
  // distinctive ones (Clementine's quad-bus, Chang'e 1/2's stacked
  // bus, etc.) dedicated silhouettes.
  luna10: buildGenericOrbiter,
  clementine: buildGenericOrbiter,
  'lunar-prospector': buildGenericOrbiter,
  'smart-1': buildGenericOrbiter,
  change1: buildGenericOrbiter,
  change2: buildGenericOrbiter,
  chandrayaan1: buildGenericOrbiter,
};

export function buildSatelliteModel(id: string, color: string): THREE.Group {
  const builder = BUILDERS[id];
  if (builder) return builder(color);
  // Unknown id → use the generic-orbiter silhouette (hex bus + wings
  // + dish). Better than the previous octahedron fallback for novel
  // missions and for /mars orbiters whose ids don't match any
  // dedicated builder yet (mars-odyssey, mro, maven, mangalyaan,
  // tgo, hope, mariner9, viking1-orbiter, mars3-orbiter, etc.).
  return buildGenericOrbiter(color);
}

/** Exposed for tests: list of ids that have a dedicated builder. */
export const KNOWN_SATELLITE_IDS = Object.keys(BUILDERS);
