import { expect, test, type Page } from '@playwright/test';

/**
 * UX slice B1 (UXD-018): the panel shell. A fixed header bar (back, name, Share, close) above
 * the scroll container, one action row under the identity block, no foot stack, a hero without
 * a hover glow, and swipe-to-close only from the bar or at the top of the list.
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
  await expect(panel.locator('.panel-bar')).toBeVisible();
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
    test(`${label} panel: bar present, close closes`, async ({ page }) => {
      const panel = await openPanel(page, path);
      await expect(panel.locator('.panel-bar button.panel-close')).toBeVisible();
      await panel.locator('button.panel-close').click();
      await expect(panel).toBeHidden({ timeout: 4_000 });
    });

    test(`${label} panel: the bar stays put and the content never goes under the close`, async ({
      page,
    }) => {
      const panel = await openPanel(page, path);
      const bar = panel.locator('.panel-bar');
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

  test('back appears after following a card link, in the bar', async ({ page }) => {
    const panel = await openPanel(page, '/missions?id=apollo11');
    await expect(panel.locator('.panel-back')).toHaveCount(0);
    await page.locator('[data-testid="mission-vehicle-fleet-link"]').click();
    await expect(page).toHaveURL(/\/fleet\?id=saturn-v/);
    const back = panel.locator('.panel-bar .panel-back');
    await expect(back).toBeVisible();
    await back.click();
    await expect(page).toHaveURL(/\/missions\?id=apollo11/);
  });

  test('the name joins the bar once the hero has scrolled out', async ({ page }) => {
    const panel = await openPanel(page, '/explore?id=mars');
    const name = panel.locator('.panel-bar-name');
    await expect(name).toHaveCSS('opacity', '0');
    await panel.locator('.content').evaluate((el) => {
      const hero = el.querySelector('.panel-hero') as HTMLElement | null;
      el.scrollTop = hero ? hero.offsetTop + hero.offsetHeight + 40 : 600;
    });
    await expect(name).toHaveCSS('opacity', '1');
    await expect(name).toHaveText(/Mars/i);
    await panel.locator('.content').evaluate((el) => (el.scrollTop = 0));
    await expect(name).toHaveCSS('opacity', '0');
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

  test('bar and row chips are 30 px on a fine pointer and 44 px on touch', async ({
    page,
    isMobile,
  }) => {
    const panel = await openPanel(page, '/explore?id=mars');
    const want = isMobile ? 44 : 30;
    const heightOf = async (sel: string) =>
      Math.round((await panel.locator(sel).first().boundingBox())!.height);
    expect(await heightOf('.panel-bar .panel-close')).toBe(want);
    expect(await heightOf('.panel-bar [data-testid="open-card-btn"]')).toBe(want);
    expect(await heightOf('.panel-actions .ui-chip')).toBeGreaterThanOrEqual(want);
    expect(await heightOf('.panel-bar')).toBe(isMobile ? 44 : 38);
  });

  test('Share opens the card overlay; Escape closes only the overlay', async ({ page }) => {
    const panel = await openPanel(page, '/missions?id=apollo11');
    await panel.locator('.panel-bar').getByTestId('open-card-btn').click();
    const card = page.locator('.backdrop .card');
    await expect(card).toBeVisible({ timeout: 10_000 });
    await page.keyboard.press('Escape');
    await expect(card).toBeHidden();
    await expect(panel).toBeVisible();
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

    test('a scrolled list is not closed by a drag; the bar and the top of the list are', async ({
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
      const bb = (await panel.locator('.panel-bar').boundingBox())!;
      await swipe(page, x, bb.y + bb.height / 2, 140);
      await expect(panel).toBeHidden({ timeout: 4_000 });

      const again = await openPanel(page, '/explore?id=mars');
      const c2 = (await again.locator('.content').boundingBox())!;
      await swipe(page, c2.x + c2.width / 2, c2.y + 40, 140);
      await expect(again).toBeHidden({ timeout: 4_000 });
    });
  });
});
