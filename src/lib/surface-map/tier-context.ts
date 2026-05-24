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
