import { expect, test, type BrowserContext, type Page } from '@playwright/test';

/**
 * Curator Tour resume across tours (ADR-075 amendment, 2026-09-11).
 *
 * The resume cookie had no tour identity, so `acceptResume()` rebuilt the queue
 * from CURATOR_FULL_TOUR unconditionally. For an episode that exists only in
 * the EXTENDED tour, `indexOf` returned -1, the cookie was cleared and the
 * saved position was silently thrown away.
 *
 * `saturn-rings` is in CURATOR_EXTENDED_TOUR and NOT in CURATOR_FULL_TOUR —
 * the case that separates fixed from broken. These tests ACCEPT the offer,
 * because that is the only path that reaches the buggy code: without the click
 * the cookie survives either way and the test would be vacuous.
 */

const TOUR_COOKIE = 'orrery_tour';
const EXTENDED_ONLY_EPISODE = 'saturn-rings';
/** A real CURATOR_FULL_TOUR episode — the pre-`tid` and fallback cases resume as the full tour. */
const FULL_TOUR_EPISODE = 'pale-blue-dot';

async function cookie(ctx: BrowserContext, name: string): Promise<string | undefined> {
  return (await ctx.cookies()).find((c) => c.name === name)?.value;
}

async function seedResume(ctx: BrowserContext, state: Record<string, unknown>): Promise<void> {
  await ctx.addCookies([
    {
      name: TOUR_COOKIE,
      value: encodeURIComponent(JSON.stringify(state)),
      url: 'http://127.0.0.1:4173',
    },
  ]);
}

/** Open the audio overlay so the resume offer can render. */
async function openOverlay(page: Page): Promise<void> {
  await page.goto('/', { waitUntil: 'networkidle' });
  // Same selector the existing audio specs use (tests/e2e/audio.spec.ts).
  await page.locator('button.audio-toggle').click();
}

test.describe('tour resume carries its tour id (ADR-075)', () => {
  test('an extended-tour episode resumes instead of being discarded', async ({ page, context }) => {
    await seedResume(context, {
      ep: EXTENDED_ONLY_EPISODE,
      pos: 12,
      idx: 3,
      cmp: 0,
      tid: 'curator-extended',
    });

    await openOverlay(page);

    const accept = page.locator('.resume-accept');
    await expect(accept, 'resume offer should be shown for a valid saved episode').toBeVisible({
      timeout: 10000,
    });
    await accept.click();

    // With the bug, acceptResume() cleared the cookie and bailed because the
    // episode is absent from CURATOR_FULL_TOUR. Fixed, the tour resumes and the
    // cookie keeps tracking position.
    await expect
      .poll(async () => await cookie(context, TOUR_COOKIE), { timeout: 8000 })
      .toBeDefined();

    // And the episode actually loaded, rather than the offer silently vanishing.
    await expect(page.locator('.resume-accept')).toHaveCount(0);
  });

  test('a pre-tid cookie still resumes as the full tour (backwards compatible)', async ({
    page,
    context,
  }) => {
    // No `tid` — exactly what every cookie written before the amendment looks
    // like. Must behave as it always did rather than being rejected.
    await seedResume(context, { ep: FULL_TOUR_EPISODE, pos: 5, idx: 0, cmp: 0 });

    await openOverlay(page);

    const accept = page.locator('.resume-accept');
    await expect(accept).toBeVisible({ timeout: 10000 });
    await accept.click();

    await expect
      .poll(async () => await cookie(context, TOUR_COOKIE), { timeout: 8000 })
      .toBeDefined();
  });

  test('an unrecognised tour id falls back instead of dropping the position', async ({
    page,
    context,
  }) => {
    await seedResume(context, {
      ep: FULL_TOUR_EPISODE,
      pos: 5,
      idx: 0,
      cmp: 0,
      tid: 'no-such-tour',
    });

    await openOverlay(page);

    const accept = page.locator('.resume-accept');
    await expect(accept).toBeVisible({ timeout: 10000 });
    await accept.click();

    await expect
      .poll(async () => await cookie(context, TOUR_COOKIE), { timeout: 8000 })
      .toBeDefined();
  });
});
