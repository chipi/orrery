import * as THREE from 'three';
import type { ShowcaseModel } from './showcase/types';

/**
 * The model families the descents fly, loaded on demand: /fly's first load stays free of them,
 * and DescentScene awaits preloadDescentModels() before it builds the scene. Until they are in,
 * every lookup below answers null and the descent keeps the Tier 0 silhouette.
 */
type Family = { SHOWCASE?: Record<string, ShowcaseModel> } & Record<string, unknown>;
const FAMILIES = import.meta.glob<Family>([
  './showcase/lunar-module.ts',
  './showcase/mars-rovers.ts',
  './showcase/station-freighters.ts',
  './showcase/lunar-landers-east.ts',
  './showcase/lunar-landers-west.ts',
  './showcase/mars-landers.ts',
  './showcase/rovers.ts',
  './showcase/capsules-classic.ts',
  './showcase/capsules-commercial.ts',
  './showcase/probes.ts',
]);
const loaded: Record<string, Family> = {};
let preloading: Promise<void> | null = null;

/** Load every family the descents fly (once; later calls share the first load). */
export function preloadDescentModels(): Promise<void> {
  preloading ??= Promise.all(
    Object.entries(FAMILIES).map(async ([path, load]) => {
      loaded[path.replace('./showcase/', '').replace(/\.ts$/, '')] = await load();
    }),
  ).then(() => undefined);
  return preloading;
}

/** A model builder that needs `family` loaded. */
interface Source {
  family: string;
  build: (m: Family) => THREE.Group;
}
const model = (family: string, id: string): Source => ({
  family,
  build: (m) => m.SHOWCASE![id].build(),
});
const builder = (family: string, name: string): Source => ({
  family,
  build: (m) => (m[name] as () => THREE.Group)(),
});
/** Build from `src` when its family is loaded, else null. */
const buildFrom = (src: Source | undefined): THREE.Group | null => {
  const m = src && loaded[src.family];
  return m ? src.build(m) : null;
};

/**
 * The central detailed models (src/lib/three/showcase/), flown in /fly's descent in place of
 * the Tier 0 surface silhouettes (operator 2026-11-23: one model per craft, used everywhere;
 * the landers "looked like two-year-old children toys"). Keyed by descent site id.
 */
const LM = builder('lunar-module', 'buildApolloLunarModule');
const LUNOKHOD: Source = { family: 'lunar-landers-east', build: lunokhodOnStage };
const DETAILED: Record<string, Source> = {
  apollo11: LM,
  apollo12: LM,
  apollo14: LM,
  apollo15: LM,
  apollo16: LM,
  apollo17: LM,
  curiosity: builder('mars-rovers', 'buildCuriosity'),
  // Scale-out (2026-11-23): the central models of every robotic Moon and Mars landing.
  luna9: model('lunar-landers-east', 'luna-9'),
  luna16: model('lunar-landers-east', 'luna-16'),
  luna24: model('lunar-landers-east', 'luna-16'),
  luna17: LUNOKHOD,
  luna21: LUNOKHOD,
  change3: model('lunar-landers-east', 'change-3'),
  change4: model('lunar-landers-east', 'change-3'),
  change5: model('lunar-landers-east', 'change-5'),
  change6: model('lunar-landers-east', 'change-5'),
  chandrayaan2: model('lunar-landers-west', 'vikram-cy3'),
  chandrayaan3: model('lunar-landers-west', 'vikram-cy3'),
  slim: model('lunar-landers-west', 'slim'),
  beresheet: model('lunar-landers-west', 'beresheet'),
  'blue-moon-mk1': model('lunar-landers-west', 'blue-moon-mk1'),
  'viking1-lander': model('mars-landers', 'viking-1'),
  mars3: model('mars-landers', 'mars-3'),
  phoenix: model('mars-landers', 'phoenix'),
  insight: model('mars-landers', 'insight'),
  schiaparelli: model('mars-landers', 'schiaparelli'),
  beagle2: model('mars-landers', 'beagle2'),
  'mars-pathfinder': builder('mars-landers', 'buildPathfinderLander'),
  spirit: { family: 'rovers', build: (r) => merOnLander(r, 'spirit') },
  opportunity: { family: 'rovers', build: (r) => merOnLander(r, 'opportunity') },
  perseverance: model('rovers', 'perseverance'),
  zhurong: model('rovers', 'zhurong'),
};

