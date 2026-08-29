import { expect, test } from '@playwright/test';

/**
 * Visual regression baseline — element-scoped, stable surfaces only.
 *
 * Per the test-coverage gap-closure plan, this seeds Playwright
 * `toHaveScreenshot` baselines on layout-stable DOM elements. 3D
 * canvas frames are explicitly OUT of scope (locale/font/retina drift
 * makes them flaky beyond their cost-benefit).
 *
 * Element-scoped (NOT full-page) baselines because element scope is
 * rectangle-stable once mounted, regardless of how long the rest of the
 * page takes to settle (tall pages whose first-paint hydration races
 * full-page stability detection).
 *
 * #388 FULL-COVERAGE EXPANSION — every user-facing static route now has a
 * baseline, each pinned to a genuinely motion-free anchor (verified
 * stable in-browser before landing, not guessed):
 *   • Bodies (/venus /mars /moon /earth): the fixed `surface-hud` chip
 *     strip. It's `position:fixed` so it stays box-stable over the live
 *     3D scene — but it's DESKTOP-ONLY (display:none on hover:none /
 *     pointer:coarse), so these are `desktopOnly` and skip mobile.
 *   • Stations (/iss /tiangong): navigated with `?view=list`, which makes
 *     the route skip `startThree()` entirely and render the module roster
 *     as a static fullscreen list — no 3D, stable on every viewport.
 *   • Content routes: SSR-synchronous headers / hub grids that paint
 *     before any manifest/image hydration.
 *
 * The 3D-heavy routes (/explore, /fly's canvas) and live-data routes
 * (/live, /missions/launches) stay out of scope — their content moves or
 * streams, so an element snapshot would be a net-negative flake.
 *
 * **First-run behaviour:** Playwright writes new baselines under
 * `tests/e2e/visual.spec.ts-snapshots/` and reports "missing". The CI
 * "Regenerate visual snapshots" workflow commits the Linux PNGs.
 */

/** @typedef {{ path: string; label: string; selector: string; desktopOnly?: boolean }} StableElement */

/** @type {StableElement[]} */
const STABLE_ELEMENTS = [
  // ── established baselines (pre-#388) ─────────────────────────────
  // /credits header — title + intro + ToC; renders synchronously.
  {
    path: '/credits',
    label: 'credits-head',
    selector: 'section.credits > header.head',
  },
  // /science Space-101 landing — static chapter list, no manifest hydration.
  {
    path: '/science',
    label: 'science-tabs',
    selector: 'main, .science-page, nav.tabs, body',
  },
  // PREVIOUSLY: a /library (library-head) baseline was dropped 2026-05-22 —
  // the full header is high-churn (live totals row grows every launch/link).
  // #388 re-adds /library below with a NARROW title-only anchor that dodges
  // the churn. See docs/guides/visual-regression-baselines.md §"What to snapshot".
  //
  // /missions filter strip — Phase 29 wrap, Phase 32 search height, Phase 28 targets.
  {
    path: '/missions',
    label: 'missions-filters',
    selector: '.filters, [data-audio-stage="missions-filters"]',
  },
  // /fleet filter strip — same surfaces as /missions.
  {
    path: '/fleet',
    label: 'fleet-filters',
    selector: '.filters, [data-audio-stage="fleet-filters"]',
  },
  // /fly mobile control bar — the touch declutter surface. Mobile-only
  // (display:none on hover devices). Stable selector — no canvas.
  {
    path: '/fly',
    label: 'fly-mobile-tabs',
    selector: '.fly-mtabs',
  },
  // /plan selector bar — destination + mission-type controls.
  {
    path: '/plan',
    label: 'plan-selector-bar',
    selector: '[data-audio-stage="plan-selector-bar"], .selector-bar',
  },

  // ── #388 bodies — surface-route HUD (desktop-only; fixed over the 3D scene) ──
  {
    path: '/venus',
    label: 'venus-surface-hud',
    selector: '[data-audio-stage="surface-hud"]',
    desktopOnly: true,
  },
  {
    path: '/mars',
    label: 'mars-surface-hud',
    selector: '[data-audio-stage="surface-hud"]',
    desktopOnly: true,
  },
  {
    path: '/moon',
    label: 'moon-surface-hud',
    selector: '[data-audio-stage="surface-hud"]',
    desktopOnly: true,
  },
  {
    path: '/earth',
    label: 'earth-surface-hud',
    selector: '[data-audio-stage="surface-hud"]',
    desktopOnly: true,
  },

  // ── #388 stations — ?view=list skips the 3D scene → static fullscreen list ──
  {
    path: '/iss?view=list',
    label: 'iss-module-list',
    selector: '[data-audio-stage="iss-module-list"], .list-layer',
  },
  {
    path: '/tiangong?view=list',
    label: 'tiangong-module-list',
    selector: '[data-audio-stage="tiangong-module-list"], .list-layer',
  },

  // ── #388 programs & recent builds — SSR-synchronous headers / hub grids ──
  {
    path: '/programs',
    label: 'programs-head',
    selector: '.programs-index > header.head',
  },
  {
    path: '/patches',
    label: 'patches-head',
    selector: 'article.patches > header',
  },
  {
    path: '/sourcing',
    label: 'sourcing-head',
    selector: 'article.sourcing > header',
  },
  {
    path: '/posters',
    label: 'posters-head',
    selector: 'article.gallery > header',
  },
  {
    // snapshot the synchronous header only — the body is gated on an async fetch.
    path: '/colophon',
    label: 'colophon-head',
    selector: 'section.colophon > header.head',
  },
  {
    path: '/catalog',
    label: 'catalog-hub-grid',
    selector: '[data-audio-stage="catalog-hub-grid"]',
  },

  // ── #388 galleries & content ─────────────────────────────────────
  {
    path: '/gallery',
    label: 'gallery-head',
    selector: 'article.gallery-hub > header',
  },
  {
    path: '/gallery/deep-sky',
    label: 'deep-sky-head',
    selector: 'article.gallery > header',
  },
  {
    path: '/essays',
    label: 'essays-head',
    selector: 'section.longview > header.head',
  },
  {
    path: '/learn',
    label: 'learn-hub-grid',
    selector: '[data-audio-stage="learn-hub-grid"]',
  },
  {
    // NARROW title-only anchor — dodges the high-churn live-totals row that
    // got the old full-header baseline dropped.
    path: '/library',
    label: 'library-title',
    selector: 'section.library .head h1',
  },
  {
    path: '/library/episodes',
    label: 'library-episodes-head',
    selector: 'section.ep-index > .ep-index-head',
  },
  {
    path: '/science/reading-list',
    label: 'reading-list-head',
    selector: 'article.resources > header.head',
  },
  {
    path: '/science/watch-list',
    label: 'watch-list-head',
    selector: 'article.resources > header.head',
  },
  {
    path: '/worlds',
    label: 'worlds-hub-grid',
    selector: '[data-audio-stage="worlds-hub-grid"]',
  },
  {
    path: '/explore/hub',
    label: 'explore-hub-grid',
    selector: '[data-audio-stage="explore-hub-grid"]',
  },
];

