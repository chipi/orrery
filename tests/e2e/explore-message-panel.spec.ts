import { test, expect, type Page } from '@playwright/test';

/**
 * /explore message-object panel (#410) — the outbound interstellar craft
 * (Voyager 1/2, Pioneer 10/11, New Horizons) surface a "message to the cosmos"
 * panel from their PATHS legend row / trajectory, carrying the culture door for
 * the message they hold (Golden Record, Pioneer Plaque) and their heading. New
 * Horizons carries no formal message, so it shows the honest no-message note.
 *
 * On desktop the PATHS legend sits in the HUD; on mobile it lives inside the
 * "Missions" MobileControlsDrawer, so the legend row is only reachable after the
 * drawer is expanded. The row testid is shared by both legends, so locators are
 * scoped to the visible instance.
 */

const panel = (p: Page) => p.getByTestId('explore-message-panel');
const legendRow = (p: Page, id: string) =>
  p.locator(`[data-testid="paths-legend-row-${id}"]:visible`);

/** Reveal the PATHS legend — expand the Missions drawer on mobile (the legend
 *  lives in the MobileDrawerGroup "Missions" tab; opening it also enables PATHS). */
async function openLegend(page: Page, isMobile: boolean): Promise<void> {
  if (isMobile) {
    await page.locator('[data-tab-id="missions"]').click();
  }
  await expect(legendRow(page, 'voyager-1')).toBeVisible({ timeout: 10_000 });
}

test.describe('/explore — message-object panel (#410)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/explore?paths=1');
  });

  test('a craft that carries a message opens the panel with its culture door', async ({
    page,
    isMobile,
  }) => {
    await openLegend(page, isMobile);
    await legendRow(page, 'voyager-1').click();
    await expect(panel(page)).toBeVisible({ timeout: 8_000 });
    await expect(panel(page)).toHaveAttribute('data-craft', 'voyager-1');
    // The message it carries — the Golden Record culture door (title + link both
    // contain the phrase, so match the first).
    await expect(panel(page).getByText('Golden Record', { exact: false }).first()).toBeVisible();
    // Status + heading (the honest "where is it now / where is it going").
    await expect(panel(page).getByText('AU', { exact: false }).first()).toBeVisible();
    await expect(panel(page).getByText('Gliese 445', { exact: false })).toBeVisible();
  });

  test('Pioneer 10 carries the Pioneer Plaque', async ({ page, isMobile }) => {
    await openLegend(page, isMobile);
    await legendRow(page, 'pioneer-10').click();
    await expect(panel(page)).toHaveAttribute('data-craft', 'pioneer-10', { timeout: 8_000 });
    await expect(panel(page).getByText('Pioneer Plaque', { exact: false }).first()).toBeVisible();
  });

  test('New Horizons carries no formal message', async ({ page, isMobile }) => {
    await openLegend(page, isMobile);
    await legendRow(page, 'new-horizons').click();
    await expect(panel(page)).toHaveAttribute('data-craft', 'new-horizons', { timeout: 8_000 });
    await expect(panel(page).getByText('no formal message', { exact: false })).toBeVisible();
    await expect(panel(page).getByText('Golden Record', { exact: false })).toHaveCount(0);
  });
});

/**
 * #410 — the Arecibo message surfaces at its real target, the globular cluster
 * M13 (a photo-less deep-sky object that now opens a flat panel because it
 * carries a culture door). Deep-linked via ?deepsky=M13.
 */
test.describe('/explore — Arecibo message at M13 (#410)', () => {
  test('M13 opens a panel carrying the Arecibo Message culture door', async ({ page }) => {
    await page.goto('/explore?deepsky=M13');
    await expect(page.getByText('Hercules Globular Cluster', { exact: false })).toBeVisible({
      timeout: 12_000,
    });
    await expect(page.getByText('The Arecibo Message', { exact: false }).first()).toBeVisible();
    await expect(page.getByText('25,000 light-years', { exact: false }).first()).toBeVisible();
  });
});
