import { test, expect, type Page, type ConsoleMessage } from '@playwright/test';

/**
 * Smoke tests — every route loads without console errors and shows
 * something. These are cheap and catch ~80% of "did the build break?"
 * regressions before the heavier explore/plan tests run.
 *
 * The 6 routes match the table in CLAUDE.md §what-this-project-is.
 */

const ROUTES = [
  { path: '/', titleHint: 'Orrery' },
  { path: '/explore', titleHint: 'Solar System Explorer' },
  { path: '/plan', titleHint: 'Mission Configurator' },
  { path: '/fly', titleHint: 'Mission Arc' },
  { path: '/missions', titleHint: 'Mission Library' },
  { path: '/earth', titleHint: 'Earth Orbit' },
  { path: '/moon', titleHint: 'Moon Map' },
];

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

for (const route of ROUTES) {
  test(`${route.path} loads cleanly with title containing "${route.titleHint}"`, async ({
    page,
  }) => {
    const errors = attachConsoleAndError(page);
    await page.goto(route.path, { waitUntil: 'networkidle' });
    await expect(page).toHaveTitle(new RegExp(route.titleHint, 'i'));
    expect(errors, `Console/page errors on ${route.path}:\n${errors.join('\n')}`).toEqual([]);
  });
}

test('nav bar is visible on every screen and links target the 6 routes', async ({ page }) => {
  await page.goto('/explore');
  const nav = page.locator('nav, [role="navigation"], header').first();
  await expect(nav).toBeVisible();
  // The nav exposes 6 anchors corresponding to the 6 screens.
  for (const path of ['/moon', '/explore', '/plan', '/fly', '/missions', '/earth']) {
    const link = page.locator(`a[href$="${path}"]`).first();
    await expect(link, `nav link to ${path}`).toBeVisible();
  }
});
