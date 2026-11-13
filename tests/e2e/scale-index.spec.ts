import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Locator, type Page } from '@playwright/test';
import { collectCanonicalRoutes } from '../../scripts/site-routes.mjs';
import { waitForHydration } from './_helpers/hydration';
import { expectLinkTargets, expectOneTabStop } from './_helpers/index-panel';
import {
  galaxyPages,
  galaxyRows,
  structurePages,
  structureRows,
  structureRowsOf,
} from './_helpers/outer-pages';

/**
 * UXD-017: the same INDEX on all eight /explore scales. One spec over every scale: the panel is
 * in the DOM and hidden until its handle is pressed, it is one roving Tab stop, search filters
 * it and the count follows, Enter selects what a canvas click would, and the ↗ link is a real
 * target. The static HTML (no browser) holds only the rows with an entity page, as links.
 * Run on all three projects: the handle and the ↗ links change size on touch, and on touch the
 * INDEX closes on a scale jump.
 */

type Scale = {
  id: string;
  /** ?context= value; null = the solar system, the default. */
  context: string | null;
  /** The handle's aria-label (en-US) at this scale. */
  aria: string;
  /** A row that is a plain object of the scene (not a black hole), selected by Enter. */
  pick: string;
  /** Whether any row has an entity page (so ↗ links exist). The two outer-scale page types follow their overlay files. */
  links: boolean;
};

const SCALES: Scale[] = [
  {
    id: 'solar-system',
    context: null,
    aria: 'Body index — jump to the Sun, any planet, or a small body',
    pick: 'mars',
    links: true,
  },
  {
    id: 'neighborhood',
    context: 'neighborhood',
    aria: 'Stellar Neighborhood index — jump to a named star or a deep-sky object',
    pick: 'canopus',
    links: true,
  },
  {
    id: 'milky-way',
    context: 'milky-way',
    aria: 'Milky Way index — jump to the Sun, a globular cluster, a satellite galaxy, a spiral arm or a black hole',
    pick: 'm13',
    links: true,
  },
  {
    id: 'local-group',
    context: 'local-group',
    aria: 'Local Group index — jump to a member galaxy',
    pick: 'andromeda',
    links: true,
  },
  {
    id: 'local-sheet',
    context: 'local-sheet',
    aria: 'Local Sheet index — jump to a member group',
    pick: 'm81-group',
    links: structureRowsOf('local-sheet') > 0,
  },
  {
    id: 'virgo',
    context: 'virgo',
    aria: 'Virgo Supercluster index — jump to a member',
    pick: 'virgo-cluster',
    links: true,
  },
  {
    id: 'laniakea',
    context: 'laniakea',
    aria: 'Laniakea index — jump to a member',
    pick: 'great-attractor',
    links: structureRowsOf('laniakea') > 0,
  },
  {
    id: 'cosmic-web',
    context: 'cosmic-web',
    aria: 'Cosmic web index — jump to a structure',
    pick: 'shapley-concentration',
    links: true,
  },
];

const routes = collectCanonicalRoutes() as string[];
const toggle = (p: Page) => p.getByTestId('scale-index-toggle');
const panelOf = (p: Page, scale: string) => p.locator(`aside.scale-index[data-scale="${scale}"]`);
const rowsOf = (panel: Locator) => panel.locator('button.si-row');

/** Cold-load a scale and wait until it is the one on screen (the handle is named after it). */
async function openScale(page: Page, s: Scale) {
  await page.goto(s.context ? `/explore?context=${s.context}` : '/explore');
  await waitForHydration(page);
  await expect(toggle(page)).toHaveAttribute('aria-label', s.aria, { timeout: 45_000 });
}

const finePointer = (page: Page) =>
  page.evaluate(() => matchMedia('(hover: hover) and (pointer: fine)').matches);

test.describe.configure({ timeout: 60_000 });

