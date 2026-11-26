import { test, expect } from '@playwright/test';

// W12: a winged return (STS-1 first) plays as the descent act (WingedReturnScene, loaded on demand)
// and ends on the landing card. ?winged=1 jumps straight to it.

test('STS-1 plays its runway landing, and Skip ends on the landing card', async ({ page }) => {
  test.slow();
  await page.goto('/fly?mission=sts-1&winged=1');
  const scene = page.getByTestId('winged-scene');
  await expect(scene).toBeVisible({ timeout: 30_000 });
  await expect(scene.locator('canvas')).toBeAttached({ timeout: 30_000 });
  await expect(page.getByTestId('winged-beat')).toHaveAttribute('data-beat', /\w+/);
  // Only the touchdown is flown: elsewhere the clock is the plan's offsets ("~").
  await expect(page.getByTestId('winged-met')).toHaveText(/^~?\d+:\d\d:\d\d\.\d$/);
  await expect(scene.locator('.mission')).toContainText('STS-1');
  await expect(page.locator('.scrubber')).toBeHidden();
  await page.getByTestId('winged-skip').click();
  await expect(scene).toBeHidden({ timeout: 10_000 });
  await expect(page.getByTestId('recovery-runway')).toContainText('23', { timeout: 10_000 });
});

test('a capsule return (Friendship 7) never shows the winged scene', async ({ page }) => {
  await page.goto('/fly?mission=friendship-7&descent=1');
  await expect(page.locator('[data-testid="descent-scene"]')).toBeVisible({ timeout: 20_000 });
  await page.waitForTimeout(1500);
  await expect(page.getByTestId('winged-scene')).toHaveCount(0);
});

// The scene's clock is the content the visitor chose to watch, not a passive animation: under
// prefers-reduced-motion it still plays (as the coast does), it must not freeze on its first frame.
test('with reduced motion the winged return, the deploy and the way home still play', async ({
  page,
}) => {
  test.slow();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const [url, met] of [
    ['/fly?mission=sts-1&winged=1', 'winged-met'],
    ['/fly?mission=galileo&launch=1&deploy=1', 'deploy-met'],
    ['/fly?mission=apollo11&descent=1&wayhome=1', 'return-get'],
  ] as const) {
    await page.goto(url);
    const clock = page.getByTestId(met);
    await expect(clock).toHaveText(/\d:\d\d\.\d/, { timeout: 30_000 });
    const first = await clock.textContent();
    await expect(clock).not.toHaveText(first ?? '', { timeout: 8_000 });
  }
});
