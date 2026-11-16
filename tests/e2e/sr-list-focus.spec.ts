import { expect, test } from '@playwright/test';
import { waitForHydration } from './_helpers/hydration';

/**
 * The screen-reader site / module lists are clipped to 1 px. A keyboard user tabbing into one
 * must still see where focus is (L6): the focused row is drawn as a chip with the focus ring,
 * every other row stays clipped but focusable, and the "select …" tour anchors never show.
 */
const ROUTES = [
  { path: '/mars', list: '.sr-site-list' },
  { path: '/iss', list: '.sr-module-list' },
];

for (const { path, list } of ROUTES) {
  test(`${path}: the focused screen-reader row is visible, with a focus ring`, async ({ page }) => {
    test.skip(test.info().project.name !== 'desktop-chromium', 'keyboard interaction');
    await page.goto(path, { waitUntil: 'domcontentloaded' });
    await waitForHydration(page);
    const first = page.locator(`${list} button`).first();
    await expect(first).toBeAttached();

    await expect(first).not.toBeInViewport();
    for (let i = 0; i < 120; i++) {
      await page.keyboard.press('Tab');
      if (await first.evaluate((el) => el === document.activeElement)) break;
    }
    await expect(first).toBeFocused();
    await expect(first).toBeInViewport();
    const box = await first.boundingBox();
    expect(box && box.width > 40 && box.height > 12).toBe(true);
    const outline = await first.evaluate((el) => getComputedStyle(el).outlineStyle);
    expect(outline).toBe('solid');

    await page.keyboard.press('Tab');
    await expect(first).not.toBeFocused();
    await expect(first).not.toBeInViewport();
  });

  test(`${path}: the tour anchors stay clipped`, async ({ page }) => {
    await page.goto(path, { waitUntil: 'domcontentloaded' });
    await waitForHydration(page);
    const anchors = page.locator('.tour-anchors');
    if ((await anchors.count()) === 0) test.skip(true, 'no tour anchors on this route');
    const box = await anchors.first().boundingBox();
    expect(box && box.width <= 2 && box.height <= 2).toBe(true);
    await expect(anchors.first().locator('button').first()).not.toBeInViewport();
  });
}
