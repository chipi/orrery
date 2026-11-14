import { test, expect, type Page } from '@playwright/test';

/**
 * E4 (UXD-035): the /fleet view toggle (GRID / LINE-UP) and the one Missions list per entry
 * (panel tab, OVERVIEW button, /fleet/<id>).
 */

async function openPanel(page: Page, id: string) {
  await page.goto(`/fleet?id=${id}`);
  const panel = page.locator('aside.panel');
  await expect(panel).toBeVisible({ timeout: 10_000 });
  return panel;
}

async function openMissionsTab(page: Page, id: string) {
  const panel = await openPanel(page, id);
  await panel.getByRole('tab', { name: /MISSIONS/i }).click();
  await expect(panel.locator('.missions-list > li').first()).toBeVisible({ timeout: 10_000 });
  return panel;
}

test.describe('/fleet view toggle', () => {
  test('GRID and LINE-UP are one radiogroup on the FILTERS row; the kind group shows only in LINE-UP', async ({
    page,
  }) => {
    await page.goto('/fleet');
    const view = page.getByRole('radiogroup', { name: 'View' });
    await expect(view).toBeVisible({ timeout: 10_000 });
    await expect(view.getByRole('radio', { name: 'Grid' })).toBeChecked();
    await expect(
      page.locator('.filters-bar').getByRole('radiogroup', { name: 'View' }),
    ).toHaveCount(1);
    await expect(page.getByRole('radio', { name: 'Launchers' })).toHaveCount(0);

    await view.getByRole('radio', { name: 'Line-up' }).click();
    await expect(page).toHaveURL(/view=lineup/);
    await expect(page).toHaveURL(/kind=launchers/);
    await expect(page.locator('section.lineup canvas')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole('radio', { name: 'Launchers' })).toBeChecked();
    // Disabled, not removed: nothing on the row moves.
    await expect(page.locator('.filters-strip')).toBeDisabled();

    await page.getByRole('radio', { name: /Capsules/ }).click();
    await expect(page).toHaveURL(/kind=spacecraft/);
    await expect(page).not.toHaveURL(/category=/);

    await view.getByRole('radio', { name: 'Grid' }).click();
    await expect(page).not.toHaveURL(/view=lineup/);
    await expect(page).not.toHaveURL(/kind=/);
    await expect(page.locator('.fleet-grid .card').first()).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('.filters-strip')).toBeEnabled();
    await expect(page.getByRole('radio', { name: 'Launchers' })).toHaveCount(0);
  });

  test('leaving the line-up leaves the category filter as it was', async ({ page }) => {
    await page.goto('/fleet?category=rover');
    await page.getByRole('radio', { name: 'Line-up' }).click();
    await expect(page.locator('section.lineup canvas')).toBeVisible({ timeout: 15_000 });
    await page.getByRole('radio', { name: 'Grid' }).click();
    await expect(page).toHaveURL(/category=rover/);
  });

  test('an old ?category=launcher&view=lineup link still opens the launcher line-up', async ({
    page,
  }) => {
    await page.goto('/fleet?category=launcher&view=lineup');
    await expect(page.locator('section.lineup canvas')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole('radio', { name: 'Line-up' })).toBeChecked();
    await expect(page.getByRole('radio', { name: 'Launchers' })).toBeChecked();
    await page.goto('/fleet?category=crewed-spacecraft&view=lineup');
    await expect(page.getByRole('radio', { name: /Capsules/ })).toBeChecked({ timeout: 15_000 });
  });
});

test.describe('the Missions list of a fleet entry', () => {
  test('Crew Dragon: 5 rows, 2 links, crew as names, no portrait or placeholder', async ({
    page,
  }) => {
    const panel = await openPanel(page, 'crew-dragon');
    const cta = panel.getByTestId('fleet-mission-cta-multi');
    await expect(cta).toContainText('5 missions');
    await cta.click();
    const rows = panel.locator('.missions-list > li');
    await expect(rows).toHaveCount(5);
    // The tab, the OVERVIEW button and the rows are one count.
    await expect(panel.getByRole('tab', { name: /MISSIONS/i })).toBeVisible();
    await expect(panel.getByRole('tab', { name: /CREW/i })).toHaveCount(0);
    await expect(panel.getByTestId('fleet-missions-summary')).toHaveText(
      /5 missions · 2 in the catalogue/,
    );
    const links = panel.locator('.missions-list a.mission-link');
    await expect(links).toHaveCount(2);
    await expect(links.nth(0)).toHaveAttribute('href', /\/missions\?id=inspiration4$/);
    await expect(links.nth(1)).toHaveAttribute('href', /\/missions\?id=polaris-dawn$/);
    await expect(
      panel.locator('a[href*="demo-2"], a[href*="crew-1"], a[href*="crew-9"]'),
    ).toHaveCount(0);
    await expect(panel.locator('.crew-portrait-empty, .crew-grid, img.patch')).toHaveCount(0);
    await expect(panel.locator('.mission-crew img')).toHaveCount(0);
    await expect(panel.locator('.mission-crew').first()).toContainText('Hurley');
  });

  test('Gemini: 10 rows, 6 of them links; Soyuz 7K-OK: 7 rows, 3 links', async ({ page }) => {
    let panel = await openMissionsTab(page, 'gemini');
    await expect(panel.locator('.missions-list > li')).toHaveCount(10);
    await expect(panel.locator('.missions-list a.mission-link')).toHaveCount(6);
    panel = await openMissionsTab(page, 'soyuz-7k-ok');
    await expect(panel.locator('.missions-list > li')).toHaveCount(7);
    await expect(panel.locator('.missions-list a.mission-link')).toHaveCount(3);
  });

  test('every link in the tab opens a mission that exists', async ({ page }) => {
    const index = (await (await page.request.get('/data/missions/index.json')).json()) as {
      id: string;
    }[];
    const ids = new Set(index.map((m) => m.id));
    for (const id of ['crew-dragon', 'gemini', 'soyuz-7k-ok', 'space-shuttle-orbiter']) {
      const panel = await openMissionsTab(page, id);
      const hrefs = await panel
        .locator('.missions-list a')
        .evaluateAll((as) =>
          as.map((a) => new URL((a as HTMLAnchorElement).href).searchParams.get('id')),
        );
      expect(hrefs.length, id).toBeGreaterThan(0);
      for (const h of hrefs) expect(ids.has(h ?? ''), `${id}: ${h}`).toBe(true);
    }
  });

  test('an entry with one mission prints its name on the OVERVIEW button, not its id', async ({
    page,
  }) => {
    const panel = await openPanel(page, 'change-3');
    const cta = panel.getByTestId('fleet-mission-cta-single');
    await expect(cta).toHaveAttribute('href', /\/missions\?id=change3$/);
    await expect(cta.locator('.spec-value')).toContainText(/Chang/, { timeout: 10_000 });
    await expect(cta.locator('.spec-value')).not.toHaveText('change3');
    await expect(panel.getByRole('tab', { name: /MISSIONS/i })).toHaveCount(0);
  });

  test('/fleet/crew-dragon lists the same 5 rows under one Missions heading', async ({ page }) => {
    await page.goto('/fleet/crew-dragon');
    const section = page.locator('section.missions');
    await expect(section.getByRole('heading', { name: /MISSIONS/i })).toBeVisible();
    await expect(section.locator('li')).toHaveCount(5);
    await expect(section.locator('a')).toHaveCount(2);
    await expect(page.locator('section.crew')).toHaveCount(0);
    await expect(section).toContainText('Hurley');
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
  });
});
