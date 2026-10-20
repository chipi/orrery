import { expect, test } from '@playwright/test';
import { clickNavLink } from './_helpers/nav';

/**
 * #588 — a tab loaded before a deploy navigates after it. The deploy removed the
 * old build's hashed chunks, so the route's JS/CSS 404. The app must recover by
 * reloading once to the fresh build and land where the user was going, with no
 * error surfaced and no reload loop.
 *
 * Simulated by 404-ing every /_app/immutable request after the first page has
 * loaded, until the browser makes a new document request (the recovery reload).
 */
test.describe('stale chunks after a deploy (#588)', () => {
  test('a client navigation whose chunks were deployed away recovers to the target page', async ({
    page,
  }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (e) => pageErrors.push(e.message));
    let documents = 0;
    let deployed = false;
    let blocked = 0;
    page.on('request', (r) => {
      if (r.isNavigationRequest() && r.resourceType() === 'document') documents++;
    });
    await page.route('**/_app/immutable/**', (route) => {
      if (deployed && documents < 2) {
        blocked++;
        return route.fulfill({ status: 404, body: 'gone' });
      }
      return route.continue();
    });

    await page.goto('/credits', { waitUntil: 'networkidle' });
    await expect(page.locator('section.credits[data-route-ready="true"]')).toBeVisible();
    deployed = true;

    await clickNavLink(page, '/plan');
    await page.waitForURL(/\/plan\/?(\?|$)/, { timeout: 30_000 });
    await page.waitForLoadState('networkidle');

    expect(blocked, 'the simulated deploy must actually remove chunks').toBeGreaterThan(0);
    expect(documents, 'recovery is one reload, not a loop').toBeLessThanOrEqual(2);
    expect(new URL(page.url()).pathname).toMatch(/\/plan\/?$/);
    await expect(page.locator('main')).toBeVisible();
    expect(pageErrors).toEqual([]);
  });
});
