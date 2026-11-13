import { expect, test, type Locator, type Page } from '@playwright/test';
import { waitForHydration } from './_helpers/hydration';

/**
 * UXD-024 (slices C4 + C5): the orbit ruler.
 *  - one line per row on /explore, /earth, /moon, /mars in seven locales (pointer devices), and in
 *    the touch drawer (phone projects);
 *  - hover and keyboard focus of a row draw the regime in the scene (`data-regime-highlight`),
 *    a click opens the panel and keeps `:active` while it is open;
 *  - the header folds the ruler and the choice survives a reload;
 *  - the bottom-left column (readout, locate chip, ruler, imagery card) owns separate pixels;
 *  - "who lives here" shows the resident's photo where there is one and the dot where there is not;
 *  - founding missions are links, without the country tag, and Hope resolves in German.
 *
 * Runs on desktop-chromium, mobile-chromium and mobile-landscape-chromium; each test says which
 * device type it is for.
 */

type Box = { x: number; y: number; width: number; height: number };
const box = async (l: Locator): Promise<Box> => (await l.boundingBox()) as Box;
const intersects = (a: Box, b: Box) =>
  a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

const hook = (page: Page) =>
  page.evaluate(
    () =>
      document.querySelector('[data-regime-highlight]')?.getAttribute('data-regime-highlight') ??
      '',
  );

async function open(page: Page, path: string): Promise<void> {
  // The dev server now and then aborts a navigation that a hot update interrupted: once more.
  await page.goto(path, { waitUntil: 'load' }).catch(() => page.goto(path, { waitUntil: 'load' }));
  await waitForHydration(page);
}

const LOCALES = ['en', 'de', 'ru', 'fr', 'hi', 'nl', 'ja'];
const ROUTES = ['/explore', '/earth', '/moon', '/mars'];
const withLocale = (loc: string, route: string) => (loc === 'en' ? route : `/${loc}${route}`);

/** Every row's height against the shortest: two lines would be about twice as tall. */
async function rowsAreOneLine(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const bands = [...document.querySelectorAll('.ruler .band')].filter(
      (b) => (b as HTMLElement).offsetParent !== null,
    ) as HTMLElement[];
    if (!bands.length) return ['no visible rows'];
    const hs = bands.map((b) => b.getBoundingClientRect().height);
    const min = Math.min(...hs);
    const bad: string[] = [];
    bands.forEach((b, i) => {
      const name = b.querySelector('.band-name') as HTMLElement;
      if (hs[i] > min * 1.4) bad.push(`${b.dataset.regime}: height ${hs[i]} vs ${min}`);
      if (name.scrollWidth > name.clientWidth + 1) bad.push(`${b.dataset.regime}: name cut off`);
    });
    return bad;
  });
}

test.describe('one line per row (pointer devices)', () => {
  test.skip(({ hasTouch }) => hasTouch, 'the touch drawer has its own test');
  test.use({ viewport: { width: 1280, height: 720 } });

  for (const route of ROUTES) {
    test(`${route}: every row is one line in ${LOCALES.join(', ')}`, async ({ page }) => {
      test.slow();
      for (const loc of LOCALES) {
        await open(page, withLocale(loc, route));
        await expect(page.locator('.ruler .band').first()).toBeVisible({ timeout: 20_000 });
        expect(await rowsAreOneLine(page), `${loc} ${route}`).toEqual([]);
      }
    });
  }
});

test.describe('touch drawer', () => {
  test.skip(({ hasTouch }) => !hasTouch, 'pointer devices have the ruler in the corner');

  for (const route of ['/earth', '/explore']) {
    test(`${route}: the Ruler tab lists one line per row; a tap opens the regime panel`, async ({
      page,
    }) => {
      test.slow();
      await open(page, route);
      await page.locator('.mdg-tab', { hasText: /ruler/i }).first().click();
      await expect(page.locator('.mdg-body .ruler .band').first()).toBeVisible();
      expect(await rowsAreOneLine(page)).toEqual([]);
      // The drawer's ruler has no fold: its tab is the fold.
      await expect(page.locator('.mdg-body .ruler').getByTestId('ruler-toggle')).toHaveCount(0);
      const first = page.locator('.mdg-body .ruler .band').first();
      const id = await first.getAttribute('data-regime');
      await first.tap();
      await expect(page.locator('aside.panel').first()).toBeVisible();
      await expect.poll(() => hook(page)).toBe(`${id}:active`);
    });
  }
});

