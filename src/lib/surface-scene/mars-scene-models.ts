/**
 * Everything the Mars globe draws its sites with: the per-mission marker glyphs and the close-up
 * hotspot models. The route loads this module on demand (`loadSceneModels`, types.ts); SurfaceScene
 * starts it as the scene is created, alongside the site list.
 */
import type { SceneModels } from './types';
import { buildMarsLanderModel } from '$lib/mars-lander-models';
import { registerMarsHotspotBuilders } from './register-mars-hotspot-builders';

export const sceneModels: SceneModels = {
  // The Mars builder takes (siteId, missionType, agency, color): reordered to the canonical order.
  landerModelBuilder: (siteId, missionType, color, agency) =>
    buildMarsLanderModel(siteId, missionType, agency, color),
  registerHotspotBuilders: registerMarsHotspotBuilders,
};
