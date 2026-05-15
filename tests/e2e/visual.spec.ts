import { expect, test } from '@playwright/test';

/**
 * Visual regression baseline (S8 — pilot scope: stable non-canvas
 * elements only).
 *
 * Per the test-coverage gap-closure plan, this slice seeds Playwright
 * `toHaveScreenshot` baselines on layout-stable DOM elements. 3D
 * canvas frames are explicitly OUT of scope (locale/font/retina drift
 * makes them flaky beyond their cost-benefit).
 *
 * Element-scoped (NOT full-page) baselines because:
 *   - `/credits` + `/library` render very tall pages whose first-paint
 *     hydration races full-page stability detection
 *   - element scope is rectangle-stable once mounted, regardless of
 *     how long the rest of the page takes to settle
 *
 * Tracks 3 layout-stable surfaces × desktop + mobile = 6 baselines.
 *
 * **First-run behaviour:** Playwright writes new baselines under
 * `tests/e2e/visual.spec.ts-snapshots/` and reports "missing".
 * Re-run to confirm stability. CI may need to re-baseline once on
 * first push to commit the CI-machine snapshots if they differ from
 * local renderings (font hinting / sub-pixel rendering varies across
 * GPUs).
 */

const STABLE_ELEMENTS = [
  // /credits header — title + intro + ToC; renders synchronously
  // and doesn't depend on manifest hydration.
  {
    path: '/credits',
    label: 'credits-head',
    selector: 'section.credits > header.head',
  },
  // /library header — same shape as /credits.
  {
    path: '/library',
    label: 'library-head',
    selector: 'section.library > header.head',
  },
  // /science Space-101 landing card grid — the page is a static
  // chapter list with hand-authored SVG covers, no manifest hydration.
  // Captures the tab-card row.
  {
    path: '/science',
    label: 'science-tabs',
    selector: 'main, .science-page, nav.tabs, body',
  },
];

test.describe('visual regression baselines (S8 — element-scoped, stable surfaces only)', () => {
  for (const { path, label, selector } of STABLE_ELEMENTS) {
    test(`${label} — element screenshot baseline`, async ({ page }, testInfo) => {
      await page.goto(path, { waitUntil: 'networkidle' });
      // Extra animation frame so font rendering settles.
      await page.evaluate(
        () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))),
      );

      // Pick the first matching element from the selector list. Each
      // route uses one of several possible anchors; using a comma-
      // separated locator lets the page evolve without test churn.
      const target = page.locator(selector).first();
      await expect(target).toBeVisible({ timeout: 10_000 });

      // Snapshot is keyed by label only; Playwright auto-suffixes
      // -${project}-${platform}.png so desktop and mobile produce
      // separate baselines.
      await expect(target).toHaveScreenshot(`${label}.png`, {
        // Modest tolerance — 2% pixel-diff cap absorbs anti-alias
        // jitter without becoming a noise filter.
        maxDiffPixelRatio: 0.02,
        animations: 'disabled',
      });

      // Reference unused testInfo to keep tsc happy if the param is
      // reintroduced for per-test logging later.
      void testInfo;
    });
  }
});
