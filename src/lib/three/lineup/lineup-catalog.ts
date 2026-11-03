/**
 * Which fleet entries the /fleet line-ups can draw, and with which 3D model. Sizes come from each
 * fleet entry's `specs` (`height_m` for launchers, `length_m` / `height_m` for spacecraft) — the
 * same numbers the fleet panel shows — so the line-up never carries a size of its own.
 */
import type { FleetCategory } from '$types/fleet';
import { LINEUP_CATEGORIES, type LineupKind } from './lineup-kind';
import * as THREE from 'three';
import { buildLauncherModel, LAUNCHER_MODEL_IDS } from '../launcher-models';
import { buildCapsuleById } from '../capsule-models';
import { buildLanderCruiseCraft } from '../lander-cruise-models';
import { buildIssVisitor, type IssVisitorId } from '$lib/iss-proxy-model';
import { buildTiangongVisitor } from '$lib/tiangong-proxy-model';
import { buildMoonLanderModel } from '$lib/moon-lander-models';
import { LAUNCHER_ID_CANON } from '$lib/physics/ascent/launch-profile-registry';
import type { LineupItem } from './lineup-scene';
import type { ShowcaseModel } from '../showcase/types';

/**
 * Lay an upright winged craft on the runway: nose (+y) to +x, wings (±x) into the screen (±z), its
 * top side up — seen side-on, as it rolls out after landing.
 */
function runwayBuild(model: ShowcaseModel, top: '+z' | '-z'): () => THREE.Object3D {
  // Rotation matrices (columns = images of x, y, z): y→x, and the top side → +y.
  const m =
    top === '+z'
      ? new THREE.Matrix4().set(0, 1, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 1)
      : new THREE.Matrix4().set(0, 1, 0, 0, 0, 0, -1, 0, -1, 0, 0, 0, 0, 0, 0, 1);
  return () => {
    const craft = model.build();
    craft.quaternion.setFromRotationMatrix(m);
    const outer = new THREE.Group();
    outer.add(craft);
    return outer;
  };
}

/** Every showcase family file's SHOWCASE map (src/lib/three/showcase/*.ts), merged by fleet id. */
const SHOWCASE: Record<string, ShowcaseModel> = Object.assign(
  {},
  ...Object.values(
    import.meta.glob<{ SHOWCASE?: Record<string, ShowcaseModel> }>('../showcase/*.ts', {
      eager: true,
    }),
  ).map((mod) => mod.SHOWCASE ?? {}),
);

/**
 * A showcase craft stood for the line-up: turned to its narrowest silhouette (solar wings nearly
 * edge-on, so a 17 m span does not spread the row), then a little further so the wings still read.
 */
function showcaseBuild(model: ShowcaseModel): () => THREE.Object3D {
  if (model.pose?.kind === 'runway') return runwayBuild(model, model.pose.top);
  return () => {
    const wrap = new THREE.Group();
    wrap.add(model.build());
    let best = 0;
    let bestW = Infinity;
    for (let i = 0; i < 12; i++) {
      wrap.rotation.y = (i * Math.PI) / 12;
      wrap.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(wrap);
      if (box.max.x - box.min.x < bestW) [best, bestW] = [wrap.rotation.y, box.max.x - box.min.x];
    }
    wrap.rotation.y = best + 0.35;
    const outer = new THREE.Group();
    outer.add(wrap);
    return outer;
  };
}

export { LINEUP_CATEGORIES, type LineupKind };

/** Fleet launchers drawn with a sibling's model in the line-up only (same silhouette). */
const LINEUP_LAUNCHER_ALIAS: Record<string, string> = {
  'soyuz-u': 'soyuz',
};

/** The launcher model a fleet launcher id draws with, or null when there is none. */
export function launcherModelFor(fleetId: string): string | null {
  const id = LINEUP_LAUNCHER_ALIAS[fleetId] ?? LAUNCHER_ID_CANON[fleetId] ?? fleetId;
  return LAUNCHER_MODEL_IDS.includes(id) ? id : null;
}

/**
 * Fleet entries drawn by one identical model: the line-up shows the craft once and names the
 * sisters under it (the five orbiters built to one design, which Columbia and Enterprise are not).
 */
const LINEUP_GROUPS: Record<string, string[]> = {
  'space-shuttle-orbiter': ['atlantis', 'challenger', 'discovery', 'endeavour'],
};
const GROUPED = new Set(Object.values(LINEUP_GROUPS).flat());

export interface LineupEntry {
  id: string;
  category: FleetCategory;
  specs?: Record<string, number | string | boolean>;
}

/**
 * A spacecraft's model and which of its sizes that model shows. The capsule models draw only the
 * re-entry vehicle, so they are sized by `capsule_height_m` and labelled as the capsule; the rest
 * draw the whole craft and use its overall length / height. Stood upright as on the rocket.
 */
interface SpacecraftModel {
  build: () => THREE.Object3D;
  size: 'capsule_height_m' | 'length_m';
  part?: 'capsule';
  /** The size is a sphere's diameter: fit the model's width. */
  fitWidth?: boolean;
}

