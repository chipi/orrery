import { expect, test, type Locator, type Page } from '@playwright/test';
import { landingGridCounts } from './_helpers/source-counts';

/**
 * F3 (UX arc 0.9.9, H1 / H2 / decision 37): the first screen of the home page and the cards.
 *
 * The wordmark, the CTAs and the first intro heading are measured against the viewport and the
 * fixed footer strip (a bounding-box assertion plus an elementFromPoint "not covered" check), the
 * Lab card sits first under LEARN with its glyph, and the cards heading carries the real count.
 */

/** In the viewport, above the footer strip, and the topmost element at its centre. */
async function expectInFirstScreen(page: Page, target: Locator, name: string): Promise<void> {
  const vh = page.viewportSize()!.height;
  const b = (await target.boundingBox())!;
  expect(b, `${name} has a box`).not.toBeNull();
  expect(b.y, `${name} top`).toBeGreaterThanOrEqual(0);
  expect(b.y + b.height, `${name} bottom ${b.y + b.height} vs viewport ${vh}`).toBeLessThanOrEqual(
    vh,
  );
  const footer = page.locator('.site-footer');
  if (await footer.isVisible()) {
    const f = (await footer.boundingBox())!;
    expect(
      b.y + b.height,
      `${name} bottom ${b.y + b.height} vs footer strip top ${f.y}`,
    ).toBeLessThanOrEqual(f.y);
  }
  const covered = await target.evaluate((el) => {
    const r = el.getBoundingClientRect();
    const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return !(top === el || el.contains(top));
  });
  expect(covered, `${name} is covered by another element`).toBe(false);
}

for (const size of [
  { name: '1366x768', width: 1366, height: 768 },
  { name: '1440x900', width: 1440, height: 900 },
]) {
  test.describe(`landing first screen — ${size.name} desktop`, () => {
    test.use({
      viewport: { width: size.width, height: size.height },
      hasTouch: false,
      isMobile: false,
    });

    test('the wordmark, both CTAs and the "What is this?" heading are in view and uncovered', async ({
      page,
    }) => {
      await page.goto('/', { waitUntil: 'networkidle' });
      await expectInFirstScreen(page, page.locator('h1.wordmark'), 'wordmark');
      await expectInFirstScreen(page, page.getByTestId('landing-cta-primary'), 'primary CTA');
      await expectInFirstScreen(page, page.getByTestId('landing-cta-tour'), 'tour CTA');
      await expectInFirstScreen(page, page.locator('.cta-secondary'), 'secondary CTA');
      await expectInFirstScreen(page, page.locator('#what-heading'), '"What is this?" heading');
    });

    test('the hero is two columns: the copy left of the same picture', async ({ page }) => {
      await page.goto('/', { waitUntil: 'networkidle' });
      const copy = (await page.locator('.hero-copy').boundingBox())!;
      const pic = (await page.locator('.hero-illustration').boundingBox())!;
      expect(copy.x + copy.width).toBeLessThanOrEqual(pic.x);
      expect(pic.width).toBeLessThanOrEqual(401);
      await expect(page.locator('.hero-illustration')).toHaveAttribute('src', /app-landing-hero/);
    });
  });
}

test.describe('landing first screen — phone 390x844', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('the CTAs stay in the first screen and the hero stays one column', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    await expectInFirstScreen(page, page.locator('h1.wordmark'), 'wordmark');
    await expectInFirstScreen(page, page.getByTestId('landing-cta-primary'), 'primary CTA');
    await expectInFirstScreen(page, page.getByTestId('landing-cta-tour'), 'tour CTA');
    await expectInFirstScreen(page, page.locator('.cta-secondary'), 'secondary CTA');
    const copy = (await page.locator('.hero-copy').boundingBox())!;
    const pic = (await page.locator('.hero-illustration').boundingBox())!;
    expect(pic.y + pic.height).toBeLessThanOrEqual(copy.y + 1);
  });
});

for (const [locale, path, rtl] of [
  ['de', '/de/', false],
  ['ar', '/ar/', true],
] as const) {
  test.describe(`landing first screen — ${locale} 1366x768`, () => {
    test.use({ viewport: { width: 1366, height: 768 }, hasTouch: false, isMobile: false });

    test(`${locale}: no horizontal overflow, CTAs in view${rtl ? ', RTL copy right of the picture' : ''}`, async ({
      page,
    }) => {
      await page.goto(path, { waitUntil: 'networkidle' });
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(0);
      await expectInFirstScreen(page, page.getByTestId('landing-cta-primary'), 'primary CTA');
      await expectInFirstScreen(page, page.getByTestId('landing-cta-tour'), 'tour CTA');
      await expectInFirstScreen(page, page.locator('.cta-secondary'), 'secondary CTA');
      if (rtl) {
        const copy = (await page.locator('.hero-copy').boundingBox())!;
        const pic = (await page.locator('.hero-illustration').boundingBox())!;
        expect(pic.x + pic.width).toBeLessThanOrEqual(copy.x + 1);
      }
    });
  });
}

test.describe('landing cards (F3)', () => {
  test('the Lab card is first under LEARN, then Essays, then Science, and draws a glyph', async ({
    page,
  }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    const items = page.locator('[data-testid="landing-cards"] > li');
    const labels = await items.evaluateAll((lis) =>
      lis.map((li) => {
        const h = li.querySelector('.grid-section-heading');
        const a = li.querySelector('a.card');
        return h ? `# ${h.textContent}` : (a?.getAttribute('href') ?? '');
      }),
    );
    const learn = labels.findIndex((l) => /^# LEARN/i.test(l));
    expect(learn).toBeGreaterThan(-1);
    expect(labels.slice(learn + 1).map((href) => href.split('/').filter(Boolean).pop())).toEqual([
      'lab',
      'essays',
      'science',
    ]);
    await expect(page.locator('[data-testid="landing-cards"] a[href*="/lab"]')).toHaveCount(1);
    const glyph = page.locator('[data-testid="landing-cards"] a[href*="/lab"] svg.card-icon > *');
    expect(await glyph.count()).toBeGreaterThan(3);
  });

  test('/learn draws the same Lab glyph as the home card', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    const home = await page
      .locator('[data-testid="landing-cards"] a[href*="/lab"] svg.card-icon')
      .innerHTML();
    await page.goto('/learn', { waitUntil: 'networkidle' });
    const hub = await page
      .locator('[data-testid="learn-hub-cards"] a[href*="/lab"] svg.card-icon')
      .innerHTML();
    expect(hub.length).toBeGreaterThan(100);
    expect(hub).toBe(home);
  });

  test('the cards heading states the number of cards the grid renders (en, de)', async ({
    page,
  }) => {
    const count = landingGridCounts().cards;
    await page.goto('/', { waitUntil: 'networkidle' });
    await expect(page.locator('#cards-heading')).toHaveText(`All ${count} destinations`);
    expect(await page.locator('[data-testid="landing-cards"] a.card').count()).toBe(count);
    await page.goto('/de/', { waitUntil: 'networkidle' });
    await expect(page.locator('#cards-heading')).toHaveText(`Alle ${count} Ziele`);
  });
});