test.describe('the prerendered /explore HTML holds the INDEX links, no dead button', () => {
  test.beforeEach(() => {
    test.skip(
      test.info().project.name !== 'desktop-chromium',
      'static HTML: one project is enough',
    );
  });

  for (const locale of ['', '/de']) {
    test(`${locale}/explore: 48 body, 66 star, 4 black-hole and 153 deep-sky links, the galaxy and structure pages of the overlay files, the lists that have one, no button row`, async ({
      request,
    }) => {
      const res = await request.get(`${locale}/explore`);
      expect(res.ok()).toBe(true);
      const html = await res.text();
      const lists = [...html.matchAll(/<aside[^>]*class="scale-index"[^>]*>/g)].map(
        (m) => /data-scale="([a-z-]+)"/.exec(m[0])?.[1],
      );
      // Six lists always have a linked row; the Local Sheet and Laniakea appear once one of their
      // members has a structure page (the overlay files decide, ADR-096 item 18).
      expect(lists.sort()).toEqual(
        [
          'cosmic-web',
          'local-group',
          'milky-way',
          'neighborhood',
          'solar-system',
          'virgo',
          ...(structureRowsOf('local-sheet') > 0 ? ['local-sheet'] : []),
          ...(structureRowsOf('laniakea') > 0 ? ['laniakea'] : []),
        ].sort(),
      );
      expect(html.match(/<button[^>]*class="[^"]*\bsi-row\b/g) ?? []).toHaveLength(0);

      // Every link in the lists is a page the site really has.
      const canonical = new Set(routes.map((r) => `${locale}${r}`));
      const listed = [...html.matchAll(/<a\b[^>]*class="si-row"[^>]*>/g)].map(
        (m) => /href="([^"]+)"/.exec(m[0])?.[1] ?? '',
      );
      for (const href of listed) expect(canonical.has(href), `${href} is not a route`).toBe(true);
      const kind = (prefix: string) => listed.filter((h) => h.startsWith(`${locale}${prefix}`));
      expect(kind('/explore/stars/')).toHaveLength(66);
      expect(kind('/explore/black-holes/')).toHaveLength(4);
      // 140 objects with text, each linked from the neighbourhood; one real object, one page, so the
      // 7 Milky Way globulars, the 4 Local Group twins (m32, m110, andromeda, triangulum), Omega Centauri
      // (ngc-5139) and the Carina alias (carina-nebula, ngc-3372) link the same pages: 13 twin rows.
      expect(kind('/explore/deep-sky/')).toHaveLength(140 + 13);
      expect(new Set(kind('/explore/deep-sky/')).size).toBe(140);
      // The galaxy rows are the Local Group's, the Magellanic Clouds twice (also in the Milky Way
      // scale); the structure rows are one per scale that lists the structure (local-group: two).
      expect(kind('/explore/galaxies/')).toHaveLength(galaxyRows());
      expect(new Set(kind('/explore/galaxies/')).size).toBe(galaxyPages.size);
      expect(kind('/explore/structures/')).toHaveLength(structureRows());
      expect(new Set(kind('/explore/structures/')).size).toBe(structurePages.size);
      expect(listed).toHaveLength(48 + 66 + 4 + 140 + 13 + galaxyRows() + structureRows());
      // Every body, star, black-hole and deep-sky page of the site is one of those links.
      const pages = routes.filter(
        (r) => /^\/explore\/[^/]+(\/[^/]+)?$/.test(r) && r !== '/explore/hub',
      );
      expect(pages.filter((r) => !listed.includes(`${locale}${r}`))).toEqual([]);
    });
  }
});

