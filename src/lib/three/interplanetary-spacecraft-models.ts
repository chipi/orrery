import * as THREE from 'three';

/**
 * Per-mission spacecraft silhouettes for /fly's heliocentric scene.
 * Each builder composes Three.js primitives into a recognisable form
 * — Cassini's RTG/HGA/Huygens stack, Voyager's dish-on-a-boom, etc. —
 * so grand-tour missions read as distinct spacecraft instead of the
 * generic red-triangle sprite shared by every mission.
 *
 * Same pattern as src/lib/earth-satellite-models.ts (for /earth) and
 * src/lib/moon-lander-models.ts (for /moon surface) — the model is a
 * THREE.Group of primitives, the caller mutates its position per frame
 * and disposes the geometry on teardown.
 *
 * Models are intentionally small (~2–3 scene units long) so they read
 * as a glyph at /fly's wide heliocentric framing, not as a real-scale
 * representation.
 *
 * Missions without a dedicated builder fall back to the generic
 * Sprite glyph already in /fly's onMount.
 */

const BUS_GREY = 0xb8b8b8;
const DISH_WHITE = 0xeaeaea;
const RTG_DARK = 0x3a3a3a;
const GOLD_FOIL = 0xd9b863;
const ACCENT_RED = 0xb45c5c;
// Added 2026-06-16 alongside the iconic-mission expansion — most of the
// 13 new builders carry visible solar arrays (Juno trefoil, Rosetta
// wings, BepiColombo MTM, Dawn 19m panels, JUICE 27m panels, Hayabusa2,
// Vega) which Cassini's RTG-only palette didn't need to cover. Deep
// indigo with a cool tint reads as photovoltaic at glyph scale.
const SOLAR_BLUE = 0x1f3a72;

function dispose(group: THREE.Group): void {
  group.traverse((obj) => {
    if (obj instanceof THREE.Mesh) {
      obj.geometry.dispose();
      const mat = obj.material;
      if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
      else if (mat) (mat as THREE.Material).dispose();
    }
  });
}

/**
 * Cassini–Huygens (1997-2017). 12 m long stack: 4 m HGA dish at one
 * end, the bus + Huygens probe in the middle, 11 m magnetometer boom
 * + 3 RTGs at the other end. The glyph compresses that silhouette
 * into a ~2.5u-long model.
 */
function buildCassini(): THREE.Group {
  const g = new THREE.Group();
  // Bus — central body wrapped in gold thermal blankets (the real
  // Cassini bus was almost entirely covered in MLI gold foil — the
  // dominant visual signature alongside the white HGA). Was BUS_GREY
  // pre-polish-wave-2; user feedback "entire spaceship is 1 color"
  // led to matching the real-spacecraft coloring.
  const bus = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.18, 0.5, 8),
    new THREE.MeshPhongMaterial({
      color: GOLD_FOIL,
      emissive: 0x6b5a26,
      emissiveIntensity: 0.55,
    }),
  );
  bus.rotation.z = Math.PI / 2;
  g.add(bus);
  // HGA dish — 0.5u radius cone facing +X. White contrasts the gold
  // bus + boom so the silhouette reads as multi-toned.
  const dish = new THREE.Mesh(
    new THREE.ConeGeometry(0.48, 0.2, 16, 1, true),
    new THREE.MeshPhongMaterial({
      color: DISH_WHITE,
      emissive: 0x444444,
      emissiveIntensity: 0.35,
      side: THREE.DoubleSide,
    }),
  );
  dish.rotation.z = -Math.PI / 2;
  dish.position.x = 0.4;
  g.add(dish);
  // Huygens probe — small disc strapped to the side of the bus.
  // Lighter-gray skin so it reads distinct from the gold bus.
  const huygens = new THREE.Mesh(
    new THREE.CylinderGeometry(0.16, 0.16, 0.12, 12),
    new THREE.MeshPhongMaterial({
      color: BUS_GREY,
      emissive: 0x333333,
      emissiveIntensity: 0.4,
    }),
  );
  huygens.position.set(0.05, 0.2, 0);
  g.add(huygens);
  // RTGs (3) on a short boom at the -X end.
  for (let i = 0; i < 3; i++) {
    const rtg = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.06, 0.18, 8),
      new THREE.MeshPhongMaterial({
        color: RTG_DARK,
        emissive: 0x442222,
        emissiveIntensity: 0.4,
      }),
    );
    rtg.position.set(-0.4, -0.05 + i * 0.05, -0.2 + i * 0.2);
    rtg.rotation.x = Math.PI / 2;
    g.add(rtg);
  }
  // Magnetometer boom — thin long cylinder out the -Y axis.
  const mag = new THREE.Mesh(
    new THREE.CylinderGeometry(0.02, 0.02, 1.6, 6),
    new THREE.MeshPhongMaterial({ color: BUS_GREY, emissive: 0x111111 }),
  );
  mag.position.set(0, -0.8, 0);
  g.add(mag);
  return g;
}

