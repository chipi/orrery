import { test, expect, type Page } from '@playwright/test';

/**
 * /explore Laniakea shell (#456, WS-5c) — the ladder extended past the Virgo
 * Supercluster to the 7th shell (one step out from Virgo). Reached via the
 * build-safe ?context=laniakea cold-load deep-link. Verifies the shell renders
 * with its honesty badge + the extended 8-rung scale picker. Asserts on
 * aria-current so it holds on both the desktop rail and the mobile popover.
 */

const toggle = (p: Page) => p.getByTestId('explore-scale-toggle');
const rung = (p: Page, shell: string) => p.getByTestId(`explore-scale-rung-${shell}`);

async function jumpTo(page: Page, shell: string, isMobile: boolean): Promise<void> {
  if (isMobile && (await toggle(page).getAttribute('aria-expanded')) !== 'true') {
    await toggle(page).click();
    await page.waitForTimeout(150);
  }
  await rung(page, shell).click();
}

test.describe.configure({ timeout: 60_000 });

test.describe('/explore — Laniakea shell (#456)', () => {
  test('the Laniakea shell shows its badge + an 8-rung scale picker', async ({ page }) => {
    await page.goto('/explore?context=laniakea');
    await expect(page.getByText('Laniakea', { exact: false }).first()).toBeVisible({
      timeout: 40_000,
    });
    await expect(page.getByRole('navigation', { name: /location/i })).toContainText(/Laniakea/i);
    await expect(rung(page, 'laniakea')).toHaveAttribute('aria-current', 'true', {
      timeout: 40_000,
    });
    await expect(rung(page, 'virgo')).toHaveCount(1);
  });

  test('jumping in from Laniakea to the Virgo Supercluster via the picker', async ({
    page,
    isMobile,
  }) => {
    await page.goto('/explore?context=laniakea');
    await expect(rung(page, 'laniakea')).toHaveAttribute('aria-current', 'true', {
      timeout: 40_000,
    });
    await jumpTo(page, 'virgo', isMobile);
    await expect(rung(page, 'virgo')).toHaveAttribute('aria-current', 'true', { timeout: 40_000 });
  });
});
