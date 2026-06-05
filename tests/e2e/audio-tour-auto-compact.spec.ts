import { test, expect, type Page } from '@playwright/test';

/**
 * Auto-compact on panel-open during an active tour (PRD-016 §S8 /
 * RFC-019 §12). Five routes wire the same $effect:
 *   if (audio.tourActive && panelOpen && !audio.compact) audio.compact = true;
 *
 *   • /missions  → MissionPanel
 *   • /fleet     → fleet entity panel
 *   • /iss       → station module panel
 *   • /tiangong  → station module panel
 *   • SurfaceScene (covers /earth, /moon, /mars)
 *
 * Without this wiring, opening a panel mid-tour leaves the full overlay
 * obstructing the visual scene the narrator is describing. The bug class
 * is silent — the executor still fires, captions still update, but the
 * scene is hidden behind the overlay. Worth a runtime e2e.
 *
 * Drives `audio.tourActive` directly via the `__orreryAudio.state` test
 * hook (AudioOverlay onMount) so we don't have to start a real tour,
 * which is slow and depends on registry load timing.
 *
 * Clicks the hidden tour-anchor buttons via `element.click()` rather
 * than Playwright's locator.click() — the anchors live inside a
 * `pointer-events: none` container with `pointer-events: auto` on the
 * buttons. Real users can't reach them; the audio executor calls
 * `el.click()` directly (RFC-019 §12.3), so this spec mirrors that
 * exact dispatch path.
 */

async function primeTourActive(page: Page): Promise<void> {
  // Wait for AudioOverlay's onMount to install the test hook.
  await page.waitForFunction(() => {
    const w = window as Window & {
      __orreryAudio?: { state?: { tourActive: boolean; compact: boolean } };
    };
    return typeof w.__orreryAudio?.state?.tourActive === 'boolean';
  });
  await page.evaluate(() => {
    const w = window as Window & {
      __orreryAudio?: { state: { tourActive: boolean; compact: boolean } };
    };
    if (!w.__orreryAudio) return;
    w.__orreryAudio.state.tourActive = true;
    w.__orreryAudio.state.compact = false;
  });
}

async function readCompact(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    const w = window as Window & {
      __orreryAudio?: { state: { compact: boolean } };
    };
    return Boolean(w.__orreryAudio?.state.compact);
  });
}

async function clickTourAnchor(page: Page, name: string): Promise<void> {
  await page.evaluate((stage) => {
    const btn = document.querySelector(`[data-audio-stage="${stage}"]`) as HTMLElement | null;
    btn?.click();
  }, name);
}

test.describe('auto-compact on panel-open during tour', () => {
  test('/missions — MissionPanel open flips audio.compact', async ({ page }) => {
    await page.goto('/missions', { waitUntil: 'networkidle' });
    await primeTourActive(page);
    expect(await readCompact(page)).toBe(false);
    await clickTourAnchor(page, 'missions-select-apollo11');
    await expect.poll(() => readCompact(page), { timeout: 3000 }).toBe(true);
  });

  test('/fleet — entity panel open flips audio.compact', async ({ page }) => {
    await page.goto('/fleet', { waitUntil: 'networkidle' });
    await primeTourActive(page);
    expect(await readCompact(page)).toBe(false);
    await clickTourAnchor(page, 'fleet-select-iss');
    await expect.poll(() => readCompact(page), { timeout: 3000 }).toBe(true);
  });

  test('/iss — module panel open flips audio.compact', async ({ page }) => {
    await page.goto('/iss', { waitUntil: 'networkidle' });
    await primeTourActive(page);
    expect(await readCompact(page)).toBe(false);
    await clickTourAnchor(page, 'iss-select-zarya');
    await expect.poll(() => readCompact(page), { timeout: 3000 }).toBe(true);
  });

  test('/tiangong — module panel open flips audio.compact', async ({ page }) => {
    await page.goto('/tiangong', { waitUntil: 'networkidle' });
    await primeTourActive(page);
    expect(await readCompact(page)).toBe(false);
    await clickTourAnchor(page, 'tiangong-select-tianhe');
    await expect.poll(() => readCompact(page), { timeout: 3000 }).toBe(true);
  });

  test('does not flip compact when tour is inactive', async ({ page }) => {
    await page.goto('/missions', { waitUntil: 'networkidle' });
    // Do NOT prime tourActive — guard against the effect over-firing.
    await page.waitForFunction(() => {
      const w = window as Window & {
        __orreryAudio?: { state?: { tourActive: boolean } };
      };
      return typeof w.__orreryAudio?.state?.tourActive === 'boolean';
    });
    await clickTourAnchor(page, 'missions-select-apollo11');
    // Give the effect a chance to misfire if it's going to.
    await page.waitForTimeout(500);
    expect(await readCompact(page)).toBe(false);
  });
});
