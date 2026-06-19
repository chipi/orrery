/**
 * Tour-stage execution coverage (2026-06-19 regression coverage).
 *
 * Static tests in src/lib/audio-tour.test.ts verify that every tour
 * stage's selector exists somewhere in source files. That's necessary
 * but not sufficient — the LIVE DOM can still be missing an anchor
 * that the static check passes (gated behind `{#if}` blocks, mobile
 * breakpoints, lazily-mounted panels, etc.). Marko reported on
 * 2026-06-19 that the guide-explore + guide-earth episodes had "most
 * actions not happening" — turned out the static corpus was happy but
 * the live run was firing flash actions on offscreen anchors with no
 * visible effect, and panel-open clicks were never paired with closes,
 * so panels sat over the canvas for 30+ seconds at a time.
 *
 * These tests pin the actual open-and-close cycle that the tour
 * depends on: clicking an `*-select-*` anchor opens a panel, and
 * clicking `[data-audio-stage="panel-close"]` closes it. If panel
 * markup or close-button structure ever changes such that the
 * tour's selectors no longer resolve to live, clickable elements,
 * these tests go red.
 */
import { expect, test } from '@playwright/test';

test.describe('tour-stage open/close cycle', () => {
  test('/explore: clicking explore-select-saturn opens a panel; panel-close closes it', async ({
    page,
  }) => {
    await page.goto('/explore', { waitUntil: 'networkidle' });

    // Wait for the canvas + tour anchors to be wired.
    await page.waitForSelector('[data-audio-stage="explore-select-saturn"]', { timeout: 5_000 });

    // Pre-state: no planet panel open.
    await expect(page.locator('[data-audio-stage="panel-close"]')).toHaveCount(0);

    // Tour-style programmatic click (matches what AudioOverlay does via el.click()).
    await page.evaluate(() => {
      const el = document.querySelector('[data-audio-stage="explore-select-saturn"]') as
        | HTMLElement
        | null;
      if (!el) throw new Error('saturn anchor missing');
      el.click();
    });

    // Panel opens with a close button — the visible Saturn label is the
    // panel title rendered by Panel.svelte.
    const closeBtn = page.locator('[data-audio-stage="panel-close"]');
    await expect(closeBtn).toBeVisible({ timeout: 5_000 });

    // Close via the tour selector + assert the panel actually disappears.
    await page.evaluate(() => {
      (document.querySelector('[data-audio-stage="panel-close"]') as HTMLElement | null)?.click();
    });
    await expect(closeBtn).toHaveCount(0, { timeout: 5_000 });
  });

  test('/explore: tour-anchor selects open panels for every named planet', async ({ page }) => {
    await page.goto('/explore', { waitUntil: 'networkidle' });
    await page.waitForSelector('[data-audio-stage="explore-select-saturn"]', { timeout: 5_000 });

    // Mirror the guide-explore beat sequence from src/lib/audio-tour.ts —
    // Mercury, Mars, Saturn, Neptune, Sun, Earth. Each click should land
    // a Panel with its close button rendered. We open + close between
    // each so the test detects regressions per anchor independently.
    const anchors = [
      'explore-select-mercury',
      'explore-select-mars',
      'explore-select-saturn',
      'explore-select-neptune',
      'explore-select-sun',
      'explore-select-earth',
    ];
    for (const a of anchors) {
      await page.evaluate((sel) => {
        (document.querySelector(`[data-audio-stage="${sel}"]`) as HTMLElement | null)?.click();
      }, a);
      await expect(page.locator('[data-audio-stage="panel-close"]')).toBeVisible({
        timeout: 3_000,
      });
      await page.evaluate(() => {
        (document.querySelector('[data-audio-stage="panel-close"]') as HTMLElement | null)?.click();
      });
      await expect(page.locator('[data-audio-stage="panel-close"]')).toHaveCount(0, {
        timeout: 3_000,
      });
    }
  });

  test('/earth: tour-anchor selects (Tiangong/Hubble/JWST/ISS) open and close cleanly', async ({
    page,
  }) => {
    await page.goto('/earth', { waitUntil: 'networkidle' });
    // /earth uses the SurfaceScene window-hook (__surfaceSceneSelectSite)
    // which is set on SurfaceScene mount; the tour anchors call into it.
    await page.waitForFunction(
      () =>
        typeof (window as Window & { __surfaceSceneSelectSite?: unknown })
          .__surfaceSceneSelectSite === 'function',
      null,
      { timeout: 10_000 },
    );

    for (const a of ['earth-select-tiangong', 'earth-select-hubble', 'earth-select-jwst', 'earth-select-iss']) {
      await page.evaluate((sel) => {
        (document.querySelector(`[data-audio-stage="${sel}"]`) as HTMLElement | null)?.click();
      }, a);
      await expect(page.locator('[data-audio-stage="panel-close"]')).toBeVisible({
        timeout: 5_000,
      });
      await page.evaluate(() => {
        (document.querySelector('[data-audio-stage="panel-close"]') as HTMLElement | null)?.click();
      });
      await expect(page.locator('[data-audio-stage="panel-close"]')).toHaveCount(0, {
        timeout: 5_000,
      });
    }
  });
});