for (const s of SCALES) {
  test.describe(`/explore INDEX — ${s.id}`, () => {
    test.beforeEach(() => {
      test.skip(
        s.context !== null &&
          !['neighborhood', 'milky-way'].includes(s.context) &&
          test.info().project.name === 'mobile-landscape-chromium',
        'heavy sequential multi-scene cold-load starves the 2-CPU landscape shard',
      );
    });

    test('hidden but in the DOM; the handle opens it alone; one Tab stop; arrows move; search filters', async ({
      page,
    }) => {
      test.slow();
      await openScale(page, s);
      const panel = panelOf(page, s.id);
      await expect(panel).toHaveCount(1);
      await expect(panel).toBeHidden();

      await toggle(page).click();
      await expect(panel).toBeVisible();
      await expect(page.locator('aside.scale-index:visible')).toHaveCount(1);
      await expect(panel).toHaveAttribute('aria-label', s.aria);

      const rows = rowsOf(panel);
      await expect(rows.first()).toBeVisible();
      await expectOneTabStop(panel.locator('button.si-row, a.si-row, a.si-page'));

      await rows.first().focus();
      await page.keyboard.press('ArrowDown');
      await expect
        .poll(() => rows.first().evaluate((el) => el === document.activeElement))
        .toBe(false);
      expect(await page.evaluate(() => document.activeElement?.closest('.si-list') !== null)).toBe(
        true,
      );

      const count = panel.locator('.si-count');
      await expect(count).toHaveText(/^\d+ \/ \d+$/);
      const [shown, total] = (await count.innerText()).split(' / ').map(Number);
      expect(shown).toBe(total);
      expect(total).toBeGreaterThan(1);
      const name = (await rows.last().locator('.si-name').textContent())!.trim();
      await panel.locator('input[type="search"]').fill(name);
      await expect
        .poll(async () => Number((await count.innerText()).split(' / ')[0]))
        .toBeLessThan(total);
      expect(await rows.count()).toBeGreaterThanOrEqual(1);
      await panel.locator('input[type="search"]').fill('');
      await expect(count).toHaveText(`${total} / ${total}`);

      await panel.getByRole('button', { name: 'Close index' }).click();
      await expect(panel).toBeHidden();
    });

    test('Enter on a row opens that object and the INDEX stays open; the ↗ links are real targets', async ({
      page,
    }) => {
      test.slow();
      await openScale(page, s);
      await toggle(page).click();
      const panel = panelOf(page, s.id);
      const row = panel.locator(`button.si-row[data-index-id="${s.pick}"]`);
      await expect(row).toBeVisible();
      const name = (await row.locator('.si-name').textContent())!.trim();
      await row.focus();
      await page.keyboard.press('Enter');
      const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      await expect(
        page
          .locator('aside.panel')
          .filter({ hasText: new RegExp(escaped, 'i') })
          .first(),
      ).toBeVisible({ timeout: 20_000 });
      await expect(panel).toBeVisible();
      await expect(row).toHaveAttribute('aria-current', 'true');

      // UXD-019: a row also takes the camera, as a canvas click does (the neighbourhood's
      // frameStar turns the view instead of moving its origin, and is not read here).
      if (s.id !== 'neighborhood') {
        await page.waitForTimeout(900);
        await expect
          .poll(() => page.evaluate(() => window.__exploreCameraState!().flying), {
            timeout: 10_000,
          })
          .toBe(false);
        const { origin } = await page.evaluate(() => window.__exploreCameraState!());
        const target =
          s.id === 'solar-system'
            ? await page.evaluate(() => window.__exploreBodyPosition!('planet:mars')!)
            : null;
        const off = Math.hypot(...origin.map((v, i) => (target ? v - target[i] : v)));
        if (target) expect(off, 'the camera is on Mars').toBeLessThan(2);
        else expect(off, 'the camera panned to the member').toBeGreaterThan(1);
      }

      const links = panel.locator('a.si-page');
      if (s.links) await expectLinkTargets(links);
      else await expect(links).toHaveCount(0);
    });

    test('the handle is a 30 px target (44 px on touch) and clear of the other chrome', async ({
      page,
    }) => {
      test.slow();
      await openScale(page, s);
      const fine = await finePointer(page);
      const box = (await toggle(page).boundingBox())!;
      expect(box.width).toBeGreaterThanOrEqual(fine ? 29 : 43);
      expect(box.height).toBeGreaterThanOrEqual(fine ? 29 : 43);
      const others = [
        page.getByTestId('explore-scale-toggle'),
        page.locator('.scale-strip').first(),
        page.locator('.footer-menu').first(),
      ];
      for (const other of others) {
        if (!(await other.isVisible())) continue;
        const o = (await other.boundingBox())!;
        const apart =
          box.x + box.width <= o.x ||
          o.x + o.width <= box.x ||
          box.y + box.height <= o.y ||
          o.y + o.height <= box.y;
        expect(apart, `the INDEX handle overlaps ${await other.evaluate((e) => e.className)}`).toBe(
          true,
        );
      }
    });
  });
}