/**
 * Voyager 1 / 2 (1977–). 3.7 m HGA dish dominates the spacecraft;
 * bus + RTG boom + magnetometer boom + golden record extend outward.
 */
function buildVoyager(): THREE.Group {
  const g = new THREE.Group();
  // HGA dish — the dominant feature, 0.6u radius.
  const dish = new THREE.Mesh(
    new THREE.ConeGeometry(0.6, 0.15, 24, 1, true),
    new THREE.MeshPhongMaterial({
      color: DISH_WHITE,
      emissive: 0x555555,
      emissiveIntensity: 0.4,
      side: THREE.DoubleSide,
    }),
  );
  dish.rotation.z = -Math.PI / 2;
  g.add(dish);
  // Bus — small box behind the dish.
  const bus = new THREE.Mesh(
    new THREE.BoxGeometry(0.2, 0.2, 0.2),
    new THREE.MeshPhongMaterial({ color: BUS_GREY, emissive: 0x222222, emissiveIntensity: 0.4 }),
  );
  bus.position.x = -0.2;
  g.add(bus);
  // RTG boom — 3 RTGs on a short tube extending sideways.
  for (let i = 0; i < 3; i++) {
    const rtg = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.05, 0.14, 8),
      new THREE.MeshPhongMaterial({
        color: RTG_DARK,
        emissive: 0x442222,
        emissiveIntensity: 0.4,
      }),
    );
    rtg.position.set(-0.2 - i * 0.18, 0, -0.5);
    rtg.rotation.x = Math.PI / 2;
    g.add(rtg);
  }
  // Magnetometer boom — long thin tube the other way.
  const mag = new THREE.Mesh(
    new THREE.CylinderGeometry(0.015, 0.015, 1.8, 6),
    new THREE.MeshPhongMaterial({ color: BUS_GREY, emissive: 0x111111 }),
  );
  mag.position.set(-0.2, 0.9, 0);
  g.add(mag);
  // Golden record — a small gold disc on the side facing +Y.
  const record = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.12, 0.02, 16),
    new THREE.MeshPhongMaterial({
      color: GOLD_FOIL,
      emissive: 0x665a30,
      emissiveIntensity: 0.7,
    }),
  );
  record.position.set(-0.2, 0.16, 0);
  g.add(record);
  return g;
}

/**
 * Galileo (1989–2003). HGA never fully deployed in flight — we show
 * the umbrella-style dish half-open as an Easter egg, plus dual
 * spin/despin sections that are the spacecraft's defining feature.
 */
function buildGalileo(): THREE.Group {
  const g = new THREE.Group();
  // Spin section (top) — cylinder with magnetometer boom out the top.
  const spin = new THREE.Mesh(
    new THREE.CylinderGeometry(0.2, 0.2, 0.3, 12),
    new THREE.MeshPhongMaterial({ color: BUS_GREY, emissive: 0x222222, emissiveIntensity: 0.4 }),
  );
  spin.position.y = 0.2;
  g.add(spin);
  // Despun section (bottom) — slightly wider cylinder.
  const despun = new THREE.Mesh(
    new THREE.CylinderGeometry(0.22, 0.22, 0.25, 12),
    new THREE.MeshPhongMaterial({
      color: GOLD_FOIL,
      emissive: 0x665a30,
      emissiveIntensity: 0.5,
    }),
  );
  despun.position.y = -0.1;
  g.add(despun);
  // HGA — partially-deployed umbrella ribs (only 12 of 18 ribs out).
  const ribsGroup = new THREE.Group();
  for (let i = 0; i < 12; i++) {
    const rib = new THREE.Mesh(
      new THREE.CylinderGeometry(0.01, 0.01, 0.5, 4),
      new THREE.MeshPhongMaterial({
        color: DISH_WHITE,
        emissive: 0x444444,
        emissiveIntensity: 0.5,
      }),
    );
    const angle = (i / 18) * Math.PI * 2; // skip 6 ribs => umbrella half-deployed
    rib.position.set(Math.cos(angle) * 0.25, 0.45, Math.sin(angle) * 0.25);
    rib.rotation.z = Math.PI / 6;
    rib.rotation.y = angle;
    ribsGroup.add(rib);
  }
  g.add(ribsGroup);
  // Magnetometer boom out the spin axis.
  const mag = new THREE.Mesh(
    new THREE.CylinderGeometry(0.015, 0.015, 1.2, 6),
    new THREE.MeshPhongMaterial({ color: BUS_GREY, emissive: 0x111111 }),
  );
  mag.position.y = 1.0;
  g.add(mag);
  // Probe relay link side-boom (Galileo Probe was released for Jupiter atmosphere entry).
  const probeBoom = new THREE.Mesh(
    new THREE.CylinderGeometry(0.02, 0.02, 0.4, 6),
    new THREE.MeshPhongMaterial({ color: ACCENT_RED, emissive: 0x441111 }),
  );
  probeBoom.position.set(0.3, -0.1, 0);
  probeBoom.rotation.z = Math.PI / 2;
  g.add(probeBoom);
  return g;
}

