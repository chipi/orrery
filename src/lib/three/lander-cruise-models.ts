import * as THREE from 'three';

/**
 * Per-mission CRUISE-configuration models for /fly's cruise + approach act —
 * the spacecraft as it actually flies to its destination CARRYING the lander,
 * before the descent act separates and lands it. Lander/rover missions have no
 * entry in `interplanetary-spacecraft-models.ts` (that file is the orbiter /
 * flyby fleet), so they fell back to the flat 2D `scSprite` glyph on approach;
 * these builders replace that glyph with the real cruise stack (cruise-stage +
 * aeroshell for Mars EDL, CSM + LM for Apollo, transfer bus for Luna, …).
 *
 * Style matches `interplanetary-spacecraft-models.ts`: MeshPhongMaterial with a
 * low emissive so the shared /fly rim-light shader (onBeforeCompile) reads the
 * silhouette against dark space. Every builder returns a THREE.Group roughly
 * 1.5–2 units long (the /fly scene scales it uniformly).
 */

// ── Shared palette (mirrors interplanetary-spacecraft-models.ts) ──────────
const BUS_GREY = 0xb8b8b8;
const DISH_WHITE = 0xeaeaea;
const RTG_DARK = 0x3a3a3a;
const GOLD_FOIL = 0xd9b863;
const ACCENT_RED = 0xb45c5c;
const SOLAR_BLUE = 0x1f3a72;
const AEROSHELL_TAN = 0xcbb9a6; // backshell / heat-shield tile tan
const WHITE_MLI = 0xf0f0ea;

function mat(color: number, emissive = 0x111111, emissiveIntensity = 0.6): THREE.MeshPhongMaterial {
  return new THREE.MeshPhongMaterial({ color, emissive, emissiveIntensity, shininess: 30 });
}

function dispose(group: THREE.Group): void {
  group.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.geometry) m.geometry.dispose();
    if (m.material) {
      const mm = m.material as THREE.Material | THREE.Material[];
      if (Array.isArray(mm)) mm.forEach((x) => x.dispose());
      else mm.dispose();
    }
  });
}

// ── Reusable cruise-craft parts ───────────────────────────────────────────

/** Flat cruise-stage disk (solar-cell ring + hub) — the Mars-EDL transit bus. */
function cruiseStage(radius: number, thickness = radius * 0.16): THREE.Group {
  const g = new THREE.Group();
  const disk = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, thickness, 36),
    mat(SOLAR_BLUE, 0x0a1430, 0.5),
  );
  g.add(disk);
  // Grey hub cap so it doesn't read as a solid blue coin.
  const hub = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 0.4, radius * 0.4, thickness * 1.2, 24),
    mat(BUS_GREY),
  );
  g.add(hub);
  return g;
}

/**
 * Aeroshell that ENCLOSES a lander: 70° sphere-cone heat-shield (down) + a
 * conical backshell (up). Returns the shell group; the lander rides hidden
 * inside during cruise (we don't add it — the silhouette is the shell).
 */
function aeroshell(radius: number, tan = AEROSHELL_TAN): THREE.Group {
  const g = new THREE.Group();
  const heat = new THREE.Mesh(
    new THREE.ConeGeometry(radius, radius * 0.5, 32),
    mat(RTG_DARK, 0x201008),
  );
  heat.rotation.x = Math.PI; // point down
  heat.position.y = -radius * 0.25;
  const back = new THREE.Mesh(new THREE.ConeGeometry(radius, radius * 0.7, 32), mat(tan, 0x231c12));
  back.position.y = radius * 0.35;
  g.add(heat, back);
  return g;
}

/** Boxy equipment bus. */
function bus(w: number, h: number, d: number, color = GOLD_FOIL): THREE.Mesh {
  return new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color, 0x2a2113));
}

/** A flat solar-array wing at ±x offset. */
function solarWing(w: number, h: number, x: number): THREE.Mesh {
  const wing = new THREE.Mesh(
    new THREE.BoxGeometry(w, 0.02 * w, h),
    mat(SOLAR_BLUE, 0x0a1430, 0.5),
  );
  wing.position.x = x;
  return wing;
}

/** High-gain dish on a short boom facing +z. */
function dish(radius: number): THREE.Mesh {
  const d = new THREE.Mesh(
    new THREE.SphereGeometry(radius, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2.3),
    mat(DISH_WHITE, 0x333333),
  );
  d.rotation.x = -Math.PI / 2;
  return d;
}

/** Thin antenna / boom rod. */
function boom(len: number, r = len * 0.02): THREE.Mesh {
  return new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 8), mat(RTG_DARK, 0x151515));
}

// Referenced by later mission batches (antennas, red accents, MLI blankets).
void ACCENT_RED;
void WHITE_MLI;
void boom;

// ── Per-mission cruise builders (Mars batch) ──────────────────────────────

/**
 * Mars-EDL cruise archetype: a spin-stabilised cruise-stage disk on top of the
 * aeroshell that encloses the lander/rover. Parameterised so each Mars mission
 * reads distinctly (aeroshell size, cruise-stage width). Viking adds an orbiter.
 */
