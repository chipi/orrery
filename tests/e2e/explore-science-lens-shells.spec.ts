import { test, expect, type Page } from '@playwright/test';

/**
 * /explore science lens on every scale shell (WS-3, RFC-039 Contract D). The
 * former bespoke chip rows (neighbourhood constellations/deep-sky/HR/light-cones,
 * Milky Way rotation/dark-matter/populations) are retired: every shell now surfaces
 * its teaching layers through the one ScienceLayersPanel; the lens-story moved to the
 * level card under the picker (C8, UXD-027). Each shell is
 * reached with the build-safe ?context=<shell> deep-link; the master lens is turned
 * on by setting the same attribute the Nav toggle writes, then the panel is expanded.
 */

/** Cross out to `shell` and wait until it's genuinely the active scale before
 * touching the lens — on mobile the multi-shell cross-out settles slower, so
 * asserting too early reads the still-active inner shell's lens. */
async function gotoShell(page: Page, shell: string): Promise<void> {
  await page.goto(`/explore?context=${shell}`);
  await expect(page.getByTestId(`explore-scale-rung-${shell}`)).toHaveAttribute(
    'aria-current',
    'true',
    { timeout: 15_000 },
  );
}

async function openLens(page: Page): Promise<void> {
  await page.evaluate(() => document.documentElement.setAttribute('data-science-lens', 'on'));
  const head = page.locator('[data-testid="science-lens-panel"] .panel-head');
  await expect(head).toBeVisible({ timeout: 15_000 });
  if ((await head.getAttribute('aria-expanded')) !== 'true') await head.click();
}

test.describe('/explore — per-shell science lens (WS-3)', () => {
  test('the neighbourhood lens surfaces its teaching layers', async ({ page }) => {
    await gotoShell(page, 'neighborhood');
    await openLens(page);
    const panel = page.locator('[data-testid="science-lens-panel"]');
    // At least one promoted teaching layer is present; the story is the level card's (C8).
    await expect(panel).toContainText(/Constellations/);
    await expect(panel).toContainText(/HR Diagram/);
    await expect(panel.locator('a.lens-story')).toHaveCount(0);
    await expect(page.getByTestId('explore-level-card')).toContainText(/nearest stars/i);
  });

  test('the Milky Way lens surfaces its overlays', async ({ page }) => {
    await gotoShell(page, 'milky-way');
    await openLens(page);
    const panel = page.locator('[data-testid="science-lens-panel"]');
    await expect(panel).toContainText(/Rotation curve/i);
    await expect(panel).toContainText(/Dark-matter halo/i);
  });

  test('the Local Group story and its learn links live in the level card, not the lens', async ({
    page,
  }) => {
    await gotoShell(page, 'local-group');
    await page.evaluate(() => document.documentElement.setAttribute('data-science-lens', 'on'));
    // The story (C8, UXD-027) moved to the card that hangs under the level picker: always there,
    // lens on or off, with its /science sections. A shell with no layers has no lens panel.
    const card = page.getByTestId('explore-level-card');
    await expect(card).toContainText(/Andromeda/i);
    // A touch screen folds the card; open it to see its links.
    const fold = page.getByTestId('explore-level-card-toggle');
    if ((await fold.getAttribute('aria-expanded')) !== 'true') await fold.click();
    await expect(card.locator('a[href$="/science/observation/local-group"]')).toBeVisible();
    await expect(page.locator('[data-testid="science-lens-panel"]')).toHaveCount(0);
  });

  test('a shell with no overlays yet has a card and no lens panel', async ({ page }) => {
    await gotoShell(page, 'local-sheet');
    await page.evaluate(() => document.documentElement.setAttribute('data-science-lens', 'on'));
    await expect(page.getByTestId('explore-level-card')).toContainText(/Local Sheet/i);
    await expect(page.locator('[data-testid="science-lens-panel"]')).toHaveCount(0);
  });
});