/** Luna 17 and 21: Lunokhod riding the E-8 landing stage, on its deck between the ramps. */
function lunokhodOnStage(east: Family): THREE.Group {
  const stage = (east.buildLunaE8LandingStage as () => THREE.Group)();
  // The deck top, measured without the ramps (which slope above it).
  const ramps = stage.getObjectByName('ramps');
  const parent = ramps?.parent;
  ramps?.removeFromParent();
  const deckTop = new THREE.Box3().setFromObject(stage).max.y;
  if (ramps && parent) parent.add(ramps);
  const rover = (east.buildLunokhod as () => THREE.Group)();
  rover.name = 'rover';
  rover.position.y = deckTop;
  stage.add(rover);
  return stage;
}

/** MER's base petal side, an estimate: the folded lander has to fit the 2.65 m aeroshell. */
const MER_BASE_SIDE_M = 2.4;

/**
 * A MER rover on its lander: the rover on the base petal, the three side petals hinged on the
 * base triangle's edges, closed around it in flight (the descent scene folds them; they open at
 * petals_open). No MER lander model exists yet: the side petals are Pathfinder's, stretched to
 * MER_BASE_SIDE_M (MER landing press kit, 2004: "a tetrahedron-shaped lander", the rover on the
 * base petal). The rover model is the deployed rover (its wheels and deck flew folded), so it
 * would poke through the closed petals: it is hidden inside them until they open.
 */
function merOnLander(rovers: Family, id: string): THREE.Group {
  const rover = rovers.SHOWCASE![id].build();
  const pf = loaded['mars-landers']?.buildPathfinderLander as (() => THREE.Group) | undefined;
  const petals = pf?.().getObjectByName('petals');
  if (!petals) return rover;
  rover.userData.insidePetals = true;
  const side = MER_BASE_SIDE_M;
  const rIn = side / (2 * Math.sqrt(3));
  // Pathfinder's petal is 0.93 m wide at the hinge and 1.2 m long; MER's closes into a regular
  // tetrahedron, whose faces reach the apex 3·rIn from the base edge, 109.5° up from flat.
  const sx = side / 0.93;
  const sz = (3 * rIn) / 1.2;
  const g = new THREE.Group();
  g.add(rover);
  petals.removeFromParent();
  petals.position.set(0, 0, 0);
  petals.userData.closedRad = Math.PI - Math.acos(1 / 3);
  petals.children.forEach((pt, k) => {
    const a = (k * Math.PI * 2) / 3;
    pt.position.set(Math.sin(a) * rIn, 0.01 * sx, Math.cos(a) * rIn);
    pt.scale.set(sx, sx, sz);
  });
  g.add(petals);
  // The base petal: a triangle of cells under the rover.
  const cell = (petals.children[0]?.children[0] as THREE.Mesh | undefined)?.material;
  const tri = new THREE.Shape(
    [0, 1, 2].map((k) => {
      const a = ((k + 0.5) * Math.PI * 2) / 3;
      // Lying flat (rotation.x = −π/2 sends shape +y to −z): between the hinges at a = k·120°.
      return new THREE.Vector2(Math.sin(a) * rIn * 2, -Math.cos(a) * rIn * 2);
    }),
  );
  const base = new THREE.Mesh(new THREE.ShapeGeometry(tri), cell);
  base.rotation.x = -Math.PI / 2;
  base.position.y = 0.005;
  base.name = 'basePetal';
  g.add(base);
  return g;
}

