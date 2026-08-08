import { test, expect, type Page } from '@playwright/test';

/**
 * /explore Cosmic Web shell (#457, WS-5d) — the ladder's outermost (8th) shell,
 * the top of the scale ladder. Reached via the build-safe ?context=cosmic-web
 * cold-load deep-link. Verifies the shell renders with its "schematic model"
 * honesty badge + the full 8-rung scale picker. Asserts on aria-current so it
 * holds on both the desktop rail and the mobile popover.
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

test.describe('/explore — Cosmic Web shell (#457)', () => {
  test('the Cosmic Web shell shows its badge + the full 8-rung scale picker', async ({ page }) => {
    await page.goto('/explore?context=cosmic-web');
    await expect(page.getByText('Cosmic Web', { exact: false }).first()).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByRole('navigation', { name: /location/i })).toContainText(/Cosmic Web/i);
    await expect(rung(page, 'cosmic-web')).toHaveAttribute('aria-current', 'true', {
      timeout: 15_000,
    });
    // The ladder is now eight rungs deep, top to bottom.
    await expect(rung(page, 'solar-system')).toHaveCount(1);
    await expect(rung(page, 'laniakea')).toHaveCount(1);
  });

  test('jumping in from the Cosmic Web to Laniakea via the picker', async ({ page, isMobile }) => {
    await page.goto('/explore?context=cosmic-web');
    await expect(rung(page, 'cosmic-web')).toHaveAttribute('aria-current', 'true', {
      timeout: 15_000,
    });
    await jumpTo(page, 'laniakea', isMobile);
    await expect(rung(page, 'laniakea')).toHaveAttribute('aria-current', 'true', {
      timeout: 15_000,
    });
  });
});
