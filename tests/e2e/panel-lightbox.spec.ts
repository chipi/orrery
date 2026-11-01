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
  await expect(page.locator('.lightbox-img')).toHaveAttribute('src', /.+/);
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
    const close = page.locator('.lightbox-close');
    const box = await close.boundingBox();
    expect(box).not.toBeNull();
    const cx = box!.x + box!.width / 2;
    const cy = box!.y + box!.height / 2;
    const topmostInLightbox = await page.evaluate(
      ([x, y]) => !!document.elementFromPoint(x!, y!)?.closest('.lightbox-root'),
      [cx, cy],
    );
    expect(topmostInLightbox).toBe(true);
    await page.mouse.click(cx, cy);
    await expect(lightbox).toHaveCount(0);
  });

  // The satellite and belt panels showed images that could not be enlarged;
  // they now open the same lightbox as every other panel.
  test('moon (satellite) hero and gallery thumb open the lightbox', async ({ page }) => {
    await page.goto('/explore?id=earth:moon');
    await openAndCloseFromHero(page);
    await page.locator('#sat-tab-gallery').click();
    const thumb = page.locator('aside.panel .gallery-thumb').first();
    await expect(thumb).toBeVisible({ timeout: 10_000 });
    await thumb.click();
    await expect(page.locator('button.lightbox')).toBeVisible({ timeout: 3_000 });
    await expect(page.locator('.lightbox-meta')).toBeVisible();
  });

  // Opened from the hero, the viewer steps through the panel's whole gallery:
  // arrows, keys, the counter and (desktop only) the thumbnail strip.
  test('steps through the gallery with arrows, keys and thumbnails', async ({ page, isMobile }) => {
    await page.goto('/missions?id=cassini');
    const hero = page.locator('.panel-hero-btn').first();
    await expect(hero).toBeVisible({ timeout: 10_000 });
    await hero.click();
    const counter = page.locator('.lightbox-count [aria-hidden]');
    await expect(counter).toHaveText(/^1 \/ \d+$/, { timeout: 3_000 });
    const total = Number((await counter.textContent())!.split('/')[1]);
    expect(total).toBeGreaterThan(1);
    const img = page.locator('.lightbox-img');
    const first = await img.getAttribute('src');

    await page.locator('.lightbox-next').click();
    await expect(counter).toHaveText(`2 / ${total}`);
    expect(await img.getAttribute('src')).not.toBe(first);
    await page.keyboard.press('ArrowRight');
    await expect(counter).toHaveText(`3 / ${total}`);
    await page.locator('.lightbox-prev').click();
    await expect(counter).toHaveText(`2 / ${total}`);

    const thumbs = page.locator('.lightbox-thumbs');
    if (isMobile) {
      await expect(thumbs).toBeHidden();
    } else {
      await expect(thumbs).toBeVisible();
      await page
        .locator('.lightbox-thumb')
        .nth(total - 1)
        .click();
      await expect(counter).toHaveText(`${total} / ${total}`);
    }

    // Clicking the image keeps the viewer open; Esc closes it.
    await img.click();
    await expect(page.locator('.lightbox-root')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('.lightbox-root')).toHaveCount(0);
  });

  test('asteroid belt hero opens the lightbox', async ({ page }) => {
    await page.goto('/explore?id=asteroid-belt');
    await openAndCloseFromHero(page);
  });
});
