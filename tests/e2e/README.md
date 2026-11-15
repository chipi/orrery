# tests/e2e — Playwright suite map

End-to-end specs, named `<route-or-concern>[-facet].spec.ts`; find your file
by route (`explore-*`, `fly-*`, `earth-*`, `fleet.*`) or cross-cutting
concern (`a11y-*`, `audio-*`, `credits.*`).

- **Route families** own one route's behavior; facets split big routes
  (`fly-cislunar`, `fly-descent`, `fly-mount-perf` for mount performance).
- **`a11y*`** — accessibility incl. keyboard nav and the RTL probe.
- **`chip.spec.ts`** — the one chip (UXD-014): size, corners, active look, FILTERS count, hit areas, and a sweep for stray chip-like controls.
- **`gallery.spec.ts`** — the gallery family (UXD-040): the deep-sky viewer inside the window at 1366x768 and 1440x900 for every image (de), scrolling on a phone, the `.page-note` footer's style equal on four pages, the hub strips' text not clipped.
- **`fly-visuals.spec.ts`** — `/fly` 2D and the HUD grid (UXD-043): the 2D canvas draws the flight's own destination (Mars, Jupiter, Pluto, a Moon flight, Europa as Jupiter plus the named moon) fitted inside the canvas with its white rings on screen, read from the canvas's `data-body2d` / `data-moon2d` / `data-scale2d` / `data-extent2d`; every HUD row's value starts in its label's row with one label x and one value x per panel; no label/value row flex-wraps.
- **`venus-sites.spec.ts`** and **`surface-panel-order.spec.ts`** — the Worlds' site panels' photo first: each Venus site's hero, GALLERY tab and lightbox (UXD-036); the hero before the tab row on every Moon, Mars and Venus site (UXD-034).
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
