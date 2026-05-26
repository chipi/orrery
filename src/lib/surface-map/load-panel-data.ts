/**
 * Race-safe panel data loader for surface-map routes (#42).
 *
 * Both /moon and /mars reset panel state + kick off two parallel
 * fetches (gallery URLs + site story) when a new site is selected.
 * The race-guard pattern — only apply the fetched data if the user
 * hasn't selected something else in the meantime — was open-coded
 * in both routes.
 */
import type { SiteStory } from '$lib/data';
import { getSiteStory } from '$lib/data';

export function loadPanelData({
  siteId,
  missionId,
  locale,
  fetchGallery,
  isStillCurrent,
  onGallery,
  onStory,
}: {
  siteId: string;
  missionId?: string;
  locale: string;
  fetchGallery: (siteId: string, missionId?: string) => Promise<string[]>;
  isStillCurrent: () => boolean;
  onGallery: (urls: string[]) => void;
  onStory: (story: SiteStory | null) => void;
}): void {
  void fetchGallery(siteId, missionId).then((urls) => {
    if (isStillCurrent()) onGallery(urls);
  });
  void getSiteStory(siteId, locale).then((story) => {
    if (isStillCurrent()) onStory(story);
  });
}
