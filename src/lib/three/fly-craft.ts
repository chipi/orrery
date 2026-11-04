/**
 * /fly craft from the showcase families (src/lib/three/showcase/): the true-size /fleet models
 * reused for the missions whose craft they are. Each family is a lazy chunk, loaded once
 * (preloadFlyCraft) before a scene needs it, so the scenes stay synchronous (flyCraft).
 */
import * as THREE from 'three';
import type { ShowcaseModel } from './showcase/types';

type Family = Record<string, unknown> & { SHOWCASE?: Record<string, ShowcaseModel> };

const FAMILIES = import.meta.glob<Family>('./showcase/*.ts');

/** Mission id → [family file, showcase fleet id or exported builder name]. */
const FLY_CRAFT: Record<string, readonly [string, string]> = {
  apollo7: ['station-freighters', 'apollo-csm-block-ii'],
  apollo8: ['station-freighters', 'apollo-csm-block-ii'],
  apollo9: ['station-freighters', 'apollo-csm-block-ii'],
  'skylab-2': ['station-freighters', 'apollo-csm-block-ii'],
  'skylab-3': ['station-freighters', 'apollo-csm-block-ii'],
  'skylab-4': ['station-freighters', 'apollo-csm-block-ii'],
  'apollo-soyuz': ['station-freighters', 'apollo-csm-block-ii'],
  'soyuz-1': ['soyuz-progress', 'soyuz-7k-ok'],
  'soyuz-11': ['soyuz-progress', 'soyuz-7k-ok'],
  'shenzhou-1': ['station-freighters', 'shenzhou'],
  inspiration4: ['capsules-commercial', 'crew-dragon'],
  'polaris-dawn': ['capsules-commercial', 'crew-dragon'],
  ...Object.fromEntries(
    [1, 2, 3, 4, 5, 6, 7].map((n) => [`otv-${n}`, ['winged', 'x37b'] as const]),
  ),
  'parker-solar-probe': ['inner-solar', 'parker-solar-probe'],
  'solar-orbiter': ['inner-solar', 'solar-orbiter'],
  messenger: ['inner-solar', 'messenger'],
  magellan: ['inner-solar', 'magellan'],
  akatsuki: ['inner-solar', 'akatsuki'],
  // Hera: a compact box bus with two wings — the Akatsuki shape is close enough.
  hera: ['inner-solar', 'akatsuki'],
  dart: ['small-body', 'dart'],
  lucy: ['small-body', 'lucy'],
  'psyche-mission': ['small-body', 'psyche-spacecraft'],
  'europa-clipper': ['small-body', 'europa-clipper'],
  'mars-express': ['orbiters', 'mars-express'],
  maven: ['orbiters', 'maven'],
  mangalyaan: ['orbiters', 'mangalyaan'],
  'hope-probe': ['orbiters', 'hope'],
  // MMX: box bus with two wings, like Mars Express.
  mmx: ['orbiters', 'mars-express'],
  mariner4: ['orbiters', 'mariner-4'],
  mariner9: ['orbiters', 'mariner-9'],
  mariner10: ['orbiters', 'buildMariner10'],
  lro: ['orbiters', 'lro'],
  clementine: ['orbiters', 'buildClementine'],
  'smart-1': ['orbiters', 'buildSmart1'],
  change1: ['orbiters', 'buildChange1'],
  chandrayaan1: ['orbiters', 'buildChandrayaan1'],
  'lunar-prospector': ['orbiters', 'buildLunarProspector'],
  luna10: ['orbiters', 'buildLuna10'],
  sputnik1: ['early-stations', 'buildSputnik1'],
};

/** Missions whose orbit is spent docked: the craft flies nose-down on the target's port. */
const DOCKED: Record<string, { target: readonly [string, string]; dockingModuleM?: number }> = {
  'skylab-2': { target: ['early-stations', 'skylab'] },
  'skylab-3': { target: ['early-stations', 'skylab'] },
  'skylab-4': { target: ['early-stations', 'skylab'] },
  // Apollo–Soyuz: CSM + the 3.15 m Docking Module + Soyuz 19 (a 7K-TM, the 7K-OK outline).
  'apollo-soyuz': { target: ['soyuz-progress', 'soyuz-7k-ok'], dockingModuleM: 3.15 },
};

