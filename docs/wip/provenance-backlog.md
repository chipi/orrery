# Provenance + credits backlog

This file is the rolling backlog for **provenance, attribution, and credits** ideas that are not yet shipped. ADR-047 ("Provenance manifests + license stewardship") locked the data model and pipeline; this list keeps the **next-step ideas** in one place so they don't get lost as scattered TODOs across the codebase.

> Add new ideas here rather than as inline `// TODO`s. When an item ships, move its bullet into the relevant ADR (047 or a successor) and delete it here.

---

## Cadence

- [ ] **Per-locale staleness check.** A linter that flags when `static/data/i18n/en-US/missions/<id>.json` has changed in the last N commits but the corresponding `es/`, `de/`, … overlay has not. Surface the result in `validate-data` so a translator can pick up the diff in the next sweep.
- [ ] **Periodic Wikimedia category sweep.** A weekly job that hits Commons categories likely to contain new mission imagery (e.g. `Category:Photographs by Mars Express`, `Category:Chang'e_5_mission`, `Category:JWST images`) and writes candidate filenames into a "new since last sweep" digest under `docs/provenance/sweeps/YYYY-MM-DD.md`. Maintainers can promote candidates into `WIKIMEDIA_*_GALLERY` lists by hand.
- [ ] **Weekly link-check GH Action.** HEAD-checks every `source_url` in `image-provenance.json` and `text-sources.json`. Failures open or update a tracking issue automatically; the run report is committed under `docs/provenance/link-checks/YYYY-MM-DD.md`. Keeps "the source URL still works" honest as upstream pages move.
- [ ] **PR comment hook.** On every PR that touches `static/images/**`, `static/textures/**`, `static/logos/**`, or any provenance manifest, post the `last-fetch-diff.md` digest as a PR comment so reviewers see the attribution delta without opening files.
- [ ] **Diff-report drift sentinel.** Today the diff report is informational. Promote it to fail-closed: if a previously-shipped manifest entry loses its `license_short`, `author`, or `revid` between runs, the build fails until the entry is reviewed.

## Detection / regression

- [ ] **Sentry breadcrumb when a UI lightbox renders without provenance.** Helps detect drift between the manifest and on-disk images at runtime in the wild — e.g. a CDN cache hands the user an image we removed from the manifest. Wire as a single `console.warn` + Sentry breadcrumb.
- [ ] **Playwright visual regression on `/credits`.** Snapshots of the en-US `/credits` page and one non-English locale, sized for mobile + desktop. Fails when grouping or layout changes silently.
- [ ] **Type-level guarantee on i18n keys for credits.** Today `credits_*` keys are just strings; a new section without an i18n key compiles silently. A lint rule (or a test that walks `pathToRouteKey` outputs and asserts each maps to an `m.credits_used_route_*` function) catches that drift.

## Authoring + ownership

- [ ] **CODEOWNERS entry.** Require owner review on changes to `static/data/image-provenance.json`, `static/data/text-sources.json`, `static/data/source-logos.json`, `static/data/license-waivers.json`, and any file under `static/images/**`. Light-weight: prevents single-developer license waiver merges.
- [ ] **Authoring contract in PR template.** Add a checkbox on the default PR template: "If this PR adds a new image, planet/mission/site description, or external text fragment, did you update the matching manifest?"
- [ ] **`scripts/check-provenance-drift.ts`.** A pre-push hook that runs `build-image-provenance --dry-run` and fails if `image-provenance.json` would change. Stops the case where someone hand-edits an image without re-running the manifest builder.

## Public credits surface

- [ ] **Search / filter on `/credits`.** Filter by source, license, type (photo/text), category. Useful once the manifest grows past ~600 photos; defer until that's a problem.
- [ ] **Per-source `?source=nasa` deep links.** Today the page uses anchor links. Adding query-param deep links makes individual source sections shareable.
- [ ] **Pagination / virtualization** — the page is plain HTML lists today. Revisit when render time crosses ~250 ms on the smallest target device.
- [ ] **Per-image lightbox on `/credits` thumbs.** Right now thumbs link out to the original Commons page; a lightbox-style modal could keep users in-app and still preserve the source link.
- [ ] **Author-level credit lines.** Where `author` is a Wikimedia username, link it to the Commons user page instead of just rendering the username.

## Coverage gaps

- [ ] **Backfill per-mission text-sources entries.** The current `text-sources.json` ships with category-baseline entries plus the highest-profile per-mission rows (Apollo 11, Curiosity, Mars Express, Hope, Chandrayaan-3). Extend coverage to all 36 missions, ~9 planets, ~24 moon sites, ~17 earth objects, and ISS modules so each entity has its primary-source attribution row.
- [ ] **Reviewer ids on translations.** `translation_status` exists in the schema but most translations don't yet record a `translation_reviewer`. Define the convention (GitHub handle? human name?) and backfill.
- [ ] **Locale-specific source notes.** Localised overlays may paraphrase from a locale's primary press kit (e.g. ISRO Hindi-language press kit for Chandrayaan). Add an `overlay_locale` field on `text-sources.json` entries to record that.

## Out of scope (intentional)

- **Runtime imagery hops.** ADR-016 still rules; live agency calls at view time are not on the table.
- **Per-photo CC-BY chain of custody on social shares.** When `/credits` is link-shared, the page itself credits the source. We do not stamp share thumbnails individually.

---

*Updated when ideas land or new ideas surface. Cite this file from PRs that defer provenance work.*
