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

// ── Per-mission cruise builders (Moon batch) ──────────────────────────────

/**
 * Apollo trans-lunar cruise: CSM (Command + Service Module) docked
 * nose-to-nose with the LM (Lunar Module). The CSM is white/gold; the LM
 * is a spidery gold-foil box on four landing legs with an octagonal ascent
 * stage on top.
 */
function buildApolloCruise(): THREE.Group {
  const g = new THREE.Group();

  // Command Module — blunt cone, white MLI
  const cm = new THREE.Mesh(new THREE.ConeGeometry(0.26, 0.38, 20), mat(WHITE_MLI, 0x282820));
  cm.rotation.x = Math.PI; // point up (apex down toward SM)
  cm.position.y = 1.35;

  // Service Module — cylinder, gold
  const sm = new THREE.Mesh(
    new THREE.CylinderGeometry(0.26, 0.26, 0.78, 20),
    mat(GOLD_FOIL, 0x2a2113),
  );
  sm.position.y = 0.82;

  // SPS engine bell at aft of SM
  const bell = new THREE.Mesh(
    new THREE.CylinderGeometry(0.14, 0.22, 0.32, 16),
    mat(RTG_DARK, 0x151515),
  );
  bell.position.y = 0.3;

  // Docking adapter (short white stub between CSM and LM)
  const adapter = new THREE.Mesh(
    new THREE.CylinderGeometry(0.22, 0.28, 0.22, 20),
    mat(WHITE_MLI, 0x282820),
  );
  adapter.position.y = 0.44;

  // LM descent stage — boxy, gold, wider
  const lmDescent = bus(0.44, 0.28, 0.44, GOLD_FOIL);
  lmDescent.position.y = 0.0;

  // LM ascent stage — octagonal boxy top
  const lmAscent = new THREE.Mesh(
    new THREE.CylinderGeometry(0.2, 0.2, 0.28, 8),
    mat(GOLD_FOIL, 0x2a2113),
  );
  lmAscent.position.y = 0.28;

  // Four landing legs splayed out from descent stage
  for (let i = 0; i < 4; i++) {
    const leg = boom(0.42, 0.015);
    leg.rotation.z = Math.PI * 0.35;
    leg.position.set(Math.cos((i * Math.PI) / 2) * 0.28, -0.18, Math.sin((i * Math.PI) / 2) * 0.28);
    leg.rotation.y = (i * Math.PI) / 2;
    g.add(leg);
  }

  g.add(cm, sm, bell, adapter, lmDescent, lmAscent);
  return g;
}

/**
 * Orion/ESM cruise: blunt capsule + ESM cylinder with 4 solar array wings
 * in a cross pattern + main engine bell.
 */
function buildOrionCruise(): THREE.Group {
  const g = new THREE.Group();

  // Crew module — blunt cone
  const cm = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.4, 20), mat(WHITE_MLI, 0x282820));
  cm.rotation.x = Math.PI;
  cm.position.y = 0.92;

  // European Service Module — cylinder
  const esm = new THREE.Mesh(
    new THREE.CylinderGeometry(0.3, 0.3, 0.82, 20),
    mat(BUS_GREY, 0x1a1a1a),
  );
  esm.position.y = 0.22;

  // Engine bell
  const bell = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.2, 0.28, 16),
    mat(RTG_DARK, 0x151515),
  );
  bell.position.y = -0.28;

  // Four solar array wings in cross — pairs on X and Z
  g.add(solarWing(0.82, 0.36, -0.72));
  g.add(solarWing(0.82, 0.36, 0.72));
  const wZ1 = solarWing(0.82, 0.36, 0);
  wZ1.rotation.y = Math.PI / 2;
  wZ1.position.z = -0.72;
  const wZ2 = solarWing(0.82, 0.36, 0);
  wZ2.rotation.y = Math.PI / 2;
  wZ2.position.z = 0.72;
  g.add(wZ1, wZ2);

  g.add(cm, esm, bell);
  return g;
}

