import { describe, expect, it } from 'vitest';
import { buildSurfacePanelTabs } from './build-panel-tabs';

describe('buildSurfacePanelTabs', () => {
  const ids = (t: ReturnType<typeof buildSurfacePanelTabs>) =>
    t.filter((x) => x.visible !== false).map((x) => x.id);

  it('always shows overview; gallery / story / learn by flag', () => {
    expect(
      ids(buildSurfacePanelTabs({ hasGallery: false, hasStory: false, hasLinks: false })),
    ).toEqual(['overview']);
    expect(
      ids(buildSurfacePanelTabs({ hasGallery: true, hasStory: true, hasLinks: true })),
    ).toEqual(['overview', 'gallery', 'story', 'learn']);
  });

  it('an orbiter has DETAIL where a lander has STORY, and only when something is drawn', () => {
    const orbiter = (hasLanding: boolean, hasStory = false) =>
      buildSurfacePanelTabs({
        kind: 'orbiter',
        hasGallery: true,
        hasStory,
        hasLinks: true,
        hasLanding,
      });
    expect(ids(orbiter(true))).toEqual(['overview', 'gallery', 'details', 'learn']);
    expect(ids(orbiter(false))).toEqual(['overview', 'gallery', 'learn']);
    // A story, if an orbiter ever gets one, brings STORY back next to DETAIL.
    expect(ids(orbiter(true, true))).toEqual(['overview', 'gallery', 'story', 'details', 'learn']);
    const lander = buildSurfacePanelTabs({
      hasGallery: true,
      hasStory: false,
      hasLinks: true,
      hasLanding: true,
    });
    expect(ids(lander)).toEqual(['overview', 'gallery', 'story', 'learn']);
    expect(lander.find((t) => t.id === 'story')?.label).not.toBe(
      buildSurfacePanelTabs({
        kind: 'orbiter',
        hasGallery: false,
        hasStory: false,
        hasLinks: false,
        hasLanding: true,
      }).find((t) => t.id === 'details')?.label,
    );
  });

  it('shows the Journey tab before Learn only for a rover with a journey (#641)', () => {
    expect(
      ids(
        buildSurfacePanelTabs({
          hasGallery: false,
          hasStory: false,
          hasLinks: true,
          hasJourney: true,
        }),
      ),
    ).toEqual(['overview', 'journey', 'learn']);
  });
});
