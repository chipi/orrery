import { test, expect, type Page } from '@playwright/test';

/**
 * Star, outer-scale and black-hole panels follow the planet pattern (B3, UXD-023): one hero or
 * none, tabs on the shared row, a star's constellation finder only in IN THE SKY, a black hole
 * opening in place with the lensing render as its action. Deep links only (the INDEX and the
 * canvas picks are covered by scale-index.spec.ts and select-focus.spec.ts).
 */

const panel = (page: Page) => page.locator('aside.panel:not(.covered)').first();

async function open(page: Page, url: string) {
  await page.goto(url);
  await expect(panel(page)).toBeVisible({ timeout: 20_000 });
}

test.describe('star panel (SN2, UXD-008)', () => {
  test('Antares: one hero, no finder above the tabs, Overview text on screen', async ({ page }) => {
    await open(page, '/explore?goto=antares');
    const p = panel(page);
    await expect(p.locator('.panel-hero')).toHaveCount(1);
    await expect(p.locator('.star-finder')).toHaveCount(0);
    await expect(p.locator('[role="tablist"] [role="tab"]')).toHaveText([
      'OVERVIEW',
      'IN THE SKY',
      'TECHNICAL',
    ]);
    const lead = p.locator('.tab-content .editorial').first();
    await expect(lead).toBeVisible();
    // A phone held sideways is 390 px tall: the lead is a scroll away there, as for every panel.
    if ((page.viewportSize()?.height ?? 0) >= 600) await expect(lead).toBeInViewport();
    const ratio = await p
      .locator('.panel-hero-btn img')
      .evaluate((el) => el.clientWidth / el.clientHeight);
    expect(ratio, 'the hero is the 16:9 cover box').toBeGreaterThan(1.7);
    expect(ratio).toBeLessThan(1.85);
  });

  test('IN THE SKY holds the finder, the constellation, the zodiac note and the lines action', async ({
    page,
  }) => {
    await open(page, '/explore?goto=antares');
    const p = panel(page);
    await p.locator('#star-tab-sky').click();
    await expect(p.locator('#star-tabpanel .star-finder')).toBeVisible();
    await expect(p.locator('#star-tabpanel')).toContainText('Scorpius');
    await expect(p.locator('#star-tabpanel')).toContainText('zodiac constellation');
    await expect(
      p.locator('#star-tabpanel').getByRole('button', { name: 'Show constellation lines' }),
    ).toBeVisible();
  });

  test('a star with a reviewed crop keeps it (Sirius)', async ({ page }) => {
    await open(page, '/explore?goto=sirius');
    const img = panel(page).locator('.panel-hero-btn img');
    await expect
      .poll(() => img.evaluate((el) => (el as HTMLElement).style.objectPosition))
      .toBe('50% 35%');
  });

  test('a star without a photo shows its drawn portrait as the one hero', async ({ page }) => {
    await open(page, '/explore?goto=arcturus');
    const p = panel(page);
    await expect(p.locator('.panel-hero')).toHaveCount(1);
    await expect(p.locator('.panel-hero canvas')).toHaveCount(1);
    await expect(p.locator('.panel-hero img')).toHaveCount(0);
  });

  test('no star has a second image, so no Gallery tab', async ({ page }) => {
    await open(page, '/explore?goto=vega');
    await expect(panel(page).locator('#star-tab-gallery')).toHaveCount(0);
  });
});

