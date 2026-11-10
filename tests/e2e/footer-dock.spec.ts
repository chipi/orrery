import { expect, test, type Locator } from '@playwright/test';

/**
 * The floating site footer must never share pixels with /explore's bottom
 * time dock or its scale panel on a non-touch window, however narrow or short.
 * Below 1000 px (1450 px on /explore) it collapses to one short line with a More button that opens
 * the full link list. Touch hides the footer, so these run with touch off.
 */
// /explore renders the 3D solar system: on the GPU-less CI runner (SwiftShader) a frame costs more the
// more pixels the window has, so the page needs 13 s at 375x812 and over 30 s at 1440x900 (CI run
// 42809273586, mobile projects). These tests only measure layout, so they get the tripled budget.
const SIZES = [
  { name: '375x812', width: 375, height: 812 },
  { name: '800x375', width: 800, height: 375 },
  { name: '1000x600', width: 1000, height: 600 },
  { name: '1100x700', width: 1100, height: 700 },
];

type Box = { x: number; y: number; width: number; height: number };
const intersects = (a: Box, b: Box) =>
  a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
const box = async (l: Locator) => (await l.boundingBox())!;

for (const size of SIZES) {
  test.describe(`footer vs dock — ${size.name} non-touch`, () => {
    test.use({
      viewport: { width: size.width, height: size.height },
      hasTouch: false,
      isMobile: false,
    });

    test('/explore: footer box clears the time dock and the scale panel', async ({ page }) => {
      test.slow();
      await page.goto('/explore', { waitUntil: 'networkidle' });
      const dock = page.locator('.time-controls');
      const scale = page.locator('.scale-strip');
      await expect(dock).toBeVisible();
      await expect(scale).toBeVisible();
      const footer = page.locator('.footer-menu');
      await expect(footer).toBeVisible();
      const f = await box(footer);
      for (const [name, other] of [
        ['dock', dock],
        ['scale panel', scale],
      ] as const) {
        const o = await box(other);
        expect(
          intersects(f, o),
          `footer ${JSON.stringify(f)} vs ${name} ${JSON.stringify(o)}`,
        ).toBe(false);
      }
    });

    test('/: footer is visible inside the viewport', async ({ page }) => {
      await page.goto('/', { waitUntil: 'networkidle' });
      const f = await box(page.locator('.footer-menu'));
      expect(f.x).toBeGreaterThanOrEqual(0);
      expect(f.x + f.width).toBeLessThanOrEqual(size.width);
      expect(f.y + f.height).toBeLessThanOrEqual(size.height);
    });
  });
}

test.describe('footer More disclosure — 800x375 non-touch', () => {
  test.use({ viewport: { width: 800, height: 375 }, hasTouch: false, isMobile: false });

  test('More opens every footer link, has a 44 px target, and Escape closes it', async ({
    page,
  }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    const more = page.locator('.footer-more-btn');
    await expect(more).toBeVisible();
    await expect(more).toHaveAttribute('aria-expanded', 'false');
    const links = page.locator('.site-footer .footer-link');
    const total = await links.count();
    await more.click();
    await expect(more).toHaveAttribute('aria-expanded', 'true');
    for (let i = 0; i < total; i++) await expect(links.nth(i)).toBeVisible();
    // hit area: the button's ::after stretches it to 44 px
    const hit = await more.evaluate((el) => {
      const s = getComputedStyle(el, '::after');
      return { h: parseFloat(s.height), w: parseFloat(s.width) };
    });
    expect(hit.h).toBeGreaterThanOrEqual(44);
    expect(hit.w).toBeGreaterThanOrEqual(44);
    await page.keyboard.press('Escape');
    await expect(more).toHaveAttribute('aria-expanded', 'false');
  });
});

for (const size of SIZES) {
  test.describe(`footer More popover — ${size.name} non-touch /explore`, () => {
    test.use({
      viewport: { width: size.width, height: size.height },
      hasTouch: false,
      isMobile: false,
    });

    test('every link is visible and not covered by the dock or any panel', async ({ page }) => {
      test.slow();
      await page.goto('/explore', { waitUntil: 'networkidle' });
      const more = page.locator('.footer-more-btn');
      if (!(await more.isVisible())) return;
      await more.click();
      const links = page.locator('.site-footer .footer-link');
      const n = await links.count();
      expect(n).toBeGreaterThanOrEqual(13);
      const covered: string[] = [];
      for (let i = 0; i < n; i++) {
        const l = links.nth(i);
        await expect(l).toBeVisible();
        const ok = await l.evaluate((el) => {
          const r = el.getBoundingClientRect();
          const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
          return !!top && (top === el || el.contains(top));
        });
        if (!ok) covered.push((await l.textContent())?.trim() ?? String(i));
      }
      expect(covered, `covered footer links: ${covered.join(', ')}`).toEqual([]);
    });
  });
}

