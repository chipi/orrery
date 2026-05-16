import { test, expect, type ConsoleMessage, type Page } from '@playwright/test';

function attachConsoleAndError(page: Page) {
  const errors: string[] = [];
  page.on('console', (msg: ConsoleMessage) => {
    if (msg.type() === 'error') errors.push(`console.error: ${msg.text()}`);
  });
  page.on('pageerror', (err: Error) => {
    errors.push(`pageerror: ${err.message}`);
  });
  return errors;
}

/**
 * Filters strip on /fleet is collapsed by default (mirrors /missions per
 * J.1). Click the eyebrow toggle so the radios + epoch strip enter the DOM.
 */
async function expandFilters(page: Page) {
  const toggle = page.locator('.filters-toggle');
  await toggle.click();
  // Wait for at least one radio inside the filters region to confirm expand.
  await expect(page.locator('#fleet-filters [role="radio"]').first()).toBeVisible({
    timeout: 4_000,
  });
}

/**
 * Wait for the data fetch to finish — when entries load, the count chip
 * inside the filters toggle bar appears. networkidle alone is not reliable
 * because onMount's async getFleetIndex() can fire after the initial idle
 * window.
 */
async function waitForFleetReady(page: Page) {
  await expect(page.locator('.filters-toggle .filters-count').first()).toBeVisible({
    timeout: 10_000,
  });
}

