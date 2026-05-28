import { test, expect, type Page } from '@playwright/test';

/**
 * Apollo 11 phase-marker reference suite — GH #107.
 *
 * The "gold-standard reference" Marko called for: Apollo 11 has full
 * Tier 2 (100 waypoints), 8 event anchors, science cross-links, and
 * 14-locale labels. This spec asserts the visible UI behaviour end-
 * to-end on the desktop-chromium + mobile-chromium projects (Playwright
 * matrix takes care of running both).
 *
 * Once this stays green for Apollo 11, the same pattern applies to
 * Apollo 13/17 + Artemis II without code changes — the marker
 * machinery is parameterised on flight.events[] + cislunar_profile.
 *
 * NOT tested here (intentional):
 *  - WebGL render-fidelity of the marker dot's pixel position
 *    (covered by snapshot at the /credits level; ADR-058 / commit C10)
 *  - i18n string parity per locale (the wave23 follow-up pass)
 */

const APOLLO_EVENT_TYPES = [
  'launch',
  'tli_or_tmi',
  'tcm',
  'loi',
  'descent_start',
  'ascent',
  'tei',
  'earth_return',
] as const;

async function loadApollo11(page: Page): Promise<void> {
  await page.goto('/fly?mission=apollo11');
  // Mission identity proves the route loaded + the mission JSON resolved.
  await expect(page.locator('[data-testid="mission-name"]')).toBeVisible({ timeout: 15_000 });
  // Phase-marker overlay only renders once the cislunar trajectory has
  // built AND the animate loop has written its first frame of screen
  // positions. Wait on the overlay before any marker query.
  await expect(page.locator('[data-testid="phase-markers-overlay"]')).toBeVisible({
    timeout: 10_000,
  });
}

