import { test, expect, type Page } from '@playwright/test';

/**
 * Audio overlay smoke tests (PRD-016 / RFC-019).
 *
 * Coverage at this layer (catches the catastrophic regression class):
 *  - Waveform icon in Nav opens the overlay.
 *  - Episode inventory loads from /data/audio/audio-provenance.json.
 *  - Clicking an episode loads it into the player + audio element src updates.
 *  - "Take the Curator Tour" starts a playlist.
 *  - ?audio=<id> deep-link opens overlay + loads matching episode.
 *
 * Deliberately does NOT assert audio actually plays — Playwright's
 * default browser denies autoplay without user gesture, and that's
 * an honest reflection of production. We assert the wiring up to
 * "audio element has the right src and is not in error state" and
 * trust the unit tests for the inner state machine.
 */

// Select by class — the aria-label moved through "Toggle audio episodes"
// → "Take the tour" (i18n-driven via m.nav_audio_tour_aria()); class is
// stable across copy changes + locales.
const AUDIO_TOGGLE_SELECTOR = 'button.audio-toggle';
const OVERLAY_SELECTOR = '#audio-overlay';
const FIRST_EPISODE_BUTTON = '.episode-row';

async function openOverlay(page: Page) {
  await page.locator(AUDIO_TOGGLE_SELECTOR).click();
  await expect(page.locator(OVERLAY_SELECTOR)).toBeVisible();
}