/**
 * New Horizons (2006–). Triangular bus with one big HGA dish.
 * Compact and asymmetric — easy to recognise.
 */
function buildNewHorizons(): THREE.Group {
  const g = new THREE.Group();
  // Triangular bus — made from 3 narrow boxes forming an A-frame.
  const bus = new THREE.Mesh(
    new THREE.BoxGeometry(0.4, 0.3, 0.3),
    new THREE.MeshPhongMaterial({ color: BUS_GREY, emissive: 0x222222, emissiveIntensity: 0.4 }),
  );
  g.add(bus);
  // HGA dish — large, 0.5u radius.
  const dish = new THREE.Mesh(
    new THREE.ConeGeometry(0.45, 0.12, 16, 1, true),
    new THREE.MeshPhongMaterial({
      color: DISH_WHITE,
      emissive: 0x444444,
      emissiveIntensity: 0.4,
      side: THREE.DoubleSide,
    }),
  );
  dish.rotation.z = -Math.PI / 2;
  dish.position.x = 0.3;
  g.add(dish);
  // RTG — single big cylinder on the opposite side.
  const rtg = new THREE.Mesh(
    new THREE.CylinderGeometry(0.1, 0.1, 0.5, 12),
    new THREE.MeshPhongMaterial({
      color: RTG_DARK,
      emissive: 0x442222,
      emissiveIntensity: 0.4,
    }),
  );
  rtg.position.set(-0.4, 0, 0.15);
  rtg.rotation.x = Math.PI / 2;
  g.add(rtg);
  return g;
}

/**
 * Juno (2011–). Iconic 3-armed trefoil: hexagonal bus with three 8.9 m
 * solar arrays radiating at 120°. The arrays dominate the silhouette
 * — anything else (HGA, magnetometer) is incidental.
 */
function buildJuno(): THREE.Group {
  const g = new THREE.Group();
  // Hexagonal bus — short flat cylinder with 6 sides.
  const bus = new THREE.Mesh(
    new THREE.CylinderGeometry(0.2, 0.2, 0.18, 6),
    new THREE.MeshPhongMaterial({ color: BUS_GREY, emissive: 0x222222, emissiveIntensity: 0.4 }),
  );
  g.add(bus);
  // Three solar arrays radiating in the XZ plane at 120°. Each is a
  // long flat plane reading as 4 panels in series — Juno's defining
  // visual signature.
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    const arm = new THREE.Group();
    for (let s = 0; s < 4; s++) {
      const panel = new THREE.Mesh(
        new THREE.BoxGeometry(0.32, 0.02, 0.22),
        new THREE.MeshPhongMaterial({
          color: SOLAR_BLUE,
          emissive: 0x081026,
          emissiveIntensity: 0.6,
        }),
      );
      panel.position.x = 0.45 + s * 0.34;
      arm.add(panel);
    }
    arm.rotation.y = a;
    g.add(arm);
  }
  // HGA dish on top, axis along +Y.
  const dish = new THREE.Mesh(
    new THREE.ConeGeometry(0.18, 0.1, 16, 1, true),
    new THREE.MeshPhongMaterial({
      color: DISH_WHITE,
      emissive: 0x444444,
      emissiveIntensity: 0.4,
      side: THREE.DoubleSide,
    }),
  );
  dish.position.y = 0.18;
  g.add(dish);
  // Magnetometer boom — thin tube sideways from one arm root.
  const mag = new THREE.Mesh(
    new THREE.CylinderGeometry(0.012, 0.012, 0.6, 6),
    new THREE.MeshPhongMaterial({ color: BUS_GREY, emissive: 0x111111 }),
  );
  mag.position.set(0, -0.05, -0.45);
  mag.rotation.x = Math.PI / 2;
  g.add(mag);
  return g;
}

/**
 * BepiColombo (2018–2025). Composite stack en route to Mercury:
 * Mercury Transfer Module (long body with 14 m solar arrays) +
 * Mercury Planetary Orbiter (cube) + Mio / MMO (squat cylinder). The
 * glyph stacks all three with the MTM wings extended.
 */