test.describe('visual regression baselines (#388 full-coverage — element-scoped, stable surfaces only)', () => {
  // Baselines are committed for LINUX ONLY (CI runners). Maintainer local
  // runs on macOS produce `*-darwin.png` files; those are gitignored.
  //
  // Regeneration workflow (one click, no Docker needed):
  //   gh workflow run "Regenerate visual snapshots" --ref <branch>
  //
  // Full failure-mode reference: docs/guides/visual-regression-baselines.md

  for (const { path, label, selector, desktopOnly } of STABLE_ELEMENTS) {
    test(`${label} — element screenshot baseline`, async ({ page }, testInfo) => {
      const isMobileProject = testInfo.project.name.startsWith('mobile');
      // fly-mobile-tabs is a mobile-only affordance — display:none on hover devices.
      test.skip(
        label === 'fly-mobile-tabs' && testInfo.project.name === 'desktop-chromium',
        'fly-mobile-tabs only renders on touch viewports (display:none on hover)',
      );
      // surface-hud (the body-route HUD) is desktop-only — display:none on
      // (hover:none)/(pointer:coarse). Skip it on the mobile projects.
      test.skip(
        Boolean(desktopOnly) && isMobileProject,
        `${label} anchor is desktop-only (surface HUD is hidden on touch viewports)`,
      );
      // mobile-landscape-chromium Linux visual baselines don't exist yet
      // (local runs only produce gitignored *-darwin.png). FOLLOW-UP: run the
      // regen workflow to commit the landscape baselines, then drop this skip.
      test.skip(
        testInfo.project.name === 'mobile-landscape-chromium',
        'landscape visual baselines pending CI regeneration',
      );
      await page.goto(path, { waitUntil: 'networkidle' });
      // /missions and /fleet collapse the filter strip behind .filters-toggle
      // on mobile. Expand it before the selector resolves so the screenshot
      // captures the strip, not a hidden node. No-op on desktop.
      if (label === 'missions-filters' || label === 'fleet-filters') {
        const toggle = page.locator('.filters-toggle');
        if (await toggle.count()) {
          await toggle
            .first()
            .click({ timeout: 5_000 })
            .catch(() => {});
          await page.waitForTimeout(200);
        }
      }
      // Extra animation frame so font rendering settles.
      await page.evaluate(
        () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))),
      );

      // Pick the first matching element from the selector list. Comma-separated
      // locators let the page evolve without test churn.
      const target = page.locator(selector).first();
      await expect(target).toBeVisible({ timeout: 10_000 });

      // Snapshot keyed by label only; Playwright auto-suffixes
      // -${project}-${platform}.png so desktop and mobile produce separate baselines.
      await expect(target).toHaveScreenshot(`${label}.png`, {
        // Modest tolerance — 2% pixel-diff cap absorbs anti-alias jitter.
        maxDiffPixelRatio: 0.02,
        animations: 'disabled',
      });

      void testInfo;
    });
  }
});