/**
 * Luna 9 — direct-ascent probe: cylindrical propellant bus with a spherical
 * lander capsule on top and four vernier nozzles around the base.
 */
function buildLunaDirectCruise(): THREE.Group {
  const g = new THREE.Group();

  const busBody = new THREE.Mesh(
    new THREE.CylinderGeometry(0.28, 0.32, 0.7, 20),
    mat(BUS_GREY, 0x222222),
  );
  busBody.position.y = -0.2;

  // Spherical lander capsule
  const capsule = new THREE.Mesh(new THREE.SphereGeometry(0.22, 20, 14), mat(WHITE_MLI, 0x282820));
  capsule.position.y = 0.37;

  // Main engine bell at base
  const bell = new THREE.Mesh(
    new THREE.CylinderGeometry(0.1, 0.18, 0.24, 16),
    mat(RTG_DARK, 0x151515),
  );
  bell.position.y = -0.66;

  // Four vernier nozzles
  for (let i = 0; i < 4; i++) {
    const nozzle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.035, 0.06, 0.14, 10),
      mat(RTG_DARK, 0x151515),
    );
    nozzle.position.set(
      Math.cos((i * Math.PI) / 2) * 0.32,
      -0.54,
      Math.sin((i * Math.PI) / 2) * 0.32,
    );
    g.add(nozzle);
  }

  g.add(busBody, capsule, bell);
  return g;
}

/**
 * Luna 16/20/24 sample-return: a wide descent-stage tank bus with four
 * spherical fuel tanks + engine bell, topped by a slender ascent stage and
 * small return sphere.
 */
function buildLunaSampleCruise(): THREE.Group {
  const g = new THREE.Group();

  // Descent stage tank bus
  const descent = new THREE.Mesh(
    new THREE.CylinderGeometry(0.34, 0.34, 0.38, 20),
    mat(BUS_GREY, 0x222222),
  );
  descent.position.y = -0.38;

  // Four spherical propellant tanks
  for (let i = 0; i < 4; i++) {
    const tank = new THREE.Mesh(new THREE.SphereGeometry(0.14, 14, 10), mat(BUS_GREY, 0x1a1a1a));
    tank.position.set(
      Math.cos((i * Math.PI) / 2) * 0.38,
      -0.44,
      Math.sin((i * Math.PI) / 2) * 0.38,
    );
    g.add(tank);
  }

  // Descent engine bell
  const dbell = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.22, 0.28, 16),
    mat(RTG_DARK, 0x151515),
  );
  dbell.position.y = -0.7;

  // Ascent stage — slender cylinder
  const ascent = new THREE.Mesh(
    new THREE.CylinderGeometry(0.16, 0.16, 0.52, 16),
    mat(GOLD_FOIL, 0x2a2113),
  );
  ascent.position.y = 0.08;

  // Return capsule sphere on top
  const returnSphere = new THREE.Mesh(
    new THREE.SphereGeometry(0.16, 16, 12),
    mat(WHITE_MLI, 0x282820),
  );
  returnSphere.position.y = 0.52;

  g.add(descent, dbell, ascent, returnSphere);
  return g;
}

/**
 * Luna 17/21 Lunokhod carrier: a descent-stage bus with the Lunokhod rover
 * (a tub-shaped body with clamshell lid) stowed on top.
 */
