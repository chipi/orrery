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
  // Bus — central body, octagonal-ish via short cylinder.
  const bus = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.18, 0.5, 8),
    new THREE.MeshPhongMaterial({ color: BUS_GREY, emissive: 0x222222, emissiveIntensity: 0.4 }),
  );
  bus.rotation.z = Math.PI / 2;
  g.add(bus);
  // HGA dish — 0.5u radius cone facing +X.
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
  const huygens = new THREE.Mesh(
    new THREE.CylinderGeometry(0.16, 0.16, 0.12, 12),
    new THREE.MeshPhongMaterial({
      color: GOLD_FOIL,
      emissive: 0x665a30,
      emissiveIntensity: 0.6,
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
 * Builder registry. Add an entry per mission you want to surface a
 * dedicated silhouette for. Missions not in this map fall back to the
 * generic scSprite glyph in /fly's onMount.
 *
 * Sized so each model is ~1.5–2u long at the default Group scale.
 * The component multiplies by a UI scale factor when adding to scene.
 */
const BUILDERS: Record<string, () => THREE.Group> = {
  cassini: buildCassini,
  'voyager-1': buildVoyager,
  'voyager-2': buildVoyager,
  galileo: buildGalileo,
  'new-horizons': buildNewHorizons,
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