/**
 * Parts stowed in flight and deployed only on the surface (hidden by the descent scene until
 * touchdown): solar arrays, petals and ramps, the rovers' masts and arms, InSight's instruments.
 * By site; a rover's 'rover' group rides on its lander and stays.
 */
const STOWED: Record<string, readonly string[]> = {
  luna9: ['petals'],
  luna17: ['ramps', 'lid'],
  luna21: ['ramps', 'lid'],
  change3: ['ramps'],
  change4: ['ramps'],
  chandrayaan2: ['ramp', 'ramps', 'rover'],
  chandrayaan3: ['ramp', 'ramps', 'rover'],
  mars3: ['petals', 'rover'],
  phoenix: ['arm'], // the arrays open at arrays_open (descent-models leggedStack)
  insight: ['arm', 'seis', 'hp3'],
  // Beagle 2's lid and panels open at petals_open (descent-models buildBeagleStack); the arm never did.
  beagle2: ['arm'],
  // Pathfinder's and MER's petals fly closed and open at petals_open (descent-scene folds them).
  'mars-pathfinder': ['mast', 'ramp', 'bagHeap'],
  spirit: ['mast', 'arm', 'solar-arrays'],
  opportunity: ['mast', 'arm', 'solar-arrays'],
  perseverance: ['mast', 'arm'],
  zhurong: ['mast', 'solar-arrays'],
};

const FLAG_SITES = new Set([
  'apollo11',
  'apollo12',
  'apollo14',
  'apollo15',
  'apollo16',
  'apollo17',
]);

/** The LM's contact probes: a 67 in (1.7 m) rod hanging under three of the four footpads (not the
 *  ladder leg, +z). Their touch lights the contact light, the cue to stop the engine. The length
 *  is an estimate (not in the record files); contact_light's altM is the same 1.7 m. In metres
 *  at `k` scene units per metre, `padR` from the centre. */
export const LM_PROBE_LENGTH_M = 1.7;
function contactProbes(k: number, padR: number): THREE.Group {
  const g = new THREE.Group();
  const rod = new THREE.MeshStandardMaterial({ color: 0xc8c9cc, metalness: 0.7, roughness: 0.4 });
  for (const a of [Math.PI / 2, Math.PI, -Math.PI / 2]) {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, LM_PROBE_LENGTH_M, 6), rod);
    p.position.set(Math.sin(a) * padR, -LM_PROBE_LENGTH_M / 2, Math.cos(a) * padR);
    g.add(p);
  }
  g.scale.setScalar(k);
  g.userData.flightOnly = true;
  return g;
}

/** The flag the crew planted, in metres at `k` scene units per metre: a 2.4 m pole with the
 *  1.5 × 0.9 m flag on its horizontal rod, a few metres ahead and left of the ladder. */
function plantedFlag(k: number): THREE.Group {
  const g = new THREE.Group();
  const pole = new THREE.MeshStandardMaterial({ color: 0xd9dadc, metalness: 0.7, roughness: 0.35 });
  const cloth = new THREE.MeshStandardMaterial({
    color: 0xe8e6e0,
    roughness: 0.8,
    side: THREE.DoubleSide,
  });
  const p = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 2.4, 8), pole);
  p.position.y = 1.2;
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 1.55, 6), pole);
  rod.rotation.z = Math.PI / 2;
  rod.position.set(0.77, 2.35, 0);
  const sheet = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.9, 6, 3), cloth);
  sheet.position.set(0.77, 1.9, 0);
  // Stripes and the canton: red bands and a blue field.
  const red = new THREE.MeshStandardMaterial({
    color: 0xb22234,
    roughness: 0.8,
    side: THREE.DoubleSide,
  });
  const blue = new THREE.MeshStandardMaterial({
    color: 0x3c3b6e,
    roughness: 0.8,
    side: THREE.DoubleSide,
  });
  for (let i = 0; i < 7; i++) {
    const band = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.9 / 13), red);
    band.position.set(0.77, 1.9 + 0.45 - (0.9 / 13) * (2 * i + 0.5), 0.002);
    g.add(band);
  }
  const canton = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.9 * (7 / 13)), blue);
  canton.position.set(0.32, 1.9 + 0.45 - (0.9 * 7) / 26, 0.004);
  g.add(p, rod, sheet, canton);
  g.position.set(-3.2, 0, 6.5);
  g.rotation.y = -0.5;
  const holder = new THREE.Group();
  holder.add(g);
  holder.scale.setScalar(k);
  holder.userData.surfaceOnly = true;
  return holder;
}

