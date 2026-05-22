# e2e flake watch — parked until end of v0.7.x

Tracking GH: **[#253](https://github.com/chipi/orrery/issues/253)**

Small mobile-chromium e2e flakes that survived Step 0 cleanup. Not
blockers for #PC (Moon) or #PF (non-NASA missions). Address as a
single batch near end of v0.7.x with one locator / scroll / tap pass.

## Parked cases

### `earth.spec.ts:183` — chip toggle flips aria-pressed (mobile-only)
- After `stations.click()`, `aria-pressed` stays `"true"` across 10 retries.
- Locator resolves to the right button (`data-testid="layer-stations"`).
- Cheapest fix candidates:
  - `await stations.tap()` (mobile touchscreen) instead of `.click()`.
  - `await page.waitForLoadState('networkidle')` before the click — HUD intro animation may not have flushed.
- Reproducer:
  ```
  npx playwright test --workers=1 --project=mobile-chromium tests/e2e/earth.spec.ts:183
  ```

### Watch list (no failure observed but flagged historically)
- `explore.spec.ts:189` — SIZES overlay
- `mars.spec.ts:25` — 2D toggle (currently passing; keep on watch)

## What Step 0 DID land

- Dropped maintainer-side `*-darwin.png` baselines + gitignore rules.
- Dropped `library-head` visual baseline (high-churn surface).
- Added `Regenerate visual snapshots` manual workflow for one-click baseline refresh from CI.
- Batch-fixed `getByRole('complementary')` → `aside.panel` (launches-banner ambiguity) across `mars/moon/earth/explore` specs.

## Resuming work
At end of v0.7.x: pick up #253, run the reproducer, attempt the tap()/networkidle fix, then full Playwright pass on both projects.