function buildBepiColombo(): THREE.Group {
  const g = new THREE.Group();
  // MTM body — long cylindrical bus at the back end.
  const mtm = new THREE.Mesh(
    new THREE.CylinderGeometry(0.16, 0.16, 0.5, 10),
    new THREE.MeshPhongMaterial({
      color: GOLD_FOIL,
      emissive: 0x5a4a20,
      emissiveIntensity: 0.5,
    }),
  );
  mtm.rotation.z = Math.PI / 2;
  mtm.position.x = -0.35;
  g.add(mtm);
  // MTM solar arrays — two long wings extending in Z.
  for (const side of [-1, 1]) {
    const wing = new THREE.Mesh(
      new THREE.BoxGeometry(0.42, 0.02, 0.18),
      new THREE.MeshPhongMaterial({
        color: SOLAR_BLUE,
        emissive: 0x081026,
        emissiveIntensity: 0.6,
      }),
    );
    wing.position.set(-0.35, 0, side * 0.45);
    g.add(wing);
  }
  // MPO — cube bus in the middle.
  const mpo = new THREE.Mesh(
    new THREE.BoxGeometry(0.26, 0.26, 0.26),
    new THREE.MeshPhongMaterial({ color: BUS_GREY, emissive: 0x222222, emissiveIntensity: 0.4 }),
  );
  mpo.position.x = 0.05;
  g.add(mpo);
  // MPO HGA dish on +X side.
  const dish = new THREE.Mesh(
    new THREE.ConeGeometry(0.18, 0.08, 14, 1, true),
    new THREE.MeshPhongMaterial({
      color: DISH_WHITE,
      emissive: 0x444444,
      emissiveIntensity: 0.4,
      side: THREE.DoubleSide,
    }),
  );
  dish.rotation.z = -Math.PI / 2;
  dish.position.set(0.25, 0.05, 0);
  g.add(dish);
  // Mio (Japanese magnetospheric orbiter) — squat cylinder on top.
  const mio = new THREE.Mesh(
    new THREE.CylinderGeometry(0.14, 0.14, 0.18, 14),
    new THREE.MeshPhongMaterial({
      color: GOLD_FOIL,
      emissive: 0x5a4a20,
      emissiveIntensity: 0.45,
    }),
  );
  mio.position.set(0.05, 0.25, 0);
  g.add(mio);
  return g;
}

/**
 * Dawn (2007–2018). Boxy bus dwarfed by two 19.7 m solar arrays.
 * Three ion engines on the +X face. The arrays are the silhouette.
 */
function buildDawn(): THREE.Group {
  const g = new THREE.Group();
  // Bus — small cube.
  const bus = new THREE.Mesh(
    new THREE.BoxGeometry(0.3, 0.25, 0.22),
    new THREE.MeshPhongMaterial({ color: BUS_GREY, emissive: 0x222222, emissiveIntensity: 0.4 }),
  );
  g.add(bus);
  // Solar arrays — two long wings.
  for (const side of [-1, 1]) {
    const wing = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.16, 1.1),
      new THREE.MeshPhongMaterial({
        color: SOLAR_BLUE,
        emissive: 0x081026,
        emissiveIntensity: 0.6,
      }),
    );
    wing.position.z = side * 0.7;
    g.add(wing);
  }
  // HGA on top.
  const dish = new THREE.Mesh(
    new THREE.ConeGeometry(0.16, 0.07, 14, 1, true),
    new THREE.MeshPhongMaterial({
      color: DISH_WHITE,
      emissive: 0x444444,
      emissiveIntensity: 0.4,
      side: THREE.DoubleSide,
    }),
  );
  dish.position.y = 0.2;
  g.add(dish);
  // Ion engines — 3 small cones on +X.
  for (let i = -1; i <= 1; i++) {
    const eng = new THREE.Mesh(
      new THREE.ConeGeometry(0.04, 0.1, 8),
      new THREE.MeshPhongMaterial({
        color: ACCENT_RED,
        emissive: 0x441111,
        emissiveIntensity: 0.5,
      }),
    );
    eng.position.set(0.18, 0, i * 0.07);
    eng.rotation.z = -Math.PI / 2;
    g.add(eng);
  }
  return g;
}

/**
 * Giotto (1985–1992). Squat cylindrical drum with the Whipple dust
 * shield as a flat disc on the leading face — the defining feature
 * for the Halley comet flyby. HGA out the back face.
 */
