/**
 * Bundle the Tier 1 hotspot-model builder registrations needed by /mars.
 * Called once during onMount before the per-frame LOD dispatcher kicks in.
 *
 * Per-route registration (vs global static side-effect) keeps the import
 * graph small for routes that don't render Martian hotspots.
 */
import { registerHotspotModelBuilder } from '$lib/hotspot-lod-dispatcher';
import { buildVikingTripodHotspot } from '$lib/hotspot-models/viking-tripod';
import { buildPathfinderSojournerHotspot } from '$lib/hotspot-models/pathfinder-sojourner';
import { buildMERRoverHotspot } from '$lib/hotspot-models/mer-rover';
import { buildCuriosityClassHotspot } from '$lib/hotspot-models/curiosity-class';
import { buildPhoenixClassHotspot } from '$lib/hotspot-models/phoenix-class';
import { buildMars3PetalHotspot } from '$lib/hotspot-models/mars-3-petal';
import { buildTianwenZhurongHotspot } from '$lib/hotspot-models/tianwen-zhurong';
import { buildSchiaparelliHotspot } from '$lib/hotspot-models/schiaparelli';
import { buildBeagle2Hotspot } from '$lib/hotspot-models/beagle-2';
import { buildPerseveranceRoverHotspot } from '$lib/hotspot-models/mars-perseverance-rover';
import { buildInsightLanderHotspot } from '$lib/hotspot-models/mars-insight-lander';

export function registerMarsHotspotBuilders(): void {
  registerHotspotModelBuilder('viking-tripod', buildVikingTripodHotspot);
  registerHotspotModelBuilder('pathfinder-sojourner', buildPathfinderSojournerHotspot);
  registerHotspotModelBuilder('mer-rover', buildMERRoverHotspot);
  registerHotspotModelBuilder('curiosity-class', buildCuriosityClassHotspot);
  registerHotspotModelBuilder('curiosity-class-with-ingenuity', (accent) =>
    buildCuriosityClassHotspot(accent, { withIngenuity: true }),
  );
  registerHotspotModelBuilder('phoenix-class', buildPhoenixClassHotspot);
  registerHotspotModelBuilder('mars-3-petal', buildMars3PetalHotspot);
  registerHotspotModelBuilder('tianwen-zhurong', buildTianwenZhurongHotspot);
  registerHotspotModelBuilder('schiaparelli', buildSchiaparelliHotspot);
  registerHotspotModelBuilder('beagle-2', buildBeagle2Hotspot);
  registerHotspotModelBuilder('perseverance-rover', buildPerseveranceRoverHotspot);
  registerHotspotModelBuilder('insight-lander', buildInsightLanderHotspot);
}
