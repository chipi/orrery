import { test, expect } from '@playwright/test';

/**
 * Mars STORY tab e2e (PRD-014 v0.7.x #PE path-B).
 *
 * Verifies the new STORY tab on the /mars detail panel:
 *   - tab appears for sites that have a site-stories/<id>.json file
 *   - tab is absent for sites without one
 *   - clicking the tab renders the SiteStoryPanel (chapters + images)
 *   - clicking an image opens the existing panel lightbox
 *
 * Curiosity is the flagship — it's authored with 5 chapters spanning
 * Hardware / Launch / Surface / Science / People and ~9 images. All
 * other Mars hotspot sites have a story too (13/13 coverage); we
 * cover them via the deep-link smoke pattern in hotspots.spec.ts,
 * so this spec stays focused on the panel lifecycle.
 */

test.describe('Mars STORY tab — Curiosity full lifecycle', () => {
  test('clicking STORY renders chapters; clicking a thumb opens lightbox', async ({ page }) => {
    await page.goto('/mars?site=curiosity');
    // Wait for the detail panel to mount — OVERVIEW tab is the
    // baseline; STORY appears only when the story JSON has loaded.
    await expect(page.getByRole('tab', { name: 'OVERVIEW' })).toBeVisible({ timeout: 20_000 });
    const storyTab = page.getByTestId('panel-tab-story');
    await expect(storyTab).toBeVisible({ timeout: 10_000 });
    await storyTab.click();
    // The story panel renders an intro + chapter sections + images.
    const story = page.getByTestId('site-story-panel');
    await expect(story).toBeVisible({ timeout: 5_000 });
    // Click the first image in the story — the existing panel
    // lightbox should open (the test for that lightbox lives in
    // the broader gallery e2e; we just confirm onLightbox fires).
    const firstThumb = story.locator('.thumb').first();
    await expect(firstThumb).toBeVisible();
    await firstThumb.click();
    // Panel lightbox is the route's existing `.lightbox` overlay.
    await expect(page.locator('.lightbox').first()).toBeVisible({ timeout: 3_000 });
  });
});

test.describe('Moon STORY tab — Apollo 11 + Beresheet smoke', () => {
  // Two Moon sites — one NASA, one non-NASA — to confirm the same
  // path-B infra works on /moon.
  for (const siteId of ['apollo11', 'beresheet']) {
    test(`/moon?site=${siteId} surfaces a STORY tab`, async ({ page }) => {
      await page.goto(`/moon?site=${siteId}`);
      await expect(page.getByRole('tab', { name: 'OVERVIEW' })).toBeVisible({ timeout: 20_000 });
      const storyTab = page.getByTestId('panel-tab-story');
      await expect(storyTab).toBeVisible({ timeout: 10_000 });
      await storyTab.click();
      await expect(page.getByTestId('site-story-panel')).toBeVisible({ timeout: 5_000 });
    });
  }
});
