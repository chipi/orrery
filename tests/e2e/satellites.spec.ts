import { test, expect, type Page } from '@playwright/test';

/**
 * SatellitePanel coverage (#304). Validates the natural-satellite
 * picker → panel chain across all three "moon families" landed in
 * v0.7: Earth's Moon (Slice 1), Uranian moons (Slice 3), and Triton
 * around Neptune (Slice 3 + #68 USGS texture).
 *
 * Opens via `?id=<parent>:<sat>` deep-link — same pattern as
 * `?id=earth` for the PlanetPanel — to avoid canvas-pixel pick math
 * (fragile under mobile-chromium DPR + animation timing). Mirrors
 * the rationale documented inline at explore.spec.ts:278-285.
 *
 * The panel's editorial text is loaded async from `satellites.json` +
 * the per-locale i18n overlay (Slice 6 loader). `expectSatelliteText`
 * polls so a slow first-paint can't cause toContainText flakes.
 */

async function expectSatelliteText(
  page: Page,
  selector: string,
  needle: RegExp,
  timeout = 10_000,
): Promise<void> {
  await expect.poll(async () => page.locator(selector).textContent(), { timeout }).toMatch(needle);
}

test.describe('/explore — SatellitePanel deep-links (#304)', () => {
  test('Earth:Moon opens SatellitePanel with Moon content', async ({ page }) => {
    await page.goto('/explore?id=earth:moon');
    const panel = page.locator('aside.panel');
    await expect(panel).toBeVisible({ timeout: 10_000 });
    // Panel's aria-label is set to entry.name — verify the right
    // satellite loaded. (Visible chrome only shows "Natural satellite ·
    // orbits {parent}" + body text; satellite name itself isn't in the
    // visible header.)
    await expect(panel).toHaveAttribute('aria-label', 'Moon', { timeout: 10_000 });
    await expectSatelliteText(page, 'aside.panel', /Earth/);
  });

  test('Uranus:Titania opens SatellitePanel (Slice 3 — Uranian moon)', async ({ page }) => {
    await page.goto('/explore?id=uranus:titania');
    const panel = page.locator('aside.panel');
    await expect(panel).toBeVisible({ timeout: 10_000 });
    await expect(panel).toHaveAttribute('aria-label', 'Titania', { timeout: 10_000 });
    await expectSatelliteText(page, 'aside.panel', /Uranus/);
  });

  test('Neptune:Triton opens SatellitePanel (Slice 3 + #68 USGS texture)', async ({ page }) => {
    await page.goto('/explore?id=neptune:triton');
    const panel = page.locator('aside.panel');
    await expect(panel).toBeVisible({ timeout: 10_000 });
    await expect(panel).toHaveAttribute('aria-label', 'Triton', { timeout: 10_000 });
    await expectSatelliteText(page, 'aside.panel', /Neptune/);
  });

  test('GALLERY tab is reachable on Moon panel', async ({ page }) => {
    await page.goto('/explore?id=earth:moon');
    const panel = page.locator('aside.panel');
    await expect(panel).toBeVisible({ timeout: 10_000 });
    const galleryTab = page.getByRole('tab', { name: /^GALLERY$/ });
    await expect(galleryTab).toBeVisible({ timeout: 10_000 });
    await galleryTab.click();
    await expect(galleryTab).toHaveAttribute('aria-selected', 'true', { timeout: 5_000 });
  });

  test('TECHNICAL tab surfaces orbital-period row', async ({ page }) => {
    await page.goto('/explore?id=earth:moon');
    const panel = page.locator('aside.panel');
    await expect(panel).toBeVisible({ timeout: 10_000 });
    const technicalTab = page.getByRole('tab', { name: /^TECHNICAL$/ });
    await expect(technicalTab).toBeVisible({ timeout: 10_000 });
    await technicalTab.click();
    await expect(technicalTab).toHaveAttribute('aria-selected', 'true', { timeout: 5_000 });
    // 27.32 days — Moon's sidereal period; locale formatting may insert
    // a thin space or a comma, so match the integer prefix only.
    await expectSatelliteText(page, 'aside.panel', /27[.,]/);
  });

  test('LIBRARY tab shows tiered LEARN links for Moon', async ({ page }) => {
    await page.goto('/explore?id=earth:moon');
    const panel = page.locator('aside.panel');
    await expect(panel).toBeVisible({ timeout: 10_000 });
    const libraryTab = page.getByRole('tab', { name: /^LIBRARY$/ });
    await expect(libraryTab).toBeVisible({ timeout: 10_000 });
    await libraryTab.click();
    await expect(libraryTab).toHaveAttribute('aria-selected', 'true', { timeout: 5_000 });
    // Moon overlay carries 5 links: wiki + NASA + Apollo + Artemis + LROC.
    await expect(panel.locator('.learn-list a').first()).toBeVisible({ timeout: 10_000 });
  });
});
