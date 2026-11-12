# Deep text pipeline

English text for deep-level entity pages that are under the thin-page floor (operator 2026-11-12:
"where we miss text, we should research and get some and translate it"). Plan and scope:
`docs/wip/2026-11-11-ux-feedback-plan.md` ("Entity pages for the deep levels"), measurements in
`docs/wip/2026-11-12-deep-entity-pages-brief.md`.

## Steps per batch

1. **Write** (one agent, ~50 objects): drafts in `batch-NN.md` — per object the target overlay file
   and fields (`fact`, `bio`, as the star overlays), 400–600 characters, and the sources fetched.
2. **Review** (science-reviewer agent): every claim against its source; verdict per object.
3. **Fix**: the lead applies the review's wording, records it in a "Science review" section.
4. **Integrate** (with the page phase that consumes it): overlay files under
   `i18n-src/en-US/universe/<type>/<id>.json`, the data-file corrections the review lists,
   `static/data/text-sources.json` entries (publisher, source_url, licence, relationship), outbound
   links in the overlays' `links` with hosts in `static/data/source-logos.json`, then
   `scripts/build-link-provenance.ts`; check /credits and /library.
5. **Glossary first** (operator 2026-11-12): list every astronomy / astrophysics term in the batch
   (e.g. globular cluster, open cluster, planetary nebula, event horizon, accretion disk,
   microlensing, blue straggler, spectral type) that is not in
   `scripts/i18n-tools/native-terms.json`; add each with the 13 locales' forms — the site's
   existing form where one exists, else the form that country's universities use (search native
   pages when unsure) — then translate with those forms.
6. **Translate** (by hand, few agents, several locales each; glossary forms from
   `scripts/i18n-tools/native-terms.json`), then the 14-locale checks.

At most 2 agents run at once on this stream (writers, reviewers, translators, page builders), plus
at most 1 on the UX A / B slices (operator 2026-11-12).

## Writer rules learnt from the batch 1 review

- NASA's popular Messier pages are a good first source but can be **outdated or overstated**: check
  ages, distances and superlatives against a recent paper or survey (Gaia-era distances for open
  clusters; Harris / Baumgardt for globulars). Batch 1 errors: M3 "8 billion years" (≈11), M15
  black hole stated as fact (contested), M22 called "northern" (Dec −24°), M3 "most variables of any
  cluster" (Omega Centauri has more).
- **Hedge what the literature hedges**: "thought to", "suggested", "candidates". Microlensing,
  radio-only or single-paper results are not facts.
- **No superlatives** ("most", "first", "largest") unless a current source states them and nothing
  contradicts them.
- **Global audience**: no "best in July" without "from the northern hemisphere"; prefer no month.
- **No false precision**: round single-paper values ("about 90–100 million years", not "94").
- **Attribute opinions and claims** to the person who made them (Thorne's disk remark).
- Text must **agree with the data file**; list disagreements under "Data conflicts" with a source.
- Leave out what you cannot source; never pad to reach the length.

## Batches

| Batch | Objects | Writer cost | Review | Status |
|---|---|---|---|---|
| 01 | m2–m23 (20 deep-sky, no photo) + 4 black holes | 152,725 tokens, 58 calls | 160,457 tokens; fix then ship (3 B, 9 M) | fixes applied, awaiting integration |
