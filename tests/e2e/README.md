# tests/e2e — Playwright suite map

End-to-end specs, named `<route-or-concern>[-facet].spec.ts`; find your file
by route (`explore-*`, `fly-*`, `earth-*`, `fleet.*`) or cross-cutting
concern (`a11y-*`, `audio-*`, `credits.*`).

- **Route families** own one route's behavior; facets split big routes
  (`fly-cislunar`, `fly-descent`, `fly-mount-perf` for mount performance).
- **`a11y*`** — accessibility incl. keyboard nav and the RTL probe.
- **`_helpers/`** — shared page utilities (nav, console-error capture,
  keyboard grids, HUD expansion). Extend helpers rather than re-deriving
  selectors in specs.

Running (all build first — specs run against the built app, not dev):

- `npm run test:e2e` — full suite; `test:e2e:ui` — headed UI mode.
- `npm run test:e2e:mobile` — mobile build + `playwright.mobile.config.ts`.
- `npm run test:e2e:smoke` — landing + smoke walk only, single worker,
  desktop-chromium; the cheap pre-push confidence check.

Convention: a spec that fails only on one platform belongs in the config
that owns that platform, not skipped globally.
