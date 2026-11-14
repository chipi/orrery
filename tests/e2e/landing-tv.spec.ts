import { expect, test } from '@playwright/test';

/**
 * RFC-031 S6 / F3 (decision 40): the home page's TV layout, emulated.
 *
 * A TV is a 1920x1080 coarse-pointer, no-hover, 1 dppx screen. The media query in +page.svelte
 * (the same one the 10-foot layer in app.css uses) turns the landing into two panels: the hero and
 * the CTAs left, the route grid right. Nothing covered this layout before; the first run of this
 * spec's probe found the grid's heading and first cards above the top of the page (a fixed 100svh
 * row with centred items, taller than the screen), which is why the row now grows with the grid
 * and the hero is pinned.
 */
const TV_QUERY =
  '(hover: none) and (pointer: coarse) and (min-width: 1100px) and (max-resolution: 1.5dppx)';

test.describe('landing on a TV (1920x1080, coarse pointer, no hover, 1 dppx)', () => {
  test.use({
    viewport: { width: 1920, height: 1080 },
    hasTouch: true,
    isMobile: true,
    deviceScaleFactor: 1,
  });

  test('the emulation hits the TV query and the landing is two columns', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    expect(await page.evaluate((q) => matchMedia(q).matches, TV_QUERY)).toBe(true);
    const cols = await page
      .locator('.landing')
      .evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(' ').length);
    expect(cols).toBe(2);
    const hero = (await page.locator('.hero').boundingBox())!;
    const cards = (await page.locator('.route-cards').boundingBox())!;
    expect(hero.x + hero.width).toBeLessThanOrEqual(cards.x);
  });

  test('the hero, the CTAs, the cards heading and the first row of cards fit the first screen', async ({
    page,
  }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    const vh = 1080;
    const inView = async (sel: string, name: string) => {
      const b = (await page.locator(sel).first().boundingBox())!;
      expect(b.y, `${name} top`).toBeGreaterThanOrEqual(0);
      expect(b.y + b.height, `${name} bottom`).toBeLessThanOrEqual(vh);
      return b;
    };
    await inView('h1.wordmark', 'wordmark');
    await inView('[data-testid="landing-cta-primary"]', 'primary CTA');
    await inView('[data-testid="landing-cta-tour"]', 'tour CTA');
    await inView('.cta-secondary', 'secondary CTA');
    await inView('#cards-heading', 'cards heading');
    const first = await inView('[data-testid="landing-cards"] a.card', 'first card');
    // The first row is the three Explore cards at the same height.
    const row = page.locator('[data-testid="landing-cards"] a.card');
    for (const i of [1, 2]) {
      const b = (await row.nth(i).boundingBox())!;
      expect(Math.abs(b.y - first.y), `card ${i} shares the first row`).toBeLessThan(2);
      expect(b.y + b.height).toBeLessThanOrEqual(vh);
    }
  });

  test('the hero stays in view while the cards scroll', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    await page.evaluate(() => window.scrollBy(0, 700));
    const b = (await page.getByTestId('landing-cta-primary').boundingBox())!;
    expect(b.y).toBeGreaterThanOrEqual(0);
    expect(b.y + b.height).toBeLessThanOrEqual(1080);
  });

  test('Tab walks the three CTAs, then the cards in order', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    const seen: string[] = [];
    for (let i = 0; i < 40; i++) {
      await page.keyboard.press('Tab');
      const id = await page.evaluate(() => {
        const el = document.activeElement as HTMLElement | null;
        if (!el) return '';
        if (el.dataset.testid) return el.dataset.testid;
        if (el.classList.contains('cta-secondary')) return 'cta-secondary';
        if (el.classList.contains('card')) return `card:${el.getAttribute('aria-label')}`;
        return '';
      });
      if (id && !seen.includes(id)) seen.push(id);
      if (seen.filter((s) => s.startsWith('card:')).length >= 3) break;
    }
    const at = (id: string) => seen.indexOf(id);
    expect(at('landing-cta-primary')).toBeGreaterThan(-1);
    expect(at('landing-cta-tour')).toBeGreaterThan(at('landing-cta-primary'));
    expect(at('cta-secondary')).toBeGreaterThan(at('landing-cta-tour'));
    const firstCard = seen.findIndex((s) => s.startsWith('card:'));
    expect(firstCard).toBeGreaterThan(at('cta-secondary'));
    expect(seen.filter((s) => s.startsWith('card:')).length).toBeGreaterThanOrEqual(3);
  });
});
