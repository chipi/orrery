import { test, expect, type Page } from '@playwright/test';

/**
 * Shared keyboard-navigation suite for the twin station routes
 * (/iss + /tiangong). Both render an identical list aside — a MODULES
 * `<ul>` followed by a visiting-vehicles `<ul>` — driven by the shared
 * `createStationSelectionService`. The roving arrow-key nav reads its
 * order live from the DOM (every `.module-row` in document order), moves
 * focus only (the committed selection stays put), and commits on
 * Enter/click. The panel opts out of the focus-grab (grabFocus={false})
 * so list nav works from the very first click.
 *
 * Keyboard navigation is a desktop interaction, so the suite is scoped
 * to the desktop-chromium project.
 */
export function stationKeyboardNavSuite(opts: {
  route: string; // '/iss'
  listTestId: string; // 'iss-list-view'
}): void {
  const { route, listTestId } = opts;

  /** Text of the `.mod-name` inside whatever row currently has focus. */
  const focusedRowName = (page: Page) =>
    page.evaluate(
      () => document.activeElement?.querySelector?.('.mod-name')?.textContent?.trim() ?? null,
    );

  test.describe(`${route} — keyboard list navigation`, () => {
    test.beforeEach(async ({ page }) => {
      test.skip(
        test.info().project.name !== 'desktop-chromium',
        'keyboard navigation is a desktop interaction',
      );
      await page.goto(`${route}?view=list`, { waitUntil: 'networkidle' });
      await expect(page.getByTestId(listTestId)).toBeVisible({ timeout: 8_000 });
      // Both the module + visitor lists must have rendered before any
      // nav assertion — they load as two independent async fetches.
      await page.waitForFunction(
        (id) => {
          const root = document.querySelector(`[data-testid="${id}"]`);
          const uls = root ? root.querySelectorAll('ul.module-list') : [];
          return (
            uls.length >= 2 &&
            uls[0].querySelectorAll('button.module-row').length > 0 &&
            uls[1].querySelectorAll('button.module-row').length > 0
          );
        },
        listTestId,
        { timeout: 8_000 },
      );
    });

    const moduleRows = (page: Page) =>
      page.getByTestId(listTestId).locator('ul.module-list').nth(0).locator('button.module-row');
    const visitorRows = (page: Page) =>
      page.getByTestId(listTestId).locator('ul.module-list').nth(1).locator('button.module-row');

    test('ArrowDown off the last module crosses into the visiting-vehicle list', async ({
      page,
    }) => {
      const lastModule = moduleRows(page).last();
      const firstVisitor = visitorRows(page).first();
      const firstVisitorName = (await firstVisitor.locator('.mod-name').textContent())?.trim();

      await lastModule.focus();
      await page.keyboard.press('ArrowDown');

      expect(await focusedRowName(page)).toBe(firstVisitorName);
    });

    test('ArrowUp off the first visitor returns to the last module; End → last visitor', async ({
      page,
    }) => {
      const lastModule = moduleRows(page).last();
      const visitors = visitorRows(page);
      const lastModuleName = (await lastModule.locator('.mod-name').textContent())?.trim();
      const lastVisitorName = (await visitors.last().locator('.mod-name').textContent())?.trim();

      await visitors.first().focus();
      await page.keyboard.press('ArrowUp');
      expect(await focusedRowName(page)).toBe(lastModuleName);

      await page.keyboard.press('End');
      expect(await focusedRowName(page)).toBe(lastVisitorName);
    });

    test('arrowing moves focus only — the committed selection stays put', async ({ page }) => {
      const first = moduleRows(page).first();
      const firstName = (await first.locator('.mod-name').textContent())?.trim();

      await first.click(); // commit: marks aria-current + opens the panel
      const current = page
        .getByTestId(listTestId)
        .locator('button.module-row[aria-current="true"]');
      await expect(current).toHaveCount(1);

      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('ArrowDown');

      // Selection did NOT follow the cursor…
      await expect(current).toHaveCount(1);
      expect((await current.locator('.mod-name').textContent())?.trim()).toBe(firstName);
      // …but focus did move off the committed row.
      expect(await focusedRowName(page)).not.toBe(firstName);
    });

    test('list nav works immediately after the first click (no focus steal)', async ({ page }) => {
      const first = moduleRows(page).first();
      const secondName = (await moduleRows(page).nth(1).locator('.mod-name').textContent())?.trim();

      await first.click(); // opens the panel — must NOT steal focus
      await page.keyboard.press('ArrowDown');

      expect(await focusedRowName(page)).toBe(secondName);
    });

    test('Enter on a focused row opens its detail panel', async ({ page }) => {
      const target = moduleRows(page).nth(1);
      const name = (await target.locator('.mod-name').textContent())?.trim();

      await target.focus();
      await page.keyboard.press('Enter');

      const panel = page.locator('aside.panel');
      await expect(panel).toBeVisible({ timeout: 8_000 });
      await expect(panel.getByRole('heading', { level: 1 })).toContainText(name ?? '');
    });

    test('Escape closes the open panel', async ({ page }) => {
      await moduleRows(page).first().click();
      const panel = page.locator('aside.panel');
      await expect(panel).toBeVisible({ timeout: 8_000 });

      await page.keyboard.press('Escape');
      await expect(panel).toBeHidden();
    });
  });
}
