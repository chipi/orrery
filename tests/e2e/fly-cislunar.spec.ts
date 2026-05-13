import { test, expect } from '@playwright/test';

/**
 * /fly — cislunar view (ADR-058).
 *
 * Covers:
 *   - Moon missions auto-switch to cislunar view on load.
 *   - Toggle button is present and swaps viewMode.
 *   - Non-Moon missions do NOT show the toggle.
 *   - One mission per profile family loads without console errors:
 *     Apollo 11 (free-return + LOI), Apollo 13 (free-return + flyby),
 *     Artemis II (hybrid free-return), Chandrayaan-3 (spiral), Chang'e 5
 *     (direct + LOR), LRO (direct orbiter), SLIM (spiral + slow).
 */

const PROFILE_FAMILY_MISSIONS = [
  'apollo11',
  'apollo13',
  'apollo17',
  'artemis2',
  'artemis3',
  'chandrayaan3',
  'change5',
  'lro',
  'luna9',
  'slim',
] as const;

test.describe('/fly — cislunar view (ADR-058)', () => {
  test('Moon mission auto-switches to cislunar view + toggle is visible', async ({ page }) => {
    await page.goto('/fly?mission=artemis2');
    const toggle = page.getByRole('button', { name: /Switch to solar view/i });
    await expect(toggle).toBeVisible({ timeout: 10_000 });
    await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  });

  test('toggle swaps to heliocentric and back', async ({ page }) => {
    await page.goto('/fly?mission=artemis2');
    const toSolar = page.getByRole('button', { name: /Switch to solar view/i });
    await expect(toSolar).toBeVisible({ timeout: 10_000 });
    await toSolar.click();
    const toCislunar = page.getByRole('button', { name: /Switch to cislunar view/i });
    await expect(toCislunar).toBeVisible();
    await expect(toCislunar).toHaveAttribute('aria-pressed', 'false');
    await toCislunar.click();
    await expect(page.getByRole('button', { name: /Switch to solar view/i })).toBeVisible();
  });

  test('Mars mission does NOT show the cislunar toggle', async ({ page }) => {
    await page.goto('/fly?mission=curiosity');
    // Identity HUD confirms the mission loaded before we assert toggle absence.
    await expect(page.locator('[data-testid="mission-name"]')).toBeVisible();
    const toggle = page.getByRole('button', { name: /Switch to (solar|cislunar) view/i });
    await expect(toggle).toHaveCount(0);
  });

  for (const id of PROFILE_FAMILY_MISSIONS) {
    test(`${id} loads in cislunar view without console errors`, async ({ page }) => {
      const consoleErrors: string[] = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') consoleErrors.push(msg.text());
      });
      page.on('pageerror', (err) => consoleErrors.push(err.message));

      await page.goto(`/fly?mission=${id}`);
      await expect(page.locator('[data-testid="mission-name"]')).toBeVisible({ timeout: 10_000 });
      await expect(page.getByRole('button', { name: /Switch to solar view/i })).toBeVisible();

      // Allow the WebGL render loop a beat to settle so any deferred
      // errors land before we assert on the buffer.
      await page.waitForTimeout(500);

      const benignNoise = consoleErrors.filter(
        (msg) =>
          // Common dev-only warnings unrelated to cislunar feature.
          !/favicon|404|webgl warning|hot module/i.test(msg),
      );
      expect(benignNoise, `console errors for ${id}: ${benignNoise.join(' | ')}`).toEqual([]);
    });
  }
});
