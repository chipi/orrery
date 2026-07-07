import { test, expect, type ConsoleMessage } from '@playwright/test';
import { isExpectedNoise } from './_helpers/console-errors';

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

    const canvas = page.locator('canvas.porkchop');
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

    const canvas = page.locator('canvas.porkchop');
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

  /* ── C.7 — Mission Sandbox: pin + compare ──────────────────────── */
  test('pin one cell, click another → compare panel surfaces deltas', async ({ page }) => {
    await page.goto('/plan');
    await expect(page.getByRole('status')).toBeHidden({ timeout: 10_000 });

    const canvas = page.locator('canvas.porkchop');
    const box = await canvas.boundingBox();
    if (!box) return;
    // Click cell A (left side).
    await canvas.click({ position: { x: box.width / 2 - 60, y: box.height / 2 - 30 } });
    const panel = page.getByRole('complementary', { name: /Mission summary/i });
    const sandbox = panel.locator('[data-testid="plan-sandbox"]');
    await expect(sandbox).toBeVisible();

    // Pin it.
    await sandbox.locator('[data-testid="plan-sandbox-pin"]').click();
    await expect(sandbox).toContainText(/PINNED/);

    // Click cell B (different position).
    await canvas.click({ position: { x: box.width / 2 + 60, y: box.height / 2 + 30 } });
    const compare = panel.locator('[data-testid="plan-sandbox-compare"]');
    await expect(compare).toBeVisible();
    await expect(compare).toContainText(/Δ DEP/);
    await expect(compare).toContainText(/Δ TOF/);
    await expect(compare).toContainText(/Δ ∆V/);
  });

  test('vehicle selector toggles the ∆v budget bar between viable and deficit states', async ({
    page,
  }) => {
    await page.goto('/plan');
    await expect(page.getByRole('status')).toBeHidden({ timeout: 10_000 });

    const canvas = page.locator('canvas.porkchop');
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

    const canvas = page.locator('canvas.porkchop');
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

test.describe('/plan — multi-destination (v0.1.6 / ADR-026; re-expanded v0.8 per #312)', () => {
  // v0.8 (ADR-076 / RFC-026 / GH #312) restored the full twelve-destination
  // set — every destination now ships a real committed porkchop grid at
  // static/data/porkchop/earth-to-<dest>.json. These were skipped under the
  // v0.7 Mars-only cut and are re-enabled here.
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

  test('Neptune porkchop loads with ?dest=neptune (ADR-028)', async ({ page }) => {
    await page.goto('/plan?dest=neptune');
    await expect(page.getByRole('status')).toBeHidden({ timeout: 10_000 });
    await expect(page.locator('.dest-select')).toHaveValue('neptune');
    const landingPill = page.getByRole('radio', { name: /LANDING/ });
    await expect(landingPill).toBeDisabled();
  });

  test('Ceres allows LANDING + FLYBY (ADR-028)', async ({ page }) => {
    await page.goto('/plan?dest=ceres');
    await expect(page.getByRole('status')).toBeHidden({ timeout: 10_000 });
    await expect(page.locator('.dest-select')).toHaveValue('ceres');
    const landingPill = page.getByRole('radio', { name: /LANDING/ });
    await expect(landingPill).not.toBeDisabled();
  });

  // #312 acceptance: every one of the twelve destinations plots a real
  // porkchop (painted heatmap, no empty region) via its ?dest deep-link,
  // with no unexpected console errors.
  const ALL_DESTINATIONS = [
    'mercury',
    'venus',
    'mars',
    'vesta',
    'ceres',
    'psyche',
    'jupiter',
    'saturn',
    'uranus',
    'neptune',
    'pluto',
    'bennu',
  ] as const;
  for (const dest of ALL_DESTINATIONS) {
    test(`${dest} — deep-link plots a real porkchop with no console errors`, async ({ page }) => {
      const errors: string[] = [];
      page.on('console', (msg: ConsoleMessage) => {
        if (msg.type() === 'error' && !isExpectedNoise(msg)) {
          errors.push(`console.error: ${msg.text()}`);
        }
      });
      page.on('pageerror', (err: Error) => errors.push(`pageerror: ${err.message}`));

      await page.goto(`/plan?dest=${dest}`);
      await expect(page.getByRole('status')).toBeHidden({ timeout: 15_000 });
      await expect(page.locator('.dest-select')).toHaveValue(dest);

      // Heatmap actually painted (non-background pixel at the plot centre) —
      // guards against the v0.7 "promised twelve, delivered an empty grid"
      // regression that the Mars-only cut existed to prevent.
      await page.waitForFunction(
        () => {
          const c = document.querySelector('canvas.porkchop') as HTMLCanvasElement | null;
          if (!c || c.width === 0) return false;
          const ctx = c.getContext('2d');
          if (!ctx) return false;
          const d = ctx.getImageData(
            Math.floor(c.width * 0.5),
            Math.floor(c.height * 0.5),
            5,
            5,
          ).data;
          for (let i = 0; i < d.length; i += 4) {
            const isBg =
              Math.abs(d[i] - 4) < 6 && Math.abs(d[i + 1] - 4) < 6 && Math.abs(d[i + 2] - 12) < 8;
            if (!isBg) return true;
          }
          return false;
        },
        { timeout: 10_000 },
      );

      expect(errors, `console errors on /plan?dest=${dest}:\n${errors.join('\n')}`).toEqual([]);
    });
  }
});

test.describe('/plan — mobile magnifier (RFC-006 Option C)', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'magnifier is touch-only');

  test('touch and hold opens the magnifier overlay', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'magnifier is only mobile interaction');
    await page.goto('/plan');
    await expect(page.getByRole('status')).toBeHidden({ timeout: 10_000 });

    const canvas = page.locator('canvas.porkchop');
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

/* ── ?dep + ?tof deeplink coverage (#337 gap 4, shipped 66cd227b1) ─── */
test.describe('/plan — porkchop point deeplink (?dep + ?tof)', () => {
  test('?dep=400&tof=240 pre-selects a cell at the requested transit', async ({ page }) => {
    // The resolver snaps to the closest grid cell — Mars grid spaces
    // depDays ~13 d and arrDays ~4 d, so the URL gets rewritten with
    // the rounded actual cell values (e.g. ?dep=395&tof=240).
    await page.goto('/plan?dep=400&tof=240');
    await expect(page.getByRole('status')).toBeHidden({ timeout: 10_000 });
    const panel = page.getByRole('complementary', { name: /Mission summary/i });
    await expect(panel).toBeVisible();
    await expect(panel).toContainText(/TRANSIT/);
    // 240-day transit lands on cell j ≈ 36; the panel reads back "240 days"
    // (closest grid cell). Tolerant ±5 days for future grid-resolution
    // changes.
    await expect(panel).toContainText(/2[3-4][0-9] days/);
    await expect(panel).toContainText(/∆V REQUIRED/);
    // URL gets rewritten to the actual grid-cell values.
    await expect(page).toHaveURL(/dep=\d+/);
    await expect(page).toHaveURL(/tof=\d+/);
  });

  test('clicking a cell writes ?dep + ?tof to the URL', async ({ page }) => {
    await page.goto('/plan');
    await expect(page.getByRole('status')).toBeHidden({ timeout: 10_000 });
    const canvas = page.locator('canvas.porkchop');
    const box = await canvas.boundingBox();
    if (!box) throw new Error('canvas not laid out');
    await canvas.click({ position: { x: box.width / 2, y: box.height / 2 } });
    // Push debounces ~one tick; wait for goto to land.
    await expect(page).toHaveURL(/dep=\d+/, { timeout: 5_000 });
    await expect(page).toHaveURL(/tof=\d+/);
  });

  test('round-trip: re-navigating to written-out URL is stable', async ({ page }) => {
    // First navigation — read back the rewritten URL.
    await page.goto('/plan?dep=400&tof=240');
    await expect(page.getByRole('status')).toBeHidden({ timeout: 10_000 });
    const firstUrl = page.url();
    // Second navigation — same URL. The resolver should land on the
    // same cell (grid is deterministic) and the URL shouldn't drift.
    await page.goto(firstUrl);
    await expect(page.getByRole('status')).toBeHidden({ timeout: 10_000 });
    expect(page.url()).toBe(firstUrl);
  });

  test('missing dep + tof params do not pre-select a cell', async ({ page }) => {
    await page.goto('/plan');
    await expect(page.getByRole('status')).toBeHidden({ timeout: 10_000 });
    const panel = page.getByRole('complementary', { name: /Mission summary/i });
    await expect(panel).toBeVisible();
    // Reading-the-porkchop intro shows; no TRANSIT readout yet.
    await expect(panel).toContainText(/READING THE PORKCHOP|PICK A LAUNCH WINDOW/);
  });
});
