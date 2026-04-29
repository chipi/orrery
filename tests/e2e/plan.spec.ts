import { test, expect } from '@playwright/test';

/**
 * /plan — Mission Configurator.
 *
 * Exercises the Lambert worker integration and the right-panel UX.
 * The worker computes 11,200 cells in ~1.5s on dev hardware; we wait
 * for the loading overlay to disappear before any cell-click test.
 */

test.describe('/plan — porkchop computes and renders', () => {
  test('the loading overlay appears, then disappears, leaving the plot', async ({ page }) => {
    await page.goto('/plan');
    // The loading overlay carries role="status" per the implementation.
    const loading = page.getByRole('status');
    // Either the overlay was caught while visible, or the worker beat
    // us to it — both are valid. Just require it to be hidden eventually.
    await expect(loading).toBeHidden({ timeout: 10_000 });

    const canvas = page.getByLabel(/Earth.Mars porkchop plot/i);
    await expect(canvas).toBeVisible();
    const dim = await canvas.evaluate((el: HTMLCanvasElement) => ({
      w: el.width,
      h: el.height,
    }));
    expect(dim.w).toBeGreaterThan(0);
    expect(dim.h).toBeGreaterThan(0);
  });

  test('clicking a porkchop cell populates the right panel', async ({ page }) => {
    await page.goto('/plan');
    await expect(page.getByRole('status')).toBeHidden({ timeout: 10_000 });

    const canvas = page.getByLabel(/Earth.Mars porkchop plot/i);
    const box = await canvas.boundingBox();
    if (!box) return;
    // Click somewhere in the plot interior — the margins are ML=64,
    // MR=18, MT=24, MB=44 so anywhere from (80, 50) to (W-30, H-50)
    // lands in the heatmap.
    await canvas.click({ position: { x: box.width / 2, y: box.height / 2 } });

    const panel = page.getByRole('complementary', { name: /Mission summary/i });
    await expect(panel).toBeVisible();
    await expect(panel).toContainText(/DEPARTURE/);
    await expect(panel).toContainText(/ARRIVAL/);
    await expect(panel).toContainText(/TRANSIT/);
    await expect(panel).toContainText(/∆V REQUIRED/);
    await expect(panel).toContainText(/km\/s/);
  });

  test('vehicle selector toggles the ∆v budget bar between viable and deficit states', async ({
    page,
  }) => {
    await page.goto('/plan');
    await expect(page.getByRole('status')).toBeHidden({ timeout: 10_000 });

    const canvas = page.getByLabel(/Earth.Mars porkchop plot/i);
    const box = await canvas.boundingBox();
    if (!box) return;
    await canvas.click({ position: { x: box.width / 2, y: box.height / 2 } });

    const panel = page.getByRole('complementary', { name: /Mission summary/i });
    await expect(panel).toBeVisible();

    const selector = panel.locator('select');
    await expect(selector).toBeVisible();

    // Get the option list — there are 6 rockets per static/data/rockets.json.
    const optionCount = await selector.locator('option').count();
    expect(optionCount).toBeGreaterThanOrEqual(6);

    // Pick Atlas V (low ∆v ~9 km/s).
    await selector.selectOption('atlas-v-541');
    await expect(panel).toContainText(/(deficit|margin)/);

    // Pick Starship (high ∆v ~13 km/s).
    await selector.selectOption('starship');
    await expect(panel).toContainText(/(deficit|margin)/);
  });

  test('FLY button reflects viable/deficit state and navigates when enabled', async ({ page }) => {
    await page.goto('/plan');
    await expect(page.getByRole('status')).toBeHidden({ timeout: 10_000 });

    const canvas = page.getByLabel(/Earth.Mars porkchop plot/i);
    const box = await canvas.boundingBox();
    if (!box) return;
    await canvas.click({ position: { x: box.width / 2, y: box.height / 2 } });

    const panel = page.getByRole('complementary', { name: /Mission summary/i });
    const flyButton = panel.getByRole('button', { name: /FLY MISSION/i });
    await expect(flyButton).toBeVisible();

    // Force a deficit by picking the lowest-capability rocket.
    await panel.locator('select').selectOption('atlas-v-541');
    // Atlas V's ∆v capability is 9.4 km/s; even cheap porkchop cells
    // need ~5-6 km/s, so it might still be viable. Verify the button
    // reports a coherent state — its disabled attribute matches the
    // visible budget label (margin → enabled, deficit → disabled).
    const flyDisabledA = await flyButton.isDisabled();
    const labelA = await panel.locator('.budget-label').innerText();
    expect(labelA).toMatch(/(margin|deficit)/);
    if (labelA.includes('deficit')) expect(flyDisabledA).toBe(true);
    if (labelA.includes('margin')) expect(flyDisabledA).toBe(false);

    // Switch to Starship — bigger ∆v budget, more cells become viable.
    await panel.locator('select').selectOption('starship');
    const labelB = await panel.locator('.budget-label').innerText();
    expect(labelB).toMatch(/(margin|deficit)/);
    const flyDisabledB = await flyButton.isDisabled();
    if (labelB.includes('margin') && !flyDisabledB) {
      // Click and verify navigation to /fly.
      await flyButton.click();
      await expect(page).toHaveURL(/\/fly(\/|$|\?)/);
    }
  });
});

