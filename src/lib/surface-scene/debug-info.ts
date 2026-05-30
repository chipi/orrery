/**
 * Debug-overlay state shared by /moon and /mars surface routes. Surfaces
 * dispatcher internals (current/target tier, projected px sample, tier2
 * status, patch detail) behind ?debug=1. Removed once Tier 2 ships clean
 * (issue #283 Slice 6 follow-up).
 */
export interface SurfaceDebugInfo {
  sidecarStatus: string;
  siteCount: number;
  hotspotCount: number;
  maxTierAcrossSites: number;
  currentTopTier: number;
  targetTopTier: number;
  pageMode: string;
  dispatcherMode: string;
  camR: number;
  projectedPxSample: string;
  tier2Status: string;
  patchDetail: string;
}

export function createSurfaceDebugInfo(): SurfaceDebugInfo {
  return {
    sidecarStatus: 'pending',
    siteCount: 0,
    hotspotCount: 0,
    maxTierAcrossSites: 0,
    currentTopTier: 0,
    targetTopTier: 0,
    pageMode: 'auto',
    dispatcherMode: 'auto',
    camR: 0,
    projectedPxSample: '',
    tier2Status: '',
    patchDetail: '',
  };
}