function buildGiotto(): THREE.Group {
  const g = new THREE.Group();
  // Whipple dust shield — flat disc on +X face, larger radius than bus.
  const shield = new THREE.Mesh(
    new THREE.CylinderGeometry(0.42, 0.42, 0.03, 24),
    new THREE.MeshPhongMaterial({
      color: 0x9a8a78,
      emissive: 0x3a3025,
      emissiveIntensity: 0.5,
    }),
  );
  shield.rotation.z = Math.PI / 2;
  shield.position.x = 0.25;
  g.add(shield);
  // Drum bus — short cylinder.
  const bus = new THREE.Mesh(
    new THREE.CylinderGeometry(0.22, 0.22, 0.34, 14),
    new THREE.MeshPhongMaterial({
      color: GOLD_FOIL,
      emissive: 0x5a4a20,
      emissiveIntensity: 0.5,
    }),
  );
  bus.rotation.z = Math.PI / 2;
  g.add(bus);
  // Solar drum belt — dark ring around the bus circumference.
  const belt = new THREE.Mesh(
    new THREE.CylinderGeometry(0.23, 0.23, 0.18, 14, 1, true),
    new THREE.MeshPhongMaterial({
      color: SOLAR_BLUE,
      emissive: 0x081026,
      emissiveIntensity: 0.5,
      side: THREE.DoubleSide,
    }),
  );
  belt.rotation.z = Math.PI / 2;
  g.add(belt);
  // HGA dish out the back.
  const dish = new THREE.Mesh(
    new THREE.ConeGeometry(0.22, 0.1, 14, 1, true),
    new THREE.MeshPhongMaterial({
      color: DISH_WHITE,
      emissive: 0x444444,
      emissiveIntensity: 0.4,
      side: THREE.DoubleSide,
    }),
  );
  dish.rotation.z = Math.PI / 2;
  dish.position.x = -0.25;
  g.add(dish);
  return g;
}

/**
 * Hayabusa2 (2014–2020). Compact box bus, two short solar panels,
 * HGA dish, and a small return capsule visible on +Z. The bus is
 * intentionally small — Hayabusa was a sample-return demonstrator.
 */
function buildHayabusa2(): THREE.Group {
  const g = new THREE.Group();
  // Bus — small box.
  const bus = new THREE.Mesh(
    new THREE.BoxGeometry(0.32, 0.32, 0.22),
    new THREE.MeshPhongMaterial({
      color: GOLD_FOIL,
      emissive: 0x5a4a20,
      emissiveIntensity: 0.5,
    }),
  );
  g.add(bus);
  // Solar panels — two short wings on Z axis.
  for (const side of [-1, 1]) {
    const panel = new THREE.Mesh(
      new THREE.BoxGeometry(0.06, 0.28, 0.5),
      new THREE.MeshPhongMaterial({
        color: SOLAR_BLUE,
        emissive: 0x081026,
        emissiveIntensity: 0.6,
      }),
    );
    panel.position.z = side * 0.4;
    g.add(panel);
  }
  // HGA dish on +Y.
  const dish = new THREE.Mesh(
    new THREE.ConeGeometry(0.14, 0.07, 14, 1, true),
    new THREE.MeshPhongMaterial({
      color: DISH_WHITE,
      emissive: 0x444444,
      emissiveIntensity: 0.4,
      side: THREE.DoubleSide,
    }),
  );
  dish.position.y = 0.22;
  g.add(dish);
  // Sample return capsule — small bright dome on -X.
  const capsule = new THREE.Mesh(
    new THREE.SphereGeometry(0.09, 14, 8),
    new THREE.MeshPhongMaterial({
      color: ACCENT_RED,
      emissive: 0x441111,
      emissiveIntensity: 0.55,
    }),
  );
  capsule.position.set(-0.22, 0, 0);
  g.add(capsule);
  // Ion engine on +X face — small cone.
  const eng = new THREE.Mesh(
    new THREE.ConeGeometry(0.06, 0.1, 8),
    new THREE.MeshPhongMaterial({ color: RTG_DARK, emissive: 0x222222 }),
  );
  eng.position.set(0.2, 0, 0);
  eng.rotation.z = -Math.PI / 2;
  g.add(eng);
  return g;
}

/**
 * JUICE (2023–). Largest interplanetary solar arrays ever flown (~85
 * m² each side). HGA dish, RIME ground-penetrating radar antenna, and
 * a compact bus dwarfed by the wings.
 */
function buildJuice(): THREE.Group {
  const g = new THREE.Group();
  // Bus — compact box.
  const bus = new THREE.Mesh(
    new THREE.BoxGeometry(0.3, 0.36, 0.3),
    new THREE.MeshPhongMaterial({ color: BUS_GREY, emissive: 0x222222, emissiveIntensity: 0.4 }),
  );
  g.add(bus);
  // Solar arrays — two MASSIVE wings (JUICE's signature feature).
  for (const side of [-1, 1]) {
    const wing = new THREE.Mesh(
      new THREE.BoxGeometry(0.1, 0.32, 1.4),
      new THREE.MeshPhongMaterial({
        color: SOLAR_BLUE,
        emissive: 0x081026,
        emissiveIntensity: 0.65,
      }),
    );
    wing.position.z = side * 0.95;
    g.add(wing);
  }
  // HGA dish on +Y.
  const dish = new THREE.Mesh(
    new THREE.ConeGeometry(0.22, 0.1, 16, 1, true),
    new THREE.MeshPhongMaterial({
      color: DISH_WHITE,
      emissive: 0x444444,
      emissiveIntensity: 0.4,
      side: THREE.DoubleSide,
    }),
  );
  dish.position.y = 0.26;
  g.add(dish);
  // RIME antenna — long thin tube extending +X (radar dipole).
  const rime = new THREE.Mesh(
    new THREE.CylinderGeometry(0.012, 0.012, 0.9, 6),
    new THREE.MeshPhongMaterial({ color: BUS_GREY, emissive: 0x111111 }),
  );
  rime.position.set(0.5, 0, 0);
  rime.rotation.z = Math.PI / 2;
  g.add(rime);
  // Magnetometer boom — sideways.
  const mag = new THREE.Mesh(
    new THREE.CylinderGeometry(0.01, 0.01, 0.55, 6),
    new THREE.MeshPhongMaterial({ color: BUS_GREY, emissive: 0x111111 }),
  );
  mag.position.set(-0.4, 0, 0);
  mag.rotation.z = Math.PI / 2;
  g.add(mag);
  return g;
}

