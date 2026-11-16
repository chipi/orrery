import { test, expect, type Page } from '@playwright/test';

/**
 * /plan → /fly handoff (slice G1, UXD-042): the rocket chosen on /plan reaches /fly as
 * vehicle + payload, the opening card's launch button starts a launch for a plan flight (and
 * `?launch=1` does), the play bar carries one marker row for the whole journey that seeks, and
 * a planetary-moon plan flies its host planet's arc and names the moon (no ORRERY DEMO).
 *
 * The Mars FLYBY cell and Falcon Heavy are chosen so the Δv budget holds (Falcon Heavy
 * 9.4 km/s, the cheapest Mars flyby cell 5.5 km/s): FLY MISSION is only enabled for a viable
 * pick. The mission type is set with the chip, then the rocket (a type change re-suggests one).
 */

async function pickMarsFlybyFalconHeavy(page: Page): Promise<void> {
  await page.goto('/plan?dest=mars&dep=302&tof=311');
  await expect(page.getByRole('status')).toBeHidden({ timeout: 20_000 });
  await page.getByRole('radio', { name: /FLYBY/i }).click();
  const panel = page.getByRole('complementary', { name: /Mission summary/i });
  await expect(panel.locator('select')).toBeVisible({ timeout: 20_000 });
  await panel.locator('select').selectOption('falcon-heavy');
}

async function planToFly(page: Page): Promise<void> {
  await pickMarsFlybyFalconHeavy(page);
  const panel = page.getByRole('complementary', { name: /Mission summary/i });
  const fly = panel.getByRole('button', { name: /FLY MISSION/i });
  await expect(fly).toBeEnabled({ timeout: 20_000 });
  await fly.click();
  await expect(page).toHaveURL(/\/fly\?/);
}

test.describe('/plan keeps and hands over the chosen rocket', () => {
  test('the pick stays in /plan’s own URL (a reload keeps it) and rides the FLY MISSION link', async ({
    page,
  }) => {
    // The Moon: any rocket has the Δv for it, so a reload cannot change viability.
    await page.goto('/plan?dest=moon&dep=312.39&tof=5.33&rocket=h3');
    await expect(page.getByRole('status')).toBeHidden({ timeout: 20_000 });
    const panel = page.getByRole('complementary', { name: /Mission summary/i });
    await expect(panel.locator('select')).toHaveValue('h3', { timeout: 20_000 });
    await panel.locator('select').selectOption('pslv-xl');
    await expect(page).toHaveURL(/rocket=pslv-xl/);
    await page.reload();
    await expect(page.getByRole('status')).toBeHidden({ timeout: 20_000 });
    await expect(panel.locator('select')).toHaveValue('pslv-xl', { timeout: 20_000 });
    const fly = panel.getByRole('button', { name: /FLY MISSION/i });
    await expect(fly).toBeEnabled({ timeout: 20_000 });
    await fly.click();
    await expect(page).toHaveURL(/\/fly\?dest=moon.*rocket=pslv-xl/);
    await expect(page.locator('.opening-stat-val').filter({ hasText: 'PSLV-XL' })).toHaveCount(1, {
      timeout: 30_000,
    });
  });

  test('the destination select has five groups and the 22 destinations', async ({ page }) => {
    await page.goto('/plan');
    const sel = page.locator('.dest-select');
    await expect(sel.locator('optgroup')).toHaveCount(5);
    await expect(sel.locator('option')).toHaveCount(22);
    const groups = await sel
      .locator('optgroup')
      .evaluateAll((els) =>
        els.map((g) => [
          (g as HTMLOptGroupElement).label,
          Array.from(g.querySelectorAll('option')).map((o) => (o as HTMLOptionElement).value),
        ]),
      );
    expect(groups.map((g) => (g[1] as string[]).length)).toEqual([6, 4, 5, 3, 4]);
    expect(groups[3][1]).toEqual(['saturn', 'titan', 'enceladus']);
    expect(groups.every((g) => (g[0] as string).length > 0)).toBe(true);
  });
});

