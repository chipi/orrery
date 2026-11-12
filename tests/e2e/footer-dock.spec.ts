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
 * /explore HUD: the flat chip row, the orbit ruler, the bottom-left card, the
 * time dock, the INDEX tab, the footer and the scale panel own separate
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
  ['earth-compare', '.scales-dock'],
  ['dock', '.time-controls'],
  ['index tab', '.scale-index-handle'],
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
          // By design (operator 2026-11-12): on short windows the INDEX tab lies over the ruler's
          // left edge rather than pushing the ruler inward.
          if (id === 'ruler|index tab') continue;
          if (intersects(boxes[i][1], boxes[j][1])) clashes.push(id);
        }
      expect(clashes, `overlapping HUD parts: ${clashes.join(', ')}`).toEqual([]);
    });
  });
}

/**
 * The worlds' HUD (/earth /moon /mars /venus): the view-control row, the one flat chip
 * row, the INDEX pull tab (and its panel, opened), the orbit ruler, the distance scale,
 * the nation legend, the locate chip and the footer own separate pixels on a non-touch
 * window. The A–Z tab is gone: the INDEX panel carries the entity-page links (ADR-096 #11).
 */
const WORLD_ROUTES = ['/earth', '/moon', '/mars', '/venus'];
const WORLD_SIZES = [
  { width: 1440, height: 900 },
  { width: 1366, height: 768 },
  { width: 1280, height: 720 },
  { width: 1100, height: 700 },
  { width: 800, height: 375 },
];
const WORLD_HUD_PARTS: Array<[string, string]> = [
  ['view row', '.hud-controls > .ctrl-row:not(.chips)'],
  ['chips', '.ctrl-row.chips'],
  ['ruler', '.ruler'],
  ['index tab', '.surface-index-handle'],
  ['distance scale', '.distance-scale'],
  ['nation legend', '.legend-3d'],
  ['locate', '.locate-slot'],
  ['footer', '.footer-menu'],
];

for (const route of WORLD_ROUTES) {
  for (const size of WORLD_SIZES) {
    const key = `${size.width}x${size.height}`;
    test.describe(`world HUD ${route} — ${key} non-touch`, () => {
      test.use({ viewport: size, hasTouch: false, isMobile: false });

      test('no two HUD parts intersect, with the INDEX panel closed and open', async ({ page }) => {
        test.slow();
        await page.goto(route, { waitUntil: 'networkidle' });
        await expect(page.locator('.ctrl-row.chips')).toBeVisible();
        await page.waitForTimeout(500);
        const measure = async (parts: Array<[string, string]>) => {
          const boxes: Array<[string, Box]> = [];
          for (const [name, sel] of parts) {
            const l = page.locator(sel).first();
            if (!(await l.isVisible())) continue;
            boxes.push([name, await box(l)]);
          }
          const clashes: string[] = [];
          for (let i = 0; i < boxes.length; i++)
            for (let j = i + 1; j < boxes.length; j++)
              if (intersects(boxes[i][1], boxes[j][1]))
                clashes.push(`${boxes[i][0]}|${boxes[j][0]}`);
          return { boxes, clashes };
        };
        const closed = await measure(WORLD_HUD_PARTS);
        expect(closed.boxes.length).toBeGreaterThanOrEqual(4);
        expect(closed.clashes, `overlapping HUD parts: ${closed.clashes.join(', ')}`).toEqual([]);

        await page.getByTestId('surface-index-toggle').click();
        await expect(page.locator('.surface-index-desktop')).toBeVisible();
        const open = await measure([
          ['view row', '.hud-controls > .ctrl-row:not(.chips)'],
          ['chips', '.ctrl-row.chips'],
          ['index panel', '.surface-index-desktop'],
        ]);
        expect(
          open.clashes,
          `overlapping with the INDEX panel: ${open.clashes.join(', ')}`,
        ).toEqual([]);
      });
    });
  }
}
