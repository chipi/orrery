import { test, expect, type ConsoleMessage, type Page } from '@playwright/test';

/**
 * Collectible cards (#547) — the card CTA → overlay → share chain, the
 * one-card-per-real-thing alias rule, and the OG share-stub pages.
 *
 * Covers the invariants TA.md §"Collectible cards" locks:
 *   - every wired panel carries the "Collector card" CTA
 *   - aliased surfaces open the CANONICAL card (fleet perseverance →
 *     the MISSION card with the mission's own hero)
 *   - /c/<kind>/<id> stubs serve crawler-visible OG tags and forward
 *     humans into the app view
 *   - the generated JPEG corpus is served (Share-card + og:image bytes)
 */

function attachConsoleAndError(page: Page) {
  const errors: string[] = [];
  page.on('console', (msg: ConsoleMessage) => {
    if (msg.type() === 'error') errors.push(`console.error: ${msg.text()}`);
  });
  page.on('pageerror', (err: Error) => {
    errors.push(`pageerror: ${err.message}`);
  });
  return errors;
}

/** Open the card overlay from a panel that has finished loading its data. */
async function openCard(page: Page): Promise<void> {
  const cta = page.getByTestId('open-card-btn');
  await expect(cta).toBeVisible({ timeout: 15_000 });
  await cta.click();
  await expect(page.locator('.backdrop .card')).toBeVisible({ timeout: 10_000 });
}

test.describe('collectible cards (#547)', () => {
  test('mission panel opens the card with share actions; Escape closes', async ({ page }) => {
    const errors = attachConsoleAndError(page);
    await page.goto('/missions?id=apollo11');
    await openCard(page);

    const card = page.locator('.backdrop .card');
    await expect(card).toContainText('Apollo 11');
    await expect(card).toContainText('MISSIONS');
    // Collection numbering renders as №NNN/total — don't pin exact counts.
    await expect(card).toContainText('№');

    // Share-card appears once the HEAD probe confirms the generated JPEG;
    // Share-link is always present.
    await expect(page.getByTestId('share-card')).toBeVisible({ timeout: 8_000 });
    await expect(page.getByTestId('share-card-link')).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(card).toBeHidden();

    expect(errors).toEqual([]);
  });

  test('fleet entry that IS a mission opens the canonical MISSION card with the mission hero', async ({
    page,
  }) => {
    await page.goto('/fleet?id=perseverance');
    await openCard(page);

    const card = page.locator('.backdrop .card');
    // Canonical rule: the fleet surface shows the MISSION card…
    await expect(card).toContainText('MISSIONS');
    // …with the mission's own override-blessed hero, not the fleet gallery's.
    await expect(card.locator('.hero-img')).toHaveAttribute(
      'src',
      /\/images\/missions\/perseverance\//,
      { timeout: 10_000 },
    );
  });

  test('fleet hardware gets a FLEET card', async ({ page }) => {
    await page.goto('/fleet?id=saturn-v');
    await openCard(page);
    await expect(page.locator('.backdrop .card')).toContainText('FLEET');
  });

  test('mars surface site without a mission gets a MARS SITES card', async ({ page }) => {
    await page.goto('/mars?site=viking2-lander');
    await openCard(page);
    const card = page.locator('.backdrop .card');
    await expect(card).toContainText('MARS SITES');
    await expect(card).toContainText('Viking 2');
  });

  test('explore planet panel gets a PLANETS card', async ({ page }) => {
    await page.goto('/explore?id=mars');
    await openCard(page);
    await expect(page.locator('.backdrop .card')).toContainText('PLANETS');
  });

  test('OG share stub serves crawler tags and forwards humans into the app', async ({
    page,
    request,
  }) => {
    // Crawler view: the prerendered HTML carries the og tags (no JS).
    const res = await request.get('/c/mission/apollo11');
    expect(res.status()).toBe(200);
    const html = await res.text();
    expect(html).toContain('og:image');
    expect(html).toContain('/images/cards/mission/apollo11.jpg');
    expect(html).toMatch(/og:title[^>]+Apollo 11/);

    // Human view: instant redirect into the mission panel deep-link.
    await page.goto('/c/mission/apollo11');
    await page.waitForURL(/\/missions\?id=apollo11/, { timeout: 10_000 });
  });

  test('generated card JPEG corpus is served', async ({ request }) => {
    for (const path of [
      '/images/cards/mission/apollo11.jpg',
      '/images/cards/fleet/saturn-v.jpg',
      '/images/cards/mars-site/viking2-lander.jpg',
    ]) {
      const res = await request.get(path);
      expect(res.status(), path).toBe(200);
      expect(res.headers()['content-type'], path).toContain('image/jpeg');
    }
  });
});
