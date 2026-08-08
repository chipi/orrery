import { test, expect, type Page } from '@playwright/test';

/**
 * /explore science lens on every scale shell (WS-3, RFC-037 Contract D). The
 * former bespoke chip rows (neighbourhood constellations/deep-sky/HR/light-cones,
 * Milky Way rotation/dark-matter/populations) are retired: every shell now surfaces
 * its teaching layers + lens-story through the one ScienceLayersPanel. Each shell is
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
    // The lens-story title + at least one promoted teaching layer are present.
    await expect(panel).toContainText(/stellar neighbourhood/i);
    await expect(panel).toContainText(/Constellations/);
    await expect(panel).toContainText(/HR Diagram/);
  });

  test('the Milky Way lens surfaces its overlays', async ({ page }) => {
    await gotoShell(page, 'milky-way');
    await openLens(page);
    const panel = page.locator('[data-testid="science-lens-panel"]');
    await expect(panel).toContainText(/Rotation curve/i);
    await expect(panel).toContainText(/Dark-matter halo/i);
  });

  test('the Local Group lens carries a story + learn link even before its overlays', async ({
    page,
  }) => {
    await gotoShell(page, 'local-group');
    await openLens(page);
    const panel = page.locator('[data-testid="science-lens-panel"]');
    await expect(panel).toContainText(/Local Group/i);
    // The → science learn link is the WS-3 deliverable for shells whose per-tier
    // overlays are still to come (WS-5): the lens-story itself is the link.
    await expect(panel.locator('a.lens-story')).toBeVisible();
  });

  test('a shell with no overlays yet shows only the lens-story, no layer rows', async ({
    page,
  }) => {
    await gotoShell(page, 'local-sheet');
    await openLens(page);
    const panel = page.locator('[data-testid="science-lens-panel"]');
    await expect(panel).toContainText(/Local Sheet/i);
    await expect(panel.locator('.rows')).toHaveCount(0);
  });
});
