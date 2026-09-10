/**
 * Bundle the Tier 1 hotspot-model builder registrations needed by /earth
 * (#285 Phase 2 B1). Called once during onMount before the per-frame LOD
 * dispatcher kicks in.
 *
 * #546: the US pads carry Tier-2 imagery (NAIP detail + Sentinel-2
 * regional), and dispatcher ENROLMENT requires a registered
 * `hotspot_model` builder — so a single generic Tier-1 launchpad model
 * (the familiar silhouette via `buildLaunchpadModel`'s generic
 * fallback) registers here. Visually Tier 1 matches Tier 0 for now;
 * its job is unlocking the Tier-2 patch ladder. Per-pad detailed
 * Tier 1 models (Saturn-V crawler-transporter, Falcon-9 strongback,
 * Soyuz MIK, Ariane mobile gantry, Long March vertical service tower)
 * remain the follow-up polish slice.
 *
 * Per-route registration (vs global static side-effect) keeps the
 * import graph small for routes that don't render Earth hotspots.
 */
import { registerHotspotModelBuilder } from '$lib/hotspot-lod-dispatcher';
import { buildLaunchpadModel } from '$lib/earth-launchpad-models';

export function registerEarthHotspotBuilders(): void {
  registerHotspotModelBuilder('launchpad-generic', (accent) =>
    // Unknown site id → buildLaunchpadModel's generic silhouette path.
    buildLaunchpadModel('launchpad-generic', undefined, accent),
  );
}