test.describe('the regime in the scene (pointer devices)', () => {
  test.skip(({ hasTouch }) => hasTouch, 'hover is a pointer affair');
  test.use({ viewport: { width: 1280, height: 720 } });

  const CASES: Array<[string, string]> = [
    ['/earth', 'LEO'],
    ['/moon', 'LLO'],
    ['/mars', 'LMO'],
    ['/explore', 'KUIPER'],
  ];
  for (const [route, id] of CASES) {
    test(`${route}: hover and focus of ${id} draw it, a click keeps it while the panel is open`, async ({
      page,
    }) => {
      test.slow();
      await open(page, route);
      const row = page.locator(`.ruler .band[data-regime="${id}"]`);
      await expect(row).toBeVisible({ timeout: 20_000 });
      await page.waitForTimeout(1500);
      expect(await hook(page)).toBe('');

      // Hover: the hook says so, and the canvas changes (a pixel-difference check of the scene).
      const before = await page.screenshot({ clip: { x: 300, y: 100, width: 800, height: 520 } });
      await row.hover();
      await expect.poll(() => hook(page)).toBe(`${id}:hover`);
      await page.waitForTimeout(600);
      const during = await page.screenshot({ clip: { x: 300, y: 100, width: 800, height: 520 } });
      expect(during.equals(before), 'the scene did not change while hovering').toBe(false);
      await page.mouse.move(700, 120);
      await expect.poll(() => hook(page)).toBe('');

      // Keyboard focus: Tab from the header onto the first row previews it.
      await page.getByTestId('ruler-toggle').focus();
      await page.keyboard.press('Tab');
      const first = await page.locator('.ruler .band').first().getAttribute('data-regime');
      await expect.poll(() => hook(page)).toBe(`${first}:hover`);
      await page.locator('.ruler .band').first().blur();
      await expect.poll(() => hook(page)).toBe('');

      // Click: the panel opens and the regime stays drawn after the pointer leaves.
      await row.click();
      await expect(page.locator('aside.panel').first()).toBeVisible();
      await page.mouse.move(700, 120);
      await row.evaluate((el) => (el as HTMLElement).blur());
      await expect.poll(() => hook(page)).toBe(`${id}:active`);
      await expect(row).toHaveAttribute('aria-current', 'true');

      // Closing the panel clears it.
      await page.keyboard.press('Escape');
      // The panel hands focus back to the row it came from: that is a keyboard preview, not a
      // lingering highlight.
      await row.evaluate((el) => (el as HTMLElement).blur());
      await expect.poll(() => hook(page)).toBe('');
    });
  }
});

test.describe('collapse (pointer devices)', () => {
  test.skip(({ hasTouch }) => hasTouch, 'the drawer has no fold');
  test.use({ viewport: { width: 1280, height: 720 } });

  test('the header folds the ruler, aria-expanded follows, the choice survives a reload', async ({
    page,
  }) => {
    test.slow();
    await open(page, '/earth');
    const toggle = page.getByTestId('ruler-toggle');
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('.ruler .band').first()).toBeVisible();
    const open1 = await box(page.locator('.ruler'));

    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(page.locator('.ruler .band').first()).toBeHidden();
    await expect(toggle).toBeVisible();
    expect((await box(page.locator('.ruler'))).height).toBeLessThan(open1.height / 3);

    await page.reload({ waitUntil: 'load' });
    await waitForHydration(page);
    await expect(page.getByTestId('ruler-toggle')).toHaveAttribute('aria-expanded', 'false');
    await expect(page.locator('.ruler .band').first()).toBeHidden();

    // Folded or open, the column keeps the chip and the ruler apart.
    const apart = async () =>
      expect(
        intersects(await box(page.locator('.locate-slot')), await box(page.locator('.ruler'))),
      ).toBe(false);
    await apart();
    await page.getByTestId('ruler-toggle').click();
    await expect(page.locator('.ruler .band').first()).toBeVisible();
    await apart();
  });

  test('with no saved choice a short window starts folded; a saved choice wins', async ({
    page,
  }) => {
    test.slow();
    await page.setViewportSize({ width: 1280, height: 500 });
    await open(page, '/moon');
    await expect(page.getByTestId('ruler-toggle')).toHaveAttribute('aria-expanded', 'false');
    await page.getByTestId('ruler-toggle').click();
    await page.reload({ waitUntil: 'load' });
    await waitForHydration(page);
    await expect(page.getByTestId('ruler-toggle')).toHaveAttribute('aria-expanded', 'true');
  });
});

