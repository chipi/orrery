import { expect, test } from '@playwright/test';
import { waitForHydration } from './_helpers/hydration';

/**
 * Plan D1 (L61): the deep-sky and named-star entity pages carry the panel's IN THE SKY section
 * (DeepSkyInTheSky / StarInTheSky, shared with the explorer panels). The latitude rows come from
 * the browser's time zone after hydration, never from the build; the lines action links into the
 * explorer. A host-only star has no sky position, so no section.
 */
test.use({ timezoneId: 'Europe/Berlin' });

test.describe('entity pages — IN THE SKY', () => {
  test('M42: the finder, the nearest star and the computed rows, and the explorer link', async ({
    page,
  }) => {
    await page.goto('/explore/deep-sky/m42');
    await waitForHydration(page);
    const sky = page.getByTestId('entity-in-the-sky');
    await expect(sky.getByRole('heading', { name: /in the sky/i })).toBeVisible();
    await expect(sky.locator('canvas, svg').first()).toBeVisible({ timeout: 15_000 });
    await expect(sky).toContainText('Orion');
    await expect(sky).toContainText('5h 35m');
    await expect(sky).toContainText(/Alnitak/);
    await expect(sky).toContainText(/best months/i, { timeout: 15_000 });
    await expect(sky).toContainText(/naked eye/i);
    await expect(sky.getByRole('link', { name: /show constellation lines/i })).toHaveAttribute(
      'href',
      /\/explore\?deepsky=m42$/,
    );
  });

  test('Betelgeuse: the Orion figure and the constellation row', async ({ page }) => {
    await page.goto('/explore/stars/betelgeuse');
    await waitForHydration(page);
    const sky = page.getByTestId('entity-in-the-sky');
    await expect(sky.locator('canvas, svg').first()).toBeVisible({ timeout: 15_000 });
    await expect(sky).toContainText('Orion');
    await expect(sky.getByRole('link', { name: /show constellation lines/i })).toHaveAttribute(
      'href',
      /\/explore\?goto=betelgeuse$/,
    );
  });

  test('a host-only star (TRAPPIST-1) has no IN THE SKY section', async ({ page }) => {
    await page.goto('/explore/stars/trappist-1');
    await waitForHydration(page);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByTestId('entity-in-the-sky')).toHaveCount(0);
  });
});
