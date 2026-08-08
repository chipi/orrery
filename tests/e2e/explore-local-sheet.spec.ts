import { test, expect, type Page } from '@playwright/test';

/**
 * /explore Local Sheet shell (#454, WS-1) — the ladder extended past the Local
 * Group to a 5th shell. Reached via the build-safe ?context=local-sheet
 * cold-load deep-link (crosses out through all the intermediate shells). Verifies
 * the shell renders with its honesty badge + the extended scale picker.
 *
 * The #258 picker is an always-on vertical rail on desktop, but collapses to a
 * "Scale" toggle chip on mobile (≤640 px) — so the rungs are in the DOM but
 * hidden until the chip is tapped. We therefore assert on `aria-current` (a true
 * end-to-end signal that the live `contextId` reached the shell), and open the
 * popover before clicking a rung, exactly like explore-scale-picker.spec.ts.
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

test.describe('/explore — Local Sheet shell (#454)', () => {
  test('the Local Sheet shell shows its badge + a 5-rung scale picker', async ({ page }) => {
    await page.goto('/explore?context=local-sheet');
    // The honesty badge proves we crossed out to the (new, outermost) Local Sheet.
    await expect(page.getByText('Local Sheet', { exact: false }).first()).toBeVisible({
      timeout: 15_000,
    });
    // Breadcrumb ends at the Local Sheet, one step out from the Local Group.
    await expect(page.getByRole('navigation', { name: /location/i })).toContainText(/Local Sheet/i);
    // The #258 scale picker now carries the Local Sheet rung (grown to 5), and it
    // is the active one. `aria-current` holds whether the rail is a visible rail
    // (desktop) or a collapsed popover (mobile).
    await expect(rung(page, 'local-sheet')).toHaveAttribute('aria-current', 'true', {
      timeout: 15_000,
    });
  });

  test('jumping in from the Local Sheet to the Milky Way via the picker', async ({
    page,
    isMobile,
  }) => {
    await page.goto('/explore?context=local-sheet');
    await expect(rung(page, 'local-sheet')).toHaveAttribute('aria-current', 'true', {
      timeout: 15_000,
    });
    await jumpTo(page, 'milky-way', isMobile);
    await expect(rung(page, 'milky-way')).toHaveAttribute('aria-current', 'true', {
      timeout: 15_000,
    });
  });
});