/**
 * Pioneer 10 / 11 (1972 / 1973). Both spacecraft are nearly
 * identical: a 2.74 m HGA dish dominates the silhouette, a thin boom
 * extends out the back carrying 2 RTGs, and a long magnetometer boom
 * extends sideways. The gold-plated plaque is too small to read at
 * glyph scale but lives on the bus.
 */
function buildPioneer(): THREE.Group {
  const g = new THREE.Group();
  // HGA dish — large 0.6u radius, defining feature.
  const dish = new THREE.Mesh(
    new THREE.ConeGeometry(0.6, 0.18, 24, 1, true),
    new THREE.MeshPhongMaterial({
      color: DISH_WHITE,
      emissive: 0x555555,
      emissiveIntensity: 0.4,
      side: THREE.DoubleSide,
    }),
  );
  dish.rotation.z = -Math.PI / 2;
  g.add(dish);
  // Compact bus behind the dish — hexagonal shape (Pioneer hexagon).
  const bus = new THREE.Mesh(
    new THREE.CylinderGeometry(0.16, 0.16, 0.16, 6),
    new THREE.MeshPhongMaterial({ color: BUS_GREY, emissive: 0x222222, emissiveIntensity: 0.4 }),
  );
  bus.rotation.z = Math.PI / 2;
  bus.position.x = -0.18;
  g.add(bus);
  // Two RTGs on a short boom extending -X.
  for (let i = 0; i < 2; i++) {
    const rtg = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.05, 0.18, 8),
      new THREE.MeshPhongMaterial({
        color: RTG_DARK,
        emissive: 0x442222,
        emissiveIntensity: 0.45,
      }),
    );
    rtg.position.set(-0.4 - i * 0.18, 0, 0.18);
    rtg.rotation.x = Math.PI / 2;
    g.add(rtg);
  }
  // Magnetometer boom — long thin tube sideways.
  const mag = new THREE.Mesh(
    new THREE.CylinderGeometry(0.012, 0.012, 1.4, 6),
    new THREE.MeshPhongMaterial({ color: BUS_GREY, emissive: 0x111111 }),
  );
  mag.position.set(-0.18, 0.7, 0);
  g.add(mag);
  // Gold plaque on the bus — Pioneer's iconic Earth message.
  const plaque = new THREE.Mesh(
    new THREE.BoxGeometry(0.04, 0.1, 0.07),
    new THREE.MeshPhongMaterial({
      color: GOLD_FOIL,
      emissive: 0x6b5a26,
      emissiveIntensity: 0.7,
    }),
  );
  plaque.position.set(-0.18, 0.13, 0.08);
  g.add(plaque);
  return g;
}

/**
 * Rosetta (2004–2016). Cubical bus with 2 huge 14 m solar wings,
 * HGA dish, and the small Philae lander piggybacked on -Z.
 */
