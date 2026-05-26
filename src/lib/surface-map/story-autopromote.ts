/**
 * One-shot OVERVIEW → STORY tab promotion (#42).
 *
 * When a site's tier-2 imagery first loads (tierContext flips on),
 * auto-switch the user from the OVERVIEW tab to STORY — but only if
 * (a) a story exists, (b) the user hasn't manually picked a different
 * tab, and (c) we haven't already auto-switched for this site. Same
 * rule on /moon + /mars.
 *
 * Wraps the state machine (previous-active flag + per-site
 * already-switched id) in a tracker the route calls inside its
 * $effect. Returns true exactly when the route should set
 * `panelTab = 'story'`.
 */

export type StoryAutopromoteInput = {
  tierContextActive: boolean;
  selectedId: string | null | undefined;
  hasStory: boolean;
  currentTab: string;
};

export function createStoryAutopromoteTracker(): {
  check(input: StoryAutopromoteInput): boolean;
} {
  let prevActive = false;
  let switchedForSite: string | null = null;
  return {
    check({ tierContextActive, selectedId, hasStory, currentTab }) {
      const becameActive = tierContextActive && !prevActive;
      prevActive = tierContextActive;
      if (!becameActive) return false;
      if (!selectedId) return false;
      if (!hasStory) return false;
      if (currentTab !== 'overview') return false;
      if (switchedForSite === selectedId) return false;
      switchedForSite = selectedId;
      return true;
    },
  };
}
