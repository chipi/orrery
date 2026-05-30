import { test, expect, type Page, type ConsoleMessage } from '@playwright/test';
import { isExpectedNoise } from './_helpers/console-errors';

/**
 * Smoke tests — every route loads without console errors and shows
 * something. These are cheap and catch ~80% of "did the build break?"
 * regressions before the heavier explore/plan tests run.
 *
 * Primary routes match CLAUDE.md §what-this-project-is (smoke subset).
 */

const ROUTES = [
  { path: '/', titleHint: 'Orrery' },
  { path: '/explore', titleHint: 'Solar System Explorer' },
  { path: '/plan', titleHint: 'Mission Configurator' },
  { path: '/fly', titleHint: 'Mission Arc' },
  { path: '/missions', titleHint: 'Mission Catalog' },
  { path: '/earth', titleHint: 'Earth Orbit' },
  { path: '/iss', titleHint: 'ISS Explorer' },
  { path: '/tiangong', titleHint: 'Tiangong Explorer' },
  { path: '/moon', titleHint: 'Moon Map' },
  { path: '/mars', titleHint: 'Mars' },
  { path: '/science', titleHint: 'Science' },
  { path: '/fleet', titleHint: 'Fleet' },
  // Disclosure / gallery pages — covered by smoke for first-load gate
  // even though they're not in the primary nav (per ADR-047 / ADR-051).
  { path: '/credits', titleHint: 'Credits' },
  { path: '/library', titleHint: 'Library' },
  { path: '/posters', titleHint: 'Gallery' },
];

function attachConsoleAndError(page: Page) {
  const errors: string[] = [];
  page.on('console', (msg: ConsoleMessage) => {
    if (msg.type() !== 'error') return;
    // isExpectedNoise: ignores favicon / webgl / hot-module noise and
    // 404s on the i18n overlay probe path; everything else (incl. real
    // asset 404s on patches / portraits / galleries) is captured.
    if (isExpectedNoise(msg)) return;
    errors.push(`console.error: ${msg.text()}`);
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

test('nav bar is visible on every screen and links target primary routes', async ({ page }) => {
  await page.goto('/explore');
  const nav = page.locator('nav, [role="navigation"], header').first();
  await expect(nav).toBeVisible();
  // On ≤640 px viewports the link strip collapses into the hamburger
  // drawer (v0.6.0 nav overhaul); open it before asserting link
  // visibility. The drawer link is `a.drawer-link`; the inline desktop
  // link is `nav .center a.link`. We can't just use `a[href$=...]`
  // because that catches the (display:none) desktop link FIRST on
  // mobile, which fails the visibility check.
  const menuToggle = page.locator('button.menu-toggle');
  const isMobile = await menuToggle.isVisible().catch(() => false);
  if (isMobile) {
    // tap() instead of click() — mobile-chromium synthetic clicks have
    // been flaky on CI (GH #253). Wait for the hamburger's onclick
    // binding to flush via networkidle before activating.
    await page.waitForLoadState('networkidle');
    await menuToggle.tap();
  }
  const linkSelector = isMobile
    ? (path: string) => `a.drawer-link[href$="${path}"]`
    : (path: string) => `nav .center a.link[href$="${path}"]`;
  for (const path of [
    '/moon',
    '/mars',
    '/iss',
    '/explore',
    '/plan',
    '/fly',
    '/missions',
    '/earth',
  ]) {
    const link = page.locator(linkSelector(path)).first();
    await expect(link, `nav link to ${path}`).toBeVisible();
  }
});