function buildLunokhodCarrierCruise(): THREE.Group {
  const g = new THREE.Group();

  // Descent stage
  const descent = new THREE.Mesh(
    new THREE.CylinderGeometry(0.4, 0.4, 0.36, 20),
    mat(BUS_GREY, 0x222222),
  );
  descent.position.y = -0.44;

  // Engine bell
  const bell = new THREE.Mesh(
    new THREE.CylinderGeometry(0.14, 0.24, 0.3, 16),
    mat(RTG_DARK, 0x151515),
  );
  bell.position.y = -0.75;

  // Lunokhod rover tub body
  const tub = new THREE.Mesh(
    new THREE.CylinderGeometry(0.34, 0.34, 0.26, 10),
    mat(GOLD_FOIL, 0x2a2113),
  );
  tub.position.y = -0.1;

  // Clamshell solar-cell lid (flat half-cylinder)
  const lid = new THREE.Mesh(
    new THREE.CylinderGeometry(0.34, 0.34, 0.06, 10, 1, false, 0, Math.PI),
    mat(SOLAR_BLUE, 0x0a1430, 0.5),
  );
  lid.position.y = 0.14;

  // Eight wheels (simplified as small cylinders)
  for (let i = 0; i < 4; i++) {
    for (const side of [-1, 1]) {
      const wheel = new THREE.Mesh(
        new THREE.CylinderGeometry(0.07, 0.07, 0.06, 10),
        mat(RTG_DARK, 0x151515),
      );
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(side * 0.4, -0.17, (i - 1.5) * 0.2);
      g.add(wheel);
    }
  }

  g.add(descent, bell, tub, lid);
  return g;
}

/**
 * Chang'e 3/4: a boxy descent lander with four legs and engine bell, with
 * the Yutu rover (a small boxy gold unit) stowed on top.
 */
function buildChange34Cruise(): THREE.Group {
  const g = new THREE.Group();

  // Descent lander box
  const lander = bus(0.56, 0.36, 0.56, GOLD_FOIL);
  lander.position.y = -0.26;

  // Engine bell
  const bell = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.2, 0.28, 16),
    mat(RTG_DARK, 0x151515),
  );
  bell.position.y = -0.58;

  // Four landing legs
  for (let i = 0; i < 4; i++) {
    const leg = boom(0.46, 0.016);
    leg.rotation.z = Math.PI * 0.35;
    leg.position.set(
      Math.cos((i * Math.PI) / 2 + Math.PI / 4) * 0.3,
      -0.38,
      Math.sin((i * Math.PI) / 2 + Math.PI / 4) * 0.3,
    );
    leg.rotation.y = (i * Math.PI) / 2;
    g.add(leg);
  }

  // Yutu rover — small boxy unit on top
  const rover = bus(0.3, 0.14, 0.36, GOLD_FOIL);
  rover.position.y = 0.07;

  // Yutu solar panels (folded, vertical)
  const rp1 = solarWing(0.3, 0.22, -0.24);
  rp1.position.y = 0.07;
  const rp2 = solarWing(0.3, 0.22, 0.24);
  rp2.position.y = 0.07;
  g.add(rp1, rp2);

  // ACCENT_RED stripe on rover for visual identity
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.04, 0.04), mat(ACCENT_RED, 0x3a0000));
  stripe.position.y = 0.12;
  stripe.position.z = 0.18;
  g.add(stripe);

  g.add(lander, bell, rover);
  return g;
}

/**
 * Chang'e 5/6 sample-return: four-module stack bottom-up —
 * orbiter (box bus + solar wings) → returner capsule → ascender → lander.
 */
function buildChange56Cruise(): THREE.Group {
  const g = new THREE.Group();

  // Orbiter bus at bottom
  const orbiter = bus(0.46, 0.3, 0.46, BUS_GREY);
  orbiter.position.y = -0.62;
  g.add(solarWing(0.9, 0.36, -0.62));
  g.add(solarWing(0.9, 0.36, 0.62));

  // Returner capsule (small cone)
  const returner = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.26, 16), mat(WHITE_MLI, 0x282820));
  returner.rotation.x = Math.PI;
  returner.position.y = -0.22;

  // Ascender stage (short cylinder)
  const ascender = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.18, 0.32, 16),
    mat(GOLD_FOIL, 0x2a2113),
  );
  ascender.position.y = 0.14;

  // Lander at top (boxy, gold)
  const lander = bus(0.4, 0.28, 0.4, GOLD_FOIL);
  lander.position.y = 0.5;

  // Lander engine bell
  const bell = new THREE.Mesh(
    new THREE.CylinderGeometry(0.1, 0.16, 0.2, 14),
    mat(RTG_DARK, 0x151515),
  );
  bell.position.y = 0.74;

  g.add(orbiter, returner, ascender, lander, bell);
  return g;
}

