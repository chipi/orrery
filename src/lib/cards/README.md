# `$lib/cards` — collectible cards (#547)

One card per real thing, shareable everywhere. Authority: `docs/adr/TA.md` §components "Collectible cards" + §pipelines Pipeline 13 + §contracts CardSpec.

| File | Owns |
|---|---|
| `card-spec.ts` | The `CardSpec` contract, the 6 pure resolvers (`cardForMission/Fleet/Site/Planet/Satellite/SmallBody`), and the canonical-card alias helpers (`fleetAliasesMission`, `siteAliasMissionId`, `earthObjectCardAlias`). Pure data mapping — no DOM, no fetch; callers pass the hero + figure URLs in. |
| `CollectibleCard.svelte` | Template 01 "cinematic" — the ONLY restyle surface. Pure HTML/CSS over a `CardSpec`; strictly monochrome chrome; figure collapses on load error; data values are LTR-isolated for RTL locales. |
| `CardOverlay.svelte` | The modal + share actions. HEAD-probes the generated JPEG (hides Share-card on 404), shares the `/c/<kind>/<id>` OG stub via `sharePath()`, capture-phase Escape (closes the overlay, not the panel underneath). |
| `card-spec.test.ts` | Unit tests for the resolvers + alias helpers. |

## Local conventions

- **Hero rule (operator-locked 2026-09-12):** the card hero IS the app hero — the entity's override-blessed `gallery[0]`. Never derive a card-specific hero. Aliased cards fetch the **canonical** entity's own gallery (see the `#547` wiring blocks in the panels).
- **Adding a card kind** = a resolver here + a branch in `src/routes/cards/[kind]/[id]/+page.svelte` + entries/load in `src/routes/c/[kind]/[id]/+page.server.ts` + a `KIND_VERSION`/`KIND_HERO_DEPS` row in `scripts/cards/generate-card-images.mjs` — all four, or the panel/generator/stub trio drifts.
- **Chrome strings** are paraglide keys (`card_*`); data values keep the mono en-US register. The generated JPEG corpus + stubs are en-US by design.
- After changing anything that alters rendered output, bump the affected `KIND_VERSION` and re-run `npm run build-cards`; commit the changed JPEGs in the same pass.
