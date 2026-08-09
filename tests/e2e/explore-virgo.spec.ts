import { test, expect, type Page } from '@playwright/test';

/**
 * /explore Virgo Supercluster shell (#455, WS-5b) — the ladder extended past the
 * Local Sheet to the 6th shell (one step out from the Local Sheet). Reached via
 * the build-safe ?context=virgo cold-load deep-link (crosses out through all the
 * intermediate shells). Verifies the shell renders with its honesty badge + the
 * extended 8-rung scale picker. Asserts on aria-current so it holds whether the
 * rail is a visible vertical rail (desktop) or a collapsed popover (mobile).
 */

const toggle = (p: Page) => p.getByTestId('explore-scale-toggle');
const rung = (p: Page, shell: string) => p.getByTestId(`explore-scale-rung-${shell}`);

/** Jump to a shell; on mobile the rail is a popover, so open it first. */
async function jumpTo(page: Page, shell: string, isMobile: boolean): Promise<void> {
  if (isMobile && (await toggle(page).getAttribute('aria-expanded')) !== 'true') {
    await toggle(page).click();
    await page.waitForTimeout(150);
  }
  await rung(page, shell).click();
}

test.describe.configure({ timeout: 60_000 });

test.describe('/explore — Virgo Supercluster shell (#455)', () => {
  // The ?context=<deep-shell> cold-load builds up to 7 Three.js scenes sequentially;
  // on the 2-CPU mobile-landscape docker shard that exceeds the per-test budget. The
  // behaviour is viewport-agnostic and covered on desktop + mobile-chromium.
  test.beforeEach(() => {
    test.skip(
      test.info().project.name === 'mobile-landscape-chromium',
      'heavy sequential multi-scene cold-load starves the 2-CPU landscape shard',
    );
  });

  test('the Virgo shell shows its badge + an 8-rung scale picker', async ({ page }) => {
    await page.goto('/explore?context=virgo');
    await expect(page.getByText('Virgo Supercluster', { exact: false }).first()).toBeVisible({
      timeout: 40_000,
    });
    await expect(page.getByRole('navigation', { name: /location/i })).toContainText(
      /Virgo Supercluster/i,
      { timeout: 40_000 },
    );
    await expect(rung(page, 'virgo')).toHaveAttribute('aria-current', 'true', { timeout: 40_000 });
    // The Local Sheet rung is still on the ladder, one step in.
    await expect(rung(page, 'local-sheet')).toHaveCount(1);
  });

  test('jumping in from Virgo to the Local Sheet via the picker', async ({ page, isMobile }) => {
    await page.goto('/explore?context=virgo');
    await expect(rung(page, 'virgo')).toHaveAttribute('aria-current', 'true', { timeout: 40_000 });
    await jumpTo(page, 'local-sheet', isMobile);
    await expect(rung(page, 'local-sheet')).toHaveAttribute('aria-current', 'true', {
      timeout: 40_000,
    });
  });
});
