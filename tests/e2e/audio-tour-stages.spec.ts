import { test, expect, type Page } from '@playwright/test';

/**
 * Tour stage authoring e2e (PRD-016 §S11 / RFC-019 §12).
 *
 * Verifies the executor wires `EPISODE_STAGES` actions to the right DOM
 * targets. Avoids depending on real <audio> playback by driving
 * `audio.positionSec` directly via the `window.__orreryAudio` test
 * hook (ADR-056 pattern). This lets the spec assert the exact frame
 * at which a stage fires without 30 + seconds of wall-clock wait.
 */

const AUDIO_TOGGLE = 'button[aria-label="Toggle audio episodes"]';
const OVERLAY = '#audio-overlay';

async function startTour(page: Page) {
  await page.goto('/', { waitUntil: 'networkidle' });
  await page.locator(AUDIO_TOGGLE).click();
  await expect(page.locator(OVERLAY)).toBeVisible();
  // Two tour-start buttons since commit 4a0df36fb (Extended Tour).
  // Narrow to the curator-only button via :not() on the extended class
  // — strict-mode otherwise rejects the locator for matching both.
  const tourBtn = page.locator(`${OVERLAY} .tour-start:not(.tour-start-extended)`);
  await expect(tourBtn).toBeVisible({ timeout: 10000 });
  await tourBtn.click();
  // First tour episode loaded.
  await expect(page.locator(`${OVERLAY} .overlay-title`)).toContainText(/pale.blue.dot/i);
}

async function setPosition(page: Page, sec: number) {
  await page.evaluate((s) => {
    const w = window as Window & {
      __orreryAudio?: { setPosition: (n: number) => void };
    };
    w.__orreryAudio?.setPosition(s);
  }, sec);
}

test.describe('pale-blue-dot guided stages (PRD-016 §S11 pilot)', () => {
  test('test hook __orreryAudio is exposed once overlay mounts', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    await page.locator(AUDIO_TOGGLE).click();
    await expect(page.locator(OVERLAY)).toBeVisible();
    const ok = await page.evaluate(() => {
      const w = window as Window & {
        __orreryAudio?: { setPosition?: (n: number) => void };
      };
      return typeof w.__orreryAudio?.setPosition === 'function';
    });
    expect(ok).toBe(true);
  });

  test('data-audio-stage anchors are present on / for every non-cue stage', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    for (const name of [
      'hero',
      'hero-illustration',
      'hero-earth-label',
      'route-grid',
      'route-card-explore',
    ]) {
      const count = await page.locator(`[data-audio-stage="${name}"]`).count();
      expect(count, `data-audio-stage="${name}" should exist on /`).toBeGreaterThan(0);
    }
  });

  test('flash fires at 32s on the hero illustration', async ({ page }) => {
    await startTour(page);
    const target = page.locator('[data-audio-stage="hero-illustration"]');
    // Pre-fire — class absent.
    await expect(target).not.toHaveClass(/audio-stage-flash/);
    await setPosition(page, 32);
    await expect(target).toHaveClass(/audio-stage-flash/, { timeout: 2000 });
  });

  test('flash on hero-earth-label fires at 52s', async ({ page }) => {
    await startTour(page);
    await setPosition(page, 52);
    const target = page.locator('[data-audio-stage="hero-earth-label"]');
    await expect(target).toHaveClass(/audio-stage-flash/, { timeout: 2000 });
  });

  test('route-grid flash fires at 100s and route-card-explore flash at 110s', async ({ page }) => {
    await startTour(page);
    await setPosition(page, 100);
    await expect(page.locator('[data-audio-stage="route-grid"]')).toHaveClass(/audio-stage-flash/, {
      timeout: 2000,
    });
    await setPosition(page, 110);
    await expect(page.locator('[data-audio-stage="route-card-explore"]')).toHaveClass(
      /audio-stage-flash/,
      { timeout: 2000 },
    );
  });

  test('cue banner appears at 4s with the scene-setter text', async ({ page }) => {
    await startTour(page);
    await setPosition(page, 4);
    // .cue-banner lives in the global .tour-banners stack (rendered
    // outside #audio-overlay so it stays visible when the overlay
    // collapses to compact mode).
    const cue = page.locator('.tour-banners .cue-banner');
    await expect(cue).toBeVisible({ timeout: 2000 });
    await expect(cue).toContainText(/Voyager 1 turned around/i);
  });

  test('stages do not re-fire on a second positionSec update past the same threshold', async ({
    page,
  }) => {
    await startTour(page);
    await setPosition(page, 32);
    await expect(page.locator('[data-audio-stage="hero-illustration"]')).toHaveClass(
      /audio-stage-flash/,
    );
    // Wait for the 1.8 s flash class to drop.
    await page.waitForTimeout(2200);
    await expect(page.locator('[data-audio-stage="hero-illustration"]')).not.toHaveClass(
      /audio-stage-flash/,
    );
    // Push past 32 again — same stage should NOT re-fire.
    await setPosition(page, 33);
    await page.waitForTimeout(300);
    await expect(page.locator('[data-audio-stage="hero-illustration"]')).not.toHaveClass(
      /audio-stage-flash/,
    );
  });
});

/**
 * Cross-route anchor presence (c26f0d492 full-corpus stage authoring).
 *
 * The pale-blue-dot block above covers the landing page only. The
 * audio-tour.test.ts unit test enforces source-file presence of every
 * non-cue selector, but it can't catch a runtime regression where an
 * anchor never hydrates (e.g. wrapped in an {#if} that defaults closed,
 * or thrown by an SSR error). One presence check per critical-path
 * route gives the runtime guarantee at near-zero cost.
 */
test.describe('cross-route tour anchors hydrate on first paint (c26f0d492)', () => {
  // Filter anchors (`missions-filters`, `fleet-filters`) sit inside the
  // `{#if filtersExpanded}` block — they're real tour targets but won't
  // be in the DOM on first paint. The tour scroll/flash on those is
  // currently best-effort: a silent no-op if filters haven't been
  // expanded. Tracked separately from this presence check; included in
  // unit-test source-string sweep at audio-tour.test.ts:216-259.
  const ROUTE_ANCHORS: ReadonlyArray<{ route: string; anchors: readonly string[] }> = [
    {
      route: '/missions',
      anchors: [
        'missions-grid',
        'missions-select-apollo11',
        'missions-select-curiosity',
        'missions-select-voyager-2',
      ],
    },
    {
      route: '/fleet',
      anchors: ['fleet-grid', 'fleet-select-saturn-v', 'fleet-select-iss', 'fleet-select-hubble'],
    },
    {
      route: '/iss',
      anchors: [
        'iss-module-list',
        'iss-select-zarya',
        'iss-select-destiny',
        'iss-select-kibo',
        'iss-select-columbus',
      ],
    },
    {
      route: '/tiangong',
      anchors: [
        'tiangong-module-list',
        'tiangong-select-tianhe',
        'tiangong-select-wentian',
        'tiangong-select-mengtian',
      ],
    },
  ];

  for (const { route, anchors } of ROUTE_ANCHORS) {
    test(`${route} renders every staged anchor`, async ({ page }) => {
      await page.goto(route, { waitUntil: 'networkidle' });
      for (const name of anchors) {
        const count = await page.locator(`[data-audio-stage="${name}"]`).count();
        expect(count, `${route} should expose data-audio-stage="${name}"`).toBeGreaterThan(0);
      }
    });
  }
});
