import { test, expect } from '@playwright/test';

/**
 * Surface object index (searchable orbit/land list for /mars, /moon, /earth).
 *
 * Desktop opens it via the left-edge INDEX handle; a landscape phone via the
 * Index drawer tab. A row click routes through selectSite(id, {face:true}),
 * which flies the camera + opens the shared detail panel (aside.panel).
 */
test.describe('surface object index', () => {
  test('desktop: edge-handle opens the list, search narrows it, a row opens detail', async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-chromium', 'desktop-only affordance');
    await page.goto('/mars', { waitUntil: 'networkidle' });

    // The vertical edge-handle toggles the desktop index panel.
    await page.locator('[data-testid="surface-index-toggle"]').click();
    const list = page.locator('[data-testid="surface-index-list"]');
    await expect(list).toBeVisible();
    // Mars carries well over a handful of sites + orbiters.
    expect(await list.locator('.sidx-row').count()).toBeGreaterThan(3);

    // Free-text search narrows to the matching row.
    await page.locator('[data-testid="surface-index-search"]').fill('curiosity');
    const row = list.locator('.sidx-row', { hasText: /curiosity/i }).first();
    await expect(row).toBeVisible();

    // Clicking a row opens the shared detail panel for that object.
    await row.click();
    const panel = page.locator('aside.panel');
    await expect(panel).toBeVisible({ timeout: 10_000 });
    await expect(panel).toContainText(/curiosity/i);
  });

  test('desktop: the orbit/land filter splits the list', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-chromium', 'desktop-only affordance');
    await page.goto('/mars', { waitUntil: 'networkidle' });
    await page.locator('[data-testid="surface-index-toggle"]').click();
    const list = page.locator('[data-testid="surface-index-list"]');
    await expect(list).toBeVisible();
    const all = await list.locator('.sidx-row').count();

    // Mars has both surface craft and orbiters → the orbit/land toggle shows.
    const orbitChip = page.getByRole('button', { name: /in orbit/i }).first();
    await expect(orbitChip).toBeVisible();
    await orbitChip.click();
    const orbitOnly = await list.locator('.sidx-row').count();
    expect(orbitOnly).toBeGreaterThan(0);
    expect(orbitOnly).toBeLessThan(all);
  });

  test('landscape phone: the Index drawer tab shows the list', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile-landscape-chromium', 'landscape-only');
    await page.goto('/mars', { waitUntil: 'networkidle' });
    const indexTab = page.locator('.mdg-tab', { hasText: /index/i });
    await expect(indexTab).toBeVisible({ timeout: 10_000 });
    await indexTab.click();
    await expect(page.locator('[data-testid="surface-index-list"]')).toBeVisible();
  });
});
