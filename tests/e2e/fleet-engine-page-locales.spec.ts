import { test, expect } from '@playwright/test';
import { waitForHydration } from './_helpers/hydration';

/**
 * Prod GlitchTip ORRERY-PROD-30/35/36/3O/4E/4I (#657): an engine page threw
 * `each_key_duplicate` in hi, ja and ko. Its four related-hardware groups were keyed by
 * their translated titles, and in those languages "Engines" (the engines heading) and
 * "Engine" (the page's own category) are one word.
 */
for (const path of ['/hi/fleet/rd-180', '/ja/fleet/j-2', '/ko/fleet/rl10', '/fleet/f-1']) {
  test(`${path} hydrates without a page error`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(path);
    await waitForHydration(page);
    expect(errors).toEqual([]);
  });
}
