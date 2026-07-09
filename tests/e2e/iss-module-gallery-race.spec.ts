import { test, expect } from '@playwright/test';

/**
 * Regression — StationModulePanel gallery survives a close→re-open.
 *
 * Reported (mobile): opening a module, closing, then opening a DIFFERENT
 * module left the 2nd module with no image (or the 1st module's image).
 *
 * Root cause was a fetch race in the gallery-load `$effect`. It guarded on a
 * self-referential `lastId` `$state` and registered no cleanup, so a slow (or
 * empty) fetch for module A could resolve AFTER module B's and clobber B's
 * gallery back to A's urls (or `[]`). Desktop never hit it because you switch
 * modules in place; the mobile close→re-open path is what exposed it.
 *
 * Both station routes read one gallery manifest, and `data.get()` does not
 * de-dupe in-flight requests — so we make the race deterministic by delaying
 * ONLY the first manifest request (module A) so it loses to the second
 * (module B). Buggy code overwrites B's hero when A finally resolves; the
 * fix's effect-cleanup drops the stale resolve and B's image stands.
 *
 * /iss and /tiangong render the same StationModulePanel, so both are covered.
 */
const ROUTES = [
  {
    route: '/iss',
    listTestId: 'iss-list-view',
    manifest: 'iss-galleries.json',
    imgDir: 'iss-modules',
  },
  {
    route: '/tiangong',
    listTestId: 'tiangong-list-view',
    manifest: 'tiangong-galleries.json',
    imgDir: 'tiangong-modules',
  },
] as const;

for (const cfg of ROUTES) {
  test.describe(`${cfg.route} — module gallery survives close→re-open (fetch race)`, () => {
    test('2nd module keeps its own hero after a stale 1st-module fetch resolves', async ({
      page,
    }) => {
      // Delay only the first gallery-manifest fetch (module A) so its (empty
      // or stale) result arrives after module B's has populated the hero.
      let manifestHits = 0;
      await page.route(`**/data/${cfg.manifest}`, async (route) => {
        manifestHits += 1;
        if (manifestHits === 1) await new Promise((r) => setTimeout(r, 2500));
        await route.continue();
      });

      // List mode: no 3D canvas, module rows always visible — deterministic.
      await page.goto(`${cfg.route}?view=list`, { waitUntil: 'networkidle' });
      const list = page.getByTestId(cfg.listTestId);
      await expect(list).toBeVisible({ timeout: 8_000 });

      const rows = list.locator('button.module-row');
      await expect(rows.nth(1)).toBeVisible();
      const panel = page.locator('aside.panel');

      // Open module A — kicks off its delayed gallery fetch.
      await rows.nth(0).click();
      await expect(panel).toBeVisible({ timeout: 8_000 });

      // Close, then open a DIFFERENT module B — fires the 2nd, fast fetch.
      await panel.locator('button.panel-close').click();
      await expect(panel).toBeHidden();
      await rows.nth(1).click();
      await expect(panel).toBeVisible({ timeout: 8_000 });

      // B's id from the URL keeps the assertion independent of list sort order.
      const moduleB = new URL(page.url()).searchParams.get('module');
      expect(moduleB, 'expected ?module=<id> after opening the 2nd module').toBeTruthy();

      // B's own hero should load first...
      const hero = panel.locator('.panel-hero img');
      const heroIsB = new RegExp(`/${cfg.imgDir}/${moduleB}/`);
      await expect(hero).toHaveAttribute('src', heroIsB, { timeout: 8_000 });

      // ...and STILL be B's after module A's delayed fetch resolves (>2500 ms).
      // Buggy code clobbers the hero here to A's gallery (or clears it).
      await page.waitForTimeout(3_000);
      await expect(hero).toBeVisible();
      await expect(hero).toHaveAttribute('src', heroIsB);
      const naturalWidth = await hero.evaluate((el) => (el as HTMLImageElement).naturalWidth);
      expect(naturalWidth, "B's hero image should be decoded, not blank").toBeGreaterThan(0);
    });
  });
}
