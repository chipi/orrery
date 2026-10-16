# /explore v2 "The Known Universe" — Slice 0 handover (2026-07-14)

*Branch: `explore-v2` (off `origin/main`). Not pushed. For the next agent / session.*

## What this is

Slice 0 of the /explore v2 epic (PRD-030 / RFC-032 / UXS-014): extend `/explore`
outward from the solar system into the real HYG stellar neighborhood, **in place**,
with v1 untouched. This slice landed the spine + the first emotional reveal.

## State

- **Built + green + visually verified on desktop AND mobile.** Committed to
  `explore-v2` (checkpoint `93b038cd1b` + a polish/mobile/i18n checkpoint on top).
  **Nothing pushed** (Marko gates push).
- Gates: typecheck 0 errors · eslint clean · vitest `src/lib/universe` green
  (context-graph / bv-to-rgb / star-selection / budget / scale-readout) · validate-data
  green · i18n compiles, 14-locale parity · no console/page errors.

## What works

- **Boundary crossing in real `/explore`:** zoom out to the heliocentric ceiling,
  scroll/pinch once more → leave the solar system. Scene swaps to the neighborhood
  (Sun → dot, real HYG field fades in, true positions + B−V spectral colour), eased
  pull-back dolly + warp-flash mask (reduced-motion aware). Scroll/pinch in past the
  inner edge, or Reset View, or the breadcrumb → cross back. **v1 render path + zoom
  range unchanged; neighborhood is a lazily-imported second scene.**
- **Scale ruler HUD:** km·AU·ly·pc ladder (active unit lit) + light-travel time +
  map scale bar, live across both contexts. Solar mode drops the redundant numeric
  readout (the Orbit Ruler owns it); neighborhood shows the full ly/pc readout.
- **Neighborhood chrome:** Orbit Ruler + layer chips + time controls + 2D/SKY hide
  out there; a breadcrumb ("‹ Solar System › Stellar Neighborhood", 44px tap target)
  gives orientation + tap-back. All localized to 14 locales.
- **Credits:** `/credits` "Data & catalogues" section — HYG · GCAT · Launch Library 2.
- **Dev anchor:** `/dev/universe-anchor` (prod-guarded) — the slider prototype, now
  consuming the shared `neighborhood-scene` module (single source of truth).

## Architecture (see TA.md §rendering → /explore v2)

- `src/lib/universe/`: `context-graph` (scale-shell + re-base), `bv-to-rgb`,
  `star-normalize`, `star-selection` (LOD/packing), `budget`, `point-field` (shader),
  `neighborhood-scene` (context scene), `scale-readout` (units/light/bar). Pure math
  tested; WebGL builders coverage-excluded.
- Data: `scripts/build-universe-stars.ts` → HYG v4.1 → `static/data/universe/stars/`
  (109,400 stars, 8 distance shells) + schemas + `validate-universe-stars`.
- `/explore` wiring: boundary helpers + zoom hooks + frame-loop render branch +
  scale HUD + breadcrumb in `src/routes/explore/+page.svelte`.

## Key numbers / tuning knobs (in +page.svelte onMount)

- Heliocentric ceiling `HELIO_CAM_R_MAX` = 1400 AU (v1 value; the crossing triggers
  at the ceiling, so v1's range is untouched).
- Neighborhood: `NB_CAM_R_MIN` 0.03 pc, `NB_CAM_R_MAX` 60 pc, `NB_FAR` 1500 pc,
  entry dolly 0.035 → 0.32 pc over 1100 ms.
- Star budget caps per tier in `budget.ts`; reveal opacity band in `neighborhood-scene.ts`.

## Next (RFC-032 §7)

- **S1:** object selection + Panel reuse + named stars + constellations + breadcrumb
  deep-link `?goto=` + **the /library article references** (they attach to a concrete
  entity — deferred here for that reason) + a `stellar-neighborhood` context entity.
- S2 warp + exoplanet mini-orreries · S3 /science + culture · S4 deep-sky · S5 Milky Way
  · S6+ physics lenses.

## Open / gated on Marko

- **Push** — not pushed; his call. Rebase onto `origin/main` before pushing (v1
  `/explore` is heavily edited by other work — check for conflicts).
- **Epic GH issue** — still `#TBD` in PRD-030/RFC-032. Per per-issue-authorization,
  draft-and-ask; do not create unprompted.
- Before merge: full e2e on both projects (the +page.svelte changes are substantial);
  regen visual baselines via the GH workflow (amd64), not locally.
