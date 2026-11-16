import { expect, test } from '@playwright/test';
import { waitForHydration } from './_helpers/hydration';

/**
 * VE1 (slice D3): the three Venus sites use the Moon and Mars gallery ladder, so each opens on
 * a photograph (the hero, before the tab row), has a GALLERY tab holding the other images and
 * its credit line, and the hero opens the lightbox. The hero slots are the blessed ones in
 * missions-hero-overrides.json. Runs on desktop-chromium, mobile-chromium and
 * mobile-landscape-chromium.
 */

// Gallery size of the mission folder, hero slot, and the grid after the hero is taken out.
const SITES = [
  { id: 'venera-13', hero: 'missions/venera-13/02', grid: 2 },
  { id: 'vega-1', hero: 'missions/vega-1/02', grid: 3 },
  { id: 'vega-2', hero: 'missions/vega-2/03', grid: 2 },
] as const;

for (const s of SITES) {
  test(`/venus?site=${s.id}: a hero before the tabs, a GALLERY tab, the lightbox`, async ({
    page,
  }) => {
    await page.goto(`/venus?site=${s.id}`, { waitUntil: 'load' });
    await waitForHydration(page);
    const panel = page.locator('aside.panel');
    const tabs = panel.locator('[role="tablist"]');
    await expect(tabs).toBeVisible({ timeout: 20_000 });

    const hero = panel.locator('.panel-hero-btn img');
    await expect(hero).toBeVisible({ timeout: 15_000 });
    expect(
      await hero.evaluate((el) => (el as HTMLImageElement).currentSrc || el.getAttribute('src')),
    ).toContain(`/images/${s.hero}`);
    const first = await panel.evaluate((p) => {
      const h = p.querySelector('.panel-hero');
      const t = p.querySelector('[role="tablist"]');
      return !!(h && t && h.compareDocumentPosition(t) & Node.DOCUMENT_POSITION_FOLLOWING);
    });
    expect(first, 'the hero comes before the tab row').toBe(true);

    await tabs.getByRole('tab', { name: 'GALLERY' }).click();
    await expect(panel.locator('.gallery-grid .gallery-thumb')).toHaveCount(s.grid);
    await expect(panel.locator('.gallery-credit')).toBeVisible();

    await panel.locator('.panel-hero-btn').click();
    await expect(page.locator('button.lightbox')).toBeVisible({ timeout: 3_000 });
    await expect(page.locator('.lightbox-meta')).toBeVisible();
  });
}
