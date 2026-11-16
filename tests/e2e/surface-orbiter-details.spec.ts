import { expect, test, type Page } from '@playwright/test';
import { waitForHydration } from './_helpers/hydration';

/**
 * UXD-034 (slice D2, WM1): an orbiter's panel names its tab DETAIL and its drawing "The
 * spacecraft"; a lander keeps STORY and "On the surface". An orbiter never touched a surface.
 *
 * Runs on desktop-chromium, mobile-chromium and mobile-landscape-chromium.
 */

async function open(page: Page, path: string): Promise<void> {
  await page.goto(path, { waitUntil: 'load' }).catch(() => page.goto(path, { waitUntil: 'load' }));
  await waitForHydration(page);
  await expect(page.getByRole('tab', { name: 'OVERVIEW' })).toBeVisible({ timeout: 30_000 });
}

// Moon and Mars orbiters with a drawing, among them the five the lander filter used to hide.
const ORBITERS = [
  '/moon?site=lunar-prospector',
  '/moon?site=lro',
  '/moon?site=clementine',
  '/mars?site=mro',
  '/mars?site=maven',
  '/mars?site=hope',
  '/mars?site=mars3-orbiter',
  '/mars?site=viking1-orbiter',
] as const;

for (const route of ORBITERS) {
  test(`${route}: DETAIL tab with "The spacecraft", no STORY, no "On the surface"`, async ({
    page,
  }) => {
    test.slow();
    await open(page, route);
    await expect(page.getByTestId('panel-tab-story')).toHaveCount(0);
    const tab = page.getByTestId('panel-tab-details');
    await expect(tab).toBeVisible({ timeout: 15_000 });
    await expect(tab).toHaveText('DETAIL');
    await tab.click();
    const panel = page.getByTestId('site-landing');
    await expect(panel).toBeVisible({ timeout: 10_000 });
    await expect(panel.getByRole('heading', { name: 'The spacecraft' })).toBeVisible();
    await expect(panel).not.toContainText('On the surface');
    await expect(panel.locator('figure.anatomy img').first()).toBeVisible();
    await expect(panel.locator('a.fleet-link').first()).toHaveAttribute('href', /\/fleet\?id=/);
  });
}

test('an orbiter with no drawing (TGO) has no DETAIL tab', async ({ page }) => {
  test.slow();
  await open(page, '/mars?site=tgo');
  await expect(page.getByTestId('panel-tab-details')).toHaveCount(0);
  await expect(page.getByTestId('panel-tab-story')).toHaveCount(0);
});

for (const route of ['/moon?site=apollo11', '/mars?site=curiosity']) {
  test(`${route}: a lander keeps STORY and "On the surface"`, async ({ page }) => {
    test.slow();
    await open(page, route);
    await expect(page.getByTestId('panel-tab-details')).toHaveCount(0);
    const tab = page.getByTestId('panel-tab-story');
    await expect(tab).toBeVisible({ timeout: 15_000 });
    await expect(tab).toHaveText('STORY');
    await tab.click();
    const landing = page.getByTestId('site-landing');
    await expect(landing.getByRole('heading', { name: 'On the surface' })).toBeVisible({
      timeout: 10_000,
    });
    await expect(landing).not.toContainText('The spacecraft');
  });
}

for (const object of ['hubble', 'iss']) {
  test(`/earth?object=${object}: DETAIL tab with "The spacecraft"`, async ({ page }) => {
    test.slow();
    await open(page, `/earth?object=${object}`);
    const tab = page.getByTestId('panel-tab-details');
    await expect(tab).toBeVisible({ timeout: 15_000 });
    await expect(tab).toHaveText('DETAIL');
    await tab.click();
    const panel = page.getByTestId('site-landing');
    await expect(panel.getByRole('heading', { name: 'The spacecraft' })).toBeVisible();
    await expect(panel.locator('figure.anatomy img').first()).toBeVisible();
  });
}
