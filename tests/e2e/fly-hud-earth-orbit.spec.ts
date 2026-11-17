import { test, expect, type Page } from '@playwright/test';

/**
 * Prod 0.9.9 (plan A10): the /fly identity HUD on Earth-orbit flights read "Cislunar transfer",
 * Vostok 1's ETA read DAY 500 (its record's transit_days 0 fell back to 250 days, doubled as a
 * round trip), and every mission first showed the default ORRERY-1 flight's values while its own
 * file loaded. The identity HUD is a desktop panel (collapsed behind a tab on phones).
 */
test.describe('/fly HUD on Earth-orbit flights (desktop)', () => {
  test.skip(
    ({ viewport }) => (viewport?.width ?? 1280) < 900,
    'the identity HUD is a desktop panel',
  );

  // The trajectory row is in the identity panel, the ETA row in another panel of the stack.
  function hudRow(page: Page, key: RegExp) {
    return page
      .locator('.hud-stack .hud-row')
      .filter({ has: page.locator('.hud-key', { hasText: key }) })
      .locator('.hud-val');
  }

  const cases: [mission: string, trajectory: string, eta: string][] = [
    ['vostok-1', 'Earth orbit', 'DAY 0'],
    ['sts-1', 'Earth orbit', 'DAY 2'],
    ['freedom-7', 'Suborbital flight', 'DAY 0'],
  ];
  for (const [mission, trajectory, eta] of cases) {
    test(`${mission}: ${trajectory}, ETA ${eta}`, async ({ page }) => {
      await page.goto(`/fly?mission=${mission}`);
      await expect(hudRow(page, /trajectory/i)).toHaveText(trajectory, { timeout: 30_000 });
      await expect(hudRow(page, /^\s*ETA\s*$/)).toHaveText(eta);
    });
  }

  test('the HUD shows nothing of the default flight while the mission loads', async ({ page }) => {
    let release!: () => void;
    const held = new Promise<void>((r) => (release = r));
    await page.route('**/data/missions/moon/apollo11.json', async (route) => {
      await held;
      await route.continue();
    });
    await page.goto('/fly?mission=apollo11');
    await page.waitForSelector('html[data-hydrated]', { state: 'attached', timeout: 30_000 });
    await expect(page.locator('[data-testid="mission-name"]')).toBeHidden();
    release();
    await expect(page.locator('[data-testid="mission-name"] .hud-title')).toHaveText(/Apollo 11/i, {
      timeout: 30_000,
    });
    await expect(page.locator('[data-testid="mission-name"]')).toBeVisible();
  });
});
