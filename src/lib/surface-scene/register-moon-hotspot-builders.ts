/**
 * Bundle the Tier 1 hotspot-model builder registrations needed by /moon.
 * Called once during onMount before the per-frame LOD dispatcher kicks in.
 *
 * Per-route registration (vs global static side-effect) keeps the import
 * graph small for routes that don't render lunar hotspots.
 */
import { registerHotspotModelBuilder } from '$lib/hotspot-lod-dispatcher';
import { buildApolloLMHotspot } from '$lib/hotspot-models/apollo-lm';
import { buildApolloLMExtendedHotspot } from '$lib/hotspot-models/apollo-lm-extended';
import { buildLuna9Hotspot } from '$lib/hotspot-models/luna-9-spherical';
import { buildLunaSampleReturnHotspot } from '$lib/hotspot-models/luna-sample-return';
import { buildLunokhodHotspot } from '$lib/hotspot-models/lunokhod-rover';
import { buildChangeLanderHotspot } from '$lib/hotspot-models/chang-e-lander';
import { buildChandrayaan3VikramHotspot } from '$lib/hotspot-models/chandrayaan-3-vikram';
import { buildSLIMPrecisionLanderHotspot } from '$lib/hotspot-models/slim-precision-lander';
import { buildBeresheetHotspot } from '$lib/hotspot-models/beresheet';

export function registerMoonHotspotBuilders(): void {
  registerHotspotModelBuilder('apollo-lm', buildApolloLMHotspot);
  registerHotspotModelBuilder('apollo-lm-extended', buildApolloLMExtendedHotspot);
  registerHotspotModelBuilder('luna-9-spherical', buildLuna9Hotspot);
  registerHotspotModelBuilder('luna-sample-return', buildLunaSampleReturnHotspot);
  registerHotspotModelBuilder('lunokhod-rover', buildLunokhodHotspot);
  registerHotspotModelBuilder('chang-e-lander', buildChangeLanderHotspot);
  registerHotspotModelBuilder('chang-e-lander-sample-return', (accent) =>
    buildChangeLanderHotspot(accent, { withAscentStage: true }),
  );
  registerHotspotModelBuilder('chandrayaan-3-vikram', buildChandrayaan3VikramHotspot);
  registerHotspotModelBuilder('slim-precision-lander', buildSLIMPrecisionLanderHotspot);
  registerHotspotModelBuilder('beresheet', buildBeresheetHotspot);
}
