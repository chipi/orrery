import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Locator, type Page } from '@playwright/test';
import { waitForHydration } from './_helpers/hydration';

/**
 * Nav bar controls (UXD-016, slice A6): the right-hand cluster is 32 px on a fine pointer and
 * 44 px on touch in both axes, the bar is one height from one token, and High contrast, Share
 * and Debug sit behind one More menu (a WAI-ARIA menu button) on the bar and as drawer rows on
 * phones. The hamburger break stays at 1219 px; the per-locale measurement at the end only
 * reports the widths the follow-up needs (deferred list L2).
 *
 * Written without a browser run: tolerances are 1 px on sizes and gaps.
 */

const DECIDED_BAR_HEIGHT = 52;
const NAV = 'nav[aria-label]:not(.footer-menu)';

const project = () => test.info().project.name;
const nav = (page: Page) => page.locator(NAV).first();
const moreTrigger = (page: Page) => page.locator(`${NAV} .nav-more-trigger`);
const moreMenu = (page: Page) => page.locator('#nav-more-menu');
const row = (page: Page, id: 'contrast' | 'share' | 'debug') =>
  moreMenu(page).locator(`[data-more="${id}"]`);

async function open(page: Page, path = '/') {
  await page.goto(path, { waitUntil: 'networkidle' });
  await waitForHydration(page);
}

const box = async (l: Locator) => (await l.boundingBox())!;
const activeMore = (page: Page) =>
  page.evaluate(() => document.activeElement?.getAttribute('data-more') ?? null);

/** The visible bar controls, left to right: each button plus the locale picker's chip. */
async function visibleBarControls(page: Page): Promise<Locator[]> {
  const all = page.locator(`${NAV} .right > button, ${NAV} .right [data-locale-picker] > button`);
  const out: Locator[] = [];
  for (let i = 0; i < (await all.count()); i++) {
    if (await all.nth(i).isVisible()) out.push(all.nth(i));
  }
  return out;
}

test.describe('nav controls — fine pointer (desktop)', () => {
  test.use({ viewport: { width: 1440, height: 900 }, hasTouch: false, isMobile: false });
  test.beforeEach(() => {
    test.skip(project() !== 'desktop-chromium', 'fine-pointer sizing is a desktop-project check');
  });

  test('bar is the decided height from one token; the cluster is 32 px, 6 px apart, centred with the links', async ({
    page,
  }) => {
    await open(page);

    const token = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--nav-bar-height').trim(),
    );
    expect(token).toBe(`${DECIDED_BAR_HEIGHT}px`);
    const bar = await box(nav(page));
    expect(Math.abs(bar.height - DECIDED_BAR_HEIGHT)).toBeLessThanOrEqual(1);

    const controls = await visibleBarControls(page);
    // audio, locale, lens, settings, More (the hamburger is hidden above 1219 px)
    expect(controls).toHaveLength(5);
    const boxes = [];
    for (const c of controls) boxes.push(await box(c));
    for (const b of boxes) {
      expect(Math.abs(b.height - 32), `control height ${b.height}`).toBeLessThanOrEqual(1);
    }
    for (const i of [0, 2, 3, 4]) {
      expect(
        Math.abs(boxes[i].width - 32),
        `icon button width ${boxes[i].width}`,
      ).toBeLessThanOrEqual(1);
    }
    expect(boxes[1].width).toBeGreaterThanOrEqual(39); // the locale chip: min-width 40
    for (let i = 1; i < boxes.length; i++) {
      const gap = boxes[i].x - (boxes[i - 1].x + boxes[i - 1].width);
      expect(Math.abs(gap - 6), `gap before control ${i}`).toBeLessThanOrEqual(1);
    }

    // The cluster is shorter than the bar (8 px air each side) and centred with the link row.
    const cluster = await box(page.locator(`${NAV} .right`));
    expect(cluster.height).toBeLessThanOrEqual(bar.height - 16);
    const link = await box(page.locator(`${NAV} .center .link`).first());
    const barMid = bar.y + bar.height / 2;
    expect(Math.abs(link.y + link.height / 2 - barMid)).toBeLessThanOrEqual(2);
    expect(Math.abs(cluster.y + cluster.height / 2 - barMid)).toBeLessThanOrEqual(2);
  });

  test('--nav-height drives the nav, and the launches timeline month header sticks at its bottom edge', async ({
    page,
  }) => {
    await open(page, '/missions/launches');
    await page.waitForSelector('div.launches[data-route-ready="true"]', { timeout: 30_000 });
    const { navHeight, navBottom, headerTop } = await page.evaluate(() => {
      const n = document.querySelector('nav[aria-label]:not(.footer-menu)')!;
      const h = document.querySelector('.month-header');
      return {
        navHeight: parseFloat(getComputedStyle(n).height),
        navBottom: n.getBoundingClientRect().bottom,
        headerTop: h ? parseFloat(getComputedStyle(h).top) : NaN,
      };
    });
    expect(navHeight).toBe(DECIDED_BAR_HEIGHT);
    expect(headerTop).toBe(navBottom);
  });
});