/**
 * Chandrayaan-3: ISRO propulsion module (box bus + single solar wing on one
 * side) with Vikram lander (4-leg box) mounted on top.
 */
function buildChandrayaan3Cruise(): THREE.Group {
  const g = new THREE.Group();

  // Propulsion module — boxy grey bus
  const pm = bus(0.44, 0.5, 0.44, BUS_GREY);
  pm.position.y = -0.3;

  // Single solar wing on one side (ISRO style)
  const wing = solarWing(0.88, 0.4, -0.66);
  wing.position.y = -0.3;
  g.add(wing);

  // Vikram lander on top — boxy gold with 4 legs
  const vikram = bus(0.42, 0.3, 0.42, GOLD_FOIL);
  vikram.position.y = 0.22;

  // Four legs
  for (let i = 0; i < 4; i++) {
    const leg = boom(0.44, 0.015);
    leg.rotation.z = Math.PI * 0.35;
    leg.position.set(
      Math.cos((i * Math.PI) / 2 + Math.PI / 4) * 0.28,
      0.12,
      Math.sin((i * Math.PI) / 2 + Math.PI / 4) * 0.28,
    );
    leg.rotation.y = (i * Math.PI) / 2;
    g.add(leg);
  }

  // Vikram engine bell
  const bell = new THREE.Mesh(
    new THREE.CylinderGeometry(0.09, 0.15, 0.18, 14),
    mat(RTG_DARK, 0x151515),
  );
  bell.position.y = 0.12;

  // HGA dish on PM
  const hgd = dish(0.18);
  hgd.position.set(0.3, -0.14, 0.3);
  g.add(hgd);

  g.add(pm, vikram, bell);
  return g;
}

/**
 * SLIM "Moon Sniper": a compact boxy bus, spherical propellant tank,
 * two engine bells, and a small solar panel. Petite craft.
 */
function buildSlimCruise(): THREE.Group {
  const g = new THREE.Group();

  // Main bus — flat and boxy
  const body = bus(0.6, 0.22, 0.42, WHITE_MLI);
  body.position.y = 0.0;

  // Spherical propellant tank
  const tank = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 12), mat(BUS_GREY, 0x1a1a1a));
  tank.position.y = 0.22;

  // Two main engine bells (side by side)
  for (const x of [-0.1, 0.1]) {
    const bell = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.1, 0.2, 12),
      mat(RTG_DARK, 0x151515),
    );
    bell.position.set(x, -0.2, 0);
    g.add(bell);
  }

  // Small solar panel
  const panel = solarWing(0.54, 0.28, -0.48);
  panel.position.y = 0.02;
  g.add(panel);

  g.add(body, tank);
  return g;
}

/**
 * Beresheet: small round lander cruising as itself — gold body, top disk of
 * solar cells, single engine bell, four legs.
 */
function buildBeresheetCruise(): THREE.Group {
  const g = new THREE.Group();

  // Main body — squat cylinder, gold
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.34, 0.34, 0.3, 20),
    mat(GOLD_FOIL, 0x2a2113),
  );
  body.position.y = 0.0;

  // Top solar-cell disk
  const solardisk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.34, 0.34, 0.04, 20),
    mat(SOLAR_BLUE, 0x0a1430, 0.5),
  );
  solardisk.position.y = 0.17;

  // Engine bell
  const bell = new THREE.Mesh(
    new THREE.CylinderGeometry(0.1, 0.18, 0.26, 16),
    mat(RTG_DARK, 0x151515),
  );
  bell.position.y = -0.28;

  // Four landing legs
  for (let i = 0; i < 4; i++) {
    const leg = boom(0.44, 0.014);
    leg.rotation.z = Math.PI * 0.38;
    leg.position.set(
      Math.cos((i * Math.PI) / 2 + Math.PI / 4) * 0.28,
      -0.1,
      Math.sin((i * Math.PI) / 2 + Math.PI / 4) * 0.28,
    );
    leg.rotation.y = (i * Math.PI) / 2;
    g.add(leg);
  }

  g.add(body, solardisk, bell);
  return g;
}