/** Site ids that fly a detailed model. */
export const DETAILED_DESCENT_LANDER_IDS = Object.keys(DETAILED);

const onSurfaceOnly = (o: THREE.Object3D): boolean => {
  for (let p: THREE.Object3D | null = o; p; p = p.parent) if (p.userData.surfaceOnly) return true;
  return false;
};

/** Bounds of what flies: the parts that appear only after touchdown are left out. */
function flyingBox(root: THREE.Object3D): THREE.Box3 {
  root.updateMatrixWorld(true);
  const box = new THREE.Box3();
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh || onSurfaceOnly(mesh)) return;
    mesh.geometry.computeBoundingBox();
    box.union(mesh.geometry.boundingBox!.clone().applyMatrix4(mesh.matrixWorld));
  });
  return box;
}

/**
 * The detailed model for `siteId`, fitted to `tier0`'s footprint and base so the descent stack
 * around it keeps its layout; an Apollo LM gets its flag, planted at touchdown. The holder's userData gives
 * `metresToScene` and, where the model has them, `engineExitY` and `dockY` in scene units.
 * Null when the site has no detailed model, or before preloadDescentModels() has loaded it.
 */
export function detailedDescentLander(siteId: string, tier0: THREE.Group): THREE.Group | null {
  const craft = buildFrom(DETAILED[siteId]);
  if (!craft) return null;
  // Curiosity's mast rode stowed through entry: raised only on the surface; likewise every
  // site's STOWED parts.
  const rsm = craft.getObjectByName('rsm');
  if (rsm) rsm.userData.surfaceOnly = true;
  for (const name of STOWED[siteId] ?? []) {
    craft.traverse((o) => {
      if (o.name === name) o.userData.surfaceOnly = true;
    });
  }
  const ref = flyingBox(tier0);
  const own = flyingBox(craft);
  const span = (b: THREE.Box3) => Math.max(b.max.x - b.min.x, b.max.z - b.min.z);
  const k = span(ref) / span(own);
  craft.scale.setScalar(k);
  craft.position.y = ref.min.y - own.min.y * k;
  const holder = new THREE.Group();
  holder.add(craft);
  if (FLAG_SITES.has(siteId)) {
    holder.add(plantedFlag(k));
    const probes = contactProbes(k, (own.max.x - own.min.x) / 2 - 0.47);
    probes.position.y = craft.position.y;
    holder.add(probes);
  }
  holder.userData.metresToScene = k;
  for (const key of ['engineExitY', 'dockY'] as const) {
    const y = craft.userData[key] as number | undefined;
    if (y != null) holder.userData[key] = craft.position.y + y * k;
  }
  return holder;
}

/** The detailed Apollo CSM (Block II), docked nose-down on the LM at `dockY`, at `k` scene units
 *  per metre. Null until its family is loaded. */
export function dockedApolloCsm(dockY: number, k: number): THREE.Group | null {
  const csm = buildFrom(model('station-freighters', 'apollo-csm-block-ii'));
  if (!csm) return null;
  const top = new THREE.Box3().setFromObject(csm).max.y;
  const g = new THREE.Group();
  csm.rotation.x = Math.PI; // CM apex (the probe) down, onto the LM's drogue
  csm.position.y = top;
  g.add(csm);
  g.scale.setScalar(k);
  g.position.y = dockY;
  return g;
}

