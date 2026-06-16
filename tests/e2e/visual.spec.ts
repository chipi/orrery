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
  // /science Space-101 landing card grid — the page is a static
  // chapter list with hand-authored SVG covers, no manifest hydration.
  // Captures the tab-card row.
  {
    path: '/science',
    label: 'science-tabs',
    selector: 'main, .science-page, nav.tabs, body',
  },
  // PREVIOUSLY: a third baseline on `/library` (library-head) was
  // dropped 2026-05-22. Library header is a high-churn surface
  // (every launches-calendar / library-section feature grows it
  // by a row); the snapshot was failing more often than it was
  // catching real regressions. Net negative as a tripwire — see
  // docs/guides/visual-regression-baselines.md §"What to snapshot"
  // for the criteria.
  //
  // ── #342 Phase 38 — mobile coverage ────────────────────────────
  // Every entry below is element-scoped on a stable fixed-position
  // HUD or filter strip; the 3D canvas frames stay out of scope
  // (per the file-level comment). Playwright auto-suffixes each
  // baseline with project + platform, so each entry produces a
  // desktop-chromium AND a mobile-chromium snapshot — mobile
  // regressions in any Phase 23–32 surface get caught automatically.
  //
  // /missions filter strip — covers Phase 29 wrap behaviour, Phase
  // 32 search-input height, Phase 28 catalog touch targets.
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
  // /fly hud-collapse button — covers Phase 25 (default-collapsed on
  // touch) + Phase 26 (font floor). The button itself is rendered on
  // every visit (display:none on hover devices via CSS); on mobile-
  // chromium the snapshot captures the visible ◐ toggle, on desktop
  // the empty box (display:none). Stable selector — no canvas.
  {
    path: '/fly',
    label: 'fly-hud-collapse',
    selector: '.hud-collapse',
  },
];

test.describe('visual regression baselines (S8 — element-scoped, stable surfaces only)', () => {
  // Baselines are committed for LINUX ONLY (CI runners). Maintainer
  // local runs on macOS would produce `*-darwin.png` files; those are
  // gitignored to prevent platform drift accumulating in the repo.
  //
  // Regeneration workflow (one click, no Docker needed):
  //   gh workflow run "Regenerate visual snapshots" --ref <branch>
  //
  // The workflow runs Playwright in CI's Linux environment, commits
  // the refreshed PNGs back to the triggered branch via
  // LAUNCHES_BOT_TOKEN. Manual `--update-snapshots` locally still
  // works but the result lands as `*-darwin.png` which CI ignores.
  //
  // Full failure-mode reference: docs/guides/visual-regression-baselines.md

  for (const { path, label, selector } of STABLE_ELEMENTS) {
    test(`${label} — element screenshot baseline`, async ({ page }, testInfo) => {
      // fly-hud-collapse is a mobile-only affordance — the .hud-collapse
      // button is display:none on hover-capable devices. The desktop
      // snapshot would capture an empty hidden node, which Playwright's
      // toBeVisible() correctly rejects. Skip the desktop baseline; the
      // mobile-chromium baseline is what this snapshot is for.
      test.skip(
        label === 'fly-hud-collapse' && testInfo.project.name === 'desktop-chromium',
        'fly-hud-collapse only renders on touch viewports (display:none on hover)',
      );
      await page.goto(path, { waitUntil: 'networkidle' });
      // #342 Phase 29 — /missions and /fleet collapse the filter
      // strip behind .filters-toggle on mobile. Expand it before the
      // selector resolves so the screenshot captures the strip
      // contents, not a hidden node. No-op on desktop (toggle is
      // display:none on hover devices).
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