test.describe('the bottom-left column (pointer devices)', () => {
  test.skip(({ hasTouch }) => hasTouch, 'on a phone the chip is in the bar');

  for (const size of [
    { width: 1440, height: 900 },
    { width: 1280, height: 720 },
  ]) {
    test(`/moon with the readout open at ${size.width}x${size.height}: no two parts intersect`, async ({
      page,
      context,
    }) => {
      test.slow();
      await context.grantPermissions(['geolocation']);
      await context.setGeolocation({ latitude: 48.2, longitude: 16.4 });
      await page.setViewportSize(size);
      await open(page, '/moon');
      await page.getByTestId('moon-locate-me').click();
      await expect(page.getByTestId('moon-observer-readout')).toBeVisible({ timeout: 20_000 });
      await page.waitForTimeout(500);
      const parts: Array<[string, Locator]> = [
        ['readout', page.locator('.moon-observer')],
        ['locate', page.locator('.locate-slot')],
        ['ruler', page.locator('.ruler')],
        ['legend', page.locator('.legend-3d')],
        ['footer', page.locator('.footer-menu')],
      ];
      const boxes: Array<[string, Box]> = [];
      for (const [n, l] of parts)
        if (await l.first().isVisible()) boxes.push([n, await box(l.first())]);
      expect(boxes.map((b) => b[0])).toEqual(
        expect.arrayContaining(['readout', 'locate', 'ruler']),
      );
      const clashes: string[] = [];
      for (let i = 0; i < boxes.length; i++)
        for (let j = i + 1; j < boxes.length; j++)
          if (intersects(boxes[i][1], boxes[j][1])) clashes.push(`${boxes[i][0]}|${boxes[j][0]}`);
      expect(clashes, `overlapping: ${clashes.join(', ')}`).toEqual([]);
    });
  }

  test('/earth: locate chip, ruler and legend own separate pixels', async ({ page }) => {
    test.slow();
    await page.setViewportSize({ width: 1280, height: 720 });
    await open(page, '/earth');
    await expect(page.getByTestId('earth-locate-me')).toBeVisible();
    await page.waitForTimeout(1500);
    const chip = await box(page.locator('.locate-slot'));
    const ruler = await box(page.locator('.ruler'));
    expect(intersects(chip, ruler)).toBe(false);
    const legend = page.locator('.legend-3d').first();
    if (await legend.isVisible()) expect(intersects(ruler, await box(legend))).toBe(false);
  });

  test('/moon at a tier with imagery: the imagery card clears the column', async ({ page }) => {
    test.slow();
    await page.setViewportSize({ width: 1280, height: 720 });
    await open(page, '/moon?site=apollo11');
    const card = page.locator('.tier-context-card').first();
    await card.waitFor({ state: 'visible', timeout: 30_000 }).catch(() => undefined);
    test.skip(!(await card.isVisible()), 'no imagery card at the default tier here');
    const stack = await box(page.locator('.hud-stack-bl'));
    expect(intersects(await box(card), stack)).toBe(false);
  });
});