/**
 * /explore HUD: the left chip rail, the orbit ruler, the bottom-left card, the
 * time dock, the A-Z index tab, the footer and the scale panel own separate
 * pixels on a non-touch window.
 */
const HUD_SIZES = [
  { width: 375, height: 812 },
  { width: 667, height: 375 },
  { width: 800, height: 375 },
  { width: 1000, height: 600 },
  { width: 1100, height: 700 },
  { width: 1280, height: 720 },
  { width: 1440, height: 900 },
  { width: 1600, height: 900 },
];
const HUD_PARTS: Array<[string, string]> = [
  ['chips', '.ctrl-row.chips'],
  ['ruler', '.ruler'],
  ['earth-compare', '.earth-compare'],
  ['dock', '.time-controls'],
  ['index tab', '.entity-index summary'],
  ['footer', '.footer-menu'],
  ['scale panel', '.scale-strip'],
];

for (const size of HUD_SIZES) {
  const key = `${size.width}x${size.height}`;
  test.describe(`explore HUD — ${key} non-touch`, () => {
    test.use({ viewport: size, hasTouch: false, isMobile: false });

    test('no two HUD parts intersect', async ({ page }) => {
      test.slow();
      await page.goto('/explore', { waitUntil: 'networkidle' });
      await expect(page.locator('.time-controls')).toBeVisible();
      await page.waitForTimeout(500);
      const boxes: Array<[string, Box]> = [];
      for (const [name, sel] of HUD_PARTS) {
        const l = page.locator(sel).first();
        if (!(await l.isVisible())) continue;
        boxes.push([name, await box(l)]);
      }
      expect(boxes.length).toBeGreaterThanOrEqual(6);
      const clashes: string[] = [];
      for (let i = 0; i < boxes.length; i++)
        for (let j = i + 1; j < boxes.length; j++) {
          const id = `${boxes[i][0]}|${boxes[j][0]}`;
          if (intersects(boxes[i][1], boxes[j][1])) clashes.push(id);
        }
      expect(clashes, `overlapping HUD parts: ${clashes.join(', ')}`).toEqual([]);
    });
  });
}

/**
 * The floating A-Z tab exists on every full-screen scene (/explore, /mars, /moon,
 * /venus). On a non-touch window it must own pixels of its own: clear of the
 * footer (strip or More button), the time dock, the scale panel, the HUD chips
 * and the surface HUD (distance scale, index handle, controls), and topmost at
 * its own centre (nothing painted over it, no ghost text behind a footer link).
 */
const TAB_ROUTES = ['/explore', '/mars', '/moon', '/venus'];
const TAB_NEIGHBOURS: Array<[string, string]> = [
  ['footer', '.footer-menu'],
  ['dock', '.time-controls'],
  ['scale panel', '.scale-strip'],
  ['chips', '.ctrl-row.chips'],
  ['surface hud', '.hud-controls'],
  ['distance scale', '.distance-scale'],
  ['surface index', '.surface-index-desktop'],
  ['side panel', '.detail-panel'],
];

for (const route of TAB_ROUTES) {
  for (const size of HUD_SIZES) {
    const key = `${size.width}x${size.height}`;
    test.describe(`A-Z tab ${route} — ${key} non-touch`, () => {
      test.use({ viewport: size, hasTouch: false, isMobile: false });

      test('the tab clears the footer and the HUD, and nothing paints over it', async ({
        page,
      }) => {
        test.slow(route === '/explore');
        await page.goto(route, { waitUntil: 'networkidle' });
        await page.waitForTimeout(500);
        const tab = page.locator('.entity-index.floating summary');
        await expect(tab).toBeVisible();
        const t = await box(tab);
        const clashes: string[] = [];
        for (const [name, sel] of TAB_NEIGHBOURS) {
          const l = page.locator(sel).first();
          if (!(await l.isVisible())) continue;
          const o = await box(l);
          if (intersects(t, o)) clashes.push(`${name} ${JSON.stringify(o)}`);
        }
        expect(clashes, `tab ${JSON.stringify(t)} overlaps: ${clashes.join('; ')}`).toEqual([]);
        const covered = await tab.evaluate((el) => {
          const r = el.getBoundingClientRect();
          const hits = document.elementsFromPoint(r.left + r.width / 2, r.top + r.height / 2);
          return hits
            .slice(0, hits.indexOf(el) < 0 ? hits.length : hits.indexOf(el))
            .filter((h) => !el.contains(h))
            .map((h) => `${h.tagName.toLowerCase()}.${h.className}`);
        });
        expect(covered, `painted over the tab: ${covered.join(', ')}`).toEqual([]);
      });
    });
  }
}
