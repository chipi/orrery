# src/lib/explore — module map

Pure logic and rune helpers lifted out of `src/routes/explore/+page.svelte`.
The page keeps the `$state`, the fn pointers the scene host fills, and thin
wrappers; markup pieces live next to it in `src/routes/explore/`.

- `scale-shell-controller.ts` — shell ladder + the `?id=` body resolver.
- `small-bodies.ts` — the solar-system small-body catalogue + orbit sampling.
- `paths-legend.ts` — PATHS layer rows, iconic taglines, interstellar craft.
- `format.ts` — HUD formatters (scale numbers, light units, context names,
  star colours, satellite sizes, time dilation).
- `lens-panel.ts` — which science-lens story + layers each shell shows, and
  where the top scale-nav back arrow goes.
- `layer-watchers.ts` — the teaching-layer subscriptions (`onLayerChange`)
  and what each one drives.
- `explore-url-sync.svelte.ts` — deep-link resolvers + shallow URL mirrors
  (`?id ?goto ?system/&planet ?deepsky ?galaxy ?bh ?context ?paths/&focus`).

Contracts: the scene host (`$lib/three/explore-scene-host.ts`) reads and
writes the URL guards through the page's bridge; fn pointers are read at
call time, never captured. `$effect` does not run under this repo's vitest
setup, so `explore-url-sync` is checked by e2e, not unit tests.

Why: TA.md §"/explore v2"; PRD-030 / RFC-032 / RFC-039.
