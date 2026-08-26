import { test, expect, type Page } from '@playwright/test';

/**
 * /explore Local Sheet shell (#454, WS-1) — the ladder extended past the Local
 * Group to a 5th shell. Reached via the build-safe ?context=local-sheet
 * cold-load deep-link (crosses out through all the intermediate shells). Verifies
 * the shell renders with its honesty badge + the extended scale picker.
 *
 * The #258 picker is one "Scale" chip on every viewport (#45) — the rungs are in
 * the DOM but hidden until the chip is tapped. We therefore assert on `aria-current`
 * (a true end-to-end signal that the live `contextId` reached the shell), and open
 * the popover before clicking a rung, exactly like explore-scale-picker.spec.ts.
 */

const toggle = (p: Page) => p.getByTestId('explore-scale-toggle');
const rung = (p: Page, shell: string) => p.getByTestId(`explore-scale-rung-${shell}`);

/** Jump to a shell; the ladder is a popover on every viewport, so open it first. */
async function jumpTo(page: Page, shell: string): Promise<void> {
  if ((await toggle(page).getAttribute('aria-expanded')) !== 'true') {
    await toggle(page).click();
    await page.waitForTimeout(150);
  }
  await rung(page, shell).click();
}

test.describe.configure({ timeout: 60_000 });

test.describe('/explore — Local Sheet shell (#454)', () => {
  // The ?context=<deep-shell> cold-load builds several Three.js scenes sequentially;
  // on the 2-CPU mobile-landscape docker shard that exceeds the per-test budget. The
  // behaviour is viewport-agnostic and covered on desktop + mobile-chromium.
  test.beforeEach(() => {
    test.skip(
      test.info().project.name === 'mobile-landscape-chromium',
      'heavy sequential multi-scene cold-load starves the 2-CPU landscape shard',
    );
  });

  test('the Local Sheet shell shows its badge + a 5-rung scale picker', async ({ page }) => {
    await page.goto('/explore?context=local-sheet');
    // The honesty badge proves we crossed out to the (new, outermost) Local Sheet.
    await expect(page.getByText('Local Sheet', { exact: false }).first()).toBeVisible({
      timeout: 40_000,
    });
    // Breadcrumb ends at the Local Sheet, one step out from the Local Group.
    await expect(page.getByRole('navigation', { name: /location/i })).toContainText(
      /Local Sheet/i,
      { timeout: 40_000 },
    );
    // The #258 scale picker now carries the Local Sheet rung (grown to 5), and it
    // is the active one. `aria-current` holds regardless of viewport (the rungs live
    // in the popover, present in the DOM whether or not the chip is open).
    await expect(rung(page, 'local-sheet')).toHaveAttribute('aria-current', 'true', {
      timeout: 40_000,
    });
  });

  test('jumping in from the Local Sheet to the Milky Way via the picker', async ({ page }) => {
    await page.goto('/explore?context=local-sheet');
    await expect(rung(page, 'local-sheet')).toHaveAttribute('aria-current', 'true', {
      timeout: 40_000,
    });
    await jumpTo(page, 'milky-way');
    await expect(rung(page, 'milky-way')).toHaveAttribute('aria-current', 'true', {
      timeout: 40_000,
    });
  });
});
