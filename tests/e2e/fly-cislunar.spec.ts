import { test, expect } from '@playwright/test';

/**
 * /fly — cislunar view (ADR-058).
 *
 * Moon missions render in the Earth-centred cislunar scene; everything
 * else renders heliocentrically. The Solar/Cislunar toggle was dropped
 * during smoke testing (see ADR-058 amendment) — each mission has the
 * one view its scale fits.
 *
 * Covers one mission per profile family loading without console errors:
 * Apollo 11 (free-return + LOI), Apollo 13 (free-return + flyby),
 * Apollo 17 (free-return + LOI), Artemis II (hybrid free-return),
 * Artemis III (NRHO), Chandrayaan-3 (spiral + land), Chang'e 5 (LOR),
 * LRO (direct orbiter), Luna 9 (direct impact), SLIM (spiral + land).
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
  for (const id of PROFILE_FAMILY_MISSIONS) {
    test(`${id} loads without console errors`, async ({ page }) => {
      const consoleErrors: string[] = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') consoleErrors.push(msg.text());
      });
      page.on('pageerror', (err) => consoleErrors.push(err.message));

      await page.goto(`/fly?mission=${id}`);
      await expect(page.locator('[data-testid="mission-name"]')).toBeVisible({ timeout: 10_000 });

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