/**
 * Blue Moon MK1: a tall lander — large central propellant tank (cylinder) on
 * a wide 4-leg frame with engine bell, payload deck on top.
 */
function buildBlueMoonCruise(): THREE.Group {
  const g = new THREE.Group();

  // Central propellant tank — tall cylinder, white
  const tank = new THREE.Mesh(
    new THREE.CylinderGeometry(0.3, 0.3, 1.1, 20),
    mat(WHITE_MLI, 0x282820),
  );
  tank.position.y = 0.1;

  // Engine bell at base
  const bell = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.3, 0.36, 16),
    mat(RTG_DARK, 0x151515),
  );
  bell.position.y = -0.6;

  // Payload deck on top
  const deck = bus(0.62, 0.1, 0.62, BUS_GREY);
  deck.position.y = 0.7;

  // Four wide landing legs on a lower truss ring
  for (let i = 0; i < 4; i++) {
    const leg = boom(0.72, 0.022);
    leg.rotation.z = Math.PI * 0.42;
    leg.position.set(
      Math.cos((i * Math.PI) / 2 + Math.PI / 4) * 0.38,
      -0.26,
      Math.sin((i * Math.PI) / 2 + Math.PI / 4) * 0.38,
    );
    leg.rotation.y = (i * Math.PI) / 2;
    g.add(leg);
  }

  // Foot pads
  for (let i = 0; i < 4; i++) {
    const pad = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.08, 0.04, 10),
      mat(BUS_GREY, 0x1a1a1a),
    );
    pad.position.set(
      Math.cos((i * Math.PI) / 2 + Math.PI / 4) * 0.68,
      -0.62,
      Math.sin((i * Math.PI) / 2 + Math.PI / 4) * 0.68,
    );
    g.add(pad);
  }

  g.add(tank, bell, deck);
  return g;
}

// ── Small-body sample / rendezvous craft ──────────────────────────────────

function buildHayabusa1Cruise(): THREE.Group {
  // Boxy bus, two solar wings, a downward sampler horn, ion-engine cluster.
  const g = new THREE.Group();
  const body = bus(0.7, 0.5, 0.7, GOLD_FOIL);
  g.add(body, solarWing(1.6, 0.6, -1.0), solarWing(1.6, 0.6, 1.0));
  const horn = new THREE.Mesh(
    new THREE.CylinderGeometry(0.05, 0.14, 0.5, 16, 1, true),
    mat(BUS_GREY),
  );
  horn.position.y = -0.5;
  const hgd = dish(0.28);
  hgd.position.set(0, 0.28, 0.4);
  // Ion thruster nozzles at the aft face.
  for (const x of [-0.15, 0.15]) {
    const t = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.1, 0.14, 12),
      mat(RTG_DARK, 0x241a30),
    );
    t.position.set(x, 0, -0.42);
    t.rotation.x = Math.PI / 2;
    g.add(t);
  }
  g.add(horn, hgd);
  return g;
}

function buildOsirisRexCruise(): THREE.Group {
  // Boxy bus, two angled solar wings in a V, the TAGSAM sampler arm extended.
  const g = new THREE.Group();
  const body = bus(0.65, 0.8, 0.65, WHITE_MLI);
  g.add(body);
  const wl = solarWing(1.3, 0.55, -0.95);
  wl.rotation.z = 0.35;
  const wr = solarWing(1.3, 0.55, 0.95);
  wr.rotation.z = -0.35;
  g.add(wl, wr);
  // TAGSAM arm — a boom reaching down-forward with a sampler head.
  const arm = boom(0.7);
  arm.position.set(0, -0.55, 0.2);
  arm.rotation.x = 0.5;
  const head = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.08, 16), mat(BUS_GREY));
  head.position.set(0, -0.85, 0.4);
  const hgd = dish(0.24);
  hgd.position.set(0, 0.45, 0.35);
  g.add(arm, head, hgd);
  return g;
}

