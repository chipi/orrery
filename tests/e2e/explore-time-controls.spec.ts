import { test, expect, type Page } from '@playwright/test';

/**
 * /explore time playback controls (#351). The bottom-left panel governs the
 * live orbital clock: pause/play, 1×/10×/100× days-per-second speed pills, a
 * running date readout, and a reset-to-today button. Layer 2 anchors the
 * clock to a real calendar (simT=0 ≡ today).
 *
 * Pin reducedMotion off so the sim clock actually advances — under
 * prefers-reduced-motion the clock hard-freezes (ADR-025) and the
 * "date advances" assertion would never resolve.
 */
test.use({ reducedMotion: 'no-preference' });

const play = (p: Page) => p.getByTestId('explore-time-play');
const date = (p: Page) => p.getByTestId('explore-sim-date');
const reset = (p: Page) => p.getByTestId('explore-time-today');
const speed = (p: Page, n: number) => p.getByTestId(`explore-speed-${n}`);

test.describe('/explore — time playback controls', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/explore');
    await expect(play(page)).toBeVisible({ timeout: 8_000 });
  });

  test('panel exposes play, three speed pills, date readout and reset', async ({ page }) => {
    await expect(play(page)).toBeVisible();
    await expect(speed(page, 1)).toBeVisible();
    await expect(speed(page, 10)).toBeVisible();
    await expect(speed(page, 100)).toBeVisible();
    await expect(reset(page)).toBeVisible();
    // The date readout populates within a frame or two of mount.
    await expect(date(page)).not.toHaveText('', { timeout: 5_000 });
  });

  test('selecting a speed pill marks it active and unpauses', async ({ page }) => {
    await speed(page, 100).click();
    await expect(speed(page, 100)).toHaveAttribute('aria-pressed', 'true');
    await expect(speed(page, 10)).toHaveAttribute('aria-pressed', 'false');
    // Picking a speed always implies playing.
    await expect(play(page)).toHaveAttribute('aria-pressed', 'false');
  });

  test('pause freezes the clock; no speed pill reads active while paused', async ({ page }) => {
    await speed(page, 100).click();
    await play(page).click(); // pause
    await expect(play(page)).toHaveAttribute('aria-pressed', 'true');
    await expect(speed(page, 100)).toHaveAttribute('aria-pressed', 'false');

    // Frozen: the date must not change while paused.
    const frozen = await date(page).textContent();
    await page.waitForTimeout(1_500);
    expect(await date(page).textContent()).toBe(frozen);

    await play(page).click(); // resume
    await expect(play(page)).toHaveAttribute('aria-pressed', 'false');
  });

  test('the date advances while playing at speed', async ({ page }) => {
    await speed(page, 100).click(); // 100 days/sec — a large, fast delta
    const start = await date(page).textContent();
    await expect
      .poll(async () => date(page).textContent(), { timeout: 6_000 })
      .not.toBe(start);
  });

  test('reset-to-today snaps the clock back to the real present day', async ({ page }) => {
    // Race the clock forward, pause so the value holds, then reset.
    await speed(page, 100).click();
    await play(page).click(); // pause to freeze whatever date we landed on
    await reset(page).click();

    // Expected = today formatted exactly as the chip formats it (2-digit day).
    const expected = await page.evaluate(() => {
      const loc = document.documentElement.lang || undefined;
      return new Intl.DateTimeFormat(loc, {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
      }).format(new Date());
    });
    await expect(date(page)).toHaveText(expected, { timeout: 5_000 });
  });
});
