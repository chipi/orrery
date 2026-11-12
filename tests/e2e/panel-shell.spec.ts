import { expect, test, type Page } from '@playwright/test';

/**
 * UX slices B1 and B1.1 (UXD-018): the panel shell. One fixed header above the scroll container:
 * the eyebrow line carries back, Share and close on its right, the name sits on the line below at
 * full width. One action row under the identity block, no foot stack, a hero without a hover glow,
 * and swipe-to-close only from the header or at the top of the list.
 */

const PANELS: { label: string; path: string }[] = [
  { label: 'planet', path: '/explore?id=mars' },
  { label: 'mission', path: '/missions?id=apollo11' },
  { label: 'fleet', path: '/fleet?id=saturn-v' },
  { label: 'site', path: '/mars?site=perseverance' },
];

const roundBox = (b: { x: number; y: number; width: number; height: number } | null) =>
  b && {
    x: Math.round(b.x),
    y: Math.round(b.y),
    width: Math.round(b.width),
    height: Math.round(b.height),
  };

async function openPanel(page: Page, path: string) {
  await page.goto(path);
  const panel = page.locator('aside.panel');
  await expect(panel).toBeVisible({ timeout: 15_000 });
  await expect(panel.locator('.panel-head')).toBeVisible();
  // The panel opens with a transition; measure geometry only once it has stopped moving.
  await expect
    .poll(
      async () => {
        const a = await panel.boundingBox();
        await page.waitForTimeout(120);
        const b = await panel.boundingBox();
        return JSON.stringify(roundBox(a)) === JSON.stringify(roundBox(b));
      },
      { timeout: 5_000 },
    )
    .toBe(true);
  return panel;
}