test.describe('nav controls — coarse pointer', () => {
  // A touch window at laptop size (links inline, More trigger) gets the same 44 px targets as a phone.
  test.describe('touch at 1280 x 720', () => {
    // DPR 2: at DPR 1 a coarse 1280-wide window matches the TV query (links inline, no hamburger).
    test.use({
      viewport: { width: 1280, height: 720 },
      hasTouch: true,
      isMobile: true,
      deviceScaleFactor: 2,
    });
    test.beforeEach(() => {
      test.skip(project() !== 'desktop-chromium', 'one emulated-touch pass is enough');
    });
    test('every visible bar control is at least 44 x 44', async ({ page }) => {
      await open(page);
      const controls = await visibleBarControls(page);
      expect(controls.length).toBeGreaterThanOrEqual(5);
      for (const c of controls) {
        const b = await box(c);
        expect(b.width, 'width').toBeGreaterThanOrEqual(43.5);
        expect(b.height, 'height').toBeGreaterThanOrEqual(43.5);
      }
    });
  });

  test('on the mobile projects every visible bar control is at least 44 x 44', async ({ page }) => {
    test.skip(project() === 'desktop-chromium', 'touch projects only');
    await open(page);
    const controls = await visibleBarControls(page);
    expect(controls.length).toBeGreaterThanOrEqual(4);
    for (const c of controls) {
      const b = await box(c);
      expect(b.width, 'width').toBeGreaterThanOrEqual(43.5);
      expect(b.height, 'height').toBeGreaterThanOrEqual(43.5);
    }
  });
});

