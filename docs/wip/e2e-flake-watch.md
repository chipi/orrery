# e2e flake watch — RESOLVED (2026-05-29)

Tracking GH: **[#253](https://github.com/chipi/orrery/issues/253)** (closed)

All three parked mobile-chromium flakes are fixed. Hardening landed in
`31e97146a` (Step 5a — `waitForLoadState('networkidle')` +
`isMobile ? tap() : click()` + pre-action `toBeVisible()`), followed by
further mobile-chromium hardening across `3ea2d156e`, `7ed0fdfe1`,
`7d37aea98`, `fd878a32c`, `99a52b7c2`. Verified 2026-05-29: all three
specs pass 3/3 on `mobile-chromium` (`--repeat-each=3`, 9/9 green).

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

## Resolution
- 2026-05-23 — Step 5a (`31e97146a`) applied `networkidle` + tap-on-mobile + `toBeVisible()` to all three specs.
- Follow-up hardening: `3ea2d156e`, `7ed0fdfe1`, `7d37aea98`, `fd878a32c`, `99a52b7c2`.
- 2026-05-29 — verification run (`--repeat-each=3` mobile-chromium, `-g "chip toggle flips aria-pressed|SIZES overlay opens via toggle|2D toggle reveals the equirectangular Mars map"`): 9/9 green.
