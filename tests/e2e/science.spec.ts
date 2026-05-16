import { test, expect } from '@playwright/test';

/**
 * /science — encyclopedia smoke (PRD-008 / ADR-034).
 *
 * Three layers to cover: landing page (editorial Space-101 narrative),
 * tab listing (101 intro + cover diagram + section list in right rail),
 * and the section reading view (hero diagram + 101 + KaTeX formula +
 * body + see-in-app + learn-more). The route is fully prerendered, so
 * deep links must work on first load.
 */

test.describe('/science', () => {
  test('landing renders the eight-chapter editorial narrative + tab grid', async ({ page }) => {
    await page.goto('/science');
    await expect(page.locator('h1', { hasText: 'SCIENCE' })).toBeVisible();
    // Chapter headlines from the landing-page Space-101 story.
    await expect(page.getByText('So you want to fly a rocket to Mars.')).toBeVisible();
    await expect(page.getByText('Now go play.')).toBeVisible();
    // Left rail with all six tabs.
    const rail = page.locator('aside[aria-label="Encyclopedia tabs"]');
    await expect(rail.getByRole('link', { name: 'ORBITS' })).toBeVisible();
    await expect(rail.getByRole('link', { name: 'PORKCHOP' })).toBeVisible();
  });

  test('tab page shows breadcrumb, cover image, 101 intro, and right-rail sections', async ({
    page,
  }) => {
    await page.goto('/science/orbits');
    // Breadcrumb back to Space 101.
    const crumb = page.locator('nav.crumb');
    await expect(crumb.getByRole('link', { name: 'SCIENCE' })).toBeVisible();
    await expect(page.locator('h1', { hasText: 'ORBITS' })).toBeVisible();
    // Tab cover SVG (chapter-title plate).
    await expect(page.locator('img[src$="_cover-orbits.svg"]')).toBeVisible();
    // 101 intro block.
    await expect(page.locator('section[aria-label="A focused 101 for this tab"]')).toBeVisible();
    // Right rail with all eight orbits sections.
    const sectionRail = page.locator('aside[aria-label="Sections in this tab"]');
    await expect(sectionRail.getByRole('link', { name: 'Vis-Viva Equation' })).toBeVisible();
    await expect(sectionRail.getByRole('link', { name: "Kepler's Three Laws" })).toBeVisible();
  });

  test('section page renders hero diagram, 101, KaTeX formula, body, and links', async ({
    page,
  }) => {
    await page.goto('/science/orbits/vis-viva');
    await expect(page.locator('h1', { hasText: 'Vis-Viva Equation' })).toBeVisible();
    // Hero diagram above the 101.
    await expect(page.locator('img[src$="vis-viva.svg"]')).toBeVisible();
    // 101 zoom-in block.
    await expect(page.locator('section[aria-label="A focused 101"]')).toBeVisible();
    // KaTeX-rendered formula (server-rendered HTML, no JS math library).
    await expect(page.locator('.katex-display').first()).toBeVisible();
    // Learn-more tiered links.
    const learnMore = page.locator('section.learn-more');
    await expect(learnMore.getByRole('link', { name: /Wikipedia.*Vis-viva/i })).toBeVisible();
  });

  test('right rail highlights the active section and lets you jump between them', async ({
    page,
  }) => {
    await page.goto('/science/orbits/vis-viva');
    const sectionRail = page.locator('aside[aria-label="Sections in this tab"]');
    const active = sectionRail.locator('a[aria-current="page"]');
    await expect(active).toHaveCount(1);
    await expect(active).toContainText('Vis-Viva Equation');
    // Jump to a sibling section without leaving the article.
    await sectionRail.getByRole('link', { name: 'Eccentricity' }).click();
    await expect(page).toHaveURL(/\/science\/orbits\/eccentricity\/?$/);
    await expect(page.locator('h1', { hasText: 'Eccentricity' })).toBeVisible();
  });

  test('breadcrumb on a section page links back to /science', async ({ page }) => {
    await page.goto('/science/transfers/hohmann-transfer');
    const crumb = page.locator('nav.crumb');
    await expect(crumb.getByText('Hohmann Transfer')).toBeVisible();
    await crumb.getByRole('link', { name: 'SCIENCE' }).click();
    await expect(page).toHaveURL(/\/science\/?$/);
    await expect(page.getByText('So you want to fly a rocket to Mars.')).toBeVisible();
  });

  test('deep link to a section without a formula still renders cleanly', async ({ page }) => {
    // /science/scales-time/au has a diagram but no formula_latex.
    await page.goto('/science/scales-time/au');
    await expect(page.locator('h1', { hasText: 'AU' })).toBeVisible();
    await expect(page.locator('img[src$="au.svg"]')).toBeVisible();
    // No KaTeX block expected here.
    await expect(page.locator('.katex-display')).toHaveCount(0);
  });
});