function buildRosetta(): THREE.Group {
  const g = new THREE.Group();
  // Bus — cube.
  const bus = new THREE.Mesh(
    new THREE.BoxGeometry(0.32, 0.32, 0.32),
    new THREE.MeshPhongMaterial({
      color: GOLD_FOIL,
      emissive: 0x5a4a20,
      emissiveIntensity: 0.5,
    }),
  );
  g.add(bus);
  // Solar arrays — two LONG wings (Rosetta's signature).
  for (const side of [-1, 1]) {
    const wing = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.22, 1.3),
      new THREE.MeshPhongMaterial({
        color: SOLAR_BLUE,
        emissive: 0x081026,
        emissiveIntensity: 0.6,
      }),
    );
    wing.position.z = side * 0.85;
    g.add(wing);
  }
  // HGA dish on +X.
  const dish = new THREE.Mesh(
    new THREE.ConeGeometry(0.24, 0.1, 16, 1, true),
    new THREE.MeshPhongMaterial({
      color: DISH_WHITE,
      emissive: 0x444444,
      emissiveIntensity: 0.4,
      side: THREE.DoubleSide,
    }),
  );
  dish.rotation.z = -Math.PI / 2;
  dish.position.x = 0.28;
  g.add(dish);
  // Philae lander — small box on -Y side of bus.
  const philae = new THREE.Mesh(
    new THREE.CylinderGeometry(0.1, 0.1, 0.12, 6),
    new THREE.MeshPhongMaterial({
      color: BUS_GREY,
      emissive: 0x222222,
      emissiveIntensity: 0.4,
    }),
  );
  philae.position.set(0, -0.26, 0);
  g.add(philae);
  // Three little legs (Philae tripod) — tiny cones below.
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    const leg = new THREE.Mesh(
      new THREE.CylinderGeometry(0.008, 0.008, 0.1, 4),
      new THREE.MeshPhongMaterial({ color: BUS_GREY, emissive: 0x111111 }),
    );
    leg.position.set(Math.cos(a) * 0.08, -0.38, Math.sin(a) * 0.08);
    g.add(leg);
  }
  return g;
}

/**
 * Ulysses (1990–2009). Spin-stabilised polar-orbiter of the Sun.
 * Compact: HGA dish on top, RTG cylinder on one side, magnetometer
 * boom extending out the other.
 */
function buildUlysses(): THREE.Group {
  const g = new THREE.Group();
  // Bus — squat box.
  const bus = new THREE.Mesh(
    new THREE.BoxGeometry(0.32, 0.26, 0.3),
    new THREE.MeshPhongMaterial({ color: BUS_GREY, emissive: 0x222222, emissiveIntensity: 0.4 }),
  );
  g.add(bus);
  // HGA dish on +Y (spin axis).
  const dish = new THREE.Mesh(
    new THREE.ConeGeometry(0.34, 0.14, 18, 1, true),
    new THREE.MeshPhongMaterial({
      color: DISH_WHITE,
      emissive: 0x444444,
      emissiveIntensity: 0.4,
      side: THREE.DoubleSide,
    }),
  );
  dish.position.y = 0.26;
  g.add(dish);
  // RTG cylinder — one big GPHS-RTG on +X side.
  const rtg = new THREE.Mesh(
    new THREE.CylinderGeometry(0.09, 0.09, 0.4, 10),
    new THREE.MeshPhongMaterial({
      color: RTG_DARK,
      emissive: 0x442222,
      emissiveIntensity: 0.45,
    }),
  );
  rtg.position.set(0.3, 0, 0);
  rtg.rotation.z = Math.PI / 2;
  g.add(rtg);
  // Magnetometer boom — long, sideways out -X.
  const mag = new THREE.Mesh(
    new THREE.CylinderGeometry(0.012, 0.012, 1.4, 6),
    new THREE.MeshPhongMaterial({ color: BUS_GREY, emissive: 0x111111 }),
  );
  mag.position.set(-0.7, 0, 0);
  mag.rotation.z = Math.PI / 2;
  g.add(mag);
  // Wire boom antennas extending in Z — two thin lines that read as
  // the spin-axis dipoles.
  for (const side of [-1, 1]) {
    const wire = new THREE.Mesh(
      new THREE.CylinderGeometry(0.006, 0.006, 0.9, 4),
      new THREE.MeshPhongMaterial({ color: BUS_GREY, emissive: 0x111111 }),
    );
    wire.position.set(0, 0, side * 0.45);
    wire.rotation.x = Math.PI / 2;
    g.add(wire);
  }
  return g;
}

/**
 * Vega 1 / 2 (1984–1986). Soviet Venus + Halley flyby pair, sharing
 * the modified Venera bus. Tall cylindrical bus, two solar wings,
 * the Venus descent capsule (sphere) piggybacked on top, and the
 * balloon canister visible mid-bus.
 */
