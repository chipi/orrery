/**
 * Shared panel-tab discriminator for surface-map routes (#42).
 *
 * /moon and /mars's side-detail panel both expose the same four
 * tabs (overview / gallery / story / learn). Type pulled out of both
 * routes so PanelTabRow + downstream consumers can share it.
 */

export type PanelTab = 'overview' | 'gallery' | 'story' | 'learn';
