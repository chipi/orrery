import { test, expect, type ConsoleMessage, type Locator, type Page } from '@playwright/test';
import { isExpectedNoise } from './_helpers/console-errors';
import { openDrawerTab } from './_helpers/hud-expand';

function attachConsoleAndError(page: Page) {
  const errors: string[] = [];
  page.on('console', (msg: ConsoleMessage) => {
    if (msg.type() !== 'error') return;
    // Filter expected probe-style 404s (overlay JSON misses, mission
    // thumbnail fallbacks) and browser-noise via the shared helper —
    // the timeline panel loads per-module hero thumbnails on demand
    // and some entries (HTV-X visitor 2025-10-26 etc.) ship without
    // one yet. Real asset misses still fail.
    if (isExpectedNoise(msg)) return;
    errors.push(`console.error: ${msg.text()}`);
  });
  page.on('pageerror', (err: Error) => {
    errors.push(`pageerror: ${err.message}`);
  });
  return errors;
}

test.describe('/iss', () => {
  test('default load has no console errors and shows 3D canvas or HUD toggle', async ({
    page,
    isMobile,
  }) => {
    const errors = attachConsoleAndError(page);
    await page.goto('/iss', { waitUntil: 'networkidle' });
    await expect(page).toHaveTitle(/ISS Explorer/i);
    expect(errors).toEqual([]);
    if (isMobile) {
      // Mobile: view controls live in the MobileDrawerGroup (LIST / ASSEMBLY /
      // MODULES); the desktop iss-view-toggle edge-handle is display:none.
      await expect(page.locator('.mdg-tab').first()).toBeVisible({ timeout: 8_000 });
    } else {
      await expect(page.getByTestId('iss-view-toggle')).toBeVisible({ timeout: 8_000 });
    }
  });

  test('list mode shows module list', async ({ page }) => {
    const errors = attachConsoleAndError(page);
    await page.goto('/iss?view=list', { waitUntil: 'networkidle' });
    await expect(page.getByTestId('iss-list-view')).toBeVisible({ timeout: 8_000 });
    await expect(page.getByRole('heading', { name: /modules/i })).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('module query in list mode opens detail panel', async ({ page }) => {
    const errors = attachConsoleAndError(page);
    await page.goto('/iss?view=list&module=zarya', { waitUntil: 'networkidle' });
    const panel = page.locator('aside.panel');
    await expect(panel).toBeVisible({ timeout: 8_000 });
    await expect(panel.getByRole('heading', { level: 1, name: /zarya/i })).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('module query in 3D mode opens detail panel', async ({ page }) => {
    const errors = attachConsoleAndError(page);
    await page.goto('/iss?module=cupola', { waitUntil: 'networkidle' });
    const panel = page.locator('aside.panel');
    await expect(panel).toBeVisible({ timeout: 10_000 });
    await expect(panel.getByRole('heading', { level: 1, name: /cupola/i })).toBeVisible();
    await panel.locator('button.panel-close').click();
    await expect(page).toHaveURL(/\/iss(?:\?view=list)?$/);
    expect(errors).toEqual([]);
  });

  test('TIMELINE toggle reveals strip + click marker opens panel', async ({ page, isMobile }) => {
    const errors = attachConsoleAndError(page);
    await page.goto('/iss', { waitUntil: 'networkidle' });
    let markers: Locator;
    if (isMobile) {
      // On mobile the timeline strip folds into the MODULES drawer content
      // (StationTimelineStrip, no dedicated testid there).
      await openDrawerTab(page, /modules/i);
      markers = page.locator('.mdg-body button.marker');
    } else {
      const toggle = page.getByTestId('iss-timeline-toggle');
      await expect(toggle).toBeVisible({ timeout: 8_000 });
      // The desktop toggle pins to the bottom edge of the ISS canvas. Dispatch
      // the click via DOM evaluate so only the button's onclick handler fires,
      // skipping any overlapping footer link in the pointer chain.
      await toggle.evaluate((el) => (el as HTMLButtonElement).click());
      const strip = page.getByTestId('iss-timeline');
      await expect(strip).toBeVisible({ timeout: 3_000 });
      markers = strip.locator('button.marker');
    }
    // At least one marker rendered (one per module + visitor; 25 total today)
    await expect(markers.first()).toBeVisible({ timeout: 5_000 });
    expect(await markers.count()).toBeGreaterThanOrEqual(20);
    // Click the last marker chronologically (HTV-X visitor at 2025-10-26).
    // The first marker (Zarya 1998) overlaps with Unity (1998-12-06 only
    // 16 days later); using last() avoids cluster collisions in DOM
    // z-order regardless of CSS hover-promotion.
    const lastMarker = markers.last();
    if (isMobile) await lastMarker.evaluate((el) => (el as HTMLButtonElement).click());
    else await lastMarker.click();
    const panel = page.locator('aside.panel');
    await expect(panel).toBeVisible({ timeout: 5_000 });
    expect(errors).toEqual([]);
  });

  test('ASSEMBLY toggle opens the overlay and scrubbing the slider updates the date readout', async ({
    page,
    isMobile,
  }) => {
    const errors = attachConsoleAndError(page);
    await page.goto('/iss', { waitUntil: 'networkidle' });
    if (isMobile) {
      // Mobile: ASSEMBLY is an action tab in the MobileDrawerGroup.
      const assemblyTab = page
        .locator('.mdg-tab')
        .filter({ hasText: /assembly/i })
        .first();
      await expect(assemblyTab).toBeVisible({ timeout: 8_000 });
      await assemblyTab.click();
    } else {
      const toggle = page.getByTestId('iss-assembly-toggle');
      await expect(toggle).toBeVisible({ timeout: 8_000 });
      // DOM-evaluate click so only the button's onclick fires, skipping any
      // overlapping footer link in the pointer chain.
      await toggle.evaluate((el) => (el as HTMLButtonElement).click());
    }
    const overlay = page.getByTestId('station-assembly');
    await expect(overlay).toBeVisible({ timeout: 5_000 });
    const dateReadout = page.getByTestId('assembly-date');
    const initialDate = (await dateReadout.textContent())?.trim() ?? '';
    expect(initialDate).not.toBe('');
    // Scrub to the back half of the timeline. The slider is
    // `<input type="range" min=0 max=1 step=0.001>` and the component
    // listens on `oninput`, so we set value + dispatch synchronously.
    const scrub = page.getByTestId('assembly-scrub');
    await scrub.evaluate((el) => {
      const input = el as HTMLInputElement;
      input.value = '0.75';
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    // The $effect that mirrors progress → assemblyRef is microtask-
    // deferred; the date readout re-renders on the next reactive tick.
    await expect
      .poll(async () => (await dateReadout.textContent())?.trim(), { timeout: 3_000 })
      .not.toBe(initialDate);
    expect(errors).toEqual([]);
  });

  test('3D canvas click opens the module panel', async ({ page }) => {
    const errors = attachConsoleAndError(page);
    await page.goto('/iss', { waitUntil: 'networkidle' });
    const canvas = page.getByTestId('iss-canvas');
    await expect(canvas).toBeVisible({ timeout: 10_000 });
    // Wait for the page to register its test hook AND for at least one
    // requestAnimationFrame so world matrices are populated and the
    // canvas has rendered once. The hook itself forces a matrixWorld
    // update, but the camera also needs to have settled into its
    // initial position before we project anything.
    await page.waitForFunction(
      () => typeof (window as unknown as { __issPickAt?: unknown }).__issPickAt === 'function',
      { timeout: 12_000 },
    );
    await page.evaluate(
      () => new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r()))),
    );
    // Project a known pickable module's world position to client-space
    // pixels and click that exact spot. Replaces the previous spiral-
    // search pattern that raced software-rasterizer WebGL in CI.
    const pos = await page.evaluate(() =>
      (
        window as unknown as {
          __issPickAt: () => { x: number; y: number; moduleId: string } | null;
        }
      ).__issPickAt(),
    );
    expect(pos, 'expected at least one pickable ISS module on-screen').not.toBeNull();
    if (!pos) return;
    // Use locator.click({position}) — dispatches the click to the
    // canvas element at canvas-relative coords, bypassing any
    // fixed-position overlay (e.g. StationOrbitBanner at top, z-index
    // 30) that would swallow a raw page.mouse.click.
    const box = await canvas.boundingBox();
    if (!box) throw new Error('canvas bounding box unavailable');
    await canvas.click({ position: { x: pos.x - box.x, y: pos.y - box.y } });
    const panel = page.locator('aside.panel');
    await expect(panel).toBeVisible({ timeout: 5_000 });
    expect(errors).toEqual([]);
  });
});