test.describe('panel shell (B1)', () => {
  for (const { label, path } of PANELS) {
    test(`${label} panel: header present, close closes`, async ({ page }) => {
      const panel = await openPanel(page, path);
      await expect(panel.locator('.panel-head button.panel-close')).toBeVisible();
      await panel.locator('button.panel-close').click();
      await expect(panel).toBeHidden({ timeout: 4_000 });
    });

    test(`${label} panel: the header stays put and the content never goes under the close`, async ({
      page,
    }) => {
      const panel = await openPanel(page, path);
      const bar = panel.locator('.panel-head');
      const content = panel.locator('.content');
      const before = await bar.boundingBox();
      const overflow = await content.evaluate((el) => el.scrollHeight - el.clientHeight);
      expect(overflow, 'panel content must be taller than the panel to scroll').toBeGreaterThan(0);
      await content.evaluate((el) => (el.scrollTop = 600));
      const after = await bar.boundingBox();
      expect(roundBox(after)).toEqual(roundBox(before));
      const contentBox = await content.boundingBox();
      expect(Math.round(contentBox!.y)).toBe(Math.round(before!.y + before!.height));
      const hitsClose = await panel.locator('button.panel-close').evaluate((el) => {
        const r = el.getBoundingClientRect();
        const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
        return !!top?.closest('.panel-close');
      });
      expect(hitsClose).toBe(true);
    });

    test(`${label} panel: no foot stack, row above the hero with at most 3 chips`, async ({
      page,
    }) => {
      const panel = await openPanel(page, path);
      await expect(panel.locator('.cta, .cta-card, .cta-bar, .card-cta-bar')).toHaveCount(0);
      const row = panel.locator('.panel-actions');
      if ((await row.count()) === 0) return;
      const chips = row.locator('.ui-chip');
      expect(await chips.count()).toBeLessThanOrEqual(3);
      const hero = panel.locator('.panel-hero').first();
      if ((await hero.count()) > 0) {
        const r = await row.boundingBox();
        const h = await hero.boundingBox();
        expect(r!.y + r!.height).toBeLessThanOrEqual(h!.y + 1);
      }
    });
  }

  test('back appears after following a card link, in the header', async ({ page }) => {
    const panel = await openPanel(page, '/missions?id=apollo11');
    await expect(panel.locator('.panel-back')).toHaveCount(0);
    await page.locator('[data-testid="mission-vehicle-fleet-link"]').click();
    await expect(page).toHaveURL(/\/fleet\?id=saturn-v/);
    const back = panel.locator('.panel-head .panel-back');
    await expect(back).toBeVisible();
    await back.click();
    await expect(page).toHaveURL(/\/missions\?id=apollo11/);
  });

  test('the name is always in the header: no bar name, nothing reveals on scroll', async ({
    page,
  }) => {
    const panel = await openPanel(page, '/explore?id=mars');
    await expect(panel.locator('.panel-bar, .panel-bar-name')).toHaveCount(0);
    const name = panel.locator('.panel-head .name');
    await expect(name).toBeVisible();
    await expect(name).toHaveText(/Mars/i);
    await panel.locator('.content').evaluate((el) => (el.scrollTop = 600));
    await expect(name).toBeVisible();
    expect(await name.evaluate((el) => getComputedStyle(el).opacity)).toBe('1');
  });

  test('hero: no hover glow, a focus ring for the keyboard only', async ({ page, isMobile }) => {
    const panel = await openPanel(page, '/explore?id=mars');
    const hero = panel.locator('.panel-hero-btn');
    await expect(hero).toBeVisible();
    const edge = () => hero.evaluate((el) => getComputedStyle(el).borderColor);
    const resting = await edge();
    if (!isMobile) {
      await hero.hover();
      expect(await edge()).toBe(resting);
    }
    expect(await hero.evaluate((el) => getComputedStyle(el).boxShadow)).toBe('none');

    for (let i = 0; i < 14; i++) {
      await page.keyboard.press('Tab');
      if (await hero.evaluate((el) => el === document.activeElement)) break;
    }
    expect(await hero.evaluate((el) => el === document.activeElement)).toBe(true);
    const ring = await hero.evaluate((el) => {
      const probe = document.createElement('div');
      probe.style.outlineColor = 'var(--color-focus)';
      document.body.appendChild(probe);
      const focus = getComputedStyle(probe).outlineColor;
      probe.remove();
      const cs = getComputedStyle(el);
      return { width: cs.outlineWidth, style: cs.outlineStyle, color: cs.outlineColor, focus };
    });
    expect(ring.width).toBe('2px');
    expect(ring.style).toBe('solid');
    expect(ring.color).toBe(ring.focus);
  });

  test('header and row chips are 30 px on a fine pointer and 44 px on touch', async ({
    page,
    isMobile,
  }) => {
    const panel = await openPanel(page, '/explore?id=mars');
    const want = isMobile ? 44 : 30;
    const heightOf = async (sel: string) =>
      Math.round((await panel.locator(sel).first().boundingBox())!.height);
    expect(await heightOf('.panel-head .panel-close')).toBe(want);
    expect(await heightOf('.panel-head [data-testid="open-card-btn"]')).toBe(want);
    expect(await heightOf('.panel-actions .ui-chip')).toBeGreaterThanOrEqual(want);
    expect(await heightOf('.panel-head .panel-actions-line')).toBe(want);
  });

  test('Share opens the card overlay; Escape closes only the overlay', async ({ page }) => {
    const panel = await openPanel(page, '/missions?id=apollo11');
    await panel.locator('.panel-head').getByTestId('open-card-btn').click();
    const card = page.locator('.backdrop .card');
    await expect(card).toBeVisible({ timeout: 10_000 });
    await page.keyboard.press('Escape');
    await expect(card).toBeHidden();
    await expect(panel).toBeVisible();
  });

  // UXD-018 amendment "header sizes": badge and status one size, × a square as tall as Share,
  // all on one centre line.
  for (const path of ['/missions?id=apollo11', '/mars?site=perseverance']) {
    test(`header sizes on ${path}: badge = status, square ×, one centre line`, async ({ page }) => {
      test.slow();
      await page.goto(path);
      const head = page.locator('aside.panel .panel-head').first();
      await expect(head.locator('.agency-badge').first()).toBeVisible({ timeout: 45_000 });
      // The panel slides in (a bottom sheet on a phone): measure once the header has stopped moving.
      await expect
        .poll(async () => {
          const a = (await head.boundingBox())!.y;
          await page.waitForTimeout(150);
          return Math.abs((await head.boundingBox())!.y - a);
        })
        .toBeLessThan(0.5);
      const box = async (sel: string) => (await head.locator(sel).first().boundingBox())!;
      const badge = await box('.agency-badge');
      const status = await box('.status');
      const share = await box('[data-testid="open-card-btn"]');
      const close = await box('.panel-close');
      expect(
        Math.abs(badge.height - status.height),
        'badge and status one height',
      ).toBeLessThanOrEqual(0.5);
      expect(Math.abs(close.width - close.height), '× is a square').toBeLessThanOrEqual(0.5);
      expect(Math.abs(close.height - share.height), '× as tall as Share').toBeLessThanOrEqual(0.5);
      const mid = (b: { y: number; height: number }) => b.y + b.height / 2;
      for (const [name, b] of [
        ['badge', badge],
        ['status', status],
        ['Share', share],
      ] as const)
        expect(Math.abs(mid(b) - mid(close)), `${name} on the × centre line`).toBeLessThanOrEqual(
          1,
        );
    });
  }

  test.describe('one-row header (B1.1)', () => {
    const KINDS: { label: string; path: string }[] = [
      { label: 'planet', path: '/explore?id=mars' },
      { label: 'mission', path: '/missions?id=apollo11' },
      { label: 'deep sky', path: '/explore?deepsky=M13' },
    ];
    type Box = { x: number; y: number; width: number; height: number };
    const boxOf = (panel: ReturnType<Page['locator']>, sel: string) =>
      panel.locator(sel).first().boundingBox() as Promise<Box>;
    const bottom = (b: Box) => b.y + b.height;

    for (const { label, path } of KINDS) {
      test(`${label}: actions share the eyebrow's line, the name starts below, the header stays`, async ({
        page,
      }) => {
        const panel = await openPanel(page, path);
        const eyebrow = await boxOf(panel, '.panel-eyebrow');
        const close = await boxOf(panel, '.panel-head button.panel-close');
        const name = await boxOf(panel, '.panel-heading');
        const head = await boxOf(panel, '.panel-head');

        // Same line: the eyebrow's vertical span and the actions' overlap, and both sit above the name.
        expect(eyebrow.y).toBeLessThan(bottom(close));
        expect(close.y).toBeLessThan(bottom(eyebrow));
        expect(name.y).toBeGreaterThanOrEqual(Math.max(bottom(eyebrow), bottom(close)) - 1);
        // The actions are at the inline end, the eyebrow before them, no overlap.
        const rtl = await panel.evaluate((el) => getComputedStyle(el).direction === 'rtl');
        const actions = await boxOf(panel, '.panel-actions-line');
        if (rtl) expect(actions.x + actions.width).toBeLessThanOrEqual(eyebrow.x + 1);
        else expect(eyebrow.x + eyebrow.width).toBeLessThanOrEqual(actions.x + 1);
        // The name has the full panel width, not the width beside the actions.
        expect(name.width).toBeGreaterThan(eyebrow.width + actions.width - 1);
        expect(name.x).toBeLessThanOrEqual(Math.min(eyebrow.x, actions.x) + 1);

        const content = panel.locator('.content');
        if ((await content.evaluate((el) => el.scrollHeight - el.clientHeight)) > 0) {
          await content.evaluate((el) => (el.scrollTop = 400));
          expect(roundBox(await boxOf(panel, '.panel-head'))).toEqual(roundBox(head));
          await expect(panel.locator('.panel-heading')).toBeInViewport();
        }
      });

      test(`${label}: a long name wraps under the actions without touching them`, async ({
        page,
      }) => {
        const panel = await openPanel(page, path);
        const heading = panel.locator('.panel-heading');
        const before = await heading.boundingBox();
        await heading.evaluate((el) => {
          const target = el.querySelector('.name, h1, h2') as HTMLElement;
          target.textContent =
            'An exceedingly long entity name that has to wrap onto several lines '.repeat(3);
        });
        const after = (await heading.boundingBox())!;
        expect(after.height).toBeGreaterThan(before!.height * 1.5);
        const chips = await panel.locator('.panel-head .panel-actions-line .ui-chip').all();
        for (const chip of chips) {
          const c = (await chip.boundingBox())!;
          expect(after.y).toBeGreaterThanOrEqual(bottom(c) - 1);
        }
        // Every line of the name uses the full width: the text's widest line is wider than the
        // space the eyebrow leaves beside the actions.
        const eyebrow = await boxOf(panel, '.panel-eyebrow');
        const lineWidth = await heading.evaluate((el) => {
          const range = document.createRange();
          range.selectNodeContents(el);
          return Math.max(...[...range.getClientRects()].map((r) => r.width));
        });
        expect(lineWidth).toBeGreaterThan(eyebrow.width);
        const panelBox = (await panel.boundingBox())!;
        expect(after.x + after.width).toBeLessThanOrEqual(panelBox.x + panelBox.width + 1);
      });
    }
  });

  test.describe('swipe down (touch)', () => {
    async function swipe(page: Page, x: number, y0: number, dy: number) {
      const cdp = await page.context().newCDPSession(page);
      await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchStart',
        touchPoints: [{ x, y: y0 }],
      });
      for (let i = 1; i <= 10; i++) {
        await cdp.send('Input.dispatchTouchEvent', {
          type: 'touchMove',
          touchPoints: [{ x, y: y0 + (dy * i) / 10 }],
        });
      }
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    }

    test('a scrolled list is not closed by a drag; the header and the top of the list are', async ({
      page,
      isMobile,
    }) => {
      test.skip(!isMobile, 'touch projects only');
      const panel = await openPanel(page, '/explore?id=mars');
      const content = panel.locator('.content');
      const cb = (await content.boundingBox())!;
      const x = cb.x + cb.width / 2;

      await content.evaluate((el) => (el.scrollTop = 300));
      await swipe(page, x, cb.y + 150, 140);
      await expect(panel).toBeVisible();

      await content.evaluate((el) => (el.scrollTop = 0));
      const bb = (await panel.locator('.panel-head').boundingBox())!;
      await swipe(page, x, bb.y + bb.height / 2, 140);
      await expect(panel).toBeHidden({ timeout: 4_000 });

      const again = await openPanel(page, '/explore?id=mars');
      const c2 = (await again.locator('.content').boundingBox())!;
      await swipe(page, c2.x + c2.width / 2, c2.y + 40, 140);
      await expect(again).toBeHidden({ timeout: 4_000 });
    });
  });
});