function buildNearShoemakerCruise(): THREE.Group {
  // NEAR: octagonal bus with FOUR fixed solar panels in a cross + a fixed dish.
  const g = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.45, 0.45, 0.7, 8),
    mat(GOLD_FOIL, 0x2a2113),
  );
  g.add(body);
  const w1 = solarWing(1.1, 0.5, -0.85);
  const w2 = solarWing(1.1, 0.5, 0.85);
  const w3 = solarWing(1.1, 0.5, 0);
  w3.rotation.y = Math.PI / 2;
  w3.position.z = -0.85;
  const w4 = solarWing(1.1, 0.5, 0);
  w4.rotation.y = Math.PI / 2;
  w4.position.z = 0.85;
  const hgd = dish(0.4);
  hgd.position.y = 0.5;
  hgd.rotation.x = 0;
  g.add(w1, w2, w3, w4, hgd);
  return g;
}

// ── Starship (its own vehicle — the cruise/transit upper stage) ────────────

function buildStarshipCruise(): THREE.Group {
  // Stainless Starship: tall cylinder + ogive nose, 2 fwd + 2 aft flaps, Raptors.
  const g = new THREE.Group();
  const steel = 0xc4c8cc;
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.4, 0.4, 1.5, 32),
    mat(steel, 0x222428, 0.4),
  );
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.4, 0.55, 32), mat(steel, 0x222428, 0.4));
  nose.position.y = 1.025;
  g.add(body, nose);
  // Forward + aft flaps.
  const flap = (y: number, x: number, w: number): THREE.Mesh => {
    const f = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.45, w), mat(steel, 0x1a1c20, 0.4));
    f.position.set(x, y, 0);
    return f;
  };
  g.add(
    flap(0.6, 0.42, 0.35),
    flap(0.6, -0.42, 0.35),
    flap(-0.65, 0.44, 0.5),
    flap(-0.65, -0.44, 0.5),
  );
  // Raptor cluster.
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const r = new THREE.Mesh(
      new THREE.ConeGeometry(0.09, 0.16, 12, 1, true),
      mat(RTG_DARK, 0x33210f),
    );
    r.position.set(Math.cos(a) * 0.2, -0.83, Math.sin(a) * 0.2);
    r.rotation.x = Math.PI;
    g.add(r);
  }
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
  // Moon batch
  apollo11: buildApolloCruise,
  apollo12: buildApolloCruise,
  apollo14: buildApolloCruise,
  apollo15: buildApolloCruise,
  apollo16: buildApolloCruise,
  apollo17: buildApolloCruise,
  artemis3: buildOrionCruise,
  artemis4: buildOrionCruise,
  luna9: buildLunaDirectCruise,
  luna16: buildLunaSampleCruise,
  luna24: buildLunaSampleCruise,
  luna17: buildLunokhodCarrierCruise,
  luna21: buildLunokhodCarrierCruise,
  change3: buildChange34Cruise,
  change4: buildChange34Cruise,
  change5: buildChange56Cruise,
  change6: buildChange56Cruise,
  chandrayaan3: buildChandrayaan3Cruise,
  slim: buildSlimCruise,
  beresheet: buildBeresheetCruise,
  'blue-moon-mk1': buildBlueMoonCruise,
  // Small-body sample / rendezvous craft
  hayabusa1: buildHayabusa1Cruise,
  'osiris-rex': buildOsirisRexCruise,
  'near-shoemaker': buildNearShoemakerCruise,
  // Starship (its own transit vehicle)
  'starship-demo': buildStarshipCruise,
  'starship-mars-crew': buildStarshipCruise,
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
