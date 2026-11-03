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
  sputnik1: ['early-stations', 'buildSputnik1'],
};

/** Every mission with a showcase craft (for the completeness test). */
export const FLY_CRAFT_MISSIONS = Object.keys(FLY_CRAFT);

const loaded = new Map<string, { build: () => THREE.Group; diameterM?: number }>();

/** The family module path for a mission's craft, if it has one. */
export function flyCraftSource(missionId: string): readonly [string, string] | null {
  return FLY_CRAFT[missionId] ?? null;
}

/** Load the mission's showcase family (once). Resolves false when the mission has none. */
export async function preloadFlyCraft(missionId: string): Promise<boolean> {
  if (loaded.has(missionId)) return true;
  const src = FLY_CRAFT[missionId];
  const load = src && FAMILIES[`./showcase/${src[0]}.ts`];
  if (!src || !load) return false;
  const mod = await load();
  const key = src[1];
  const show = mod.SHOWCASE?.[key];
  const fn = show?.build ?? (mod[key] as (() => THREE.Group) | undefined);
  if (typeof fn !== 'function') return false;
  loaded.set(missionId, { build: fn, diameterM: show?.diameterM });
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