/**
 * Phase 2 — cross-screen `?` chips (ADR-036). The chips embed in HUDs and
 * panels across /missions, /fly, /explore, /plan and link to the matching
 * /science/[tab]/[section].
 */
test.describe('/science Phase 2 chips', () => {
  test('/plan educational primer surfaces porkchop chips that navigate to /science', async ({
    page,
  }) => {
    await page.goto('/plan');
    const chips = page.locator('a[data-science-chip]');
    expect(await chips.count()).toBeGreaterThanOrEqual(4);
    const departureChip = page
      .locator('a[data-science-chip][href*="porkchop/departure-axis"]')
      .first();
    await expect(departureChip).toBeVisible();
    await departureChip.click();
    await expect(page).toHaveURL(/\/science\/porkchop\/departure-axis\/?$/);
    await expect(page.locator('h1', { hasText: 'Departure-Window Axis' })).toBeVisible();
  });

  test('ScienceChip exposes a tooltip via title and a clickable href', async ({ page }) => {
    await page.goto('/plan');
    const firstChip = page.locator('a[data-science-chip]').first();
    await expect(firstChip).toHaveAttribute('title', /.+/);
    await expect(firstChip).toHaveAttribute('href', /\/science\/[^/]+\/[^/]+/);
    await expect(firstChip).toHaveAttribute('aria-label', /Learn more/);
  });
});

// /science Cmd-K is reachable on both viewports as of v0.6.2:
//   • desktop — left rail's Search button (display:flex on ≥641 px)
//   • mobile  — hamburger drawer's Search row (issue #137)
// Both surfaces carry the same `aria-label="Search the encyclopedia (⌘K)"`,
// so `getByRole('button', {name: /Search the encyclopedia/i})` matches in
// both viewports — but on mobile the rail button is `display:none` and
// the drawer button isn't rendered until the hamburger is open. The
// helper below opens the drawer first when the menu toggle is visible.
test.describe('/science Cmd-K search', () => {
  async function openSearchButton(page: import('@playwright/test').Page): Promise<void> {
    // If the hamburger toggle is visible we're on mobile-chromium —
    // open the drawer so the drawer Search row paints. Desktop has the
    // toggle hidden, so we skip the click and click the rail button
    // directly.
    const menuToggle = page.locator('button.menu-toggle');
    if (await menuToggle.isVisible().catch(() => false)) {
      await menuToggle.click();
    }
    await page.getByRole('button', { name: /Search the encyclopedia/i }).click();
  }

  test('search button opens the overlay and a query navigates to a section', async ({ page }) => {
    await page.goto('/science');
    await openSearchButton(page);
    // Dialog opens.
    const dialog = page.getByRole('dialog', { name: /Search \/science/i });
    await expect(dialog).toBeVisible();
    // Type a query that hits a unique section.
    await page.locator('input[type="search"]').fill('vis-viva');
    // First result should be Vis-Viva Equation.
    const firstResult = page.locator('a.result').first();
    await expect(firstResult).toContainText('Vis-Viva Equation');
    await firstResult.click();
    await expect(page).toHaveURL(/\/science\/orbits\/vis-viva\/?$/);
  });

  test('escape closes the overlay', async ({ page }) => {
    await page.goto('/science');
    await openSearchButton(page);
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).not.toBeVisible();
  });
});
