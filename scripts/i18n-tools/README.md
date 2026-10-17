# i18n-tools — hand translation editing kit

Small, hand-run tools for editing the translation overlays (`i18n-src/<locale>/**`)
and UI messages (`messages/<locale>.json`) **without a paid model**. Every writer
checks each new string with `problems()` (`scripts/lib/translate-quality.mjs`)
and writes surgically (`scripts/lib/json-surgical.mjs`) so a diff is only the
edited lines. Run them from the repo root: `node scripts/i18n-tools/<tool>.mjs …`.
Each file's header comment says what it takes.

Not part of the app or CI; excluded from the coverage gate (`vite.config.ts`).

## Policy they serve

- Names: `src/lib/name-origins.js` (origin-language rule for vehicles, missions,
  bureaus).
- Science, geography, astronomy terms and people: native in every locale, as that
  country's universities and space agency write them — `native-terms.json` is the
  glossary (unsure forms checked on native pages; `sources` records where).

## Tools

| Tool | Does |
|---|---|
| `apply-literal.mjs <map.tsv>` | `file\tfrom\tto` rows; each `from` must occur exactly once. For grammar-aware hand fixes. |
| `apply-keys.mjs <loc> <spec.json>` | `{ file: { key: value } }` — replace top-level keys, shape checked against en-US. |
| `apply-edits.mjs <loc> <edits.json>` | `[{rel, at, old, new}]` — reviewed path edits; refuses any that add a `problems()` failure. |
| `showdiff.mjs <edits.json>` | One line per edit, only the changed window — for reviewing before applying. |
| `bodies-apply.mjs <loc>` | Candidate edits: English planet/moon/small-body names → glossary form (CJK spacing, Korean particles), vehicle names protected. Writes `maps/…/bodies-edits-<loc>.json`. |
| `bodies.mjs <loc> [out.tsv]` | Counts body names left in English outside vehicle names, with context. |
| `inventory.mjs <dict> <out.tsv>` | Proper-noun runs of the English source that aren't vehicle words. |
| `classify.mjs` | Latin-script words left in each locale: vehicle / acronym / other. |
| `partial-titles.mjs` | Science titles in non-Latin locales that are still partly English. |
| `apply-hand.mjs`, `apply-arrays.mjs`, `apply-hs.mjs`, `apply-labels.mjs`, `apply-generic.mjs`, `apply-notes.mjs`, `apply-stories.mjs`, `apply-traverses.mjs` | Writers for the 2026-10-17 clean-up items (hand rewrites, paragraph lists, hotspot overlays, event labels, notes, site stories, traverse stops). |
| `convert-native.mjs` (+ `-lib`), `hs-native.mjs` | Origin-language name conversion (step 0). |
| `cjk-spaces.mjs` | Removes spaces left between CJK characters after a Latin name was replaced. |
| `add-msgs.mjs`, `galaxy-msgs.mjs` | Add UI message keys to every `messages/<loc>.json`. |
| `label-*.mjs`, `same-by-key.mjs`, `stories-extract.mjs`, `origin-inventory.mjs` | Analysis: identical-to-English labels, existing translations to reuse, story extraction, names by origin country. |


Pass 1 (gallery/entity pages set each name) and pass 2 (article text follows them):

| Tool | What it does |
|---|---|
| `wikidata-labels.mjs "<enwiki title>"…` | Prints the title each locale's own Wikipedia uses — the evidence for a native name. |
| `canonical-names.mjs`, `canonical-check.mjs`, `canonical-english-words.mjs`, `name-variants.mjs` | One name per thing per language: list the page names, find the text that spells them differently. |
| `site-names.mjs`, `planet-pages.mjs`, `launch-site-pages.mjs`, `unify-names.mjs`, `descriptor-names.mjs` | Pass-1 writers for the entity pages; `planet-pages.mjs` also syncs page names into the `body` glossary. |
| `glossary-apply.mjs <loc> <classes>` | Pass-2 generator: glossary forms (`native-terms.json`) into running text, with rocket-family guards, Latin-script article rules, Korean particles, and Russian/Serbian declension. Writes `maps/…/glossary-edits-<loc>.json` for review. |
| `ru-case.mjs`, `sr-case.mjs` | Declension and a case guess from the preceding words, for `glossary-apply.mjs`. `sr-case.mjs` also reads the case from a hyphenated ending ("Mars-а"); a possessive ending ("Phobos-ова") becomes a possessive adjective (Фобосова). |
| `patch-edits.mjs <edits.json> <corrections.tsv>` | Hand corrections on the generated edits before applying; reports rows that no longer match. |
| `pass2-size.mjs` | Counts pass-2 candidates per locale before starting. |
| `dedupe-descriptors.mjs` | Collapses a doubled descriptor (フラ・マウロ高地高地). |
| `rocket-body-audit.mjs`, `rocket-body-restore.mjs` | Finds and restores rocket names turned into a planet (土星ロケット). |

## maps/

The hand-written inputs and analysis results, one folder per arc
(`maps/2026-10-17-translation-cleanup/`): per-locale title tables, ru name and
grammar fix maps, paragraph-list rewrites, hotspot overlays, label vocabularies,
the English proper-noun inventory, the English story extraction. Reuse them; add
new arcs as new folders.

Lesson recorded with them: a mechanical name swap in an inflected language
leaves every name in the nominative ("с Байконур", "после Гагарин" — fixed in
`ru-decl.tsv`). Generate candidates, read every one, then apply.
