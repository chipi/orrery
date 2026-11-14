import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { waitForHydration } from './_helpers/hydration';

/**
 * The program page (E1, UXD-032): a section with no rows draws nothing, label included; related
 * programs and surface sites are rails of one MiniCard; hardware is compact cards with a rectangular
 * mini hero; the mission pane keeps one box for every mission; an Earth surface card opens
 * `/earth?object=` (the parameter Earth reads). Runs on all three projects.
 */

const rj = <T>(p: string): T => JSON.parse(readFileSync(p, 'utf8')) as T;
const program = (id: string) =>
  rj<{
    related_programs?: string[];
    roster: { ref?: string }[];
    surface_sites?: unknown[];
  }>(`static/data/programs/${id}.json`);

/** The page's top-level sections, in DOM order, by class (locale independent). */
const sectionOrder = (page: Page): Promise<string[]> =>
  page.evaluate(() =>
    [...document.querySelectorAll('article.program > section')].map(
      (s) => s.className.split(' ')[0],
    ),
  );

test.describe('program page sections and cards', () => {
  test('/programs/sputnik: no Hardware heading and no empty list', async ({ page }) => {
    await page.goto('/programs/sputnik');
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('section.hardware-section')).toHaveCount(0);
    await expect(page.locator('ul.hardware')).toHaveCount(0);
    for (const h of await page.locator('article.program h2').all()) {
      const rows = await h.evaluate((el) => {
        const sec = el.closest('section');
        return sec ? sec.querySelectorAll('li, p, figure, ol').length : 1;
      });
      expect(rows, await h.innerText()).toBeGreaterThan(0);
    }
  });

  test('/programs/apollo: sections in order, a two-card surface rail, compact hardware cards', async ({
    page,
  }) => {
    await page.goto('/programs/apollo');
    const order = await sectionOrder(page);
    const want = ['roster', 'surface', 'hardware-section', 'related', 'see-also', 'sources'];
    expect(order.filter((c) => want.includes(c))).toEqual(want);

    const apollo = program('apollo');
    await expect(page.locator('section.surface .mini-card')).toHaveCount(
      apollo.surface_sites?.length ?? -1,
    );
    const hw = page.locator('ul.hardware .hw-card');
    await expect(hw).toHaveCount(apollo.roster.filter((r) => r.ref === 'fleet').length);
    const first = hw.first();
    const box = await first.boundingBox();
    expect(box!.height).toBeLessThanOrEqual(58);
    const img = first.locator('img.hw-hero');
    await expect(img).toHaveAttribute('alt', '');
    const ib = await img.boundingBox();
    expect(Math.round(ib!.width)).toBe(72);
    expect(Math.round(ib!.height)).toBe(48);
    await expect(page.locator('ul.hardware img.entity-thumb')).toHaveCount(0);
    await expect(page.locator('ul.hardware a')).toHaveCount(await hw.count());
    // "Go deeper" no longer repeats the related programs.
    await expect(page.locator('section.see-also a[href*="/programs/"]')).toHaveCount(0);
  });

  test('the related rail has one card per related program, all one size, inside the rail', async ({
    page,
  }) => {
    await page.goto('/programs/apollo');
    const cards = page.locator('section.related .mini-card');
    await expect(cards).toHaveCount(program('apollo').related_programs!.length);
    const sizes = await cards.evaluateAll((els) =>
      els.map((e) => [
        Math.round(e.getBoundingClientRect().width),
        Math.round(e.getBoundingClientRect().height),
      ]),
    );
    expect(new Set(sizes.map((s) => s[0]))).toEqual(new Set([176]));
    expect(new Set(sizes.map((s) => s[1])).size).toBe(1);
    await expect(page.locator('section.related ul[aria-label]')).toHaveCount(1);
  });

  test('/de/programs/iss: the related cards carry the overlay names, not capitalised slugs', async ({
    page,
  }) => {
    await page.goto('/de/programs/iss');
    const names = await page.locator('section.related .mini-card .mc-title').allInnerTexts();
    expect(names).toContain('ESA — Europa in der bemannten Raumfahrt');
    expect(names).not.toContain('Esa Human');
  });

  test('a rail scrolls sideways inside its box; the page does not (390 px)', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/programs/mars-rovers');
    const rail = page.locator('section.surface ul.card-rail');
    await expect(rail.locator('.mini-card')).toHaveCount(5);
    const m = await rail.evaluate((el) => [el.scrollWidth, el.clientWidth]);
    expect(m[0]).toBeGreaterThan(m[1]);
    const doc = await page.evaluate(() => [
      document.documentElement.scrollWidth,
      document.documentElement.clientWidth,
    ]);
    expect(doc[0]).toBeLessThanOrEqual(doc[1]);
  });
});

test.describe('the mission pane keeps its box', () => {
  test('/programs/mercury: the pane has one height for all six missions; nothing below moves', async ({
    page,
  }) => {
    await page.goto('/programs/mercury');
    await waitForHydration(page);
    const buttons = page.locator('.roster-split .timeline button.t-name');
    const n = await buttons.count();
    expect(n).toBe(6);
    const pane = page.locator('aside.detail');
    const below = page.locator('section.hardware-section h2');
    const measure = async () => ({
      h: (await pane.boundingBox())!.height,
      y: await below.evaluate((el) => el.getBoundingClientRect().top + window.scrollY),
    });
    await buttons.first().click();
    const base = await measure();
    for (let i = 1; i < n; i++) {
      await buttons.nth(i).click();
      await expect(pane.locator('.d-name')).not.toHaveText('');
      const got = await measure();
      expect(Math.abs(got.h - base.h), `mission ${i} pane height`).toBeLessThanOrEqual(1);
      expect(Math.abs(got.y - base.y), `mission ${i} section below`).toBeLessThanOrEqual(1);
    }
  });
});

test.describe('the Earth surface card', () => {
  test('/programs/iss: the card opens /earth?object=iss and leaves the ISS selected', async ({
    page,
    isMobile,
  }) => {
    test.slow(isMobile, 'Earth panel mount is slow on a touch profile');
    await page.goto('/programs/iss');
    const card = page.locator('section.surface a.mini-card').first();
    await expect(card).toHaveAttribute('href', /\/earth\?object=iss$/);
    await card.click();
    await expect(page).toHaveURL(/\/earth\?object=iss/);
    await expect(page.locator('aside.panel')).toBeVisible({ timeout: 25_000 });
    expect(new URL(page.url()).searchParams.get('object')).toBe('iss');
  });
});
