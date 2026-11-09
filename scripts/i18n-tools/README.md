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
| `apply-edits.mjs <loc> <edits.json> [--check]` | `[{rel, at, old, new}]` — reviewed path edits; refuses any that add a `problems()` failure. `rel: "messages"` writes the UI bundle `messages/<loc>.json`. `--check` writes nothing and lists every refusal (without it only the first 30 are printed), so a fixer can test patches against the guard. |
| `showdiff.mjs <edits.json>` | One line per edit, only the changed window — for reviewing before applying. |
| `bodies-apply.mjs <loc>` | Candidate edits: English planet/moon/small-body names → glossary form (CJK spacing, Korean particles), vehicle names protected. Writes `maps/…/bodies-edits-<loc>.json`. |
| `bodies.mjs <loc> [out.tsv]` | Counts body names left in English outside vehicle names, with context. |
| `inventory.mjs <dict> <out.tsv>` | Proper-noun runs of the English source that aren't vehicle words. |
| `classify.mjs` | Latin-script words left in each locale: vehicle / acronym / other. |
| `partial-titles.mjs` | Science titles in non-Latin locales that are still partly English. |
| `apply-hand.mjs`, `apply-arrays.mjs`, `apply-hs.mjs`, `apply-labels.mjs`, `apply-generic.mjs`, `apply-notes.mjs`, `apply-stories.mjs`, `apply-traverses.mjs` | Writers for the 2026-10-17 clean-up items (hand rewrites, paragraph lists, hotspot overlays, event labels, notes, site stories, traverse stops). |
| `convert-native.mjs` (+ `-lib`), `hs-native.mjs` | Origin-language name conversion (step 0). `convert-native.mjs [--write] [--samples=<file>]`: read the `--write` diff, hand-fix what it cannot judge, re-run until the dry run changes nothing. What it leaves English (Latin phrases, CJK glosses, `sourcing/`) lives in `scripts/lib/native-skip.mjs`, shared with `i18n-coverage-scan.mjs`'s `nativeNameMissing` count so both agree. |
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
| `patch-edits.mjs <edits.json> <corrections.tsv\|.json>` | Hand corrections on the generated edits before applying; reports rows that no longer match. An optional 4th column names the field, for a file where two fields carry the same text. A `.json` file `[{rel, at, find, replace}]` is the garble-pass checker's output. |
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
| `original-work-fleet-names.mjs [--sync-english]` | Fills missing /colophon cutaway titles (`original-work.json` anatomy/exploded art) from each locale's fleet `name`, so the colophon names a vehicle as /fleet does. `--sync-english` also replaces a title still identical to the English one when the locale's fleet name differs; a hand-written title is never touched. |
| `same-as-english-triage.mjs <cov.json> [locale] [--list]` | Sorts `i18n-coverage-scan.mjs --json --examples=1000`'s `sameAsEnglish` into names kept by the origin-language rule (fleet/mission names, reviewed exceptions in `REVIEWED`) and fields with an ordinary English word to translate. Read-only; `translate: 0` is the target. |
| `unit-symbols.mjs [--write]` | One way to write the kilometre per locale (operator, 2026-11-04): sr-Cyrl SI symbols in Latin; zh-CN a number takes km / km/s / km/h, prose 公里. Dry run prints counts and samples; a re-run should find 0. |
| `sample-pair.mjs <locale> <tree> [n] [seed]` | Seeded random (en-US, locale) prose pairs from an overlay tree, for a hand-read quality sample graded OK / MINOR / BROKEN. Results go in the open-items note; keep the seed so a sample can be repeated. |
| `au-forms.mjs [--write]` | The English "AU" left in locales with their own form (style guide §1a): fr/es/it/pt-BR au next to a quantity and UA as a noun; ja au; de AE; ru а. е.; sr-Cyrl АЈ; ar و.ف. All-caps labels skipped (fr "AU PÉRIGÉE"). A re-run should print 0 per locale. |
| `number-drift.mjs [tree=science\|all] [locales] [--changed] [--list] [--json] [--no-dates] [--unreviewed] [--gate] [--accept=<loc\|file\|field> --why=…]` · `number-words.mjs` · `number-drift-reviewed.json` · `number-drift.test.ts` · `number-drift-words.test.ts` | Numbers in the English missing from the translation, per field. A value is present or not (how often it is said is not compared). Same value written another way counts: separators, Arabic/Devanagari digits and subscripts (`N₂O₄`), number words per locale (`number-words.mjs`: de nl fr es it pt-BR ru sr-Cyrl ar hi, compounds, case forms, ordinals, "N and a half"; one-words and articles are not read), Roman numerals, CJK/Korean numerals with scales (`38万4,000`, `1억 4,000만`, `9조 4,600억`), decades and short years (1960s = années 60 = шестидесятые, 1946-47), million/billion words in every locale, Gyr/Myr/Mpc/Ga/bn, `$100M`, `36k`, a scale shared across a range, SI prefix words, ft/mi/lb conversions, `1-year`, `24/7`, `1P/Halley`. Dates are compared as dates ("February 12" = "12.02." = "12 февраля" = "2月12日"; month names from Intl; the year stays a plain number). `tree=all` walks every tree; `--json` prints `{trees: {tree: {locale: {fields, withMissing, reviewed}}}, totals}`; `--no-dates` is the old date-blind count; `--changed` keeps fields where a different number appears instead. A finding is a translation error (fix the text in `i18n-src`) or a false positive recorded with `--accept=<locale\|file\|field> --why="reason"` in `number-drift-reviewed.json` (hash of the English and of the translation, so any edit brings it back). `--unreviewed` subtracts the reviewed ones; `--gate` does too over every tree and locale, and exits 1 on a finding left or a stale exception. Run by `npm run validate-data` (`check-i18n-number-drift`) and `reviewed-gates.test.ts`. A new class of false positive is taught to the finder (with a unit test), not recorded. |
| `dropped-sentences.mjs [tree=science\|all] [locales] [--list] [--unreviewed] [--gate] [--accept=<loc\|file\|field> --why=…]` · `dropped-sentences-reviewed.json` | Fields with fewer sentences than the English and clearly short for the locale — a dropped sentence or clause. Merged sentences show too; read each hit. `intro_sentence` is capped at 240 characters, so a restored sentence must fit. Reviewed ones (a clause joined by a comma or dash, CJK sentences run together) live in the reviewed file with the same hashes as `number-drift`; `--gate` is run by `npm run validate-data` (`check-i18n-dropped-sentences`) and `reviewed-gates.test.ts`. |
| `../i18n-coverage-scan.mjs [--gate] [--accept=<loc\|*>\|file\|field --why=…] [--json=out.json] [--examples=N]` · `coverage-reviewed.json` · `coverage-gate.test.ts` | Free scan of every locale for gaps: missing file/key, empty, placeholder text, type or length mismatch, a string identical to the English (overlays and `messages/<loc>.json`), plus orphan keys, locale-only `name`, and base data with English prose. `--gate` exits 1 on any of the first group left (extra keys, extra files, `nameOverride` and base data are reported, not gated). An identical string that is right (a vehicle, mission, instrument or museum name kept in English; a word spelled the same in the language) is recorded with `--accept=<locale\|*>\|<file>\|<field> --why="reason"` (`*` records every locale flagged for that field now) in `coverage-reviewed.json`, with a hash of the English and of the translation so an edit to either brings it back; a stale exception fails too. A string that is wrong is fixed in `i18n-src` (`apply-edits.mjs`), never recorded. Run by `npm run validate-data` (`check-i18n-coverage`) and `coverage-gate.test.ts`. |
| `stale-overlays.mjs [--since=YYYY-MM-DD] [--tree=x] [--list] [--fields]` | Locale overlays whose en-US file changed in a later commit than the locale's last touch (one `git log` pass; deleted files drop out). Run after editing English text; read each hit — an English grammar fix flags too, so it is a finder, not a gate. `--fields` narrows each hit to leaves: en-US as of the locale file's newest commit vs now, JSON `{summary, fields}` with kind changed / new / missing per dotted key. |
| `english-in-labels.mjs [locales] [--list]` | English words left in short label fields (`mission_type`, `label`, `subtitle`, `kicker`, `badge`, `caption_short`) of the non-Latin locales — "Active Orbiter · 2006 – 現在". Names (fleet, missions, sites) are stripped first; a word counts only if the English prose writes it in lowercase. Read each hit. On 2026-11-04 the 7–8 left per locale are surface feature names kept in English everywhere (Home Plate, Three Forks, North Ray, Genesis Rock, Lunar Gateway). |
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
| `term-candidates.mjs <term[,term…]> [locales] [--top=4] [--misses=<file>]` | Each locale's forms for a term, ranked by how many of the term's fields use them (words, word pairs, 6-letter prefixes; character runs for ja / zh-CN / ko) against the rest of the locale: the majority form and its coverage, one line per locale, ~1 s a term. With `--misses=` it ranks the forms inside the missed fields only, i.e. the variants the stems do not accept yet. |
| `term-match.mjs` | Shared matching rules: Arabic vowel marks ignored, keep keys, text hashes; a term's `_en_cs` (case-sensitive English, so mission names are not the noun) and `_en_skip` (path prefixes where the English word has another sense, e.g. the Shuttle "orbiter"). |
| `term-drift.mjs [--terms] [--locales] [--trees] [--misses=f] [--gate]` | Term × locale table of fields using the binding form (or a reviewed keep), and the unreviewed misses. `--gate` exits 1 if any are left. |
| `term-widen-check.mjs <old-glossary.json> [--trees] [--out=f]` | After widening stems: fields that pass only under the new stems with no reviewed keep, grouped by the matched word, so a too-wide stem cannot hide misses. |
| `term-workfile.mjs <misses.json> <outdir> [--max=150]` | Misses → per-locale review files (field, English, current text, each term's sense, binding form and stems) for a fix round. |
| `term-apply.mjs <loc> <edits.json> [--dry]` | Applies the round's `change` decisions (exact find, once) through `apply-edits.mjs`. |
| `term-apply-check.mjs <loc> <edits.json> …` | After `term-apply`: lists every `change` decision whose replace text is not in the file now (a field is refused whole when one of its finds is missing). Exit 1 if any. |
| `term-keep.mjs <decisions.json> [loc]` | Records `keep` decisions in `term-keeps.json` with the hash of the field's text; a later edit to the field brings the miss back. |
| `term-glossary.test.ts` | Every term entry complete for 13 locales, stems compile, the binding form matches its own stems; keeps well-formed. |
| `wrong-forms.mjs [--json]` · `wrong-forms.json` · `wrong-forms.test.ts` | Every wrong form a glossary fix round found (ar مهبط, nl steekproef, fr vitesse d'échappement …), searched across all overlays, the UI messages and the alt text — where term-drift does not look. Exit 1 on any hit; the test keeps them from coming back. Add each new wrong form at the end of a round; `allow` lists file prefixes where the form is right. |
| `../build-glossary.mjs [--check]` | Builds the `/glossary` page data (PRD-038) from the `term` section, the definitions in `i18n-src/<loc>/glossary/terms.json` and the "used on" counts. |
| `link-targets.test.ts` | Translated overlays keep the English markdown link targets. |

Garble pass (text from the 2026-05 / 2026-07-14 runs without quality checks). Method, results and
fix rules: `git show 5cf9491e398:git show 5cf9491e398:docs/wip/2026-10-31-garble-pass.md`.

| Tool | What it does |
|---|---|
| `garble-sample.mjs <outdir> [--trees] [--per=25\|all] [--before] [--locales] [--seed]` | Per locale × tree: fields whose text was last written on or before `--before` (git blame). `--per=25` is the graded sample (brief: `maps/2026-10-31-garble-pass/grade-brief.md`). `--per=all` is the fix round's work file, with each field's term bindings (brief: `fix-brief.md`), applied with `apply-edits.mjs`. |
| `garble-check.mjs <loc> <workfile> <decisions>… --out=<edits.json>` | Checks a fix round's decisions against the work file (numbers changed, English-style 1,000 separators, link targets, 140-char taglines, term bindings) and writes the edits for `apply-edits.mjs` plus `<edits>.flags.json` to read. Skips fields whose text changed since the work file. |
| `garble-cell-commit.sh <loc> <tree> <edits.json> <round-dir> [summary]` | One locale × tree: applies the edits, runs the gates (refused 0, term gate, name drift, validate-data), copies the round's inputs to `maps/2026-10-31-garble-pass/<loc>-<tree>/` and commits; stops on any gate. Second reader before it: `maps/2026-10-31-garble-pass/check-brief.md`, applied with `patch-edits.mjs`. |
| `garble-cell-prep.sh <loc> <name> <trees,comma> <workdir>` | A fix round's cell up to the reading: `garble-check.mjs` on `<workdir>/out/part*.json`, the flags, long taglines, refusals and term misses, then `git checkout --` on the trees it applied to (do not run it with uncommitted work in them). Writes `edits.json`, `edits.flags.json`, `misses.json` into `<workdir>`. |
| `garble-round-commit.sh <loc> <name> <trees,comma> <workdir> "<summary>"` | Records the round (`out/part*.json`, `edits.json`, `hand*.json` as `r3-*` in `<workdir>/rec`), then `garble-cell-commit.sh` with the trees. |
| `garble-flags.mjs <edits.flags.json> [--kinds=ISO,tagline,link,number,separator] [--headers] [--full]` | The flagged fields of `garble-check.mjs` as EN / OLD / NEW blocks, filtered by reason. `--long=<edits.json> --cap=140` lists the tagline edits over the cap. |
| `term-misses.mjs show <misses.json> [--no-en \| --brief] [--loc=] [--term=]` · `keeps <misses.json> <keeps.json> [term=reason …]` | Reads the misses of `term-drift.mjs --misses=`; `keeps` turns them into the `[{term, loc, rel, at, why}]` file for `term-keep.mjs` (reason: the miss's `staleKeep`, else the one given for its term). `--brief` prints only the English sentence with the term and the translation's sentence at the same position: a fix round's reading at about a fifth of the text. |
| `term-finds.mjs <misses.json> <finds.json> <outdir>` | A fix round's changes written as text only (`[{loc, term, find, replace}]`) → `term-apply.mjs` edit files: each find is looked up among the locale's misses for the term and must be in one field (or in several holding the same text, e.g. a fleet tagline and its best_known_for). Exit 1 otherwise. |
| `schema-caps.mjs <edits.json> <work.json> [--out=over-cap.json]` | Edits over the `maxLength` of their field, read from `static/data/schemas` (intro_sentence, headline, tagline, mission event label); writes `over-cap.json` for a shortening round and prints count and max per field. |
| `number-loss.mjs <edits.json> <work.json> [--min=10]` | Fields whose new text lacks an English number ≥ min after normalising thousands separators, the decimal comma and the CJK multipliers (万 亿 万亿 / 만 억 / 万 億). |
| `edit-fixes.mjs refused <loc> <workdir>` · `merge <edits.json> <fix.json>` · `drop <edits.json> <rel:at>…` | Between rounds: `refused` runs `apply-edits.mjs --check` and writes `<workdir>/refused-in.json` (EN, new, guard) for the translator; `merge` copies fixed `new` texts into the edits; `drop` removes edits. |
| `show-edits.mjs <workdir> <loc> [--sample=N --seed=S] [--match=<substr>…] [--width=300]` · `<workdir> --caps` | Reads a round's edits as EN / OLD / NEW blocks: a seeded sample, or the fields matching a path; `--caps` shows `cap-fix.json` against `over-cap.json`. |
| `split-work.mjs <file.json> <n>` | Splits a work file into `<file>.part1.json` … `<file>.partN.json` for n translators. |
| `term-forms.mjs <loc> <regex> [--edits=<edits.json>]` | Which forms of a word a locale uses: every match in `i18n-src/<loc>` and `messages/<loc>.json` with context, or with `--edits` the count of each form in the edits' new texts. |
| `garble-tally.mjs <graded-dir \| graded.json…> [--pools=tree=n,…]` · `--outdir=<dir>…` | OK/MINOR/BROKEN per locale × tree of the graders' files, with the cells to read; `--outdir` counts a reviewer's grades and decisions in `<dir>/out/part*.json` and the fields kept although not OK. |
| `grade-pack.mjs <out.json> <sampledir>/<bucket>/<loc>.json …` | Merges sample files into one grader file, adding `loc` and `tree`. |
| `iso-restore.mjs <edits.json>` | Puts back ISO dates (the site keeps 1969-07-16 in every locale) where a translator spelled them out as CJK 1969年7月16日 or ko 1969년 7월 16일; counts any ISO date missing in another form, for reading. `garble-check.mjs` flags dropped ISO dates. |
| `pattern-scan.mjs <outdir> [--locales]` | Site-wide scans, every tree, for the error classes the close-out sweep kept finding. Writes `thousands-<loc>.json`, ready `apply-edits.mjs` edits: an English `1,578` copied into a comma-decimal locale becomes the locale's separator (space for fr/ru/es, dot for the others; es four-digit numbers take none). Writes `review.json` for a translator to judge: `scale` (long-scale billion/trillion false friends), `moonword` (allunaggio / alunizaje / alunissage for a landing not on the Moon), `falsefriend` (nl maandag, maremoto, ru Водолей, hi चंद्र ग्रहण, sr квинтилион), `sametext` (a field identical to the English). Record: `maps/2026-10-31-garble-pass/pattern-scan/`. |
| `en-fix-workfile.mjs <fixes.json> <outdir> [--apply-en]` | An English source correction (`[{rel, at, find, replace}]`) carried into every locale: per-locale work files `{en_old, en_new, tr, terms}` for the translators (brief: `maps/2026-10-31-garble-pass/en-fix-brief.md`); `--apply-en` writes the new English. |
| `en-fix-edits.mjs <workdir> <outdir> <editsdir>` | The translators' output → per-locale `apply-edits.mjs` files; prints changed / unchanged / flagged (numbers differ from the new English) per locale, the check for a fact changed in all 14 locales. |

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