/** Earth-return capsule families (earth-orbit-registry `capsuleId`) → the central model whose
 *  'descent-module' is the part that comes home. */
const CAPSULE_MODEL: Record<string, Source> = {
  vostok: model('capsules-classic', 'vostok'),
  voskhod: model('capsules-classic', 'voskhod'),
  mercury: model('capsules-classic', 'mercury-capsule'),
  gemini: model('capsules-classic', 'gemini'),
  soyuz: model('capsules-classic', 'soyuz-7k-ok'),
  'apollo-cm': model('station-freighters', 'apollo-csm-block-ii'),
  shenzhou: model('station-freighters', 'shenzhou'),
  dragon: model('capsules-commercial', 'crew-dragon'),
};

/**
 * The central model's descent module for an Earth-return capsule family, fitted to `old` (the
 * capsule the re-entry stack was laid out around): same height, same base. Null when the family
 * has no central model yet.
 */
export function detailedReturnCapsule(capsuleId: string, old: THREE.Group): THREE.Group | null {
  const whole = buildFrom(CAPSULE_MODEL[capsuleId]);
  if (!whole) return null;
  whole.updateMatrixWorld(true);
  const dm = whole.getObjectByName('descent-module');
  if (!dm) return null;
  const craft = new THREE.Group();
  craft.add(dm.clone());
  craft.children[0].applyMatrix4(dm.parent!.matrixWorld);
  const ref = new THREE.Box3().setFromObject(old);
  const own = new THREE.Box3().setFromObject(craft);
  const k = (ref.max.y - ref.min.y) / (own.max.y - own.min.y);
  craft.scale.setScalar(k);
  craft.position.y = ref.min.y - own.min.y * k;
  const holder = new THREE.Group();
  holder.add(craft);
  holder.userData = { ...old.userData, metresToScene: k };
  return holder;
}

/** Capsule families that come home in a central model. */
export const DETAILED_CAPSULE_IDS = Object.keys(CAPSULE_MODEL);

/** Descents flown by a probe or a sample-return craft: by body, or by site for the asteroids. */
const PROBE_BY_BODY: Record<string, Source> = {
  venus: builder('probes', 'buildVeneraLander'),
  titan: builder('probes', 'buildHuygensProbe'),
  jupiter: builder('probes', 'buildGalileoProbe'),
  comet_67p: builder('probes', 'buildPhilae'),
};
const PROBE_BY_SITE: Record<string, Source> = {
  hayabusa1: model('probes', 'hayabusa'),
  hayabusa2: model('probes', 'hayabusa-2'),
  'osiris-rex': model('probes', 'osiris-rex'),
};

/**
 * The central model for a probe descent (Venera, Huygens, the Galileo probe, Philae, the asteroid
 * samplers), fitted to `old` — the model the descent stack was laid out around: the same
 * largest dimension, the same base. Null when there is none.
 */
export function detailedProbe(body: string, siteId: string, old: THREE.Group): THREE.Group | null {
  const craft = buildFrom(PROBE_BY_SITE[siteId] ?? PROBE_BY_BODY[body]);
  if (!craft) return null;
  const size = (b: THREE.Box3) => {
    const v = b.getSize(new THREE.Vector3());
    return Math.max(v.x, v.y, v.z) || 1;
  };
  const ref = new THREE.Box3().setFromObject(old);
  const own = new THREE.Box3().setFromObject(craft);
  const k = size(ref) / size(own);
  craft.scale.setScalar(k);
  craft.position.y = ref.min.y - own.min.y * k;
  const holder = new THREE.Group();
  holder.add(craft);
  holder.userData = { ...old.userData, metresToScene: k }; // the models are in metres
  return holder;
}