test.describe('/fly after /plan', () => {
  test('shows the chosen rocket and its payload, the launch button starts a launch, markers seek', async ({
    page,
  }) => {
    await planToFly(page);

    // The opening card: vehicle and payload, no dashes.
    const stats = page.locator('.opening-stat-val');
    await expect(stats.filter({ hasText: 'Falcon Heavy' })).toHaveCount(1, { timeout: 30_000 });
    await expect(stats.filter({ hasText: 'Generic spacecraft · 6065 kg' })).toHaveCount(1);
    await expect(stats.filter({ hasText: /^—$/ })).toHaveCount(0);

    // START WITH LAUNCH is a working button for a plan flight.
    const launch = page.locator('[data-testid="fly-opening-launch"]');
    await expect(launch).toBeVisible();
    await launch.click();
    await expect(page.locator('[data-testid="launch-scene"]')).toBeVisible({ timeout: 20_000 });

    // The journey row carries the ascent beats while the launch plays.
    const ascent = page.locator('[data-testid="milestone-track"] [data-marker-kind="ascent"]');
    await expect(ascent.first()).toBeAttached();
    expect(await ascent.count()).toBeGreaterThanOrEqual(2);

    // A click on a tick seeks there: the bar's value moves to the tick's position.
    const last = ascent.last();
    const leftPct = parseFloat(
      (await last.evaluate((el) => (el as HTMLElement).style.left)).replace('%', ''),
    );
    expect(leftPct).toBeGreaterThan(0);
    await last.dispatchEvent('click');
    await expect(async () => {
      const v = await page
        .locator('input.scrub')
        .evaluate((el) => Number((el as HTMLInputElement).value));
      expect(Math.abs(v * 100 - leftPct)).toBeLessThan(2.5);
    }).toPass({ timeout: 10_000 });
  });

  test('a plan flight carries no descent markers', async ({ page }) => {
    await planToFly(page);
    await page.locator('[data-testid="fly-opening-launch"]').click({ timeout: 30_000 });
    await expect(page.locator('[data-testid="launch-scene"]')).toBeVisible({ timeout: 20_000 });
    await expect(page.locator('[data-marker-kind="descent"]')).toHaveCount(0);
  });

  test('?launch=1 starts the launch for a plan URL with a rocket', async ({ page }) => {
    await page.goto('/fly?dest=jupiter&type=flyby&dep=9900&tof=900&rocket=sls-block-1&launch=1');
    await expect(page.locator('[data-testid="launch-scene"]')).toBeVisible({ timeout: 30_000 });
  });

  test('?launch=1 starts the launch for the Moon plan flight too', async ({ page }) => {
    await page.goto('/fly?dest=moon&type=landing&dep=312&tof=5.33&rocket=sls-block-1&launch=1');
    await expect(page.locator('[data-testid="launch-scene"]')).toBeVisible({ timeout: 30_000 });
  });

  test('with no rocket there is no launch to offer (no dead button)', async ({ page }) => {
    await page.goto('/fly?dest=mars&type=flyby&dep=302&tof=311');
    await expect(page.locator('.opening-name')).toContainText('EARTH → MARS', { timeout: 30_000 });
    await expect(page.locator('[data-testid="fly-opening-launch"]')).toHaveCount(0);
  });

  test('the cruise-only bar already carries the flight-director stage ticks', async ({ page }) => {
    await page.goto('/fly?dest=mars&type=flyby&dep=302&tof=311&rocket=falcon-heavy');
    await expect(page.locator('.opening-name')).toContainText('EARTH → MARS', { timeout: 30_000 });
    await expect(
      page.locator('[data-testid="milestone-track"] [data-marker-kind="stage"]').first(),
    ).toBeAttached();
  });
});

test.describe('/fly planetary-moon plan flights (ADR-086)', () => {
  test('Europa flies the Jupiter arc and names Europa, not the demo scenario', async ({ page }) => {
    await page.goto('/fly?dest=europa&type=landing&dep=1092&tof=1089');
    const name = page.locator('.opening-name');
    await expect(name).toContainText('EUROPA', { timeout: 30_000 });
    await expect(name).toContainText('JUPITER');
    await expect(name).not.toContainText('ORRERY DEMO');
    await expect(page.locator('body')).not.toContainText('ORRERY DEMO');
    expect(await page.evaluate(() => window.__flyMissionId?.())).toBe('plan-europa-LANDING');
  });

  for (const dest of ['phobos', 'titan', 'triton']) {
    test(`${dest} does not fall through to the demo scenario`, async ({ page }) => {
      await page.goto(`/fly?dest=${dest}&type=landing&dep=1000&tof=900`);
      await expect(page.locator('.opening-name')).toContainText(dest.toUpperCase(), {
        timeout: 30_000,
      });
    });
  }
});
