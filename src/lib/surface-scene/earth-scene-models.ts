/**
 * Everything the Earth globe draws its sites with: the per-mission marker glyphs and the close-up
 * hotspot models. The route loads this module on demand (`loadSceneModels`, types.ts); SurfaceScene
 * starts it as the scene is created, alongside the site list. The glyphs are the launch pads.
 */
import type { SceneModels } from './types';
import { buildLaunchpadModel } from '$lib/earth-launchpad-models';
import { registerEarthHotspotBuilders } from './register-earth-hotspot-builders';

export const sceneModels: SceneModels = {
  landerModelBuilder: buildLaunchpadModel,
  registerHotspotBuilders: registerEarthHotspotBuilders,
};
