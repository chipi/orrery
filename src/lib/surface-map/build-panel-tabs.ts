/**
 * Build the side-detail panel's tab config for surface-map routes (#42).
 *
 * /moon and /mars expose the same four tabs (overview / gallery /
 * story / learn) with identical labels + visibility rules:
 *   - overview is always visible
 *   - gallery hides when the gallery is empty
 *   - story hides when no story exists for the site
 *   - learn hides when the site has no Learn-tab links
 *
 * Caller passes the three booleans; helper returns the tabs array.
 */
import * as m from '$lib/paraglide/messages';

export function buildSurfacePanelTabs({
  hasGallery,
  hasStory,
  hasLinks,
}: {
  hasGallery: boolean;
  hasStory: boolean;
  hasLinks: boolean;
}) {
  return [
    { id: 'overview', label: m.panel_tab_overview() },
    { id: 'gallery', label: m.panel_tab_gallery(), visible: hasGallery },
    {
      id: 'story',
      label: m.panel_tab_story(),
      visible: hasStory,
      testid: 'panel-tab-story',
    },
    { id: 'learn', label: m.panel_tab_learn(), visible: hasLinks },
  ];
}
