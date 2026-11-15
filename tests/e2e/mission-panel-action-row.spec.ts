import { expect, test } from '@playwright/test';

/**
 * Plan L35 (UXD-019 item 11): a Moon or Mars mission's action row waits for the surface-site list
 * (a fetch) before it draws its chips. The row holds its place meanwhile and the chips arrive
 * together, so the surface chip never pushes Fly to the right and the hero never moves down.
 * Apollo 11 fills two rows at the panel's width (surface chip, then Fly and Share); with a
 * one-row reservation the hero dropped 36 px when the list arrived (measured 2026-11-15).
 * The site list is held for 1.5 s so the late arrival is certain, not a race.
 */
test('the action row holds its place while the surface site is read', async ({ page }) => {
  await page.route('**/data/moon-sites.json', async (route) => {
    await new Promise((r) => setTimeout(r, 1500));
    await route.continue();
  });
  await page.goto('/missions?id=apollo11');
  const panel = page.locator('aside.panel').first();
  await expect(panel).toBeVisible({ timeout: 20_000 });
  // The panel's own slide-in settles first; the row is measured against the hero from then on.
  await page.waitForTimeout(500);

  const samples = await page.evaluate(
    () =>
      new Promise<{ gap: number | null; fly: number | null; chips: number }[]>((resolve) => {
        const out: { gap: number | null; fly: number | null; chips: number }[] = [];
        const t0 = performance.now();
        const tick = () => {
          const hero = document.querySelector('aside.panel .panel-hero');
          const slot = document.querySelector('aside.panel .action-slot');
          const fly = document.querySelector('aside.panel [data-testid="fly-mission-btn"]');
          out.push({
            gap:
              hero && slot
                ? hero.getBoundingClientRect().top - slot.getBoundingClientRect().top
                : null,
            fly: fly ? fly.getBoundingClientRect().left : null,
            chips: fly?.parentElement ? fly.parentElement.querySelectorAll('.ui-chip').length : 0,
          });
          if (performance.now() - t0 < 3000) requestAnimationFrame(tick);
          else resolve(out);
        };
        tick();
      }),
  );

  const gaps = samples.map((s) => s.gap).filter((v): v is number => v !== null);
  expect(gaps.length, 'the row and the hero are on screen').toBeGreaterThan(10);
  expect(Math.max(...gaps) - Math.min(...gaps), 'hero moved under the row (px)').toBeLessThanOrEqual(
    1,
  );

  const withFly = samples.filter((s) => s.fly !== null);
  expect(withFly.length, 'Fly appears').toBeGreaterThan(0);
  expect(withFly[0]!.chips, 'Fly arrives together with the surface chip and Share').toBe(3);
  const flyLefts = withFly.map((s) => s.fly!);
  expect(Math.max(...flyLefts) - Math.min(...flyLefts), 'Fly moved (px)').toBeLessThanOrEqual(1);
});
