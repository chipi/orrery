import { test, expect } from '@playwright/test';

/**
 * Planet panel hero (UXD-029): every planet shows its whole disc, so the hero image is
 * object-fit: contain on a pure-black ground (the pictures' own space is rgb(0,0,0)).
 */
const PLANETS: [id: string, name: string][] = [
  ['mercury', 'Mercury'],
  ['venus', 'Venus'],
  ['earth', 'Earth'],
  ['mars', 'Mars'],
  ['jupiter', 'Jupiter'],
  ['saturn', 'Saturn'],
  ['uranus', 'Uranus'],
  ['neptune', 'Neptune'],
  ['pluto', 'Pluto'],
];

for (const [id, name] of PLANETS) {
  test(`${name} panel hero shows the whole picture on black`, async ({ page }) => {
    await page.goto(`/explore?id=${id}`);
    const panel = page.locator(`aside.panel[aria-label="${name}"]`);
    await expect(panel).toBeVisible({ timeout: 30_000 });
    const img = panel.locator('.planet-hero .panel-hero-btn img');
    await expect(img).toBeVisible();
    await expect(img).toHaveCSS('object-fit', 'contain');
    await expect(panel.locator('.planet-hero .panel-hero-btn')).toHaveCSS(
      'background-color',
      'rgb(0, 0, 0)',
    );
    await expect
      .poll(() => img.evaluate((el: HTMLImageElement) => el.naturalWidth), { timeout: 15_000 })
      .toBeGreaterThanOrEqual(320);
    const box = await img.boundingBox();
    expect(box!.width / box!.height).toBeCloseTo(16 / 9, 1);
  });
}
