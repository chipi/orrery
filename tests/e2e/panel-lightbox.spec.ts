import { test, expect, type Page } from '@playwright/test';

/**
 * The shared PanelLightbox, opened from a side panel's hero image: the
 * overlay shows the image with its credit strip, and a click on the
 * overlay closes it. MissionPanel and FleetEntryPanel stand in for the
 * eight panels that render it (/mars covers SurfaceScene in
 * mars-story-tab.spec.ts).
 */

async function openAndCloseFromHero(page: Page) {
  const hero = page.locator('.panel-hero-btn').first();
  await expect(hero).toBeVisible({ timeout: 10_000 });
  await hero.click();

  const lightbox = page.locator('button.lightbox');
  await expect(lightbox).toBeVisible({ timeout: 3_000 });
  await expect(lightbox.locator('img')).toHaveAttribute('src', /.+/);
  await expect(page.locator('.lightbox-meta')).toBeVisible();

  await lightbox.click({ position: { x: 8, y: 8 } });
  await expect(lightbox).toHaveCount(0);
  await expect(page.locator('.lightbox-meta')).toHaveCount(0);
}

test.describe('panel lightbox', () => {
  test('mission panel hero opens the lightbox with its credit', async ({ page }) => {
    await page.goto('/missions?id=apollo11');
    await openAndCloseFromHero(page);
  });

  test('fleet panel hero opens the lightbox with its credit', async ({ page }) => {
    await page.goto('/fleet?id=falcon-9');
    await openAndCloseFromHero(page);
  });

  // The planet panel renders its lightbox inside aside.panel; the panel's
  // stacking context kept it under the site nav, which covered the close ×.
  test('explore planet lightbox sits above the nav; its × closes it', async ({ page }) => {
    await page.goto('/explore?id=mars');
    const hero = page.locator('aside.panel .panel-hero-btn').first();
    await expect(hero).toBeVisible({ timeout: 15_000 });
    const lightbox = page.locator('button.lightbox');
    // PlanetPanel ignores a hero click in its first 400 ms (open-gesture guard).
    await expect(async () => {
      await hero.click();
      await expect(lightbox).toBeVisible({ timeout: 1_000 });
    }).toPass({ timeout: 10_000 });
    const close = lightbox.locator('.lightbox-close');
    const box = await close.boundingBox();
    expect(box).not.toBeNull();
    const cx = box!.x + box!.width / 2;
    const cy = box!.y + box!.height / 2;
    const topmostInLightbox = await page.evaluate(
      ([x, y]) => !!document.elementFromPoint(x!, y!)?.closest('button.lightbox'),
      [cx, cy],
    );
    expect(topmostInLightbox).toBe(true);
    await page.mouse.click(cx, cy);
    await expect(lightbox).toHaveCount(0);
  });
});
