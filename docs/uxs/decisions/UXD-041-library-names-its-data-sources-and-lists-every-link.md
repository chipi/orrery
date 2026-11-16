# UXD-041 — The library names its data sources and lists every link: a Planetary models block, a Moon and Mars surface data block, the /science and essay links in the manifest, the one length rule on the source blocks

- **Status**: accepted (built; unit tests green, browser checks listed under Verification)
- **Date**: 2026-11-14
- **Decider**: the operator, 2026-11-14 — "I'm okay with all the recommendations. Go for them." (the recommendations of `docs/wip/2026-11-14-slice-F2-brief.md` §12: decisions 29a, 30a, 31a, 32a; 25a, the length rule, is [UXD-038](UXD-038-one-length-rule-for-the-long-text-pages.md))
- **Answers**: LI2, LI3 of the UX feedback plan (LI1 was closed by A2); Q10; slice F2
- **Builds on**: [UXD-012](UXD-012-one-page-shell.md) (the page shell), [UXD-014](UXD-014-one-chip-and-filter.md) ("Show all" is the one action chip), [UXD-038](UXD-038-one-length-rule-for-the-long-text-pages.md) (`previewList`, `ShowAll`), ADR-051 (outbound-link stewardship), ADR-095 (the JPL planetary positions)
- **Changes**: `src/routes/library/+page.svelte`, `+page.server.ts`, `source-ids.ts` (+ test), `scripts/build-link-provenance.ts`, `static/data/link-provenance.json` (regenerated), `static/data/source-logos.json` (30 sources), `static/data/data-sources.json` (6 entries), `static/data/schemas/data-sources.schema.json` (`planetary-model`), `static/data/schemas/link-provenance.schema.json` (`science`, `essay`), `i18n-src/*/data-sources.json` (6 descriptions in 14 files), `messages/*.json` (`library_planetary_models`, `library_surface_data` added, `library_astro_planets` removed), `src/lib/link-provenance-coverage.test.ts` (new), `tests/e2e/library.spec.ts`. No image, no hero and no dependency changed.

## Context

**LI2.** JPL was one sentence in the Astrophysics aside (`library_astro_planets`). The repo uses three JPL things, not "models" in any larger sense: the approximate Keplerian elements (ADR-095; `planet-positions-jpl.test.ts` holds every planet within 0.6° of them), the planetary physical parameters and the planetary satellite parameters (both linked from the science articles). It does not use the DE ephemerides or Horizons (ADR-058, ADR-085).

**LI3.** The Moon traverse sources lived only in the route files' `credit` strings. `/credits` listed two Mars sources and `/library` none.

**The intro was false.** `library_intro_body_1` says "Every external link Orrery sends you to lives here". The /science articles and the essays held 469 and 76 link rows the manifest did not have.

## Decision

1. **A "Planetary models (NASA JPL)" block (29a).** Three `data-sources.json` entries (`jpl-keplerian-elements`, `jpl-planetary-parameters`, `jpl-satellite-parameters`; category `planetary-model`, a new schema value; licence PD-USGov as the existing `jpl-iau-constants` entry). The block draws each one's name as the link and its description under it. The Small-Body Database is not added. `jpl-iau-constants` stays on `/credits` as the entry for the Lab's IAU, EGM96 and IUGG constants; the planet-positions sentence moved out of the Astrophysics aside into `jpl-keplerian-elements`.
2. **A "Moon and Mars surface data" block (30a).** Five entries: three new (`lroc-nac-traverses`, LROC-EDU; `usgs-apollo17-traverse`, Haase et al. 2019; `hirise-zhurong-traverse`, PD-NASA) and the two Mars entries `/credits` already had (`nasa-mmgis-rover-traverses`, `pds-mer-traverses`). Each is a source a route file's `credit` already names. Chandrayaan-3 and Chang'e 3 are not listed: their polylines are Orrery's own. `source-ids.test.ts` reads every Moon and Mars traverse file and fails when a credit names a source the block does not list.
3. **One source of text for `/credits` and `/library`.** Both blocks read name and link from `data-sources.json` in the server load (`source-ids.ts` holds the ids) and the description from the same locale overlay `/credits` uses (`getDataSources(locale)`), so the two pages cannot drift.
4. **Every link is in the manifest (31a).** `build-link-provenance.ts` collects the `links[{l,u,t}]` of `static/data/science/<tab>/<id>.json` (category `science`, entity `<tab>/<id>`, route `/science/<tab>/<id>`) and the `sources[{title,url}]` of the published essays (category `essay`, entity the slug, route `/essays/<slug>`). 544 entries added (1,873 to 2,417 rows; 1,540 to 1,924 distinct URLs), 30 new publishers in `source-logos.json` (each host the build could not classify fails closed, as before), 32 new host rules (30 for the new publishers, 2 for ESO and EOX, which had a row but no rule). `link-provenance-coverage.test.ts` fails when a /science or essay link is not in the manifest (written red first: 469 and 76 missing). An entry's `route` is the page that holds the link, which `/library` links to, so the schema's route pattern is widened from one segment to nested routes (`/science/<tab>/<id>`, `/essays/<slug>`) rather than pointing these entries at `/science` and `/essays`. The categories show on `/library` as "SCIENCE" and "Essays" (existing messages `nav_science`, `essays_label`).
5. **The blocks stay header asides, one style (32a).** Five `aside.data-sources` at the head (Audio episodes, Launches data, Astrophysics data, Planetary models, Moon and Mars surface data), no new section and no contents entry; the contents list stays the sources.
6. **The length rule (25a).** Each source block draws its first 10 entity clusters and a "Show all N" chip (`ShowAll`, `colophon_show_all`, `data-list` = the source id); headers and the contents list stay open, so a `#src-<id>` link lands on the header with 10 clusters. With 544 more links the Wikipedia block holds 869 clusters; the cap is what keeps the page from growing with them.

## Not done here

- The 30 new `source-logos.json` `license_summary` lines are English only (there is no overlay row for them in the 13 locales); the 6 data-source descriptions and the 2 headings are translated.
- The new manifest rows carry `last_verified` = the build date; the link checker (`check-learn-links.ts`, `npm run fetch`) has not seen them.

## Verification

Unit: see the commit. Browser results (the three projects, screenshots) are recorded in the slice report; this record is not updated with them.

Not checked: Firefox and WebKit; whether `lroc.im-ldi.com/about/terms` names the GeoJSON traverse layers specifically (the entry's rationale says so); the licence of the published Haase et al. traverse data (the entry's rationale says so).
