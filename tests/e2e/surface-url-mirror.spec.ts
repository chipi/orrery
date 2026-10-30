import { test, expect, type Page } from '@playwright/test';

/**
 * Surface routes mirror the open site card into ?site= with a shallow
 * replaceState. A shallow replaceState leaves `page.url` at the last real
 * navigation, so the mirror must compare against the address bar: opening a
 * site in-session writes ?site=, and closing it must remove it again.
 */

const site = (page: Page) => new URL(page.url()).searchParams.get('site');

async function waitForSceneReady(page: Page) {
  await page.waitForFunction(
    () =>
      typeof (window as { __surfaceSceneSelectSite?: unknown }).__surfaceSceneSelectSite ===
      'function',
    null,
    { timeout: 20_000 },
  );
}

test('/moon — closing a site opened in-session clears ?site', async ({ page }) => {
  await page.goto('/moon');
  await waitForSceneReady(page);
  // The site list loads after mount; selecting before it arrives is a no-op,
  // so retry the selection until the card (and its ?site=) is up.
  await expect
    .poll(
      async () => {
        await page.evaluate(() =>
          (
            window as { __surfaceSceneSelectSite?: (id: string) => void }
          ).__surfaceSceneSelectSite?.('luna9'),
        );
        return site(page);
      },
      { timeout: 20_000 },
    )
    .toBe('luna9');
  await page.locator('aside.panel .panel-close').click();
  await expect.poll(() => site(page)).toBeNull();
});
