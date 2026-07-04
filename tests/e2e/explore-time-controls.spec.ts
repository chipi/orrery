import { test, expect, type Page } from '@playwright/test';

/**
 * /explore time playback controls (#351). The bottom scrubber governs the
 * live orbital clock: pause/play, 1×/10×/100× days-per-second speed pills, a
 * running date readout, and a reset-to-today button. Layer 2 anchors the
 * clock to a real calendar (simT=0 ≡ today).
 *
 * On mobile (≤767 px) the three speed pills collapse into a popover behind a
 * `.speed-slot` trigger (showing the current "N×"); the inline desktop pills
 * stay in the DOM (hidden, direct children of `.speed-group`) as a state
 * mirror. `speedMirror` reads aria-pressed on either viewport; `pickSpeed`
 * performs the selection (opening the popover first on mobile).
 */

const play = (p: Page) => p.getByTestId('explore-time-play');
const date = (p: Page) => p.getByTestId('explore-sim-date');
const reset = (p: Page) => p.getByTestId('explore-time-today');

const speedMirror = (p: Page, n: number, isMobile: boolean) =>
  isMobile
    ? p.locator(`.speed-group > [data-testid="explore-speed-${n}"]`)
    : p.getByTestId(`explore-speed-${n}`);

async function openSpeedPopover(page: Page): Promise<void> {
  const trigger = page.locator('.speed-slot button[aria-expanded]').first();
  if ((await trigger.getAttribute('aria-expanded')) !== 'true') {
    await trigger.click().catch(() => {});
    await page.waitForTimeout(150);
  }
}

async function pickSpeed(page: Page, n: number, isMobile: boolean): Promise<void> {
  if (isMobile) {
    await openSpeedPopover(page);
    // Selecting a pill closes the popover.
    await page.locator(`.speed-popover [data-testid="explore-speed-${n}"]`).click();
  } else {
    await page.getByTestId(`explore-speed-${n}`).click();
  }
}

test.describe('/explore — time playback controls', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/explore');
    await expect(play(page)).toBeVisible({ timeout: 8_000 });
  });

  test('panel exposes play, three speed pills, date readout and reset', async ({
    page,
    isMobile,
  }) => {
    await expect(play(page)).toBeVisible();
    if (isMobile) {
      await openSpeedPopover(page);
      await expect(page.locator('.speed-popover [data-testid="explore-speed-1"]')).toBeVisible();
      await expect(page.locator('.speed-popover [data-testid="explore-speed-10"]')).toBeVisible();
      await expect(page.locator('.speed-popover [data-testid="explore-speed-100"]')).toBeVisible();
    } else {
      await expect(speedMirror(page, 1, false)).toBeVisible();
      await expect(speedMirror(page, 10, false)).toBeVisible();
      await expect(speedMirror(page, 100, false)).toBeVisible();
    }
    await expect(reset(page)).toBeVisible();
    // The date readout populates within a frame or two of mount.
    await expect(date(page)).not.toHaveText('', { timeout: 5_000 });
  });

  test('selecting a speed pill marks it active and unpauses', async ({ page, isMobile }) => {
    await pickSpeed(page, 100, isMobile);
    await expect(speedMirror(page, 100, isMobile)).toHaveAttribute('aria-pressed', 'true');
    await expect(speedMirror(page, 10, isMobile)).toHaveAttribute('aria-pressed', 'false');
    // Picking a speed always implies playing.
    await expect(play(page)).toHaveAttribute('aria-pressed', 'false');
  });

  test('pause freezes the clock; no speed pill reads active while paused', async ({
    page,
    isMobile,
  }) => {
    await pickSpeed(page, 100, isMobile);
    await play(page).click(); // pause
    await expect(play(page)).toHaveAttribute('aria-pressed', 'true');
    await expect(speedMirror(page, 100, isMobile)).toHaveAttribute('aria-pressed', 'false');

    // Frozen: the date must not change while paused.
    const frozen = await date(page).textContent();
    await page.waitForTimeout(1_500);
    expect(await date(page).textContent()).toBe(frozen);

    await play(page).click(); // resume
    await expect(play(page)).toHaveAttribute('aria-pressed', 'false');
  });

  test('the date advances while playing at speed', async ({ page, isMobile }) => {
    await pickSpeed(page, 100, isMobile); // 100 days/sec — a large, fast delta
    const start = await date(page).textContent();
    await expect.poll(async () => date(page).textContent(), { timeout: 6_000 }).not.toBe(start);
  });

  test('reset-to-today snaps the clock back to the real present day', async ({
    page,
    isMobile,
  }) => {
    // Race the clock forward, pause so the value holds, then reset.
    await pickSpeed(page, 100, isMobile);
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
