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
4. **Integrate** (with the page phase that consumes it; for deep-sky objects the pages exist, so
   adding the 14 overlay files adds a page: `deepSkyPageIds()` lists the en-US overlay files,
   `validate-data` checks each has a fact, a bio and one or two links in all 14 locales, and
   `route-lastmod` needs the new routes): overlay files under
   `i18n-src/en-US/universe/<type>/<id>.json`; distances, sizes and magnitudes in the text follow the
   catalogue layer (#658) in `static/data/universe/*.json`, not the review's data-file corrections;
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
| 01 | m2–m23 (20 deep-sky, no photo) + 4 black holes | 152,725 tokens, 58 calls | 160,457 tokens; fix then ship (3 B, 9 M) | black holes: integrated in 14 locales; deep-sky: integrated (en) |
| 02 | m24–m80 (50 deep-sky, no photo) | not recorded | fix then ship (6 B, 14 M, ~25 minor) | integrated (en) |
| 03 | m81–m110 (27, no photo) + 23 with a photo (30-doradus … ngc-604) | not recorded | fix then ship (2 B, 19 M, ~13 minor) | integrated (en) |
| 04 | ngc-1300 … wr-124 (21 with a photo; the deep-sky list is complete) | not recorded (77 web calls) | 151,188 tokens, 54 calls; fix then ship (2 B, 11 F); `batch-04-review.md`; distances fixed in the catalogue layer (`add002372ae`) | integrated in 14 locales (`4ab9ca0a4e8`, translations `528784c6b4b`…`d102d11395d`) |

Integrated (en) overlays have no translation yet: until steps 5 and 6 are done for them, the four
translation-parity gates of `npm run validate-data` (overlay-completeness, `check-i18n-coverage`,
`check-i18n-en-source`, `check-i18n-number-drift`) are red for these files by design. Do not run
`stale-overlays.mjs --manifest=write` before the translations exist.