/** Every mission with a showcase craft (for the completeness test). */
export const FLY_CRAFT_MISSIONS = Object.keys(FLY_CRAFT);

const loaded = new Map<string, { build: () => THREE.Group; diameterM?: number }>();
const loadedTargets = new Map<string, () => THREE.Group>();

async function loadBuilder(
  src: readonly [string, string],
): Promise<{ build: () => THREE.Group; diameterM?: number } | null> {
  const load = FAMILIES[`./showcase/${src[0]}.ts`];
  if (!load) return null;
  const mod = await load();
  const show = mod.SHOWCASE?.[src[1]];
  const fn = show?.build ?? (mod[src[1]] as (() => THREE.Group) | undefined);
  return typeof fn === 'function' ? { build: fn, diameterM: show?.diameterM } : null;
}

/** The family module path for a mission's craft, if it has one. */
export function flyCraftSource(missionId: string): readonly [string, string] | null {
  return FLY_CRAFT[missionId] ?? null;
}

/** Load the mission's showcase family (once). Resolves false when the mission has none. */
export async function preloadFlyCraft(missionId: string): Promise<boolean> {
  if (loaded.has(missionId)) return true;
  const src = FLY_CRAFT[missionId];
  if (!src) return false;
  const dock = DOCKED[missionId];
  const [craft, target] = await Promise.all([
    loadBuilder(src),
    dock ? loadBuilder(dock.target) : Promise.resolve(null),
  ]);
  if (!craft) return false;
  if (target) loadedTargets.set(missionId, target.build);
  loaded.set(missionId, craft);
  return true;
}

/** The mission's showcase craft (metres, upright, base at y = 0), if preloaded.
 *  `userData.bodyDiameterM` is the main body's diameter (arrays and wings excluded). */
export function flyCraft(missionId: string | undefined): THREE.Group | null {
  const entry = missionId ? loaded.get(missionId) : undefined;
  if (!entry) return null;
  const g = entry.build();
  g.userData.bodyDiameterM = entry.diameterM;
  return g;
}

/** Scale a craft so its largest dimension is `size` and centre it on the origin. */
export function fitCraft(g: THREE.Group, size: number): THREE.Group {
  const box = new THREE.Box3().setFromObject(g);
  const dim = box.getSize(new THREE.Vector3());
  const k = size / (Math.max(dim.x, dim.y, dim.z) || 1);
  const c = box.getCenter(new THREE.Vector3());
  const holder = new THREE.Group();
  g.scale.setScalar(k);
  g.position.copy(c.multiplyScalar(-k));
  holder.add(g);
  return holder;
}

/** The mission's craft as it spent its orbit: docked nose-down on its target's axial port
 *  (Skylab, Soyuz 19 via the Docking Module), else the craft alone. Metres, target base at 0. */
export function flyCraftInOrbit(missionId: string | undefined): THREE.Group | null {
  const craft = flyCraft(missionId);
  const target = missionId ? loadedTargets.get(missionId) : undefined;
  if (!craft || !target || !missionId) return craft;
  const stack = new THREE.Group();
  const station = target();
  stack.add(station);
  // Showcase craft stand docking end up, so the target's port is its top.
  let portY = new THREE.Box3().setFromObject(station).max.y;
  const dmLen = DOCKED[missionId].dockingModuleM;
  if (dmLen) {
    const dm = new THREE.Mesh(
      new THREE.CylinderGeometry(0.7, 0.7, dmLen, 24),
      new THREE.MeshStandardMaterial({ color: 0xd9d6cc, roughness: 0.5, metalness: 0.2 }),
    );
    dm.position.y = portY + dmLen / 2;
    stack.add(dm);
    portY += dmLen;
  }
  const h = new THREE.Box3().setFromObject(craft).max.y;
  craft.rotation.x = Math.PI; // nose down onto the port
  craft.position.y = portY + h;
  stack.add(craft);
  return stack;
}