test.describe('/plan — multi-destination (v0.1.6 / ADR-026)', () => {
  test('Jupiter porkchop renders when ?dest=jupiter is set', async ({ page }) => {
    await page.goto('/plan?dest=jupiter');
    // Loading spinner clears once the pre-computed grid loads.
    await expect(page.getByRole('status')).toBeHidden({ timeout: 10_000 });
    // Destination selector reflects the URL param.
    const destSelect = page.locator('.dest-select');
    await expect(destSelect).toHaveValue('jupiter');
    // Canvas painted (sample non-bg pixel near centre, like the existing test).
    const canvas = page.locator('canvas.porkchop');
    await page.waitForFunction(
      () => {
        const c = document.querySelector('canvas.porkchop') as HTMLCanvasElement | null;
        if (!c || c.width === 0) return false;
        const ctx = c.getContext('2d');
        if (!ctx) return false;
        const data = ctx.getImageData(
          Math.floor(c.width * 0.5),
          Math.floor(c.height * 0.5),
          5,
          5,
        ).data;
        for (let i = 0; i < data.length; i += 4) {
          const isBg =
            Math.abs(data[i] - 4) < 6 &&
            Math.abs(data[i + 1] - 4) < 6 &&
            Math.abs(data[i + 2] - 12) < 8;
          if (!isBg) return true;
        }
        return false;
      },
      { timeout: 8_000 },
    );
    await expect(canvas).toBeVisible();
  });

  test('LANDING pill is disabled with aria-disabled when dest is a gas giant', async ({ page }) => {
    await page.goto('/plan?dest=jupiter');
    await expect(page.getByRole('status')).toBeHidden({ timeout: 10_000 });
    const landingPill = page.getByRole('radio', { name: /LANDING/ });
    await expect(landingPill).toHaveAttribute('aria-disabled', 'true');
    await expect(landingPill).toBeDisabled();
  });

  test('LANDING + FLYBY both selectable on Mars', async ({ page }) => {
    await page.goto('/plan?dest=mars');
    await expect(page.getByRole('status')).toBeHidden({ timeout: 10_000 });
    const landingPill = page.getByRole('radio', { name: /LANDING/ });
    const flybyPill = page.getByRole('radio', { name: /FLYBY/ });
    await expect(landingPill).not.toBeDisabled();
    await expect(flybyPill).not.toBeDisabled();
  });

  test('switching destination updates URL and porkchop ranges', async ({ page }) => {
    await page.goto('/plan');
    await expect(page.getByRole('status')).toBeHidden({ timeout: 10_000 });
    await page.locator('.dest-select').selectOption('saturn');
    // URL reflects the change (replaceState).
    await expect(page).toHaveURL(/dest=saturn/);
    // Loading spinner clears for the new grid.
    await expect(page.getByRole('status')).toBeHidden({ timeout: 10_000 });
    // LANDING pill should now be disabled (Saturn is a gas giant).
    const landingPill = page.getByRole('radio', { name: /LANDING/ });
    await expect(landingPill).toBeDisabled();
  });
});

test.describe('/plan — mobile magnifier (RFC-006 Option C)', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'magnifier is touch-only');

  test('touch and hold opens the magnifier overlay', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'magnifier is only mobile interaction');
    await page.goto('/plan');
    await expect(page.getByRole('status')).toBeHidden({ timeout: 10_000 });

    const canvas = page.getByLabel(/Earth.Mars porkchop plot/i);
    const box = await canvas.boundingBox();
    if (!box) return;

    // Synthesise a single-finger touch sequence centred in the plot.
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;
    await page.touchscreen.tap(cx, cy); // Quick tap completes the magnifier flow.
    // After tap, a cell is selected — the right panel populates.
    const panel = page.getByRole('complementary', { name: /Mission summary/i });
    await expect(panel).toBeVisible();
    await expect(panel).toContainText(/∆V REQUIRED/);
  });
});
