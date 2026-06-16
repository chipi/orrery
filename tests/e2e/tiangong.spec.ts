import { test, expect, type ConsoleMessage, type Page } from '@playwright/test';

function attachConsoleAndError(page: Page) {
  const errors: string[] = [];
  page.on('console', (msg: ConsoleMessage) => {
    if (msg.type() === 'error') errors.push(`console.error: ${msg.text()}`);
  });
  page.on('pageerror', (err: Error) => {
    errors.push(`pageerror: ${err.message}`);
  });
  return errors;
}

test.describe('/tiangong', () => {
  test('default load has no console errors and shows 3D canvas or HUD toggle', async ({ page }) => {
    const errors = attachConsoleAndError(page);
    await page.goto('/tiangong', { waitUntil: 'networkidle' });
    await expect(page).toHaveTitle(/Tiangong/i);
    expect(errors).toEqual([]);
    const toggle = page.getByTestId('tiangong-view-toggle');
    await expect(toggle).toBeVisible({ timeout: 8_000 });
  });

  test('list mode shows module list', async ({ page }) => {
    const errors = attachConsoleAndError(page);
    await page.goto('/tiangong?view=list', { waitUntil: 'networkidle' });
    await expect(page.getByTestId('tiangong-list-view')).toBeVisible({ timeout: 8_000 });
    await expect(page.getByRole('heading', { name: /modules/i })).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('module query in list mode opens detail panel', async ({ page }) => {
    const errors = attachConsoleAndError(page);
    await page.goto('/tiangong?view=list&module=tianhe', { waitUntil: 'networkidle' });
    const panel = page.locator('aside.panel');
    await expect(panel).toBeVisible({ timeout: 8_000 });
    await expect(panel.getByRole('heading', { level: 1, name: /tianhe/i })).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('module query in 3D mode opens detail panel', async ({ page }) => {
    const errors = attachConsoleAndError(page);
    await page.goto('/tiangong?module=mengtian', { waitUntil: 'networkidle' });
    const panel = page.locator('aside.panel');
    await expect(panel).toBeVisible({ timeout: 10_000 });
    await expect(panel.getByRole('heading', { level: 1, name: /mengtian/i })).toBeVisible();
    await panel.locator('button.panel-close').click();
    await expect(page).toHaveURL(/\/tiangong(?:\?view=list)?$/);
    expect(errors).toEqual([]);
  });

  test('TIMELINE toggle reveals strip + click marker opens panel', async ({ page }) => {
    const errors = attachConsoleAndError(page);
    await page.goto('/tiangong', { waitUntil: 'networkidle' });
    const toggle = page.getByTestId('tiangong-timeline-toggle');
    await expect(toggle).toBeVisible({ timeout: 8_000 });
    // Toggle pins to the bottom of the canvas; on mobile the footer's
    // "Library" link overlaps it and intercepts pointer events. Dispatch
    // click via DOM evaluate so only the button's onclick handler fires
    // (force-click bubbled to the footer link and navigated away).
    await toggle.evaluate((el) => (el as HTMLButtonElement).click());
    const strip = page.getByTestId('tiangong-timeline');
    await expect(strip).toBeVisible({ timeout: 3_000 });
    const markers = strip.locator('button.marker');
    await expect(markers.first()).toBeVisible();
    // Tiangong: 4 modules + 2 visitors = 6 markers expected
    expect(await markers.count()).toBeGreaterThanOrEqual(5);
    // Click the last marker chronologically (Mengtian 2022-10-31, alone
    // in its month). The first marker (Tianhe) overlaps with Chinarm —
    // both launched 2021-04-29 because Chinarm rode up pre-attached to
    // Tianhe — so first() collides in DOM z-order.
    // Same DOM-dispatch workaround as the toggle above: on mobile the
    // footer "Credits" link sits over the timeline strip and
    // intercepts the synthetic pointer event during action stability
    // checks. evaluate(el => el.click()) bypasses the pointer-events
    // intercept and fires the marker's onclick directly.
    const lastMarker = markers.last();
    await lastMarker.evaluate((el) => (el as HTMLButtonElement).click());
    const panel = page.locator('aside.panel');
    await expect(panel).toBeVisible({ timeout: 5_000 });
    expect(errors).toEqual([]);
  });

  test('ASSEMBLY toggle opens the overlay and scrubbing the slider updates the date readout', async ({
    page,
  }) => {
    const errors = attachConsoleAndError(page);
    await page.goto('/tiangong', { waitUntil: 'networkidle' });
    const toggle = page.getByTestId('tiangong-assembly-toggle');
    await expect(toggle).toBeVisible({ timeout: 8_000 });
    // Same DOM-evaluate trick as the TIMELINE toggle — on the mobile
    // viewport the site footer's Library link overlaps the bottom-pinned
    // controls and intercepts pointer events.
    await toggle.evaluate((el) => (el as HTMLButtonElement).click());
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
    await page.goto('/tiangong', { waitUntil: 'networkidle' });
    const canvas = page.getByTestId('tiangong-canvas');
    await expect(canvas).toBeVisible({ timeout: 10_000 });
    // Wait for the test hook AND for at least one rAF so world matrices
    // are populated and the camera has settled. The hook forces matrix
    // updates internally, but the camera also needs its first frame.
    await page.waitForFunction(
      () =>
        typeof (window as unknown as { __tiangongPickAt?: unknown }).__tiangongPickAt ===
        'function',
      { timeout: 12_000 },
    );
    await page.evaluate(
      () => new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r()))),
    );
    // Project a known pickable module's world position to client-space
    // pixels and click that exact spot. Replaces the previous spiral-
    // search approach which raced software-rasterizer WebGL in CI.
    const pos = await page.evaluate(() =>
      (
        window as unknown as {
          __tiangongPickAt: () => { x: number; y: number; moduleId: string } | null;
        }
      ).__tiangongPickAt(),
    );
    expect(pos, 'expected at least one pickable Tiangong module on-screen').not.toBeNull();
    if (!pos) return;
    // Use locator.click({position}) — dispatches the click to the
    // canvas element at canvas-relative coords, bypassing any fixed
    // overlay (e.g. StationOrbitBanner at the top of the viewport)
    // that would otherwise swallow a raw page.mouse.click.
    const box = await canvas.boundingBox();
    if (!box) throw new Error('canvas bounding box unavailable');
    await canvas.click({ position: { x: pos.x - box.x, y: pos.y - box.y } });
    const panel = page.locator('aside.panel');
    await expect(panel).toBeVisible({ timeout: 5_000 });
    expect(errors).toEqual([]);
  });
});