test.describe('nav More menu — keyboard and pointer (desktop)', () => {
  test.use({ viewport: { width: 1440, height: 900 }, hasTouch: false, isMobile: false });
  test.beforeEach(() => {
    test.skip(project() !== 'desktop-chromium', 'menu keyboard flow is a desktop interaction');
  });

  test('menu button: arrow sweep reaches it, Enter opens on the first row, arrows wrap, Space switches, Escape returns', async ({
    page,
  }) => {
    await open(page);
    const trigger = moreTrigger(page);
    await expect(trigger).toHaveAttribute('aria-haspopup', 'menu');
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');

    // The bar is one roving toolbar: End from the brand lands on the last control, the trigger.
    await page.locator(`${NAV} .brand`).focus();
    await page.keyboard.press('End');
    await expect(trigger).toBeFocused();

    await page.keyboard.press('Enter');
    await expect(moreMenu(page)).toBeVisible();
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await expect(moreMenu(page).getByRole('menuitemcheckbox')).toHaveCount(2);
    await expect(moreMenu(page).getByRole('menuitem')).toHaveCount(1);
    expect(await activeMore(page)).toBe('contrast');

    await page.keyboard.press('ArrowDown');
    expect(await activeMore(page)).toBe('share');
    await page.keyboard.press('ArrowDown');
    expect(await activeMore(page)).toBe('debug');
    await page.keyboard.press('ArrowDown');
    expect(await activeMore(page)).toBe('contrast'); // wraps
    await page.keyboard.press('ArrowUp');
    expect(await activeMore(page)).toBe('debug'); // wraps back
    await page.keyboard.press('Home');
    expect(await activeMore(page)).toBe('contrast');
    await page.keyboard.press('End');
    expect(await activeMore(page)).toBe('debug');
    await page.keyboard.press('Home');

    // Space on a switch row flips it and the menu stays open so the change is visible.
    await expect(row(page, 'contrast')).toHaveAttribute('aria-checked', 'false');
    await page.keyboard.press('Space');
    await expect(row(page, 'contrast')).toHaveAttribute('aria-checked', 'true');
    await expect(page.locator('html')).toHaveAttribute('data-high-contrast', 'true');
    await expect(moreMenu(page)).toBeVisible();
    await page.keyboard.press('Space');
    await expect(row(page, 'contrast')).toHaveAttribute('aria-checked', 'false');
    await expect(page.locator('html')).not.toHaveAttribute('data-high-contrast', 'true');

    await page.keyboard.press('Escape');
    await expect(moreMenu(page)).toHaveCount(0);
    await expect(trigger).toBeFocused();
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  test('ArrowUp on the button opens on the last row; Tab leaves and closes; an outside click closes', async ({
    page,
  }) => {
    await open(page);
    const trigger = moreTrigger(page);
    await trigger.focus();
    await page.keyboard.press('ArrowUp');
    await expect(moreMenu(page)).toBeVisible();
    expect(await activeMore(page)).toBe('debug');

    await page.keyboard.press('Tab');
    await expect(moreMenu(page)).toHaveCount(0);

    await trigger.click();
    await expect(moreMenu(page)).toBeVisible();
    await page.mouse.click(600, 500);
    await expect(moreMenu(page)).toHaveCount(0);

    // The trigger toggles it with the pointer too.
    await trigger.click();
    await expect(moreMenu(page)).toBeVisible();
    await trigger.click();
    await expect(moreMenu(page)).toHaveCount(0);
  });

  test('the Debug row switches debug mode and keeps the menu open; Share calls navigator.share and closes', async ({
    page,
  }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'share', {
        configurable: true,
        value: async (data: unknown) => {
          (window as unknown as { __shared: unknown }).__shared = data;
        },
      });
    });
    await open(page);
    await moreTrigger(page).click();
    await row(page, 'debug').click();
    await expect(row(page, 'debug')).toHaveAttribute('aria-checked', 'true');
    await expect(moreMenu(page)).toBeVisible();
    await page.keyboard.press('Space'); // the DebugPanel may now cover the row: focus is still on it
    await expect(row(page, 'debug')).toHaveAttribute('aria-checked', 'false');

    await row(page, 'share').click();
    await expect(moreMenu(page)).toHaveCount(0);
    await expect(moreTrigger(page)).toBeFocused();
    await page.waitForFunction(() => '__shared' in window);
    const shared = await page.evaluate(
      () => (window as unknown as { __shared: { url: string } }).__shared,
    );
    expect(shared.url).toContain(new URL(page.url()).pathname);
  });

  test('roving toolbar is unchanged: one tab stop open or closed, and the arrows never enter the menu rows', async ({
    page,
  }) => {
    await open(page);
    const tabStops = () =>
      nav(page).evaluate(
        (n) =>
          [...n.querySelectorAll<HTMLElement>('a[href], button')].filter(
            (el) =>
              !(el as HTMLButtonElement).disabled &&
              el.offsetParent !== null &&
              el.getAttribute('aria-disabled') !== 'true' &&
              el.tabIndex === 0,
          ).length,
      );
    expect(await tabStops()).toBe(1);

    await moreTrigger(page).click();
    await expect(moreMenu(page)).toBeVisible();
    expect(await tabStops()).toBe(1);
    // The rows are outside the nav and tabindex -1 (Tab leaves the menu in one step).
    expect(await moreMenu(page).locator('[tabindex="0"]').count()).toBe(0);

    await moreTrigger(page).focus();
    await page.keyboard.press('ArrowRight'); // wraps to the first control of the bar
    const inMenu = await page.evaluate(() => !!document.activeElement?.closest('#nav-more-menu'));
    expect(inMenu).toBe(false);
    expect(await nav(page).evaluate((n) => n.contains(document.activeElement))).toBe(true);

    await page.keyboard.press('Escape');
    await expect(moreMenu(page)).toHaveCount(0);
    expect(await tabStops()).toBe(1);
  });

  test('open menu has no axe violations (names, roles, contrast)', async ({ page }) => {
    await open(page);
    await moreTrigger(page).click();
    await expect(moreMenu(page)).toBeVisible();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const results = await new AxeBuilder({ page: page as any })
      .include('#nav-more-menu')
      .include(`${NAV} .nav-more-trigger`)
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    expect(
      results.violations.map((v) => `${v.id}: ${v.help}`),
      'axe on the open More menu',
    ).toEqual([]);
  });
});

