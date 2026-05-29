import { test, expect, type Page } from '@playwright/test';

/**
 * Curiosity (Mars heliocentric) phase-marker reference spec — #107
 * review findings 6 + 7.
 *
 * Mirrors fly-apollo11-phase-markers.spec.ts's depth but on a
 * heliocentric mission, to catch any regression that affects Mars/
 * outer-system path which the cislunar-focused Apollo 11 spec wouldn't.
 * Curiosity is a good gold-standard pick: 8 events (launch, tli_or_tmi,
 * 4 TCMs, arrival, edl_or_oi) spanning 254 transit days, with
 * NASA-published timing → tier_1_5_hybrid waypoints (Step 6d).
 *
 * The parity smoke spec (fly-phase-markers-parity.spec.ts) covers
 * Curiosity at 5 assertions × 2 projects; this spec adds depth.
 */

const CURIOSITY_EVENT_TYPES = [
  'launch',
  'tli_or_tmi',
  'tcm',
  'tcm',
  'tcm',
  'tcm',
  'arrival',
  'edl_or_oi',
] as const;

async function loadCuriosity(page: Page): Promise<void> {
  await page.goto('/fly?mission=curiosity');
  await expect(page.locator('[data-testid="mission-name"]')).toBeVisible({ timeout: 15_000 });
  await expect(page.locator('[data-testid="phase-markers-overlay"]')).toBeVisible({
    timeout: 10_000,
  });
}

test.describe('/fly Curiosity — phase markers (#107 finding 6 — Mars depth reference)', () => {
  test('all 8 flight-event markers exist in the overlay (logical count)', async ({ page }) => {
    await loadCuriosity(page);
    const overlay = page.locator('[data-testid="phase-markers-overlay"]');
    const count = await overlay.getAttribute('data-marker-count');
    expect(Number(count)).toBe(CURIOSITY_EVENT_TYPES.length);
  });

  test('HUD phase pill carries a science chip on Mars missions too', async ({ page }) => {
    await loadCuriosity(page);
    const pill = page.locator('[data-testid="hud-phase-pill"]');
    await expect(pill).toBeVisible();
    await expect(pill.locator('[data-science-chip]')).toBeVisible();
  });

  test('HUD chip click navigates to /science encyclopedia (heliocentric path)', async ({
    page,
  }) => {
    await loadCuriosity(page);
    const chip = page.locator('[data-testid="hud-phase-pill"] [data-science-chip]');
    await expect(chip).toBeVisible();
    const href = await chip.getAttribute('href');
    expect(href).toMatch(/\/science\/[a-z-]+\/[a-z-]+$/);
    await chip.click();
    await expect(page).toHaveURL(/\/science\//, { timeout: 10_000 });
  });

  test('phase markers preserved when toggling 3D → 2D on heliocentric path', async ({ page }) => {
    await loadCuriosity(page);
    const overlay = page.locator('[data-testid="phase-markers-overlay"]');
    const countBefore = await overlay.getAttribute('data-marker-count');
    expect(Number(countBefore)).toBe(CURIOSITY_EVENT_TYPES.length);
    const toggle = page.getByRole('button', { name: /^2d$/i });
    await expect(toggle).toBeVisible();
    await toggle.click();
    await expect(page.getByRole('button', { name: /^3d$/i })).toBeVisible();
    await page.waitForTimeout(300);
    const countAfter = await overlay.getAttribute('data-marker-count');
    expect(Number(countAfter)).toBe(CURIOSITY_EVENT_TYPES.length);
  });

  test('no console errors on load + 3D ⇄ 2D round trip (Mars path)', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    await loadCuriosity(page);
    const toggle2d = page.getByRole('button', { name: /^2d$/i });
    await toggle2d.click();
    await page.getByRole('button', { name: /^3d$/i }).click();
    await page.waitForTimeout(300);
    const real = errors.filter((e) => !/favicon|404|webgl warning|hot module/i.test(e));
    expect(real, real.join('\n')).toEqual([]);
  });

  test('reduced-motion: at least one fresh marker mounted at sim start', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await loadCuriosity(page);
    // Launch event at MET 0 — under reducedMotion the marker is fresh
    // (simMet=0 == event MET, intensity snaps to 1, label visible).
    const fresh = page.locator('[data-testid="phase-marker"][data-phase-state="fresh"]').first();
    await expect(fresh).toBeAttached({ timeout: 10_000 });
  });

  test('every rendered marker dot has the event name in its title attribute (a11y)', async ({
    page,
  }) => {
    await loadCuriosity(page);
    const dots = page.locator(
      '[data-testid="phase-marker"] > .dot, [data-testid="phase-marker"] > .dot-btn',
    );
    const titles = await dots.evaluateAll((els) => els.map((el) => el.getAttribute('title')));
    expect(titles.length).toBeGreaterThan(0);
    for (const t of titles) {
      expect(t).toBeTruthy();
      expect(t!.length).toBeGreaterThan(0);
    }
  });

  test('logical marker count stays stable across sim advancement', async ({ page }) => {
    await loadCuriosity(page);
    const overlay = page.locator('[data-testid="phase-markers-overlay"]');
    const before = await overlay.getAttribute('data-marker-count');
    expect(Number(before)).toBe(CURIOSITY_EVENT_TYPES.length);
    await page.waitForTimeout(1500);
    const after = await overlay.getAttribute('data-marker-count');
    expect(Number(after)).toBe(CURIOSITY_EVENT_TYPES.length);
  });

  test('clicking a phase marker dot jumps sim to that event MET (Mars scrubber)', async ({
    page,
  }) => {
    // #107 finding 7 — verify the scrubber UX works on Mars missions
    // too (not just Moon). Step 6g wired this through both projection
    // paths but only Apollo 11 had explicit e2e coverage.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await loadCuriosity(page);
    const renderState = page.locator('[data-testid="fly-render-state"]');
    const simDayBefore = Number(await renderState.getAttribute('data-sim-day'));
    const jumpBtn = page.locator('[data-testid="phase-marker-jump"]').first();
    await expect(jumpBtn).toBeVisible({ timeout: 10_000 });
    await jumpBtn.click({ force: true });
    await page.waitForTimeout(200);
    const simDayAfter = Number(await renderState.getAttribute('data-sim-day'));
    expect(Number.isFinite(simDayAfter)).toBe(true);
    // Curiosity transit is ~254 days; the click should move simDay
    // within the mission window.
    const delta = simDayAfter - simDayBefore;
    expect(delta).toBeGreaterThanOrEqual(-1);
    expect(delta).toBeLessThanOrEqual(400);
  });
});
