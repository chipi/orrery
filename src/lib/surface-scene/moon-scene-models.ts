/**
 * Everything the Moon globe draws its sites with: the per-mission marker glyphs and the close-up
 * hotspot models. The route loads this module on demand (`loadSceneModels`, types.ts); SurfaceScene
 * starts it as the scene is created, alongside the site list.
 */
import type { SceneModels } from './types';
import { buildMoonLanderModel } from '$lib/moon-lander-models';
import { registerMoonHotspotBuilders } from './register-moon-hotspot-builders';

export const sceneModels: SceneModels = {
  landerModelBuilder: buildMoonLanderModel,
  registerHotspotBuilders: registerMoonHotspotBuilders,
};
