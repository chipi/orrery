import { test, expect, type Page } from '@playwright/test';

/**
 * The welcome hint (C8, E1 on /explore, W1 on the four Worlds, UXD-027): one dismissible line
 * inviting a zoom. It shows on load, goes after the first wheel turn on the canvas or its own ×,
 * and is not remembered (it is back on the next visit). The 12 s timeout is the constant in
 * `hint-state.ts`, covered by its unit test.
 */

const ROUTES: Array<{ path: string; testid: string; text: RegExp }> = [
  { path: '/explore', testid: 'explore-hint', text: /through the 8 scales/ },
  { path: '/earth', testid: 'surface-hint', text: /Zoom in to explore/ },
  { path: '/moon', testid: 'surface-hint', text: /Zoom in to explore/ },
  { path: '/mars', testid: 'surface-hint', text: /Zoom in to explore/ },
  { path: '/venus', testid: 'surface-hint', text: /Zoom in to explore/ },
];

// No hydration wait: the hint's 12 s run from its mount, so a slow page must be checked at once.
async function load(page: Page, path: string, testid: string): Promise<void> {
  await page.goto(path);
  await expect(page.getByTestId(testid)).toBeVisible({ timeout: 40_000 });
}

/** The page centre, once the canvas (not a loading layer) is the element under it. */
async function centreOverCanvas(page: Page): Promise<{ x: number; y: number }> {
  const vp = page.viewportSize()!;
  const x = vp.width / 2;
  const y = vp.height / 2;
  await expect
    .poll(() => page.evaluate(([px, py]) => document.elementFromPoint(px, py)?.tagName, [x, y]), {
      timeout: 40_000,
    })
    .toBe('CANVAS');
  return { x, y };
}

test.describe.configure({ timeout: 90_000 });

// The hint never sits under the scale readout, the time dock or the rest of the bottom HUD.
for (const size of [
  { width: 1440, height: 900 },
  { width: 1280, height: 720 },
  { width: 1024, height: 768 },
]) {
  test.describe(`hint clear of the HUD — ${size.width}x${size.height}`, () => {
    test.use({ viewport: size, hasTouch: false, isMobile: false });

    test('/explore: its box meets no other HUD part', async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== 'desktop-chromium', 'a pointer window');
      await load(page, '/explore', 'explore-hint');
      const hint = await page.getByTestId('explore-hint').boundingBox();
      expect(hint).not.toBeNull();
      const parts = ['.scale-strip', '.time-controls', '.scales-dock', '.ruler', '.footer-menu'];
      for (const sel of parts) {
        const el = page.locator(sel).first();
        const b = (await el.isVisible()) ? await el.boundingBox() : null;
        if (!b || !hint) continue;
        const meets =
          hint.x < b.x + b.width &&
          hint.x + hint.width > b.x &&
          hint.y < b.y + b.height &&
          hint.y + hint.height > b.y;
        expect(meets, `hint ${JSON.stringify(hint)} meets ${sel} ${JSON.stringify(b)}`).toBe(false);
      }
    });

    test('/explore?id=venus: no hint beside the docked panel', async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== 'desktop-chromium', 'a pointer window');
      await page.goto('/explore?id=venus');
      await expect(page.locator('aside.panel').first()).toBeVisible({ timeout: 40_000 });
      await expect(page.getByTestId('explore-hint')).toHaveCount(0, { timeout: 10_000 });
    });
  });
}

test.describe('welcome hint', () => {
  for (const r of ROUTES) {
    test(`${r.path}: shows, goes on a wheel turn over the canvas, and returns next visit`, async ({
      page,
    }) => {
      await load(page, r.path, r.testid);
      const hint = page.getByTestId(r.testid);
      await expect(hint).toHaveText(r.text);
      await expect(hint).toHaveAttribute('role', 'status');

      const { x, y } = await centreOverCanvas(page);
      await page.mouse.move(x, y);
      await page.mouse.wheel(0, -120);
      await expect(hint).toHaveCount(0, { timeout: 5_000 });

      await load(page, r.path, r.testid);
    });
  }

  test('the × closes it', async ({ page }) => {
    await load(page, '/explore', 'explore-hint');
    const hint = page.getByTestId('explore-hint');
    // The × is in the prerendered HTML before the page hydrates and a click then does nothing,
    // so click until it takes (the hint is also gone after 12 s, which counts as closed).
    await expect(async () => {
      if ((await hint.count()) > 0)
        await page.getByTestId('explore-hint-close').click({ timeout: 2_000 });
      await expect(hint).toHaveCount(0, { timeout: 1_500 });
    }).toPass({ timeout: 30_000 });
  });

  test('a press that moves under 6 px keeps it, the drag it turns into closes it', async ({
    page,
  }) => {
    await load(page, '/moon', 'surface-hint');
    const { x, y } = await centreOverCanvas(page);
    // One gesture, never released as a click: a click on the Moon would select a site.
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x + 3, y + 2);
    await expect(page.getByTestId('surface-hint')).toBeVisible();
    await page.mouse.move(x + 60, y + 20, { steps: 6 });
    await page.mouse.up();
    await expect(page.getByTestId('surface-hint')).toHaveCount(0, { timeout: 5_000 });
  });

  test('/explore does not draw it beside a docked side panel', async ({ page }, testInfo) => {
    test.skip(
      testInfo.project.name !== 'desktop-chromium',
      'the panel docks at the right on a desktop window',
    );
    await page.goto('/explore?id=jupiter');
    await expect(page.locator('aside.panel').first()).toBeVisible({ timeout: 40_000 });
    await expect(page.getByTestId('explore-hint')).toHaveCount(0);
  });

  test('/explore: the hint does not come back when the docked panel is closed', async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-chromium', 'the panel docks at the right');
    await page.goto('/explore?id=jupiter');
    const panel = page.locator('aside.panel').first();
    await expect(panel).toBeVisible({ timeout: 40_000 });
    await expect(page.getByTestId('explore-hint')).toHaveCount(0);
    await panel.locator('.panel-close').first().click();
    await expect(panel).toBeHidden({ timeout: 15_000 });
    // Once seen (here: shown at load, then covered by the panel), it must not reappear.
    await page.waitForTimeout(1_500);
    await expect(page.getByTestId('explore-hint')).toHaveCount(0);
  });
});