test.describe('nav controls — phone drawer', () => {
  test.use({ viewport: { width: 390, height: 844 } });
  test.beforeEach(() => {
    test.skip(project() !== 'mobile-chromium', 'phone layout');
  });

  test('no More button and no Share in the bar; the drawer holds locale, contrast, share and debug; no horizontal scroll', async ({
    page,
  }) => {
    await open(page);
    await expect(moreTrigger(page)).toBeHidden();
    await expect(page.locator(`${NAV} .right [data-more]`)).toHaveCount(0);
    await expect(page.locator(`${NAV} .right [data-locale-picker]`)).toBeHidden();
    const widths = await page.evaluate(() => ({
      scroll: document.documentElement.scrollWidth,
      inner: window.innerWidth,
    }));
    expect(widths.scroll).toBeLessThanOrEqual(widths.inner);

    await page.locator('button.menu-toggle').click();
    const drawer = page.locator('#mobile-nav-drawer');
    await expect(drawer.locator('[data-locale-picker]')).toBeVisible();
    for (const id of ['contrast', 'share', 'debug']) {
      const r = drawer.locator(`[data-more="${id}"]`);
      await expect(r).toBeVisible();
      const b = await box(r);
      expect(b.height, `${id} row height`).toBeGreaterThanOrEqual(43.5);
    }

    // The switch rows report their state with aria-pressed, not with English On / Off text.
    await drawer.locator('[data-more="contrast"]').click();
    await expect(page.locator('html')).toHaveAttribute('data-high-contrast', 'true');
    await expect(drawer.locator('[data-more="debug"]')).toHaveAttribute('aria-pressed', 'false');
    await drawer.locator('[data-more="debug"]').click(); // last: the DebugPanel may open over the page
    await expect(drawer.locator('[data-more="debug"]')).toHaveAttribute('aria-pressed', 'true');
    await expect(drawer).toBeVisible(); // switch rows keep the drawer open
    expect(await drawer.locator('[data-more="debug"]').innerText()).not.toMatch(/^\s*(On|Off)\s*$/);
  });
});

// Reports, never fails (deferred list L2): the width the full link row + the compact cluster
// need in each of the 14 locales, so the hamburger break (1219 px today) can be lowered to a
// measured value in a later step. The link row is forced visible below the break to measure it.
const LOCALES = [
  '',
  'es',
  'fr',
  'de',
  'pt-BR',
  'it',
  'nl',
  'sr-Cyrl',
  'zh-CN',
  'ja',
  'ko',
  'hi',
  'ar',
  'ru',
];

test.describe('nav bar width per locale (report only)', () => {
  test.use({ hasTouch: false, isMobile: false });
  test.beforeEach(() => {
    test.skip(project() !== 'desktop-chromium', 'measurement runs once, on desktop');
  });

  test('14 locales x 1024 / 1100 / 1219 px: needed width and overlap of the full bar', async ({
    page,
  }, testInfo) => {
    test.setTimeout(240_000);
    const rows: string[] = [];
    for (const code of LOCALES) {
      await page.setViewportSize({ width: 1219, height: 800 });
      await open(page, code ? `/${code}/` : '/');
      await page.addStyleTag({
        content: `${NAV} .center { display: flex !important; } ${NAV} .menu-toggle { display: none !important; }`,
      });
      for (const width of [1024, 1100, 1219]) {
        await page.setViewportSize({ width, height: 800 });
        const m = await page.evaluate((sel) => {
          const n = document.querySelector(sel)!;
          const r = (s: string) => n.querySelector(s)!.getBoundingClientRect();
          const left = r('.left');
          const center = r('.center');
          const right = r('.right');
          const overlaps = (a: DOMRect, b: DOMRect) =>
            a.left < b.right - 0.5 && b.left < a.right - 0.5;
          return {
            needed: Math.round(left.width + center.width + right.width + 48),
            overlap: overlaps(left, center) || overlaps(center, right) || overlaps(left, right),
            pageScroll: document.documentElement.scrollWidth - window.innerWidth,
          };
        }, NAV);
        expect(m.needed).toBeGreaterThan(0);
        rows.push(
          `${code || 'en-US'}\t${width}\tneeded ${m.needed}\toverlap ${m.overlap}\tpageScroll ${m.pageScroll}`,
        );
      }
    }
    const report = rows.join('\n');
    console.log(`\nnav bar width per locale\n${report}\n`);
    await testInfo.attach('nav-bar-width-per-locale.tsv', {
      body: report,
      contentType: 'text/tab-separated-values',
    });
  });
});
