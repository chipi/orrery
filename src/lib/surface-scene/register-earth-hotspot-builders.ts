/**
 * Bundle the Tier 1 hotspot-model builder registrations needed by /earth
 * (#285 Phase 2 B1). Called once during onMount before the per-frame LOD
 * dispatcher kicks in.
 *
 * v1 ships **no Tier 1 launchpad models** — the Tier 0 launchpad
 * silhouette from `buildLaunchpadModel` is the only marker rendered.
 * Per-pad detailed Tier 1 models (Saturn-V crawler-transporter,
 * Falcon-9 strongback, Soyuz MIK, Ariane mobile gantry, Long March
 * vertical service tower) are tracked as a follow-up polish slice
 * after Phase 2 lands. The empty registry function exists so that the
 * SurfaceSceneConfig `registerHotspotBuilders` contract holds for
 * /earth identically to /moon and /mars (ADR-072).
 *
 * Per-route registration (vs global static side-effect) keeps the
 * import graph small for routes that don't render Earth hotspots.
 */
export function registerEarthHotspotBuilders(): void {
  // Tier 1 launchpad-specific builders register here in follow-ups.
}
