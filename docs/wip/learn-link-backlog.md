# LEARN-link + /library backlog

This file is the rolling backlog for **outbound LEARN-link stewardship and the
public `/library` page** that are not yet shipped. ADR-051 ("Outbound
learn-link stewardship") locks the data model, pipeline, and rendering rules;
this list keeps the **next-step ideas** in one place so they don't get lost as
scattered TODOs across the codebase.

Companion to [`provenance-backlog.md`](provenance-backlog.md), which covers
the imagery side (ADR-047).

> Add new ideas here rather than as inline `// TODO`s. When an item ships, move
> its bullet into the relevant ADR (051 or a successor) and delete it here.

---

## Cadence

- [ ] **Weekly link-check GH Action.** Cron-triggered `npm run check-learn-links`
  that opens or updates a tracking issue when `intro` / `core` links go 4xx
  or 5xx. Diff report committed under `docs/provenance/link-checks/YYYY-MM-DD.md`.
  Until this lands, link-checking happens at refetch time only.
- [ ] **Per-locale staleness check on link labels.** A linter that flags when
  `static/data/missions/<dest>/<id>.json` has gained a new English label but
  the locale overlay has not been retranslated. Surfaces in `validate-data`.
- [ ] **PR comment hook on link-provenance changes.** On every PR that touches
  `static/data/link-provenance.json`, post the link-check diff as a PR
  comment so reviewers see "1 redirect, 2 added, 1 replaced" without opening
  the file.

## Source diversity follow-ups

- [ ] **Backfill Hindi-language ISRO links** for Mangalyaan and the
  Chandrayaan family. ISRO publishes Hindi-language press notes; the audit did
  not find them because the link maps were English-only.
- [ ] **Backfill Russian-language Roscosmos links** beyond the obvious
  `roscosmos.ru/22XXX/` mission pages — e.g. `tass.ru` cosmonautics archive,
  Lavochkin Association builder pages, Energia Russian-language
  iss-segment pages.
- [ ] **Backfill Chinese-language CNSA links** for Chang'e family + Tianwen-1.
  `cnsa.gov.cn` is bilingual but the URLs differ; the manifest currently
  records only the English variant for ease of authoring.
- [ ] **Educational publishers in non-US languages** — TASS Cosmonautics
  encyclopedia, Xinhua space coverage, NHK Cosmos archives. None are agency
  primary sources but they fill the science-publisher tier in their own
  languages.

## Detection / regression

- [ ] **Sentry breadcrumb when a LEARN link returns 4xx in the wild.** A
  client-side heads-up when a user clicks an outbound link the link-checker
  has not yet caught (since the checker is refetch-cadence, not real-time).
  Single `console.warn` + Sentry breadcrumb; no PII.
- [ ] **Playwright visual regression on `/library`.** Snapshots of en-US,
  one CJK locale, and one RTL locale, sized for mobile + desktop. Fails when
  grouping or layout changes silently.
- [ ] **Type-level guarantee on i18n keys for `/library`.** Today
  `library_*` keys are just strings; a new section without an i18n key
  compiles silently. A lint rule (or a test that walks `linkSourceId`
  outputs and asserts each maps to an `m.library_*` function) catches that
  drift.

## Authoring + ownership

- [ ] **CODEOWNERS entry.** Require owner review on changes to
  `static/data/link-provenance.json`, `scripts/build-link-provenance.ts`,
  `scripts/check-learn-links.ts`, `static/data/source-logos.json`. Same
  pattern as the imagery side.
- [ ] **Authoring contract in PR template.** Extend the existing checkbox: "If
  this PR adds, edits, or removes an outbound LEARN link, did you re-run
  `npm run build-link-provenance` and `npm run check-learn-links`?"
- [ ] **`scripts/check-link-provenance-drift.ts`.** Pre-push hook that runs
  `build-link-provenance --dry-run` and fails if `link-provenance.json` would
  change. Stops the case where someone hand-edits a `links[]` array without
  re-running the manifest builder.

## Public surface

- [ ] **Search / filter on `/library`.** Filter by source, language, kind,
  tier, route. Useful once the manifest grows past ~1500 links; defer until
  that's a problem.
- [ ] **Per-source `?source=esa` deep links.** Today the page uses anchor
  links. Adding query-param deep links makes individual source sections
  shareable.
- [ ] **Pagination / virtualisation** — the page is plain HTML lists today.
  Revisit when render time crosses ~250 ms on the smallest target device.
- [ ] **JSON-LD `sameAs` block on entity pages** for SEO discoverability of
  source diversity. A Tianwen-1 panel page links to `cnsa.gov.cn` and
  `en.wikipedia.org/wiki/Tianwen-1` — emit `<script type="application/ld+json">`
  with `sameAs` pointing at the operator portal so search engines see the
  primary-source signal.
- [ ] **Per-link "report broken" button** that opens a pre-filled GH issue.
  Lower-friction than waiting for the checker to catch the break.

## Coverage gaps

- [ ] **Backfill `last_verified` from per-host CDN headers** instead of the
  HEAD probe timestamp. Some hosts (esa.int, jaxa.jp) ship `Last-Modified`
  headers that are more honest than "we pinged it on date X".
- [ ] **Press kit ingestion.** When a mission ships a press kit (PDF or
  microsite), record it as a `kind: 'mission-microsite'` `core` link with
  the press-kit publication date as `last_verified`. Today press kits are
  ad-hoc.
- [ ] **Per-publisher rate-limit etiquette.** Document each agency's
  preferred crawl rate in the link-checker. NASA hosts handle 10 req/s
  fine; agency CMSes (esa.int, isro.gov.in) prefer 1 req/s; smaller
  national agencies may want even less.

## Out of scope (intentional)

- **Runtime LEARN-link rendering hops.** ADR-016 still rules; the LEARN tab
  reads the manifest at view time but never live-checks a link.
- **In-app preview of the destination page.** Frame-busting and cross-origin
  policies make in-app previews unreliable; we keep the open-in-new-tab UX
  per ADR-051 rendering rules.
- **Full archive of every page we link to.** Wayback Machine handles that.
  We do not duplicate it.

---

*Updated when ideas land or new ideas surface. Cite this file from PRs that
defer LEARN-link work.*
