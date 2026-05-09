import { test, expect } from '@playwright/test';

test('porkchop refreshes when destination changes', async ({ page }) => {
  await page.goto('/plan');
  await page.waitForLoadState('networkidle');
  // Wait for the porkchop canvas to be in the DOM with non-zero
  // dimensions — proves the page has computed + drawn the heatmap.
  // Replaces a fixed waitForTimeout(800) that raced slow CI.
  const canvas = page.locator('canvas.porkchop');
  await expect(canvas).toBeVisible({ timeout: 10_000 });
  await page.waitForFunction(
    () => {
      const c = document.querySelector('canvas.porkchop') as HTMLCanvasElement | null;
      return c != null && c.width > 0 && c.height > 0;
    },
    { timeout: 10_000 },
  );

  // Capture canvas hash for Mars (default).
  const sample = async () => {
    return await page.evaluate(() => {
      const c = document.querySelector('canvas.porkchop') as HTMLCanvasElement | null;
      if (!c) return null;
      const ctx = c.getContext('2d');
      if (!ctx) return null;
      const W = c.width;
      const H = c.height;
      // Sample the middle 50% of the canvas — heatmap interior.
      const sx = Math.floor(W * 0.25);
      const sy = Math.floor(H * 0.25);
      const sw = Math.floor(W * 0.5);
      const sh = Math.floor(H * 0.5);
      const data = ctx.getImageData(sx, sy, sw, sh).data;
      let sum = 0;
      for (let i = 0; i < data.length; i++) sum += data[i];
      return { sum, W, H, sx, sy, sw, sh };
    });
  };

  const marsHash = await sample();
  const marsUrl = page.url();
  const marsSelect = await page.locator('select.dest-select').inputValue();

  // Click a cell so the right-panel rocket section renders. Wait for
  // the rocket figure to materialise instead of a fixed 500ms.
  const canvasBox = await canvas.boundingBox();
  if (canvasBox) {
    await page.mouse.click(
      canvasBox.x + canvasBox.width * 0.4,
      canvasBox.y + canvasBox.height * 0.7,
    );
    await page.locator('figure.rocket-photo').waitFor({ state: 'visible', timeout: 5_000 });
  }

  // Rocket image must render at the figure's 16:9 aspect ratio (the
  // right-panel flex column was squashing it to ~2px tall before the
  // flex-shrink: 0 fix on .rocket-photo).
  const rocketFigHeight = await page.evaluate(() => {
    const fig = document.querySelector('figure.rocket-photo') as HTMLElement | null;
    return fig?.clientHeight ?? 0;
  });
  expect(rocketFigHeight).toBeGreaterThan(100);

  // Switch destination + wait for the porkchop hash to actually change
  // — replaces the older fixed waitForTimeout(2500) that was tuned to
  // be 'long enough for Lambert + draw on a slow CI machine'.
  const beforeJupiter = marsHash;
  await page.selectOption('select.dest-select', 'jupiter');
  await page.waitForFunction(
    (before) => {
      const c = document.querySelector('canvas.porkchop') as HTMLCanvasElement | null;
      if (!c) return false;
      const ctx = c.getContext('2d');
      if (!ctx) return false;
      const W = c.width;
      const H = c.height;
      const sx = Math.floor(W * 0.25);
      const sy = Math.floor(H * 0.25);
      const sw = Math.floor(W * 0.5);
      const sh = Math.floor(H * 0.5);
      const data = ctx.getImageData(sx, sy, sw, sh).data;
      let sum = 0;
      for (let i = 0; i < data.length; i++) sum += data[i];
      return before == null || sum !== before.sum;
    },
    beforeJupiter,
    { timeout: 10_000 },
  );

  const jupiterHash = await sample();
  const jupiterUrl = page.url();
  const jupiterSelect = await page.locator('select.dest-select').inputValue();

  console.log({
    marsSelect,
    jupiterSelect,
    marsHash,
    jupiterHash,
    marsUrl,
    jupiterUrl,
  });
  expect(jupiterSelect).toBe('jupiter');
  expect(jupiterUrl).toContain('dest=jupiter');
  expect(jupiterHash).not.toBe(marsHash);
});
