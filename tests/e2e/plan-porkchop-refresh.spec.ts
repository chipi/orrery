import { test, expect } from '@playwright/test';

test('porkchop refreshes when destination changes', async ({ page }) => {
  await page.goto('/plan');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(800);

  // Capture canvas hash for Mars (default).
  const sample = async () => {
    return await page.evaluate(() => {
      const c = document.querySelector('canvas') as HTMLCanvasElement | null;
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

  await page.screenshot({ path: '/tmp/porkchop-mars.png' });
  await page.selectOption('select.dest-select', 'jupiter');
  await page.waitForTimeout(2500);
  await page.screenshot({ path: '/tmp/porkchop-jupiter.png' });

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
