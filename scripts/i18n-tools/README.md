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
| `apply-edits.mjs <loc> <edits.json>` | `[{rel, at, old, new}]` — reviewed path edits; refuses any that add a `problems()` failure. `rel: "messages"` writes the UI bundle `messages/<loc>.json`. |
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
| `ui-label-audit.mjs <loc\|all> [--prune]` | UI-string checks per locale: `problems(…, { ui: true })` on every key, plus short English labels translated more than one way, plus labels whose whole English is a glossary term but whose value lacks the glossary form. Compared with `ui-label-baseline.json` (known defects of locales not audited yet, and label variants with a reason); `ui-label-audit.test.ts` fails on a new entry and on one that was fixed, so `--prune` after fixing. |
| `ui-senses.json` | What an ambiguous UI key means (satellite constellation, unpowered coast, countdown hold…). The UI translators send it with the key; a key mistranslated in two or more locales goes here. |
| `label-*.mjs`, `same-by-key.mjs`, `stories-extract.mjs`, `origin-inventory.mjs` | Analysis: identical-to-English labels, existing translations to reuse, story extraction, names by origin country. |


Pass 1 (gallery/entity pages set each name) and pass 2 (article text follows them):

| Tool | What it does |
|---|---|
| `wikidata-labels.mjs "<enwiki title>"…` | Prints the title each locale's own Wikipedia uses — the evidence for a native name. |
| `canonical-names.mjs`, `canonical-check.mjs`, `canonical-english-words.mjs`, `name-variants.mjs` | One name per thing per language: list the page names, find the text that spells them differently. |
| `site-names.mjs`, `planet-pages.mjs`, `launch-site-pages.mjs`, `unify-names.mjs`, `descriptor-names.mjs` | Pass-1 writers for the entity pages; `planet-pages.mjs` also syncs page names into the `body` glossary. |
| `glossary-apply.mjs <loc> <classes>` | Pass-2 generator: glossary forms (`native-terms.json`) into running text, with rocket-family guards, Latin-script article rules, Korean particles, and Russian/Serbian declension, over the overlays **and the UI bundle** (`messages/<loc>.json`, rel `messages`). Guards (`GUARD`) keep homonyms out (Vega probes, Sirius XM, Snow White, SLIM, Space Center Houston); a path guard matches `<file>:<field>`. Names that mostly mean a spacecraft here (Orion, Kepler, Galileo) are allowlisted instead (`ONLY`): replaced only on the pages that mean the constellation or the person. Its case choice is a guess: read every ru/sr proposal before applying (homonym pass: `maps/…/homonym-fixups.mjs`). Writes to `glossary-edits-<loc>.json`, overwriting a committed map, unless `PASS_TAG` is set. A full run should propose nothing; anything it proposes is either a new fix or a missing guard. Writes `maps/…/glossary-edits-<loc>.json` for review. |
| `ru-case.mjs`, `sr-case.mjs` | Declension and a case guess from the preceding words, for `glossary-apply.mjs`. `sr-case.mjs` also reads the case from a hyphenated ending ("Mars-а"); a possessive ending ("Phobos-ова") becomes a possessive adjective (Фобосова). |
| `patch-edits.mjs <edits.json> <corrections.tsv>` | Hand corrections on the generated edits before applying; reports rows that no longer match. An optional 4th column names the field, for a file where two fields carry the same text. |
| `pass2-size.mjs` | Counts pass-2 candidates per locale before starting. |
| `dedupe-descriptors.mjs` | Collapses a doubled descriptor (フラ・マウロ高地高地). |
| `rocket-body-audit.mjs`, `rocket-body-restore.mjs` | Finds and restores rocket names turned into a planet (土星ロケット). |

Names glossary (celestial names and people), in order:

