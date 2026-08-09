import { test, expect, type Page } from '@playwright/test';

/**
 * /explore scale picker (#258) — quick-jump between the four nested scale shells
 * (Solar System → Stellar Neighbourhood → Milky Way → Local Group) that the scene
 * already crosses via wheel/pinch. Each rung drives the host's `contextDeepLinkFn`,
 * which walks the shell ladder OUT or IN (`scale-shell-controller` · `planShellJump`).
 *
 * Desktop shows an always-on vertical rail; mobile (≤640 px) collapses to a
 * "Scale" toggle chip that opens the same ladder as a popover and auto-closes on
 * pick. The active rung mirrors the live `contextId`, which only flips once a
 * crossing completes — so `aria-current` is a true end-to-end assertion that the
 * jump actually happened, not just that a button was pressed.
 */

const picker = (p: Page) => p.getByTestId('explore-scale-picker');
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

test.describe('/explore — scale picker (#258)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/explore');
    await expect(picker(page)).toBeVisible({ timeout: 10_000 });
  });

  test('jumps out to Local Group (multi-step) and back in to Solar System', async ({
    page,
    isMobile,
  }, testInfo) => {
    // The multi-step out-then-back walk builds several Three.js scenes; on the 2-CPU
    // mobile-landscape docker shard that exceeds the per-test budget. Covered on
    // desktop + mobile-chromium.
    test.skip(
      testInfo.project.name === 'mobile-landscape-chromium',
      'heavy sequential multi-scene walk starves the 2-CPU landscape shard',
    );
    // Cold load starts in the solar system.
    await expect(rung(page, 'solar-system')).toHaveAttribute('aria-current', 'true', {
      timeout: 15_000,
    });

    // One tap climbs OUT through neighborhood + milky-way to the local group.
    await jumpTo(page, 'local-group', isMobile);
    await expect(rung(page, 'local-group')).toHaveAttribute('aria-current', 'true', {
      timeout: 40_000,
    });

    // And back IN to the solar system.
    await jumpTo(page, 'solar-system', isMobile);
    await expect(rung(page, 'solar-system')).toHaveAttribute('aria-current', 'true', {
      timeout: 40_000,
    });
  });

  test('hidden in 2D view and during a full-screen sub-view', async ({ page, isMobile }) => {
    // Scale shells are a 3D concept — the picker is gone in the flat 2D map.
    const viewToggle = isMobile
      ? page.getByTestId('explore-view-toggle-mobile')
      : page.getByTestId('explore-view-toggle');
    await viewToggle.click();
    await expect(picker(page)).toBeHidden();
    await viewToggle.click();
    await expect(picker(page)).toBeVisible();

    // A black-hole takeover owns the whole viewport — `contextDeepLinkFn` knows
    // only the shells, so the ladder is hidden until you exit the sub-view.
    await page.goto('/explore?bh=sagittarius-a-star');
    await expect(picker(page)).toBeHidden({ timeout: 40_000 });
  });
});
