import * as THREE from 'three';
import { buildApolloLunarModule } from './showcase/lunar-module';
import { buildCuriosity } from './showcase/mars-rovers';
import { SHOWCASE as FREIGHTERS } from './showcase/station-freighters';
import {
  SHOWCASE as LUNAR_EAST,
  buildLunaE8LandingStage,
  buildLunokhod,
} from './showcase/lunar-landers-east';
import { SHOWCASE as LUNAR_WEST } from './showcase/lunar-landers-west';
import { SHOWCASE as MARS_LANDERS, buildPathfinderLander } from './showcase/mars-landers';
import { SHOWCASE as ROVERS } from './showcase/rovers';

/**
 * The central detailed models (src/lib/three/showcase/), flown in /fly's descent in place of
 * the Tier 0 surface silhouettes (operator 2026-11-23: one model per craft, used everywhere;
 * the landers "looked like two-year-old children toys"). Keyed by descent site id.
 */
const DETAILED: Record<string, () => THREE.Group> = {
  apollo11: buildApolloLunarModule,
  apollo12: buildApolloLunarModule,
  apollo14: buildApolloLunarModule,
  apollo15: buildApolloLunarModule,
  apollo16: buildApolloLunarModule,
  apollo17: buildApolloLunarModule,
  curiosity: buildCuriosity,
  // Scale-out (2026-11-23): the central models of every robotic Moon and Mars landing.
  luna9: () => LUNAR_EAST['luna-9'].build(),
  luna16: () => LUNAR_EAST['luna-16'].build(),
  luna24: () => LUNAR_EAST['luna-16'].build(),
  luna17: lunokhodOnStage,
  luna21: lunokhodOnStage,
  change3: () => LUNAR_EAST['change-3'].build(),
  change4: () => LUNAR_EAST['change-3'].build(),
  change5: () => LUNAR_EAST['change-5'].build(),
  change6: () => LUNAR_EAST['change-5'].build(),
  chandrayaan2: () => LUNAR_WEST['vikram-cy3'].build(),
  chandrayaan3: () => LUNAR_WEST['vikram-cy3'].build(),
  slim: () => LUNAR_WEST.slim.build(),
  beresheet: () => LUNAR_WEST.beresheet.build(),
  'blue-moon-mk1': () => LUNAR_WEST['blue-moon-mk1'].build(),
  'viking1-lander': () => MARS_LANDERS['viking-1'].build(),
  mars3: () => MARS_LANDERS['mars-3'].build(),
  phoenix: () => MARS_LANDERS.phoenix.build(),
  insight: () => MARS_LANDERS.insight.build(),
  schiaparelli: () => MARS_LANDERS.schiaparelli.build(),
  beagle2: () => MARS_LANDERS.beagle2.build(),
  'mars-pathfinder': buildPathfinderLander,
  spirit: () => ROVERS.spirit.build(),
  opportunity: () => ROVERS.opportunity.build(),
  perseverance: () => ROVERS.perseverance.build(),
  zhurong: () => ROVERS.zhurong.build(),
};

/** Luna 17 and 21: Lunokhod riding the E-8 landing stage, on its deck between the ramps. */
function lunokhodOnStage(): THREE.Group {
  const stage = buildLunaE8LandingStage();
  // The deck top, measured without the ramps (which slope above it).
  const ramps = stage.getObjectByName('ramps');
  const parent = ramps?.parent;
  ramps?.removeFromParent();
  const deckTop = new THREE.Box3().setFromObject(stage).max.y;
  if (ramps && parent) parent.add(ramps);
  const rover = buildLunokhod();
  rover.name = 'rover';
  rover.position.y = deckTop;
  stage.add(rover);
  return stage;
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
  phoenix: ['solar-arrays', 'arm'],
  insight: ['solar-arrays', 'arm', 'seis', 'hp3'],
  beagle2: ['petals', 'arm'],
  'mars-pathfinder': ['petals'],
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
 * Null when the site has no detailed model.
 */
export function detailedDescentLander(siteId: string, tier0: THREE.Group): THREE.Group | null {
  const build = DETAILED[siteId];
  if (!build) return null;
  const craft = build();
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
  if (FLAG_SITES.has(siteId)) holder.add(plantedFlag(k));
  holder.userData.metresToScene = k;
  for (const key of ['engineExitY', 'dockY'] as const) {
    const y = craft.userData[key] as number | undefined;
    if (y != null) holder.userData[key] = craft.position.y + y * k;
  }
  return holder;
}

/** The detailed Apollo CSM (Block II), docked nose-down on the LM at `dockY`, at `k` scene units
 *  per metre. */
export function dockedApolloCsm(dockY: number, k: number): THREE.Group {
  const csm = FREIGHTERS['apollo-csm-block-ii'].build();
  const top = new THREE.Box3().setFromObject(csm).max.y;
  const g = new THREE.Group();
  csm.rotation.x = Math.PI; // CM apex (the probe) down, onto the LM's drogue
  csm.position.y = top;
  g.add(csm);
  g.scale.setScalar(k);
  g.position.y = dockY;
  return g;
}
