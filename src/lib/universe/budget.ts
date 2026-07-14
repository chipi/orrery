// Device budget for the /explore v2 star field (RFC-032 C-C / Budget).
//
// The scalable-render contract: the same PointField code path draws ~200k
// points on a desktop and ~15k on a low-end phone, chosen by the existing
// detect-gpu quality tier ($lib/quality/quality-tier.ts) — no new dependency.
// `tierToStarBudget` is the pure mapping; `resolveStarBudget` is the thin
// runtime adapter over the shared quality resolver.

import { resolveQualitySync, type QualityTier } from '$lib/quality/quality-tier';

export interface StarBudget {
  /** Maximum number of stars to upload to the GPU (the N in "N brightest within R"). */
  maxPoints: number;
  /** Radius, in parsecs, beyond which stars are not rendered in this tier. */
  shellRadiusPc: number;
}

/**
 * Per-tier caps. Points scale ~10× from the minimal phone tier to the cinematic
 * desktop tier; the radius grows with it so stronger devices reach deeper into
 * the catalogue. Cinematic effectively renders the whole HYG set (~115k stars).
 */
const BUDGETS: Record<QualityTier, StarBudget> = {
  minimal: { maxPoints: 15_000, shellRadiusPc: 80 },
  low: { maxPoints: 30_000, shellRadiusPc: 120 },
  medium: { maxPoints: 70_000, shellRadiusPc: 300 },
  high: { maxPoints: 140_000, shellRadiusPc: 700 },
  cinematic: { maxPoints: 200_000, shellRadiusPc: 2_000 },
};

/** Pure tier → budget mapping. */
export function tierToStarBudget(tier: QualityTier): StarBudget {
  return BUDGETS[tier];
}

/**
 * Resolve the star budget for the current device/session, reusing the shared
 * synchronous quality resolver (URL override → saved choice → cached detect-gpu
 * → fallback). Call at scene setup.
 */
export function resolveStarBudget(url?: URL): StarBudget {
  return tierToStarBudget(resolveQualitySync(url).tier);
}