test.describe('who lives here and the founding missions', () => {
  const panel = (page: Page, text: RegExp) => page.locator('aside.panel').filter({ hasText: text });

  test('GIANTS: four loaded photos; BELT: two photos and two dots; the links keep their classes', async ({
    page,
  }) => {
    test.slow();
    await open(page, '/explore?regime=GIANTS');
    const giants = panel(page, /Jupiter/).first();
    await expect(giants).toBeVisible();
    await expect(giants.locator('.resident-thumb')).toHaveCount(4);
    await expect
      .poll(() =>
        giants
          .locator('.resident-thumb')
          .evaluateAll((els) => els.filter((e) => (e as HTMLImageElement).naturalWidth > 0).length),
      )
      .toBe(4);
    await expect(giants.locator('button.resident-link')).toHaveCount(4);

    await open(page, '/explore?regime=BELT');
    const belt = panel(page, /Pallas/).first();
    await expect(belt).toBeVisible();
    await expect(belt.locator('.resident-thumb')).toHaveCount(2);
    await expect(belt.locator('.thumb-slot .agency-dot')).toHaveCount(2);
    await expect(belt.locator('button.resident-link', { hasText: /Ceres/ })).toHaveCount(1);
    await expect(belt.locator('.resident-label', { hasText: /Pallas/ })).toHaveCount(1);
  });

  test('GIANTS: a first with a mission page opens the mission in place over the regime panel', async ({
    page,
  }) => {
    test.slow();
    await open(page, '/explore?regime=GIANTS');
    const giants = panel(page, /Jupiter/).first();
    await giants.locator('.firsts-link', { hasText: /Pioneer 10/ }).click();
    await expect(page.locator('aside.panel', { hasText: /Pioneer 10/ }).last()).toBeVisible();
    expect(new URL(page.url()).pathname).toBe('/explore');
    await expect(page).toHaveURL(/regime=GIANTS/);
    // Covered, not unmounted: the regime panel is still in the page.
    await expect(giants).toBeAttached();
  });

  test('/moon?regime=LLO: the first is an anchor to its mission page', async ({ page }) => {
    await open(page, '/moon?regime=LLO');
    const link = page.locator('.firsts-link').first();
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute('href', /\/missions\?id=luna10$/);
  });

  for (const loc of ['en', 'de', 'ru']) {
    test(`${loc}: no founding mission ends in a country tag; 23 of 38 are links`, async ({
      page,
    }) => {
      test.slow();
      let links = 0;
      const tails: string[] = [];
      for (const [route, ids] of [
        ['/earth', ['LEO', 'MEO', 'GEO', 'HEO', 'MOON', 'L2']],
        ['/moon', ['LLO', 'HLO', 'NRHO', 'L2']],
        ['/mars', ['LMO', 'HMO', 'DMO']],
        [
          '/explore',
          ['SUN', 'TERRESTRIAL', 'BELT', 'GIANTS', 'KUIPER', 'SCATTERED', 'HELIOPAUSE', 'OORT'],
        ],
      ] as Array<[string, string[]]>) {
        for (const id of ids) {
          await open(page, `${withLocale(loc, route)}?regime=${id}`);
          const items = page.locator('aside.panel .firsts li');
          await expect(page.locator('aside.panel').first()).toBeVisible();
          links += await page.locator('aside.panel .firsts-link').count();
          for (const t of await items.locator('.firsts-link, .firsts-label').allTextContents()) {
            const m = t.match(/[(（]([^()（）]*)[)）]\s*↗?\s*$/);
            if (
              m &&
              /USA|USSR|UdSSR|США|СССР|China|Китай|Netherlands|Niederlande|Нидерланды|ESA/.test(
                m[1],
              )
            )
              tails.push(t.trim());
          }
        }
      }
      expect(tails).toEqual([]);
      expect(links).toBe(23);
    });
  }

  test('de: the Hope link resolves to the mission page', async ({ page }) => {
    test.slow();
    await open(page, '/de/mars?regime=DMO');
    const link = page.locator('.firsts-link').first();
    await expect(link).toHaveAttribute('href', /\/missions\?id=hope-probe$/);
    await link.click();
    await expect(page).toHaveURL(/\/missions\?id=hope-probe/);
    await expect(
      page.locator('aside.panel', { hasText: /Hope|Al-Amal|Amal/i }).first(),
    ).toBeVisible({
      timeout: 20_000,
    });
  });
});
