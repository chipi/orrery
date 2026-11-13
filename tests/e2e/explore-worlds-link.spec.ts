import { expect, test, type Page } from '@playwright/test';
import { waitForHydration } from './_helpers/hydration';

/**
 * UXD-028 (slice C9): Explore and the four world pages are joined by an explicit link both ways,
 * never a switch on zoom (D5). The planet or satellite panel's "Go to …" chip opens the world
 * page; the world page's "Back to Explore" chip is the first control of its view row and opens
 * /explore?id=<body> with the panel open and the camera on the body (select = focus, UXD-019).
 * Four round trips, each on the three projects; no other panel carries the chip.
 */

test.use({ reducedMotion: 'reduce' });
test.describe.configure({ timeout: 120_000 });

const WORLDS = [
  { id: 'earth', explore: 'earth', name: 'Earth', label: 'Go to Earth' },
  { id: 'moon', explore: 'earth:moon', name: 'Moon', label: 'Go to the Moon' },
  { id: 'mars', explore: 'mars', name: 'Mars', label: 'Go to Mars' },
  { id: 'venus', explore: 'venus', name: 'Venus', label: 'Go to Venus' },
] as const;

const idParam = (page: Page) => new URL(page.url()).searchParams.get('id');

for (const w of WORLDS) {
  test(`${w.id}: panel chip to the world page and back to the focused panel`, async ({ page }) => {
    await page.goto(`/explore?id=${w.explore}`);
    await waitForHydration(page);
    const panel = page.locator('aside.panel').first();
    await expect(panel).toBeVisible({ timeout: 45_000 });

    const chip = panel.getByTestId('panel-world-link');
    await expect(chip).toHaveText(w.label);
    await expect(chip).toHaveAttribute('href', `/${w.id}`);
    await expect(chip).toBeInViewport();
    await chip.click();

    await expect(page).toHaveURL(new RegExp(`/${w.id}$`), { timeout: 30_000 });
    await expect(page.locator('.surface-scene')).toBeVisible({ timeout: 60_000 });

    // The view row's first chip: the desktop row on a fine pointer, the top-left cluster on touch.
    const row = page.locator('.hud-controls:visible, .hud-top-mobile:visible').first();
    await expect(row).toBeVisible({ timeout: 60_000 });
    const back = row.locator('.ui-chip').first();
    await expect(back).toHaveAttribute('data-testid', /^surface-back-to-explore/);
    await expect(back).toHaveText('Back to Explore');
    await expect(back).toHaveAttribute('href', `/explore?id=${w.explore}`);
    await expect(back).toBeInViewport();
    await back.click();

    await expect(page).toHaveURL(/\/explore\?/, { timeout: 30_000 });
    await waitForHydration(page);
    await expect(page.locator('aside.panel').first()).toBeVisible({ timeout: 45_000 });
    expect(idParam(page)).toBe(w.explore);
    await expect
      .poll(() => page.evaluate(() => window.__exploreCameraState?.()?.ringVisible ?? false), {
        timeout: 30_000,
        message: `${w.id} is focused: its ring is up`,
      })
      .toBe(true);
  });
}

test('no other Explore panel carries the world chip', async ({ page }) => {
  for (const id of ['jupiter', 'sun', 'mercury']) {
    await page.goto(`/explore?id=${id}`);
    await waitForHydration(page);
    await expect(page.locator('aside.panel').first()).toBeVisible({ timeout: 45_000 });
    await expect(page.getByTestId('panel-world-link')).toHaveCount(0);
  }
});

test.describe('/explore/<id> entity page', () => {
  for (const w of WORLDS) {
    test(`${w.id}: links the world page`, async ({ page }) => {
      await page.goto(`/explore/${w.id}`);
      const link = page.getByTestId('entity-world-link');
      await expect(link).toHaveText(w.label);
      await expect(link).toHaveAttribute('href', `/${w.id}`);
    });
  }

  test('jupiter has no world link', async ({ page }) => {
    await page.goto('/explore/jupiter');
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.getByTestId('entity-world-link')).toHaveCount(0);
  });
});
