import { test, expect } from '@playwright/test';

/**
 * Surface object index (searchable orbit/land list for /mars, /moon, /earth).
 *
 * Desktop opens it via the left-edge INDEX handle; a landscape phone via the
 * Index drawer tab. A row click routes through selectSite(id, {face:true}),
 * which flies the camera + opens the shared detail panel (aside.panel).
 */
test.describe('surface object index', () => {
  test('desktop: edge-handle opens the list, search narrows it, a row opens detail', async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-chromium', 'desktop-only affordance');
    await page.goto('/mars', { waitUntil: 'networkidle' });

    // The vertical edge-handle toggles the desktop index panel.
    await page.locator('[data-testid="surface-index-toggle"]').click();
    const list = page.locator('[data-testid="surface-index-list"]');
    await expect(list).toBeVisible();
    // Mars carries well over a handful of sites + orbiters.
    expect(await list.locator('.sidx-row').count()).toBeGreaterThan(3);

    // Free-text search narrows to the matching row.
    await page.locator('[data-testid="surface-index-search"]').fill('curiosity');
    const row = list.locator('.sidx-row', { hasText: /curiosity/i }).first();
    await expect(row).toBeVisible();

    // Clicking a row opens the shared detail panel for that object.
    await row.click();
    const panel = page.locator('aside.panel');
    await expect(panel).toBeVisible({ timeout: 10_000 });
    await expect(panel).toContainText(/curiosity/i);
  });

  test('desktop: the orbit/land filter splits the list', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-chromium', 'desktop-only affordance');
    await page.goto('/mars', { waitUntil: 'networkidle' });
    await page.locator('[data-testid="surface-index-toggle"]').click();
    const list = page.locator('[data-testid="surface-index-list"]');
    await expect(list).toBeVisible();
    const all = await list.locator('.sidx-row').count();

    // Mars has both surface craft and orbiters → the orbit/land toggle shows.
    const orbitChip = page.getByRole('radio', { name: /in orbit/i }).first();
    await expect(orbitChip).toBeVisible();
    await orbitChip.click();
    const orbitOnly = await list.locator('.sidx-row').count();
    expect(orbitOnly).toBeGreaterThan(0);
    expect(orbitOnly).toBeLessThan(all);
  });

  test('a site dot is its nation colour, the legend swatch colour; the meta line says orbit or land (WM3)', async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name === 'mobile-chromium',
      'the index is a desktop and landscape tab',
    );
    await page.goto('/moon', { waitUntil: 'networkidle' });
    await page.locator('[data-testid="surface-index-toggle"]').click();
    const list = page.locator('[data-testid="surface-index-list"]');
    await expect(list).toBeVisible();

    const rgb = (hex: string) => {
      const n = parseInt(hex.slice(1), 16);
      return `rgb(${n >> 16}, ${(n >> 8) & 255}, ${n & 255})`;
    };
    // Every moon site has a photo (L45): the nation colour is the ring of the round thumb.
    const dot = (id: string) =>
      list.locator(`.sidx-row[data-index-id="${id}"] img.entity-thumb`).evaluate((el) => {
        const cs = getComputedStyle(el);
        return { bg: cs.borderTopColor, ring: cs.borderTopStyle };
      });
    // The meta wraps only after a " · ": no-break spaces inside each part, read here as spaces.
    const meta = async (id: string) =>
      (await list.locator(`.sidx-row[data-index-id="${id}"] .row-meta`).innerText()).replaceAll(
        ' ',
        ' ',
      );

    await expect(list.locator('.sidx-row[data-index-id="change4"]')).toHaveCount(1);
    const china = await dot('change4');
    expect(china.bg).toBe(rgb('#DE2910'));
    expect(china.ring).not.toBe('none');
    expect((await dot('apollo11')).bg).toBe(rgb('#0B3D91'));
    expect((await dot('luna9')).bg).toBe(rgb('#8B0000'));
    expect((await dot('luna10')).bg).toBe(rgb('#8B0000'));

    expect(await meta('apollo11')).toMatch(/1969 · .+ · ON LAND$/);
    expect(await meta('luna10')).toMatch(/ · IN ORBIT$/);

    if (testInfo.project.name === 'desktop-chromium') {
      // The legend swatch of China is drawn from the same palette: one colour, not two.
      const tone = await page
        .getByTestId('legend-nation-China')
        .first()
        .evaluate((el) => getComputedStyle(el).getPropertyValue('--chip-tone').trim());
      expect(rgb(tone)).toBe(china.bg);
    }
  });

  test('a row carries the round photo of its panel hero, ringed in the nation colour; a blocked file falls back to the dot; a closed index fetches none (L45, T2)', async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name === 'mobile-chromium',
      'the index is a desktop and landscape tab',
    );
    const thumbs: string[] = [];
    page.on('request', (r) => {
      if (r.url().includes('/credit-thumbs/')) thumbs.push(r.url());
    });
    await page.route('**/credit-thumbs/images/missions/apollo12/**', (r) => r.abort());
    await page.goto('/moon', { waitUntil: 'networkidle' });
    const toggle = page.locator('[data-testid="surface-index-toggle"]');
    await page.waitForSelector('html[data-hydrated]', { state: 'attached', timeout: 45_000 });
    await expect(toggle).toBeVisible({ timeout: 45_000 });
    await page.waitForTimeout(1500);
    expect(thumbs, 'a closed index loads no lazy image').toHaveLength(0);
    await toggle.click();
    const list = page.locator('[data-testid="surface-index-list"]');
    await expect(list).toBeVisible();
    const row = (id: string) => list.locator(`.sidx-row[data-index-id="${id}"]`);

    // 28 of 28 moon sites have a photo; Apollo 12's is blocked above, so 27 images and one dot.
    await expect(list.locator('.sidx-row img.entity-thumb')).toHaveCount(27);
    await expect(row('apollo12').locator('.entity-thumb-dot')).toHaveCount(1);
    await expect(row('apollo12').locator('img.entity-thumb')).toHaveCount(0);

    // Apollo 16: the blessed slot of the mission folder its panel shows (06), not slot 01.
    const img = row('apollo16').locator('img.entity-thumb');
    await expect(img).toHaveAttribute(
      'src',
      /\/credit-thumbs\/images\/missions\/apollo16\/06\.1x1\.webp$/,
    );
    await expect(img).toHaveAttribute('alt', '');
    await expect(img).toHaveAttribute('loading', 'lazy');
    expect(await img.boundingBox()).toMatchObject({ width: 28, height: 28 });
    expect(await img.evaluate((el) => getComputedStyle(el).borderTopColor)).toBe(
      'rgb(11, 61, 145)',
    );

    // Names start at one x for a row with a photo and a row with the dot.
    const x = async (id: string) => (await row(id).locator('.row-name').boundingBox())!.x;
    expect(Math.abs((await x('apollo12')) - (await x('apollo16')))).toBeLessThan(1);
  });

  test('agency, era and status are folded behind one FILTERS button beside the count; the fold keeps its state and the button its count (C6-F)', async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name === 'mobile-chromium',
      'the index is a desktop and landscape tab',
    );
    await page.goto('/moon', { waitUntil: 'networkidle' });
    await page.waitForSelector('html[data-hydrated]', { state: 'attached', timeout: 45_000 });
    await page.locator('[data-testid="surface-index-toggle"]').click({ timeout: 45_000 });
    const list = page.locator('[data-testid="surface-index-list"]');
    await expect(list).toBeVisible();
    const panel = page.locator('.sidx').filter({ has: list });
    const btn = panel.getByTestId('index-filters-toggle');
    const count = panel.locator('.sidx-count');

    // Closed at the start: the domain chips are on one line, the three groups are not shown.
    await expect(btn).toHaveAttribute('aria-expanded', 'false');
    await expect(panel.getByRole('radio', { name: /in orbit/i })).toBeVisible();
    await expect(panel.getByRole('radio', { name: /^NASA$/ })).toBeHidden();
    await expect(btn.locator('.idx-filters-n')).toHaveCount(0);
    const rows = await list.locator('.sidx-row').count();
    await expect(count).toHaveText(`${rows} / ${rows}`);

    // Open: three labelled groups; a chip in one filters.
    await btn.click();
    await expect(btn).toHaveAttribute('aria-expanded', 'true');
    for (const label of [/^AGENCY$/i, /^ERA$/i, /^STATUS$/i]) {
      await expect(panel.locator('.idx-fold-label').filter({ hasText: label })).toBeVisible();
    }
    await panel.getByRole('radio', { name: /^NASA$/ }).click();
    await expect(count).not.toHaveText(`${rows} / ${rows}`);
    const narrowed = await list.locator('.sidx-row').count();
    expect(narrowed).toBeLessThan(rows);
    await expect(btn.locator('.idx-filters-n')).toHaveText('1');

    // Folding does not change the filter: same rows, the count stays on the closed button.
    await btn.click();
    await expect(panel.getByRole('radio', { name: /^NASA$/ })).toBeHidden();
    expect(await list.locator('.sidx-row').count()).toBe(narrowed);
    await expect(btn.locator('.idx-filters-n')).toHaveText('1');

    // A second group raises the count; keyboard: the button is a Tab stop and Enter opens it.
    await btn.focus();
    await page.keyboard.press('Enter');
    await expect(btn).toHaveAttribute('aria-expanded', 'true');
    await panel.getByRole('radio', { name: /^FLOWN$/i }).click();
    await expect(btn.locator('.idx-filters-n')).toHaveText('2');
  });

  test('phone: a site panel (a full-height sheet) covers the index handle, which does not draw over its text', async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name === 'mobile-landscape-chromium',
      'a landscape sheet is a side drawer',
    );
    // A narrow window with a mouse (390 px) gets the same full-width panel as a phone.
    if (testInfo.project.name === 'desktop-chromium')
      await page.setViewportSize({ width: 390, height: 844 });
    test.slow();
    await page.goto('/moon?site=apollo11');
    await page.waitForSelector('html[data-hydrated]', { state: 'attached', timeout: 45_000 });
    const panel = page.locator('aside.panel');
    await expect(panel).toBeVisible({ timeout: 45_000 });
    const handle = page.locator('.surface-index-handle');
    await expect(handle).toHaveCount(1);
    const covered = await handle.evaluate((el) => {
      const r = el.getBoundingClientRect();
      const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      return !!hit && !el.contains(hit) && !!hit.closest('aside.panel');
    });
    expect(covered, 'the panel text is on top, the handle does not cover it').toBe(true);
  });

  test('landscape phone: the Index pullout tab shows the list', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile-landscape-chromium', 'landscape-only');
    await page.goto('/mars', { waitUntil: 'networkidle' });
    // A1: the object index is a left-edge pullout tab on all viewports (it used
    // to be a bottom-drawer tab on mobile); open it via the same handle as desktop.
    const indexTab = page.locator('[data-testid="surface-index-toggle"]');
    await expect(indexTab).toBeVisible({ timeout: 10_000 });
    await indexTab.click();
    await expect(page.locator('[data-testid="surface-index-list"]')).toBeVisible();
  });
});
