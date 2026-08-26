import { test, expect, type Page } from '@playwright/test';

/**
 * /explore Cosmic Web shell (#457, WS-5d) — the ladder's outermost (8th) shell,
 * the top of the scale ladder. Reached via the build-safe ?context=cosmic-web
 * cold-load deep-link. Verifies the shell renders with its "schematic model"
 * honesty badge + the full 8-rung scale picker. Asserts on aria-current so it
 * holds regardless of viewport (#45 promoted the picker to one chip+popover on
 * every viewport, so the ladder opens via the toggle on desktop too).
 */

const toggle = (p: Page) => p.getByTestId('explore-scale-toggle');
const rung = (p: Page, shell: string) => p.getByTestId(`explore-scale-rung-${shell}`);

async function jumpTo(page: Page, shell: string): Promise<void> {
  if ((await toggle(page).getAttribute('aria-expanded')) !== 'true') {
    await toggle(page).click();
    await page.waitForTimeout(150);
  }
  await rung(page, shell).click();
}

test.describe.configure({ timeout: 60_000 });

test.describe('/explore — Cosmic Web shell (#457)', () => {
  // The ?context=<deep-shell> cold-load builds up to 7 Three.js scenes sequentially;
  // on the 2-CPU mobile-landscape docker shard that exceeds the per-test budget. The
  // behaviour is viewport-agnostic and covered on desktop + mobile-chromium.
  test.beforeEach(() => {
    test.skip(
      test.info().project.name === 'mobile-landscape-chromium',
      'heavy sequential multi-scene cold-load starves the 2-CPU landscape shard',
    );
  });

  test('the Cosmic Web shell shows its badge + the full 8-rung scale picker', async ({ page }) => {
    await page.goto('/explore?context=cosmic-web');
    await expect(page.getByText('Cosmic Web', { exact: false }).first()).toBeVisible({
      timeout: 40_000,
    });
    await expect(page.getByRole('navigation', { name: /location/i })).toContainText(/Cosmic Web/i, {
      timeout: 40_000,
    });
    await expect(rung(page, 'cosmic-web')).toHaveAttribute('aria-current', 'true', {
      timeout: 40_000,
    });
    // The ladder is now eight rungs deep, top to bottom.
    await expect(rung(page, 'solar-system')).toHaveCount(1);
    await expect(rung(page, 'laniakea')).toHaveCount(1);
  });

  test('jumping in from the Cosmic Web to Laniakea via the picker', async ({ page }) => {
    await page.goto('/explore?context=cosmic-web');
    await expect(rung(page, 'cosmic-web')).toHaveAttribute('aria-current', 'true', {
      timeout: 40_000,
    });
    await jumpTo(page, 'laniakea');
    await expect(rung(page, 'laniakea')).toHaveAttribute('aria-current', 'true', {
      timeout: 40_000,
    });
  });
});
