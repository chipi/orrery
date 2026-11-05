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
