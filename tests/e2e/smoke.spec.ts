import { test, expect, type Page, type ConsoleMessage } from '@playwright/test';
import { isExpectedNoise } from './_helpers/console-errors';
import { revealDesktopNavLink } from './_helpers/nav';

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
  { path: '/colophon', titleHint: 'Colophon' },
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
  // Walk the (global) nav from a STATIC route, not /explore. The nav chrome is
  // identical on every route, but /explore runs a continuous 3D rAF loop that
  // starves the main thread under docker/CI load; each group toggle then costs
  // a slow Svelte re-render (roving tabindex flips every trigger's tabindex),
  // and the reveal loop's clicks race those re-renders into a flake. /library
  // is pure content (zero canvases), so the dropdowns open in a single frame
  // and the walk is fast and deterministic.
  await page.goto('/library');
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
  const primaryRoutes = [
    '/moon',
    '/mars',
    '/iss',
    '/explore',
    '/plan',
    '/fly',
    '/missions',
    '/earth',
  ];
  for (const path of primaryRoutes) {
    // Mobile: every link is in the (already-open) drawer. Desktop: most
    // routes now live behind the Explore / Catalog / Learn dropdowns
    // (2026-07 nav regroup), so reveal each via its group before asserting.
    // Match the route exactly OR with a trigger query (e.g. the /explore
    // "Solar System" child is ?context=solar-system so a bare click re-enters
    // the scale) — but not a sub-path like /explore/hub.
    const link = isMobile
      ? page.locator(`a.drawer-link[href$="${path}"], a.drawer-link[href*="${path}?"]`).first()
      : await revealDesktopNavLink(page, path);
    await expect(link, `nav link to ${path}`).toBeVisible();
  }
});