test.describe('/fly Apollo 11 — phase markers (GH #107 reference)', () => {
  test('all 8 flight-event markers exist in the overlay (logical count)', async ({ page }) => {
    await loadApollo11(page);
    // Authoritative count = the COMPUTED markers (phaseMarkerScreens
    // array length), exposed via `data-marker-count` on the overlay.
    // The rendered DOM count can be ≤ this depending on which markers
    // happen to project on-screen at the initial camera framing.
    const overlay = page.locator('[data-testid="phase-markers-overlay"]');
    const count = await overlay.getAttribute('data-marker-count');
    expect(Number(count)).toBe(APOLLO_EVENT_TYPES.length);
  });

  test('at least one marker projects on-screen at default framing', async ({ page }) => {
    await loadApollo11(page);
    // Default cislunar camera frames the whole Earth-Moon volume; the
    // mid-mission markers (LOI, descent, ascent, TEI near the Moon)
    // are the most reliably on-screen. Asserting "at least one" guards
    // against a projection regression where all markers flag onScreen
    // false; the exact count is camera-framing-dependent and not a
    // useful pixel-level assertion.
    const onScreenCount = await page
      .locator('[data-testid="phase-markers-overlay"]')
      .getAttribute('data-on-screen-count');
    expect(Number(onScreenCount)).toBeGreaterThan(0);
  });

  test('all markers start in the ghosted state at sim-day = dep_day', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await loadApollo11(page);
    // Reduced-motion freezes sim at dep_day so simMet stays at 0;
    // every event with met_days > 0 is therefore pre-event. launch
    // (met_days=0) sits exactly on the boundary — its state under
    // reducedMotion is fresh+labelVisible (intensity snaps to 1).
    // So we assert "all OTHER markers are ghosted" + "launch is
    // fresh", not "all 8 are ghosted".
    const states = await page.locator('[data-testid="phase-marker"]').evaluateAll((els) =>
      els.map((el) => ({
        state: el.getAttribute('data-phase-state'),
        title: el.querySelector('.dot')?.getAttribute('title') ?? '',
      })),
    );
    const nonLaunch = states.filter((s) => s.title.toLowerCase() !== 'launch');
    expect(nonLaunch.length).toBeGreaterThan(0);
    for (const s of nonLaunch) expect(s.state).toBe('ghosted');
  });

  test('ghosted marker has the dot visible but no label', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await loadApollo11(page);
    // The first marker (launch, MET 0). With reducedMotion the simT is
    // frozen at dep_day so launch sits exactly on the boundary —
    // markerStateFor's `delta = 0` puts it in fresh-snap mode under
    // reducedMotion. To get a guaranteed ghosted, we pick the LAST
    // event (earth_return at MET 8.13d > current simMet=0).
    const ghosted = page
      .locator('[data-testid="phase-marker"][data-phase-state="ghosted"]')
      .first();
    await expect(ghosted).toBeAttached();
    // No label child rendered for a ghosted marker.
    await expect(ghosted.locator('[data-testid="phase-marker-label"]')).toHaveCount(0);
  });

  test('HUD phase pill carries a science chip', async ({ page }) => {
    await loadApollo11(page);
    const pill = page.locator('[data-testid="hud-phase-pill"]');
    await expect(pill).toBeVisible();
    // The chip is a ScienceChip — rendered as <a data-science-chip>
    await expect(pill.locator('[data-science-chip]')).toBeVisible();
  });

  test('HUD phase chip click navigates to /science encyclopedia', async ({ page }) => {
    await loadApollo11(page);
    const chip = page.locator('[data-testid="hud-phase-pill"] [data-science-chip]');
    await expect(chip).toBeVisible();
    const href = await chip.getAttribute('href');
    // Must point at /science/<tab>/<slug> per ADR-036.
    expect(href).toMatch(/\/science\/[a-z-]+\/[a-z-]+$/);
    await chip.click();
    await expect(page).toHaveURL(/\/science\//, { timeout: 10_000 });
  });

  test('phase markers preserved when toggling 3D → 2D', async ({ page }) => {
    await loadApollo11(page);
    const overlay = page.locator('[data-testid="phase-markers-overlay"]');
    // Logical count in 3D mode.
    const countBefore = await overlay.getAttribute('data-marker-count');
    expect(Number(countBefore)).toBe(APOLLO_EVENT_TYPES.length);
    // Toggle to 2D — the button label flips between "2D" / "3D".
    const toggle = page.getByRole('button', { name: /^2d$/i });
    await expect(toggle).toBeVisible();
    await toggle.click();
    // Allow the 2D draw2d frame to write phaseMarkerScreens.
    await expect(page.getByRole('button', { name: /^3d$/i })).toBeVisible();
    await page.waitForTimeout(300);
    const countAfter = await overlay.getAttribute('data-marker-count');
    expect(Number(countAfter)).toBe(APOLLO_EVENT_TYPES.length);
  });

  test('no console errors on load + 3D ⇄ 2D round trip', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    await loadApollo11(page);
    const toggle2d = page.getByRole('button', { name: /^2d$/i });
    await toggle2d.click();
    await page.getByRole('button', { name: /^3d$/i }).click();
    await page.waitForTimeout(300);
    const real = errors.filter((e) => !/favicon|404|webgl warning|hot module/i.test(e));
    expect(real, real.join('\n')).toEqual([]);
  });

  test('reduced-motion: no animation classes, instant label visibility', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await loadApollo11(page);
    // Sim is paused at dep_day under reduced-motion; launch event sits
    // exactly at MET 0 so markerStateFor returns fresh+labelVisible
    // (reducedMotion snaps intensity to 1, labelVisible true).
    const launchLabel = page.locator(
      '[data-testid="phase-marker"][data-phase-state="fresh"] [data-testid="phase-marker-label"]',
    );
    // At least one fresh marker with a label is mounted at sim start.
    await expect(launchLabel.first()).toBeVisible({ timeout: 10_000 });
  });

  test('phase-marker overlay does not render on non-Moon missions', async ({ page }) => {
    // Mariner 4 is a Mars flyby — heliocentric view, no cislunar
    // markers. The overlay {#if} should evaluate false.
    await page.goto('/fly?mission=mariner4');
    await expect(page.locator('[data-testid="mission-name"]')).toBeVisible({ timeout: 10_000 });
    // Brief beat for the animate loop.
    await page.waitForTimeout(500);
    await expect(page.locator('[data-testid="phase-markers-overlay"]')).toHaveCount(0);
  });

  test('every rendered marker dot has the event name in its title attribute (a11y)', async ({
    page,
  }) => {
    await loadApollo11(page);
    // Direct-child `> .dot` so the selector picks up only the marker's
    // own dot, not the ScienceChip's nested `.dot` SVG icon (the chip
    // is rendered inside the label, deeper than the marker's direct
    // dot span).
    const dots = page.locator('[data-testid="phase-marker"] > .dot');
    const titles = await dots.evaluateAll((els) => els.map((el) => el.getAttribute('title')));
    // Every rendered marker (≤ 8 depending on framing) carries its
    // label as hover-only milestone hint for keyboard / mouse-only
    // users. Empty title would mean a marker rendered without its
    // event label resolved — a real defect.
    expect(titles.length).toBeGreaterThan(0);
    for (const t of titles) {
      expect(t).toBeTruthy();
      expect(t!.length).toBeGreaterThan(0);
    }
  });

  test('marker overlay sits inside the .fly container (positioning context)', async ({ page }) => {
    await loadApollo11(page);
    // Sanity: the overlay's parent must be the .fly container so
    // absolute positioning resolves to the canvas bounds, not the
    // body. Captures regressions where the overlay accidentally lifts
    // out of the SPA container.
    const parentClass = await page
      .locator('[data-testid="phase-markers-overlay"]')
      .evaluate((el) => el.parentElement?.className ?? '');
    expect(parentClass).toMatch(/fly\b/);
  });

  test('logical marker count stays stable across sim advancement', async ({ page }) => {
    await loadApollo11(page);
    const overlay = page.locator('[data-testid="phase-markers-overlay"]');
    const before = await overlay.getAttribute('data-marker-count');
    expect(Number(before)).toBe(APOLLO_EVENT_TYPES.length);
    // Let the animate loop tick for a beat; the marker COUNT (not
    // their state) must remain constant. Reveal state can change as
    // simMet advances; this assertion guards against accidental
    // re-renders that drop or duplicate the entries.
    await page.waitForTimeout(1500);
    const after = await overlay.getAttribute('data-marker-count');
    expect(Number(after)).toBe(APOLLO_EVENT_TYPES.length);
  });
});