test.describe('/explore INDEX — black holes sit in the scale they belong to', () => {
  test.beforeEach(() => {
    test.skip(
      test.info().project.name === 'mobile-landscape-chromium',
      'heavy sequential multi-scene cold-load starves the 2-CPU landscape shard',
    );
  });

  const row = (panel: Locator, id: string) => panel.locator(`button.si-row[data-index-id="${id}"]`);

  test('the Milky Way lists Sagittarius A* and Cygnus X-1; the neighbourhood lists none', async ({
    page,
  }) => {
    test.slow();
    await openScale(page, SCALES[2]);
    await toggle(page).click();
    const mw = panelOf(page, 'milky-way');
    await expect(row(mw, 'sagittarius-a-star')).toBeVisible();
    await expect(row(mw, 'cygnus-x-1')).toBeVisible();
    await expect(row(mw, 'm87-star')).toHaveCount(0);
    await expect(panelOf(page, 'neighborhood').locator('.si-badge--black-hole')).toHaveCount(0);
    await expect(panelOf(page, 'neighborhood').locator('.si-section')).toHaveCount(2);
  });

  test('Virgo lists M87*', async ({ page }) => {
    test.slow();
    await openScale(page, SCALES[5]);
    await toggle(page).click();
    await expect(row(panelOf(page, 'virgo'), 'm87-star')).toBeVisible();
  });

  test('the Cosmic web lists Gargantua last, under Fiction', async ({ page }) => {
    test.slow();
    await openScale(page, SCALES[7]);
    await toggle(page).click();
    const web = panelOf(page, 'cosmic-web');
    const gargantua = row(web, 'gargantua');
    await expect(gargantua).toBeVisible();
    await expect(gargantua).toHaveClass(/si-row--fiction/);
    await expect(web.locator('.si-section').last()).toHaveText(/fiction/i);
    expect(await web.locator('button.si-row').last().getAttribute('data-index-id')).toBe(
      'gargantua',
    );
  });

  test('selecting Cygnus X-1 opens its panel and closes the INDEX', async ({ page }) => {
    test.slow();
    await openScale(page, SCALES[2]);
    await toggle(page).click();
    await row(panelOf(page, 'milky-way'), 'cygnus-x-1').click();
    await expect(
      page
        .locator('aside.panel')
        .filter({ hasText: /Cygnus X-1/i })
        .first(),
    ).toBeVisible({ timeout: 30_000 });
    await expect(panelOf(page, 'milky-way')).toBeHidden();
  });
});

test.describe('/explore INDEX — across a scale jump', () => {
  test.beforeEach(() => {
    test.skip(
      test.info().project.name === 'mobile-landscape-chromium',
      'heavy sequential multi-scene cold-load starves the 2-CPU landscape shard',
    );
  });

  test('open at the neighbourhood, jump to the Milky Way: the rail shows the Milky Way list on a fine pointer, closes on touch', async ({
    page,
  }) => {
    test.slow();
    await openScale(page, SCALES[1]);
    await toggle(page).click();
    await expect(panelOf(page, 'neighborhood')).toBeVisible();

    await page.getByTestId('explore-scale-toggle').click();
    await page.getByTestId('explore-scale-rung-milky-way').click();
    await expect(toggle(page)).toHaveAttribute('aria-label', SCALES[2].aria, { timeout: 45_000 });
    await expect(panelOf(page, 'neighborhood')).toBeHidden();
    if (await finePointer(page)) await expect(panelOf(page, 'milky-way')).toBeVisible();
    else await expect(panelOf(page, 'milky-way')).toBeHidden();
  });

  test('the scale ladder opens above an open INDEX: its rung is the hit target', async ({
    page,
  }) => {
    test.slow();
    await openScale(page, SCALES[1]);
    await toggle(page).click();
    await expect(panelOf(page, 'neighborhood')).toBeVisible();
    await page.getByTestId('explore-scale-toggle').click();
    const rung = page.getByTestId('explore-scale-rung-milky-way');
    await expect(rung).toBeVisible();
    // The INDEX rail (z 45) used to cover the open ladder and swallow the click.
    const hitIsRung = await rung.evaluate((el) => {
      const r = el.getBoundingClientRect();
      const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      return !!hit && el.contains(hit);
    });
    expect(hitIsRung, 'the Milky Way rung is what a click at its centre reaches').toBe(true);
    await rung.click();
    await expect(toggle(page)).toHaveAttribute('aria-label', SCALES[2].aria, { timeout: 45_000 });
  });
});

test.describe('/explore INDEX — axe with the INDEX open', () => {
  for (const s of [SCALES[0], SCALES[1]]) {
    test(`${s.id}: 0 critical or serious axe violations`, async ({ page }) => {
      test.slow();
      await openScale(page, s);
      await toggle(page).click();
      await expect(panelOf(page, s.id)).toBeVisible();
      const results = await new AxeBuilder({ page: page as never })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .disableRules(['region'])
        .include('aside.scale-index:not([hidden])')
        .analyze();
      const blocking = results.violations.filter(
        (v) => v.impact === 'critical' || v.impact === 'serious',
      );
      expect(blocking.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
    });
  }
});
