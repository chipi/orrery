import { expect, test } from '@playwright/test';

/**
 * PRD-031 / RFC-033 — linked-video media layer.
 *
 * The load-bearing guarantee (RFC-033 V-B): the gallery is a click-to-load
 * FACADE — zero <iframe> mounts until the user clicks a video tile. This is
 * the perf non-negotiable (the #360 render-storm lesson). A wall of eager
 * embeds must never be possible.
 *
 * apollo11 carries the restored-moonwalk clip in the seed manifest, so its
 * GALLERY tab is guaranteed to render a video tile.
 */

test.describe('/missions — video gallery facade', () => {
  test('no <iframe> at rest; a tile click mounts exactly one', async ({ page }) => {
    await page.goto('/missions', { waitUntil: 'networkidle' });

    // Open Apollo 11 → its detail panel.
    await page.locator('[data-testid="mission-card-apollo11"]').click();
    const galleryTab = page.locator('#mp-tab-gallery');
    await expect(galleryTab).toBeVisible({ timeout: 10_000 });
    await galleryTab.click();

    // The video tile is a poster + play affordance — NOT an embed.
    const tile = page.locator('.video-thumb').first();
    await expect(tile).toBeVisible({ timeout: 10_000 });

    // RFC-033 V-B: nothing is embedded at rest.
    await expect(page.locator('iframe')).toHaveCount(0);
    await expect(page.locator('.vp-overlay')).toHaveCount(0);

    // Click-to-load: exactly one embed mounts, inside the player overlay.
    await tile.click();
    await expect(page.locator('.vp-overlay')).toBeVisible();
    await expect(page.locator('.vp-overlay iframe')).toHaveCount(1);

    // Escape closes the player (capture-phase) without also closing the Panel.
    await page.keyboard.press('Escape');
    await expect(page.locator('.vp-overlay')).toHaveCount(0);
    await expect(galleryTab).toBeVisible();
  });
});

test.describe('/credits — video provenance disclosure', () => {
  test('renders a Video section with per-clip rows + source links', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto('/credits', { waitUntil: 'networkidle' });

    const videoBlock = page.locator('#src-video');
    await expect(videoBlock).toBeVisible({ timeout: 10_000 });

    // At least one credited clip, each linking its source.
    const rows = videoBlock.locator('.photo');
    expect(await rows.count()).toBeGreaterThan(0);
    await expect(rows.first().locator('a[rel~="noopener"]').first()).toHaveAttribute(
      'href',
      /https?:\/\//,
    );

    expect(errors).toEqual([]);
  });
});

test.describe('/live — live feeds', () => {
  test('ISS pin is a facade (no iframe at rest, one on click); launch section renders', async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto('/live', { waitUntil: 'networkidle' });
    await expect(page.locator('section.live[data-route-ready="true"]')).toBeVisible();

    // Pinned ISS stream renders as a click-to-load facade — no embed at rest.
    const pin = page.locator('.pin-tile');
    await expect(pin).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('iframe')).toHaveCount(0);

    // Launch section always renders (either live rows or the honest empty state).
    await expect(page.locator('#live-launches')).toBeVisible();

    // Click-to-load the ISS stream: exactly one embed mounts.
    await pin.click();
    await expect(page.locator('.vp-overlay iframe')).toHaveCount(1);

    expect(errors).toEqual([]);
  });
});
