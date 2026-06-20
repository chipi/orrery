import { test, expect, type Page } from '@playwright/test';

/**
 * Roving keyboard navigation across the two /science encyclopedia rails
 * (left = tabs, right = section subnav). Same focus-only model as the
 * list/grid routes: ↑/↓ within a rail (wraps), → jumps tabs → sections,
 * ← jumps back, Enter activates the <a> and swaps the centre content
 * (these rails have no detail panel).
 *
 * Keyboard navigation is a desktop interaction → scoped to
 * desktop-chromium (also where the rails render as vertical stacks).
 */

const TAB = '.rail-left .tab-card';
const SECTION = '.rail-right .section-row';

const focused = (page: Page) =>
  page.evaluate(() => {
    const a = document.activeElement;
    const cl = a?.classList;
    return {
      text: a?.textContent?.trim() ?? null,
      rail: cl?.contains('tab-card') ? 'left' : cl?.contains('section-row') ? 'right' : null,
    };
  });

test.describe('/science — rail keyboard navigation', () => {
  test.beforeEach(async ({ page }) => {
    test.skip(
      test.info().project.name !== 'desktop-chromium',
      'keyboard navigation is a desktop interaction',
    );
    // A tab page renders BOTH rails (left tabs + right section subnav).
    await page.goto('/science/orbits', { waitUntil: 'networkidle' });
    await expect(page.locator(SECTION).first()).toBeVisible({ timeout: 8_000 });
  });

  test('ArrowDown / ArrowUp move within the tab rail and wrap', async ({ page }) => {
    const tabs = page.locator(TAB);
    const firstName = (await tabs.first().textContent())?.trim();
    const lastName = (await tabs.last().textContent())?.trim();
    const secondName = (await tabs.nth(1).textContent())?.trim();

    await tabs.first().focus();
    await page.keyboard.press('ArrowDown');
    expect((await focused(page)).text).toBe(secondName);

    await page.keyboard.press('ArrowUp');
    expect((await focused(page)).text).toBe(firstName);

    // Wrap: ArrowUp off the first tab lands on the last.
    await page.keyboard.press('ArrowUp');
    expect((await focused(page)).text).toBe(lastName);
  });

  test('ArrowRight jumps into the section subnav; ArrowLeft returns to the active tab', async ({
    page,
  }) => {
    const activeTabName = (await page.locator(`${TAB}.active`).textContent())?.trim();

    await page.locator(`${TAB}.active`).focus();
    await page.keyboard.press('ArrowRight');
    expect((await focused(page)).rail).toBe('right');

    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowLeft');
    const f = await focused(page);
    expect(f.rail).toBe('left');
    expect(f.text).toBe(activeTabName);
  });

  test('ArrowDown / ArrowUp move within the section subnav', async ({ page }) => {
    const sections = page.locator(SECTION);
    const secondName = (await sections.nth(1).textContent())?.trim();

    await sections.first().focus();
    await page.keyboard.press('ArrowDown');
    expect((await focused(page)).text).toBe(secondName);
  });

  test('Enter on a section navigates and swaps the centre content', async ({ page }) => {
    const target = page.locator(SECTION).nth(2);
    await target.focus();
    await page.keyboard.press('Enter');

    await expect(page).toHaveURL(/\/science\/orbits\/[^/]+$/);
    // The navigated-to section is now the active one in the rail.
    await expect(page.locator(`${SECTION}.active`)).toHaveCount(1);
  });

  // Regression guard for the real-world flow: clicking a rail link does a
  // full SvelteKit navigation, which resets focus to <body> by default —
  // killing the arrow nav. `data-sveltekit-keepfocus` keeps focus on the
  // clicked link so the keyboard nav continues after navigating. (A click,
  // unlike a programmatic focus, is how a user actually engages the rail.)
  test('focus survives navigation so arrow nav continues after a click', async ({ page }) => {
    await page.locator(SECTION).nth(1).click();
    await expect(page).toHaveURL(/\/science\/orbits\/[^/]+$/);

    // Focus must still be on a rail link (not <body>) for arrows to work.
    expect((await focused(page)).rail).not.toBeNull();
    await page.keyboard.press('ArrowDown');
    expect((await focused(page)).rail).toBe('right');
  });
});