| Tool | What it does |
|---|---|
| `name-inventory.mjs <out.tsv>` | Every capitalised run in the English source looked up on English Wikipedia (single words also as "X (moon)", "(asteroid)"…) and classified by its Wikidata "instance of": body / feature / star / person. Paced, cached, resumable (`NAME_INV_CACHE`). |
| `name-curate.mjs <classes.tsv> <curation.tsv> <out.tsv>` | Drops vehicle/deity/fiction classes and applies the hand decisions in `maps/…/names-curation.tsv`. |
| `name-forms.mjs <curated.tsv> <out.tsv>` | Each locale's form: Wikipedia title (bodies), label (people; Russian patronymic dropped); stars as `name¦designation` (name from label/aliases, never a Bayer, Flamsteed or catalogue label; designation spelled out only — an abbreviation such as "α UMi" or an alias that is a whole catalogue list is not taken); zh-CN through Wikidata's simplified converter; sr-Cyrl only where Cyrillic at the source. |
| `name-glossary-merge.mjs <forms.tsv> <overrides.tsv> <features.tsv>` | Writes the `body` / `star` / `person` / `feature` classes of `native-terms.json` (never overwrites an existing key); guards for Bayer and catalogue aliases, designations, nicknames, transliteration-only changes in Latin-script locales. |
| `star-pages.mjs [--dry]` | Pass 1 for stars: writes each named-star page's localized `name` from the `star` glossary, and removes a name the glossary no longer gives. |
| `build-en-overlays.mjs <surface> [--seed=<locs>] [--manifest=<out.json>]` | en-US overlays for data sets whose English lives only in `static/data` (`site-stories`, `deep-sky`, `trajectories`, `videos`, `original-work`), in the shape each loader merges; seeds missing locale files with the English and writes a `retranslate-fields.mjs` manifest for them. |
| `original-work-fleet-names.mjs` | Fills missing /colophon cutaway titles (`original-work.json` anatomy/exploded art) from each locale's fleet `name`, so the colophon names a vehicle as /fleet does. Never overwrites a title. |
| `name-drift-scan.mjs [locs] [--json=out]` | Runs the checker's name tests (`problems()`: designations and the site's own names kept as in English outside their origin locale) over every existing translation, overlays and UI. A `validate-data` gate (`check-i18n-name-drift`): any hit fails. Reviewed exceptions sit in its `ALLOW` list. |
| `variant-sweep.mjs <loc> <map.tsv> <out-edits.json>` | One name per language in running text: replaces other spellings of a name (regex rows) with the gallery's form and writes an edits file for `apply-edits.mjs`; prints the hit count per row. |
| `glossary-keys.mjs` | Per-key context report: where each glossary key occurs in the English source, to decide guards and overrides. |
| `person-case.test.ts` | Tests for the person declension in `ru-case.mjs` / `sr-case.mjs`. |

Technical terms (the `term` class: burn, flyby, orbit insertion …). Runbook: the
`term-consistency` skill (`.claude/skills/term-consistency/SKILL.md`).

| Tool | What it does |
|---|---|
| `term-census.mjs [--json]` | How often each candidate term occurs in the English trees; ✓ marks the ones already in `term`. Picks the next batch. |
| `term-contexts.mjs <term> <loc> [max] [trees]` | How the site writes one term in one locale now: aligned field count and sample English/translation pairs. |
| `term-match.mjs` | Shared matching rules: Arabic vowel marks ignored, keep keys, text hashes. |
| `term-drift.mjs [--terms] [--locales] [--trees] [--misses=f] [--gate]` | Term × locale table of fields using the binding form (or a reviewed keep), and the unreviewed misses. `--gate` exits 1 if any are left. |
| `term-widen-check.mjs <old-glossary.json> [--trees] [--out=f]` | After widening stems: fields that pass only under the new stems with no reviewed keep, grouped by the matched word, so a too-wide stem cannot hide misses. |
| `term-workfile.mjs <misses.json> <outdir> [--max=150]` | Misses → per-locale review files (field, English, current text, each term's sense, binding form and stems) for a fix round. |
| `term-apply.mjs <loc> <edits.json> [--dry]` | Applies the round's `change` decisions (exact find, once) through `apply-edits.mjs`. |
| `term-apply-check.mjs <loc> <edits.json> …` | After `term-apply`: lists every `change` decision whose replace text is not in the file now (a field is refused whole when one of its finds is missing). Exit 1 if any. |
| `term-keep.mjs <decisions.json> [loc]` | Records `keep` decisions in `term-keeps.json` with the hash of the field's text; a later edit to the field brings the miss back. |
| `term-glossary.test.ts` | Every term entry complete for 13 locales, stems compile, the binding form matches its own stems; keeps well-formed. |
| `../build-glossary.mjs [--check]` | Builds the `/glossary` page data (PRD-038) from the `term` section, the definitions in `i18n-src/<loc>/glossary/terms.json` and the "used on" counts. |
| `link-targets.test.ts` | Translated overlays keep the English markdown link targets. |

Garble pass (text from the 2026-05 / 2026-07-14 runs without quality checks). Method, results and
fix rules: `docs/wip/2026-10-31-garble-pass.md`.

| Tool | What it does |
|---|---|
| `garble-sample.mjs <outdir> [--trees] [--per=25\|all] [--before] [--locales] [--seed]` | Per locale × tree: fields whose text was last written on or before `--before` (git blame). `--per=25` is the graded sample (brief: `maps/2026-10-31-garble-pass/grade-brief.md`). `--per=all` is the fix round's work file, with each field's term bindings (brief: `fix-brief.md`), applied with `apply-edits.mjs`. |

## maps/

The hand-written inputs and analysis results, one folder per arc
(`maps/2026-10-17-translation-cleanup/`): per-locale title tables, ru name and
grammar fix maps, paragraph-list rewrites, hotspot overlays, label vocabularies,
the English proper-noun inventory, the English story extraction. Reuse them; add
new arcs as new folders. `maps/2026-10-31-space-terms/` holds the technical-term
pilot: reviewer decisions per locale, hand edits, and the glossary widening steps.

Lesson recorded with them: a mechanical name swap in an inflected language
leaves every name in the nominative ("с Байконур", "после Гагарин" — fixed in
`ru-decl.tsv`). Generate candidates, read every one, then apply.
