/**
 * Tier-context info-card shape (#42).
 *
 * Populated by /moon and /mars's LOD dispatcher whenever the camera
 * crosses into a tier where a published source exists (Tier 2 patches
 * for both routes, Tier 3 panorama for the panorama gate). The card
 * stacks one attribution block per active layer — Mars routinely
 * stacks regional CTX + detail HiRISE; Moon stacks regional Chang'e 2
 * + detail LROC.
 */

export type TierLayer = {
  /** Display label e.g. 'Regional view' or 'Detail view'. */
  layerLabel: string;
  sourceTitle: string;
  sourceAuthor: string;
  resolutionText: string;
  sourceUrl?: string;
  licenseShort: string;
  /**
   * Optional per-layer absolute georeferencing uncertainty (metres).
   * When set, the card renders "±N m" alongside the licence badge on
   * THIS layer's footer. Mars Regional CTX typically reports ~50–100 m
   * absolute; HiRISE detail patches inherit the site's published
   * landing-coordinate uncertainty (50–100 m). Falls back to the
   * site-level `uncertaintyM` on the last layer when omitted.
   */
  uncertaintyM?: number;
};

export type TierContext = {
  siteId: string;
  siteName: string;
  nation: string;
  nationColor: string;
  missionContext: string;
  /**
   * One entry per active layer at this zoom. With the two-layer Tier 2
   * composition (regional + detail) both can be on-screen
   * simultaneously, so the card stacks an attribution block per
   * layer. Ordered regional → detail (top → bottom).
   */
  layers: TierLayer[];
  uncertaintyM?: number;
};

import type { SurfaceSite } from '$types/surface-site';
import { missionContextFor } from './site-formatters';

/**
 * Assemble a `TierContext` from the site + agency chip + the
 * dispatcher-computed `layers` array. Both routes built this record
 * with the same 9-line literal pre-extraction.
 */
export function buildTierContext({
  site,
  agencyChip,
  layers,
}: {
  site: Pick<
    SurfaceSite,
    'id' | 'name' | 'mission_type' | 'landing_date' | 'location_uncertainty_m'
  >;
  agencyChip: { label: string; color: string };
  layers: TierLayer[];
}): TierContext {
  return {
    siteId: site.id,
    siteName: site.name ?? site.id,
    nation: agencyChip.label,
    nationColor: agencyChip.color,
    missionContext: missionContextFor(site),
    layers,
    uncertaintyM: site.location_uncertainty_m,
  };
}
