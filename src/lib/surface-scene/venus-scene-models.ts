/**
 * Everything the Venus globe draws its sites with: the per-mission marker glyphs and the close-up
 * hotspot models. The route loads this module on demand (`loadSceneModels`, types.ts); SurfaceScene
 * starts it as the scene is created, alongside the site list.
 */
import type { SceneModels } from './types';
import { buildVenusLanderModel } from '$lib/venus-lander-models';
import { registerVenusHotspotBuilders } from './register-venus-hotspot-builders';

export const sceneModels: SceneModels = {
  landerModelBuilder: buildVenusLanderModel,
  registerHotspotBuilders: registerVenusHotspotBuilders,
};
