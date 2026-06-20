import { test, expect, type Page } from '@playwright/test';

/**
 * Shared 2-D keyboard-navigation suite for the entity card grids
 * (/missions + /fleet — both `<ul class="entity-card-grid">` of
 * `<button class="card">`, driven by src/lib/grid-keyboard-nav.ts).
 *
 * Arrows move focus only (the committed `.selected` card + open panel
 * stay put until Enter/click); ↑/↓ move by the live column count; the
 * detail panel opts out of the focus-grab so nav survives the first open.
 *
 * Keyboard navigation is a desktop interaction → scoped to
 * desktop-chromium.
 */
export function gridKeyboardNavSuite(opts: { route: string }): void {
  const { route } = opts;

  const GRID = 'ul.entity-card-grid button.card';

  const focusedIdx = (page: Page) =>
    page.evaluate((sel) => {
      const cards = Array.from(document.querySelectorAll(sel));
      return cards.indexOf(document.activeElement as Element);
    }, GRID);

  const columnCount = (page: Page) =>
    page.evaluate((sel) => {
      const cards = Array.from(document.querySelectorAll<HTMLElement>(sel));
      if (cards.length === 0) return 0;
      const top = (el: HTMLElement) => Math.round(el.getBoundingClientRect().top);
      const first = top(cards[0]);
      let cols = 0;
      for (const c of cards) {
        if (top(c) === first) cols++;
        else break;
      }
      return cols;
    }, GRID);

  test.describe(`${route} — grid keyboard navigation`, () => {
    test.beforeEach(async ({ page }) => {
      test.skip(
        test.info().project.name !== 'desktop-chromium',
        'keyboard navigation is a desktop interaction',
      );
      await page.goto(route, { waitUntil: 'networkidle' });
      await page.waitForFunction((sel) => document.querySelectorAll(sel).length > 4, GRID, {
        timeout: 10_000,
      });
    });

    const cards = (page: Page) => page.locator(GRID);

    test('ArrowRight / ArrowLeft move focus by one card', async ({ page }) => {
      await cards(page).first().focus();
      await page.keyboard.press('ArrowRight');
      expect(await focusedIdx(page)).toBe(1);
      await page.keyboard.press('ArrowLeft');
      expect(await focusedIdx(page)).toBe(0);
    });

    test('ArrowDown / ArrowUp move focus by a full row', async ({ page }) => {
      const cols = await columnCount(page);
      expect(cols).toBeGreaterThan(1);

      await cards(page).first().focus();
      await page.keyboard.press('ArrowDown');
      expect(await focusedIdx(page)).toBe(cols);
      await page.keyboard.press('ArrowUp');
      expect(await focusedIdx(page)).toBe(0);
    });

    test('arrowing moves focus only — the committed selection stays put', async ({ page }) => {
      await cards(page).first().click(); // commit
      const selected = page.locator(`${GRID}.selected`);
      await expect(selected).toHaveCount(1, { timeout: 8_000 });

      await page.keyboard.press('ArrowRight');
      await page.keyboard.press('ArrowRight');

      // Selection did not follow the cursor…
      await expect(selected).toHaveCount(1);
      // …but focus moved off the first card.
      expect(await focusedIdx(page)).toBeGreaterThan(0);
    });

    test('grid nav works immediately after the first open (focus retained)', async ({ page }) => {
      await cards(page).first().click(); // opens the panel — must NOT steal focus
      await expect(page.locator('aside.panel')).toBeVisible({ timeout: 8_000 });

      await page.keyboard.press('ArrowRight');
      expect(await focusedIdx(page)).toBe(1);
    });

    test('Enter opens the focused card detail panel', async ({ page }) => {
      await cards(page).nth(1).focus();
      await page.keyboard.press('Enter');
      await expect(page.locator('aside.panel')).toBeVisible({ timeout: 8_000 });
    });

    test('Escape closes the open panel', async ({ page }) => {
      await cards(page).first().click();
      const panel = page.locator('aside.panel');
      await expect(panel).toBeVisible({ timeout: 8_000 });

      await page.keyboard.press('Escape');
      await expect(panel).toBeHidden();
    });
  });
}
