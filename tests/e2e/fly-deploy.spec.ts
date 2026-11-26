import { test, expect } from '@playwright/test';

// W10: a mission that left from the Shuttle's payload bay plays its deploy between the launch and
// the cruise (DeployScene, loaded on demand). ?deploy=1 (with ?launch=1) jumps straight to it.

test('Galileo plays the Shuttle deploy, and Skip goes on to the cruise', async ({ page }) => {
  test.slow();
  await page.goto('/fly?mission=galileo&launch=1&deploy=1');
  const scene = page.getByTestId('deploy-scene');
  await expect(scene).toBeVisible({ timeout: 30_000 });
  await expect(scene.locator('canvas')).toBeAttached({ timeout: 30_000 });
  await expect(page.getByTestId('deploy-beat')).toHaveAttribute('data-beat', /\w+/);
  // The MET runs from the release's sourced time back: before it the clock is an estimate ("~").
  await expect(page.getByTestId('deploy-met')).toHaveText(/^~?\d+:\d\d:\d\d\.\d$/);
  await expect(scene.locator('.mission')).toContainText('STS-34');
  // The master play bar steps aside while the deploy plays.
  await expect(page.locator('.scrubber')).toBeHidden();
  await page.getByTestId('deploy-skip').click();
  await expect(scene).toBeHidden({ timeout: 10_000 });
  await expect(page.locator('[data-testid="launch-scene"]')).toBeHidden({ timeout: 10_000 });
});

test('a launch with no Shuttle deploy (Cassini) never shows the deploy scene', async ({ page }) => {
  await page.goto('/fly?mission=cassini&launch=1&deploy=1');
  await expect(page.locator('[data-testid="launch-scene"]')).toBeVisible({ timeout: 20_000 });
  await page.waitForTimeout(1500);
  await expect(page.getByTestId('deploy-scene')).toHaveCount(0);
});
