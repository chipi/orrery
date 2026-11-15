import { expect, test } from '@playwright/test';
import { waitForHydration } from './_helpers/hydration';

/**
 * UXD-048: an era with no entries on a page stays in the strip (the nine eras read the same on
 * every page) but is dimmed and not selectable: aria-disabled, skipped by the arrow keys, a click
 * does nothing, its count still reads 0. /programs has no Mars Era program.
 */
test('/programs: the empty Mars Era tile is dimmed, disabled and skipped by the arrow keys', async ({
  page,
}) => {
  await page.goto('/programs');
  await waitForHydration(page);
  const tiles = page.locator('.era-tiles [role="radio"]');
  await expect(tiles).toHaveCount(9);
  const mars = tiles.nth(8);
  await expect(mars.locator('.era-count')).toHaveText('0');
  await expect(mars).toBeDisabled();
  await expect(mars).toHaveAttribute('aria-disabled', 'true');
  expect(Number(await mars.evaluate((e) => getComputedStyle(e).opacity))).toBeLessThan(0.6);

  // a click does nothing
  await mars.click({ force: true });
  await expect(mars).toHaveAttribute('aria-checked', 'false');
  await expect(page).not.toHaveURL(/epoch=mars-era/);

  // End goes to the last tile that can be chosen, not to the dimmed one
  await tiles.first().focus();
  await page.keyboard.press('End');
  await expect(tiles.nth(7)).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await expect(mars).not.toBeFocused();
});

test('/programs: a tile with entries is not dimmed', async ({ page }) => {
  await page.goto('/programs');
  await waitForHydration(page);
  const first = page.locator('.era-tiles [role="radio"]').first();
  await expect(first).toBeEnabled();
  expect(Number(await first.evaluate((e) => getComputedStyle(e).opacity))).toBe(1);
});
