import { expect, test } from '@playwright/test';

/**
 * /colophon — the inventory of Orrery's own work (F1: one totals line computed from the drawn
 * sections, cutaways split into spacecraft and launcher sketches, the 10-row rule with "Show all").
 */

test.describe('/colophon — totals, cutaway split, the 10-row rule', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/colophon', { waitUntil: 'networkidle' });
    await expect(page.locator('section.colophon[data-route-ready="true"]')).toBeVisible();
    await expect(page.locator('section.block').first()).toBeVisible({ timeout: 10_000 });
  });

  test('the totals line equals the section counts on screen, and the contents agree with the headings', async ({
    page,
  }) => {
    const heads = await page.locator('section.block > h2').evaluateAll((hs) =>
      hs.map((h) => ({
        id: h.id.replace(/^sec-/, ''),
        n: Number(h.querySelector('.count')?.textContent),
      })),
    );
    const toc = await page.locator('nav.toc li').evaluateAll((lis) =>
      lis.map((li) => ({
        id: li
          .querySelector('a')
          ?.getAttribute('href')
          ?.replace(/^#sec-/, ''),
        n: Number(li.querySelector('.counts')?.textContent?.replace(/\D/g, '')),
      })),
    );
    expect(toc).toEqual(heads);

    const works = heads.reduce((n, h) => n + h.n, 0);
    await expect(page.getByTestId('colophon-totals')).toHaveText(
      `${works} original works in ${heads.length} sections`,
    );
    // Interface graphics: the heading, the contents row and the glyph cards are one number
    // (the manifest's own `ui` list holds 4 and is not what the section draws).
    const ui = heads.find((h) => h.id === 'ui')!;
    const more = page.locator('[data-testid="show-all"][data-list="ui"]');
    if (await more.count()) await more.click();
    await expect(page.locator('#sec-ui').locator('xpath=..').locator('.icon-card')).toHaveCount(
      ui.n,
    );
  });

  test('cutaways are split into spacecraft and launcher sketches; exploded stays whole', async ({
    page,
  }) => {
    const j = await (await page.request.get('/data/original-work.json')).json();
    const launchers = j.anatomy_art.filter((e: { kind: string }) => e.kind === 'launcher').length;
    const spacecraft = j.anatomy_art.length - launchers;
    expect(launchers).toBeGreaterThan(0);
    await expect(page.locator('#sec-cutaways .count')).toHaveText(String(spacecraft));
    await expect(page.locator('#sec-launchers .count')).toHaveText(String(launchers));
    await expect(page.locator('#sec-exploded .count')).toHaveText(String(j.exploded_art.length));
    // A launcher is not in the spacecraft grid.
    const spacecraftSection = page.locator('section.block', { has: page.locator('#sec-cutaways') });
    await expect(spacecraftSection.locator('img[alt="Ariane 5"]')).toHaveCount(0);
  });

  test('every list shows 10 rows and a Show all chip that opens the rest', async ({ page }) => {
    const grid = page
      .locator('section.block', { has: page.locator('#sec-launchers') })
      .locator('ul.thumb-grid');
    await expect(grid.locator('> li')).toHaveCount(10);
    const chip = page.locator('[data-testid="show-all"][data-list="launchers"]');
    const total = Number((await chip.textContent())!.replace(/\D/g, ''));
    await chip.click();
    await expect(grid.locator('> li')).toHaveCount(total);
    await expect(chip).toHaveCount(0);
  });

  test('a contents link lands on its open header with the first rows below it', async ({
    page,
  }) => {
    await page.locator('nav.toc a[href="#sec-launchers"]').click();
    const head = page.locator('#sec-launchers');
    await expect(head).toBeInViewport();
    const grid = page.locator('section.block', { has: head }).locator('ul.thumb-grid');
    await expect(grid.locator('> li')).toHaveCount(10);
  });
});