test.describe('/fleet', () => {
  test('default load renders without console errors and shows ~110 cards', async ({ page }) => {
    const errors = attachConsoleAndError(page);
    await page.goto('/fleet');
    await waitForFleetReady(page);
    await expect(page).toHaveTitle(/Fleet/i);

    // The card grid has been populated by the index.json fetch.
    const cards = page.locator('.fleet-grid .card');
    await expect(cards.first()).toBeVisible({ timeout: 8_000 });
    const count = await cards.count();
    // Expect ≥100 entries; tolerates curation drift below the 124 we
    // ship today as long as the index hasn't shrunk dramatically.
    expect(count).toBeGreaterThanOrEqual(100);

    expect(errors).toEqual([]);
  });

  test('filter-bar count reflects filter state', async ({ page }) => {
    await page.goto('/fleet');
    await waitForFleetReady(page);
    const count = page.locator('.filters-toggle .filters-count').first();
    const totalText = (await count.textContent())?.trim() ?? '';
    // Unfiltered total — total-only chip shows just the number.
    const total = parseInt(totalText, 10);
    expect(total).toBeGreaterThanOrEqual(100);

    // Apply STATUS=FAILED filter — chip flips to "{filtered} / {total}".
    await expandFilters(page);
    await page.getByRole('radio', { name: /^FAILED$/ }).click();
    await expect(count).not.toHaveText(totalText);
    const newText = (await count.textContent())?.trim() ?? '';
    const failedTotal = parseInt(newText.split('/')[0]?.trim() ?? '0', 10);
    expect(failedTotal).toBeLessThan(total);
    expect(failedTotal).toBeGreaterThan(0);
  });

  test('category filter narrows the grid and updates URL', async ({ page }) => {
    await page.goto('/fleet');
    await waitForFleetReady(page);
    await expandFilters(page);
    await page.getByRole('radio', { name: /^Launcher$/ }).click();
    await expect(page).toHaveURL(/category=launcher/);
    // ~22 launchers in V1; expect ≥10.
    const cards = page.locator('.fleet-grid .card');
    expect(await cards.count()).toBeGreaterThanOrEqual(10);
  });

  test('epoch chip filter works (mobile carousel)', async ({ page }) => {
    // Mobile viewport activates the chip carousel rather than the axis.
    await page.setViewportSize({ width: 375, height: 800 });
    await page.goto('/fleet');
    await waitForFleetReady(page);
    await expandFilters(page);
    await page.getByRole('radio', { name: /Lunar Era/i }).click();
    await expect(page).toHaveURL(/epoch=lunar-era/);
    const cards = page.locator('.fleet-grid .card');
    // ~8 entries in Lunar Era epoch.
    expect(await cards.count()).toBeGreaterThanOrEqual(3);
    expect(await cards.count()).toBeLessThanOrEqual(20);
  });

  test('list view fallback renders rows', async ({ page }) => {
    const errors = attachConsoleAndError(page);
    await page.goto('/fleet?view=list');
    const rows = page.locator('.fleet-list .list-row');
    await expect(rows.first()).toBeVisible({ timeout: 10_000 });
    expect(await rows.count()).toBeGreaterThanOrEqual(100);
    expect(errors).toEqual([]);
  });

  test('?id= deep-link opens the detail panel pre-selected', async ({ page }) => {
    const errors = attachConsoleAndError(page);
    await page.goto('/fleet?id=saturn-v');
    const panel = page.locator('aside.panel');
    await expect(panel).toBeVisible({ timeout: 10_000 });
    await expect(panel.getByRole('heading', { level: 1, name: /Saturn V/i })).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('panel close clears ?id= from URL', async ({ page }) => {
    await page.goto('/fleet?id=hubble');
    const panel = page.locator('aside.panel');
    await expect(panel).toBeVisible({ timeout: 10_000 });
    await panel.locator('button.close').click();
    await expect(panel).toBeHidden({ timeout: 4_000 });
    await expect(page).toHaveURL(/\/fleet(?:\?[^=]*=[^&]*&?)*$/);
    await expect(page).not.toHaveURL(/[?&]id=/);
  });

  test('panel renders LEARN tab with tiered links for marquee entry', async ({ page }) => {
    await page.goto('/fleet?id=jwst');
    const panel = page.locator('aside.panel');
    await expect(panel).toBeVisible({ timeout: 10_000 });
    await panel.getByRole('tab', { name: /LEARN/i }).click();
    // JWST gets full 3-tier coverage (intro/core/deep) per Phase I.
    await expect(panel.locator('.tier h4', { hasText: /Intro/i })).toBeVisible();
    await expect(panel.locator('.tier h4', { hasText: /Core/i })).toBeVisible();
    await expect(panel.locator('.tier h4', { hasText: /Deep/i })).toBeVisible();
  });

  test('panel renders Operating sites cross-route links for rover entries', async ({ page }) => {
    await page.goto('/fleet?id=curiosity');
    const panel = page.locator('aside.panel');
    await expect(panel).toBeVisible({ timeout: 10_000 });
    // Curiosity's linked_sites was populated in Phase K → mars site.
    const siteLink = panel.locator('.site-link', { hasText: /Mars/i });
    await expect(siteLink).toBeVisible();
    await expect(siteLink).toHaveAttribute('href', /\/mars\?site=curiosity/);
  });

  test('panel renders MISSIONS tab when linked_missions is populated', async ({ page }) => {
    await page.goto('/fleet?id=saturn-v');
    const panel = page.locator('aside.panel');
    await expect(panel).toBeVisible({ timeout: 10_000 });
    await panel.getByRole('tab', { name: /MISSIONS/i }).click();
    // Saturn V's linked_missions includes apollo11 + apollo17 (Phase E).
    const missionLinks = panel.locator('.missions-list a.mission-link');
    expect(await missionLinks.count()).toBeGreaterThanOrEqual(2);
  });

  test('mobile (375 px) renders without horizontal scroll', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await page.goto('/fleet');
    await waitForFleetReady(page);
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    // Allow 1 px tolerance for sub-pixel rounding.
    expect(scrollWidth - clientWidth).toBeLessThanOrEqual(1);
  });

  test('nav exposes the FLEET link', async ({ page }) => {
    await page.goto('/explore', { waitUntil: 'networkidle' });
    // Desktop nav surfaces the link inline; mobile hides it behind the
    // hamburger drawer (per v0.6.0 nav overhaul, ≤640 px viewport).
    const desktopFleet = page.locator('nav .center a.link[href*="/fleet"]').first();
    if (await desktopFleet.isVisible().catch(() => false)) {
      await expect(desktopFleet).toBeVisible({ timeout: 5_000 });
      return;
    }
    await page.locator('button.menu-toggle').click();
    await expect(page.locator('a.drawer-link[href*="/fleet"]').first()).toBeVisible({
      timeout: 5_000,
    });
  });
});