test.describe('outer-scale panels (MW3, MW5)', () => {
  test('omega Centauri: its photo is the hero, no private rem type', async ({ page }) => {
    await open(page, '/explore?galaxy=omega-centauri');
    const p = panel(page);
    await expect(p.locator('.panel-hero')).toHaveCount(1);
    await expect(p.locator('.panel-hero img')).toHaveAttribute(
      'src',
      /hst-omega-centauri\.thumb\.jpg/,
    );
    await expect(p.locator('.editorial').first()).toBeVisible();
    await expect(p.getByText('Globular cluster', { exact: false }).first()).toBeVisible();
  });

  test('the LMC: a part-of photo says what is pictured', async ({ page }) => {
    await open(page, '/explore?galaxy=lmc');
    const p = panel(page);
    await expect(p.locator('.panel-hero')).toHaveCount(1);
    await expect(p.locator('.hero-caption')).toContainText('Pictured: Tarantula Nebula');
  });

  test('a spiral arm has no hero: no slot, no empty frame, no tab row', async ({ page }) => {
    await open(page, '/explore?galaxy=perseus');
    const p = panel(page);
    await expect(p.getByText('Spiral arm', { exact: false }).first()).toBeVisible();
    await expect(p.locator('.panel-hero')).toHaveCount(0);
    await expect(p.locator('[role="tablist"]')).toHaveCount(0);
  });

  test('a deep-sky object shows its photo as the hero and the same size lead', async ({ page }) => {
    await open(page, '/explore?deepsky=m42');
    const p = panel(page);
    await expect(p.locator('.panel-hero')).toHaveCount(1);
    await expect(p.locator('.panel-hero img')).toHaveAttribute('src', /\/images\/deep-sky\//);
  });
});

test.describe('black holes (MW3, Q1)', () => {
  test('a hole picked at its scale opens its panel in place, with the EHT hero and the lensing action', async ({
    page,
  }) => {
    await open(page, '/explore?galaxy=sagittarius-a-star');
    const p = panel(page);
    await expect(p.locator('.panel-hero img')).toHaveAttribute(
      'src',
      /black-holes\/sagittarius-a-star\/01/,
    );
    expect(new URL(page.url()).searchParams.get('bh'), 'no takeover yet').toBeNull();
    const see = p.getByRole('button', { name: 'See the lensing simulation' });
    await expect(see).toBeVisible();
    await see.click();
    await expect
      .poll(() => new URL(page.url()).searchParams.get('bh'), { timeout: 15_000 })
      .toBe('sagittarius-a-star');
    await expect(
      panel(page).getByRole('button', { name: 'See the lensing simulation' }),
    ).toHaveCount(0);
  });

  test('?bh= still enters the takeover directly, with the panel and no lensing action', async ({
    page,
  }) => {
    await open(page, '/explore?bh=sagittarius-a-star');
    await expect(panel(page).locator('.panel-hero')).toHaveCount(1);
    await expect(
      panel(page).getByRole('button', { name: 'See the lensing simulation' }),
    ).toHaveCount(0);
  });

  test('a hole without a picture has no hero slot (Cygnus X-1)', async ({ page }) => {
    await open(page, '/explore?galaxy=cygnus-x-1');
    await expect(panel(page).locator('.panel-hero')).toHaveCount(0);
    await expect(
      panel(page).getByRole('button', { name: 'See the lensing simulation' }),
    ).toBeVisible();
  });

  test('the hero opens the lightbox', async ({ page }) => {
    await open(page, '/explore?galaxy=sagittarius-a-star');
    await panel(page).locator('.panel-hero-btn').click();
    await expect(page.locator('.lightbox')).toBeVisible();
  });

  test('an open hole panel is a selection: ?galaxy= keeps it, Reset is live and closes it', async ({
    page,
  }) => {
    await open(page, '/explore?galaxy=sagittarius-a-star');
    await expect(panel(page)).toContainText(/Sagittarius A\*/);
    expect(new URL(page.url()).searchParams.get('galaxy')).toBe('sagittarius-a-star');
    const reset = page.getByTestId('explore-scale-reset');
    await expect(reset).toBeEnabled();
    // × keeps the camera on the pin, so Reset stays live (UXD-019); on a phone × is also the way
    // past the sheet to the navigator.
    await panel(page).locator('.panel-close').click();
    await expect(page.locator('aside.panel:visible')).toHaveCount(0);
    await expect(reset).toBeEnabled();
    await reset.click();
    await expect
      .poll(() => page.evaluate(() => window.__exploreCameraState!().origin), { timeout: 10_000 })
      .toEqual([0, 0, 0]);
    expect(new URL(page.url()).searchParams.get('galaxy')).toBeNull();
  });

  test('picking another member closes the hole panel and shows the member', async ({ page }) => {
    await open(page, '/explore?galaxy=sagittarius-a-star');
    const toggle = page.getByTestId('scale-index-toggle');
    // A portrait phone's full-height sheet covers the INDEX handle: no other pick is reachable
    // while the hole's panel is open there.
    const covered = await toggle.evaluate((el) => {
      const r = el.getBoundingClientRect();
      const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      return !top || !(top === el || el.contains(top));
    });
    test.skip(covered, "the hole's full-height sheet covers the INDEX handle");
    await toggle.click();
    await page
      .locator(
        'aside.scale-index[data-scale="milky-way"] button.si-row[data-index-id="omega-centauri"]',
      )
      .click();
    await expect(panel(page)).toContainText(/Omega Centauri|ω Centauri/i, { timeout: 10_000 });
    await expect(page.locator('aside.panel:visible')).toHaveCount(1);
    await expect(page.locator('aside.panel:visible')).not.toContainText(/Sagittarius A\*/);
  });
});