test.describe('AudioOverlay smoke', () => {
  test('waveform icon opens + closes the overlay', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    const toggle = page.locator(AUDIO_TOGGLE_SELECTOR);
    await expect(toggle).toBeVisible();

    await toggle.click();
    await expect(page.locator(OVERLAY_SELECTOR)).toBeVisible();

    await page.locator(`${OVERLAY_SELECTOR} button[aria-label="Close audio overlay"]`).click();
    await expect(page.locator(OVERLAY_SELECTOR)).toBeHidden();
  });

  test('episode inventory loads from audio-provenance.json', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    await openOverlay(page);

    // Wait for registry to finish loading — the scope tabs appear once
    // audioRegistry.loaded flips true.
    await expect(page.locator(`${OVERLAY_SELECTOR} .scope-tabs`)).toBeVisible({ timeout: 10000 });

    const rows = page.locator(FIRST_EPISODE_BUTTON);
    await expect(rows.first()).toBeVisible();
    const count = await rows.count();
    expect(count).toBeGreaterThan(0);
  });

  test('clicking an episode loads it into the player', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    await openOverlay(page);

    await expect(page.locator(`${OVERLAY_SELECTOR} .scope-tabs`)).toBeVisible({ timeout: 10000 });

    const firstRow = page.locator(FIRST_EPISODE_BUTTON).first();
    const epTitle = await firstRow.locator('.ep-title').textContent();
    await firstRow.click();

    // After click, the now-playing section renders with the episode title.
    await expect(page.locator(`${OVERLAY_SELECTOR} .overlay-title`)).toContainText(
      epTitle?.trim() ?? '',
    );

    // The hidden <audio> element gets a real src.
    const src = await page.locator(`${OVERLAY_SELECTOR} audio`).getAttribute('src');
    expect(src).toMatch(/\.mp3$/);
  });

  test('Take the Curator Tour starts a playlist', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    await openOverlay(page);

    // Curator button only — target its positive class (siblings: extended +
    // kiosk launchers also carry .tour-start, so a bare selector is ambiguous).
    const tourBtn = page.locator(`${OVERLAY_SELECTOR} .tour-start-curator`);
    await expect(tourBtn).toBeVisible({ timeout: 10000 });
    await tourBtn.click();

    // Tour-active bar shows position indicator.
    const tourPos = page.locator(`${OVERLAY_SELECTOR} .tour-position`);
    await expect(tourPos).toBeVisible();
    await expect(tourPos).toContainText('/'); // e.g. "1 / 21"

    // First tour episode is pale-blue-dot — the now-playing title reflects.
    await expect(page.locator(`${OVERLAY_SELECTOR} .overlay-title`)).toContainText(
      /pale.blue.dot/i,
    );
  });

  test('?audio=<id> deep-link opens overlay and loads the matching episode', async ({ page }) => {
    await page.goto('/?audio=pale-blue-dot', { waitUntil: 'networkidle' });

    await expect(page.locator(OVERLAY_SELECTOR)).toBeVisible({ timeout: 10000 });
    await expect(page.locator(`${OVERLAY_SELECTOR} .overlay-title`)).toContainText(
      /pale.blue.dot/i,
      { timeout: 10000 },
    );

    const src = await page.locator(`${OVERLAY_SELECTOR} audio`).getAttribute('src');
    expect(src).toMatch(/curator\/pale-blue-dot\..+\.mp3$/);
  });

  // A/B variant switcher tests skipped — the voice-picker UI was unwired
  // in commit 36c00f4d7 ("tour-first copy, two-up launchers, voice picker
  // unwired"). The .provider-switcher / .provider-btn DOM no longer exists
  // (only the CSS lingers in AudioOverlay.svelte). Re-enable when the
  // picker is rewired.
  test.skip('A/B variant switcher appears for episodes with two providers', async ({ page }) => {
    await page.goto('/?audio=pale-blue-dot', { waitUntil: 'networkidle' });
    await expect(page.locator(OVERLAY_SELECTOR)).toBeVisible({ timeout: 10000 });

    const switcher = page.locator(`${OVERLAY_SELECTOR} .provider-switcher`);
    await expect(switcher).toBeVisible({ timeout: 10000 });

    const buttons = switcher.locator('.provider-btn');
    const count = await buttons.count();
    expect(count).toBeGreaterThanOrEqual(2); // Google + ElevenLabs at least
  });

  test.skip('clicking the inactive A/B variant swaps the audio src', async ({ page }) => {
    await page.goto('/?audio=pale-blue-dot', { waitUntil: 'networkidle' });
    await expect(page.locator(OVERLAY_SELECTOR)).toBeVisible({ timeout: 10000 });

    const switcher = page.locator(`${OVERLAY_SELECTOR} .provider-switcher`);
    await expect(switcher).toBeVisible({ timeout: 10000 });

    const srcBefore = await page.locator(`${OVERLAY_SELECTOR} audio`).getAttribute('src');
    expect(srcBefore).toBeTruthy();

    // Click the variant button that is NOT currently active.
    const inactive = switcher.locator('.provider-btn:not(.active)').first();
    await expect(inactive).toBeVisible();
    await inactive.click();

    await expect
      .poll(async () => page.locator(`${OVERLAY_SELECTOR} audio`).getAttribute('src'), {
        timeout: 5000,
      })
      .not.toBe(srcBefore);
  });

  test('captions toggle (CC) flips aria-pressed', async ({ page }) => {
    await page.goto('/?audio=pale-blue-dot', { waitUntil: 'networkidle' });
    await expect(page.locator(OVERLAY_SELECTOR)).toBeVisible({ timeout: 10000 });

    const cc = page.locator(`${OVERLAY_SELECTOR} .cc-toggle`);
    await expect(cc).toBeVisible({ timeout: 10000 });

    const initial = await cc.getAttribute('aria-pressed');
    await cc.click();
    const after = await cc.getAttribute('aria-pressed');
    expect(after).not.toBe(initial);
  });

  test('deep-link is a one-shot — closing overlay does not re-pop on re-render', async ({
    page,
  }) => {
    await page.goto('/?audio=pale-blue-dot', { waitUntil: 'networkidle' });
    await expect(page.locator(OVERLAY_SELECTOR)).toBeVisible({ timeout: 10000 });

    await page.locator(`${OVERLAY_SELECTOR} button[aria-label="Close audio overlay"]`).click();
    await expect(page.locator(OVERLAY_SELECTOR)).toBeHidden();

    // Trigger a no-op state churn (toggle science lens off/on isn't reliable
    // cross-route; instead trigger a small router event by reloading the URL
    // hash). The handledAudioIds Set should keep the overlay closed.
    await page.evaluate(() => {
      history.replaceState({}, '', window.location.pathname + window.location.search + '#test');
    });
    await page.waitForTimeout(200);
    await expect(page.locator(OVERLAY_SELECTOR)).toBeHidden();
  });

  test('deep-link to /mars episode auto-navigates from / to /mars', async ({ page }) => {
    await page.goto('/?audio=signal-delay', { waitUntil: 'networkidle' });

    await expect(page.locator(OVERLAY_SELECTOR)).toBeVisible({ timeout: 10000 });

    // After the registry loads, the layout effect should goto() the
    // episode's anchored route. signal-delay anchors to /mars.
    await expect.poll(() => page.url(), { timeout: 10000 }).toMatch(/\/mars/);
  });

  test('stopping a tour does not bounce-back the overlay-title state', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    await openOverlay(page);

    // Curator button only (see test above for the strict-mode rationale).
    const tourBtn = `${OVERLAY_SELECTOR} .tour-start-curator`;
    await page.locator(tourBtn).click();
    await expect(page.locator(`${OVERLAY_SELECTOR} .tour-position`)).toBeVisible();

    await page.locator(`${OVERLAY_SELECTOR} .tour-stop`).click();

    // After stopping, tour-bar shows the start button again (idle state).
    await expect(page.locator(tourBtn)).toBeVisible();
  });
});