function marsCruise(opts: { shellR: number; cruiseR: number }): THREE.Group {
  const g = new THREE.Group();
  const shell = aeroshell(opts.shellR);
  shell.position.y = -opts.shellR * 0.2;
  const cs = cruiseStage(opts.cruiseR);
  cs.position.y = opts.shellR * 0.6;
  g.add(shell, cs);
  return g;
}

function buildCuriosityCruise(): THREE.Group {
  // MSL: the largest aeroshell ever flown to Mars + a wide cruise stage.
  return marsCruise({ shellR: 0.9, cruiseR: 1.0 });
}
function buildPerseveranceCruise(): THREE.Group {
  return marsCruise({ shellR: 0.9, cruiseR: 1.0 });
}
function buildInsightCruise(): THREE.Group {
  return marsCruise({ shellR: 0.6, cruiseR: 0.75 });
}
function buildPhoenixCruise(): THREE.Group {
  return marsCruise({ shellR: 0.62, cruiseR: 0.78 });
}
function buildPathfinderCruise(): THREE.Group {
  return marsCruise({ shellR: 0.6, cruiseR: 0.72 });
}
function buildSpiritCruise(): THREE.Group {
  return marsCruise({ shellR: 0.62, cruiseR: 0.75 });
}
function buildOpportunityCruise(): THREE.Group {
  return marsCruise({ shellR: 0.62, cruiseR: 0.75 });
}
function buildSchiaparelliCruise(): THREE.Group {
  // Rode attached to the Trace Gas Orbiter — small aeroshell + a bus.
  const g = marsCruise({ shellR: 0.5, cruiseR: 0.6 });
  const tgo = bus(0.6, 0.3, 0.3, BUS_GREY);
  tgo.position.y = 0.9;
  g.add(tgo, solarWing(0.9, 0.4, -0.75), solarWing(0.9, 0.4, 0.75));
  return g;
}
function buildViking1Cruise(): THREE.Group {
  // Viking = orbiter (octagonal bus + panels + dish) with the lander in its
  // bioshield aeroshell slung below.
  const g = new THREE.Group();
  const orbiter = bus(0.8, 0.35, 0.8, GOLD_FOIL);
  orbiter.position.y = 0.55;
  const hgd = dish(0.4);
  hgd.position.set(0, 0.55, 0.5);
  g.add(orbiter, hgd, solarWing(1.3, 0.55, -1.0), solarWing(1.3, 0.55, 1.0));
  const shell = aeroshell(0.6);
  shell.position.y = -0.2;
  g.add(shell);
  return g;
}
function buildMars3Cruise(): THREE.Group {
  // Soviet M-71: a cylindrical bus with the descent-capsule aeroshell on top.
  const g = new THREE.Group();
  const busBody = new THREE.Mesh(
    new THREE.CylinderGeometry(0.45, 0.45, 0.9, 24),
    mat(BUS_GREY, 0x222222),
  );
  busBody.position.y = -0.1;
  const shell = new THREE.Mesh(
    new THREE.SphereGeometry(0.55, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2),
    mat(AEROSHELL_TAN, 0x231c12),
  );
  shell.position.y = 0.55;
  g.add(busBody, shell, solarWing(1.4, 0.5, -0.9), solarWing(1.4, 0.5, 0.9));
  return g;
}
function buildTianwen1Cruise(): THREE.Group {
  // Orbiter bus + the entry-capsule aeroshell (rover inside).
  const g = new THREE.Group();
  const orbiter = bus(0.7, 0.4, 0.7, GOLD_FOIL);
  orbiter.position.y = 0.5;
  const shell = aeroshell(0.62);
  shell.position.y = -0.2;
  g.add(orbiter, shell, solarWing(1.5, 0.5, -0.95), solarWing(1.5, 0.5, 0.95));
  const hgd = dish(0.32);
  hgd.position.set(0, 0.5, 0.45);
  g.add(hgd);
  return g;
}

// ── Dispatch ──────────────────────────────────────────────────────────────

const BUILDERS: Record<string, () => THREE.Group> = {
  curiosity: buildCuriosityCruise,
  perseverance: buildPerseveranceCruise,
  insight: buildInsightCruise,
  phoenix: buildPhoenixCruise,
  'mars-pathfinder': buildPathfinderCruise,
  spirit: buildSpiritCruise,
  opportunity: buildOpportunityCruise,
  schiaparelli: buildSchiaparelliCruise,
  viking1: buildViking1Cruise,
  mars3: buildMars3Cruise,
  tianwen1: buildTianwen1Cruise,
};

/**
 * The cruise-configuration model for a lander mission (its transit stack), or
 * null when the mission has no dedicated cruise builder (keeps the sprite).
 */
export function buildLanderCruiseCraft(missionId: string): THREE.Group | null {
  const fn = BUILDERS[missionId];
  if (!fn) return null;
  const g = fn();
  g.userData.dispose = () => dispose(g);
  return g;
}

/** Public for testing / colophon enumeration. */
export const CRUISE_MISSION_IDS = Object.keys(BUILDERS);