function buildVega(): THREE.Group {
  const g = new THREE.Group();
  // Bus — tall cylinder (Venera-derived).
  const bus = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.18, 0.5, 12),
    new THREE.MeshPhongMaterial({
      color: BUS_GREY,
      emissive: 0x222222,
      emissiveIntensity: 0.4,
    }),
  );
  g.add(bus);
  // Solar wings — two short panels off ±Z.
  for (const side of [-1, 1]) {
    const wing = new THREE.Mesh(
      new THREE.BoxGeometry(0.04, 0.22, 0.5),
      new THREE.MeshPhongMaterial({
        color: SOLAR_BLUE,
        emissive: 0x081026,
        emissiveIntensity: 0.55,
      }),
    );
    wing.position.z = side * 0.4;
    g.add(wing);
  }
  // Descent capsule on top — sphere (Venera-style lander).
  const capsule = new THREE.Mesh(
    new THREE.SphereGeometry(0.18, 18, 10),
    new THREE.MeshPhongMaterial({
      color: GOLD_FOIL,
      emissive: 0x5a4a20,
      emissiveIntensity: 0.5,
    }),
  );
  capsule.position.y = 0.36;
  g.add(capsule);
  // Balloon canister — small drum strapped mid-bus on +X.
  const balloon = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.08, 0.18, 10),
    new THREE.MeshPhongMaterial({
      color: ACCENT_RED,
      emissive: 0x441111,
      emissiveIntensity: 0.5,
    }),
  );
  balloon.position.set(0.22, 0, 0);
  balloon.rotation.z = Math.PI / 2;
  g.add(balloon);
  // HGA dish at the bottom (transit-comms with Earth).
  const dish = new THREE.Mesh(
    new THREE.ConeGeometry(0.22, 0.08, 14, 1, true),
    new THREE.MeshPhongMaterial({
      color: DISH_WHITE,
      emissive: 0x444444,
      emissiveIntensity: 0.4,
      side: THREE.DoubleSide,
    }),
  );
  dish.position.y = -0.32;
  dish.rotation.z = Math.PI;
  g.add(dish);
  return g;
}

/**
 * Venera 13 (1981–1983). Soviet Venus orbiter + descent capsule —
 * tall cylindrical bus with a large spherical lander piggybacked at
 * the top (the iconic ball that survived Venus surface conditions).
 */
function buildVenera13(): THREE.Group {
  const g = new THREE.Group();
  // Bus — tall cylinder.
  const bus = new THREE.Mesh(
    new THREE.CylinderGeometry(0.16, 0.16, 0.42, 12),
    new THREE.MeshPhongMaterial({
      color: BUS_GREY,
      emissive: 0x222222,
      emissiveIntensity: 0.4,
    }),
  );
  g.add(bus);
  // Two solar panels — flat wings on ±X.
  for (const side of [-1, 1]) {
    const panel = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.18, 0.03),
      new THREE.MeshPhongMaterial({
        color: SOLAR_BLUE,
        emissive: 0x081026,
        emissiveIntensity: 0.55,
      }),
    );
    panel.position.x = side * 0.36;
    g.add(panel);
  }
  // Lander sphere — iconic Venera ball, dominant feature.
  const lander = new THREE.Mesh(
    new THREE.SphereGeometry(0.22, 18, 12),
    new THREE.MeshPhongMaterial({
      color: GOLD_FOIL,
      emissive: 0x5a4a20,
      emissiveIntensity: 0.55,
    }),
  );
  lander.position.y = 0.35;
  g.add(lander);
  // Antenna boom — long thin tube extending out the bottom.
  const ant = new THREE.Mesh(
    new THREE.CylinderGeometry(0.015, 0.015, 0.7, 6),
    new THREE.MeshPhongMaterial({ color: BUS_GREY, emissive: 0x111111 }),
  );
  ant.position.y = -0.45;
  g.add(ant);
  return g;
}

/**
 * Builder registry. Add an entry per mission you want to surface a
 * dedicated silhouette for. Missions not in this map fall back to the
 * generic scSprite glyph in /fly's onMount.
 *
 * Sized so each model is ~1.5–2u long at the default Group scale.
 * The component multiplies by a UI scale factor when adding to scene.
 *
 * Tour variants (cassini-tour, galileo-tour, juno-tour) share the
 * parent's builder — same hardware, different trajectory file on
 * /explore.
 */
const BUILDERS: Record<string, () => THREE.Group> = {
  // Pre-existing iconic 5.
  cassini: buildCassini,
  'cassini-tour': buildCassini,
  'voyager-1': buildVoyager,
  'voyager-2': buildVoyager,
  galileo: buildGalileo,
  'galileo-tour': buildGalileo,
  'new-horizons': buildNewHorizons,
  // 2026-06-16 expansion to cover every /explore iconic-trajectory.
  bepicolombo: buildBepiColombo,
  dawn: buildDawn,
  giotto: buildGiotto,
  hayabusa2: buildHayabusa2,
  juice: buildJuice,
  juno: buildJuno,
  'juno-tour': buildJuno,
  'pioneer-10': buildPioneer,
  'pioneer-11': buildPioneer,
  rosetta: buildRosetta,
  ulysses: buildUlysses,
  'vega-1': buildVega,
  'vega-2': buildVega,
  'venera-13': buildVenera13,
};

export function buildInterplanetarySpacecraft(missionId: string): THREE.Group | null {
  const fn = BUILDERS[missionId];
  if (!fn) return null;
  const g = fn();
  // Per-frame teardown — caller invokes via group.userData.dispose().
  g.userData.dispose = () => dispose(g);
  return g;
}

/** Public for testing / completeness. */
export const SUPPORTED_MISSION_IDS = Object.keys(BUILDERS);