const upright = (g: THREE.Object3D) => {
  // Station visitors are modelled docking end down; flip so the service end sits on the ground,
  // then turn about the long axis to the narrowest silhouette, so solar wings are seen edge-on
  // (as from the side) instead of spreading the row by their full span.
  g.rotation.x = Math.PI;
  const wrap = new THREE.Group();
  wrap.add(g);
  let best = 0;
  let bestW = Infinity;
  for (const yaw of [0, Math.PI / 4, Math.PI / 2, (3 * Math.PI) / 4]) {
    wrap.rotation.y = yaw;
    wrap.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(wrap);
    const w = box.max.x - box.min.x;
    if (w < bestW) [best, bestW] = [yaw, w];
  }
  wrap.rotation.y = best;
  const outer = new THREE.Group();
  outer.add(wrap);
  return outer;
};
const visitor = (id: IssVisitorId) => () => upright(buildIssVisitor(id));

const SPACECRAFT_MODELS: Record<string, SpacecraftModel> = {
  'mercury-capsule': {
    build: () => buildCapsuleById('mercury'),
    size: 'capsule_height_m',
    part: 'capsule',
  },
  gemini: { build: () => buildCapsuleById('gemini'), size: 'capsule_height_m', part: 'capsule' },
  vostok: {
    build: () => buildCapsuleById('vostok'),
    size: 'capsule_height_m',
    part: 'capsule',
    fitWidth: true,
  },
  voskhod: {
    build: () => buildCapsuleById('voskhod'),
    size: 'capsule_height_m',
    part: 'capsule',
    fitWidth: true,
  },
  'apollo-lm': {
    build: () => buildMoonLanderModel('apollo11', 'lander', '#c9ccd2'),
    size: 'length_m',
  },
  orion: { build: () => buildLanderCruiseCraft('artemis4') ?? new THREE.Group(), size: 'length_m' },
  'crew-dragon': { build: visitor('crew_dragon'), size: 'length_m' },
  'cargo-dragon-2': { build: visitor('cargo_dragon'), size: 'length_m' },
  'soyuz-ms': { build: visitor('soyuz_ms'), size: 'length_m' },
  'progress-ms': { build: visitor('progress_ms'), size: 'length_m' },
  'cygnus-enhanced': { build: visitor('cygnus'), size: 'length_m' },
  'htv-x': { build: visitor('htv_x'), size: 'length_m' },
  starliner: { build: visitor('starliner'), size: 'length_m' },
  shenzhou: { build: () => upright(buildTiangongVisitor('shenzhou')), size: 'length_m' },
  tianzhou: { build: () => upright(buildTiangongVisitor('tianzhou')), size: 'length_m' },
};

/** Fleet spacecraft ids the line-up can draw. */
export const LINEUP_SPACECRAFT_IDS = Object.keys(SPACECRAFT_MODELS);

function sizeOf(kind: LineupKind, e: LineupEntry): number | null {
  const s = e.specs ?? {};
  const key = SHOWCASE[e.id] ? 'length_m' : (SPACECRAFT_MODELS[e.id]?.size ?? 'length_m');
  const v = kind === 'launchers' ? s.height_m : (s[key] ?? s.height_m);
  return typeof v === 'number' && v > 0 ? v : null;
}

export interface LineupCatalog {
  items: LineupItem[];
  /** Entries of the line-up's categories with no 3D model or no size, by id. */
  missing: { id: string; reason: 'no-model' | 'no-size' }[];
}

/** Build the line-up for `kind` from full fleet records, tallest first. */
export function buildLineupCatalog(kind: LineupKind, entries: LineupEntry[]): LineupCatalog {
  const items: LineupItem[] = [];
  const missing: LineupCatalog['missing'] = [];
  for (const e of entries) {
    if (!LINEUP_CATEGORIES[kind].includes(e.category) || GROUPED.has(e.id)) continue;
    const build = modelBuilder(kind, e.id);
    const size = sizeOf(kind, e);
    if (!build) missing.push({ id: e.id, reason: 'no-model' });
    else if (size == null) missing.push({ id: e.id, reason: 'no-size' });
    else
      items.push({
        id: e.id,
        build,
        heightM: size,
        part: SPACECRAFT_MODELS[e.id]?.part,
        members: LINEUP_GROUPS[e.id],
        // A runway craft's sourced size is its length, now lying along x.
        fitWidth: SHOWCASE[e.id]?.pose ? true : SPACECRAFT_MODELS[e.id]?.fitWidth,
      });
  }
  items.sort((a, b) => b.heightM - a.heightM);
  return { items, missing };
}

function modelBuilder(kind: LineupKind, fleetId: string): (() => THREE.Object3D) | null {
  if (kind === 'launchers') {
    const modelId = launcherModelFor(fleetId);
    return modelId ? () => buildLauncherModel(modelId, 1, 0).root : null;
  }
  const showcase = SHOWCASE[fleetId];
  if (showcase) return showcaseBuild(showcase);
  return SPACECRAFT_MODELS[fleetId]?.build ?? null;
}
