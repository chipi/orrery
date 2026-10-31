import * as m from '$lib/paraglide/messages';
import type { QualityTier } from './quality-tier';

const LABEL: Record<QualityTier, () => string> = {
  minimal: m.quality_tier_minimal,
  low: m.quality_tier_low,
  medium: m.quality_tier_medium,
  high: m.quality_tier_high,
  cinematic: m.quality_tier_cinematic,
};

/** The quality tier as the viewer reads it (the tier id stays the stored value). */
export function qualityTierLabel(tier: QualityTier): string {
  return LABEL[tier]();
}
